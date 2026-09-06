import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { analyzeCycleSpendingPatterns, analyzeSpendingInsights, parseExcelOrSheetWithGemini, parseVoiceMemo, scanReceiptImage } from './geminiService.js';
import { APP_VERSION, MIN_TRANSACTION_AMOUNT_TOMAN } from '../src/types.js';
import { sendDueReminders } from './jobs/sendReminders.js';
import { getCalendarPhase } from '../src/features/cycle/cycleMath.js';

const AUTH_HAMID_HASH = process.env.AUTH_HAMID_HASH || '$2b$12$7JQHxKj.SX3Wt0TxJRgaKerG2MFGMBf3K7PBp.VJuWvYtpZnGSGtS';
const AUTH_FATI_HASH  = process.env.AUTH_FATI_HASH  || '$2b$12$nNwuvHvUm6MKLEBRIBEJfeaiqkHnZPFRm4dR9oR6GUn1mX7UfmHfW';
if (!process.env.AUTH_HAMID_HASH) console.warn('[SECURITY] AUTH_HAMID_HASH not set — using dev default!');

export const apiRouter = Router();

// --- AUTH MIDDLEWARE ---
// Token-based auth. The frontend stores the user object in localStorage
// after login. We check a header "x-auth-user" containing the username.
const authMiddleware = (req: any, res: any, next: any) => {
  // Skip auth for login, health, version, push public key, and internal reminder runner
  if (
    req.path === '/auth/login' ||
    req.path === '/health' ||
    req.path === '/version' ||
    req.path === '/push/public-key' ||
    req.path === '/internal/run-reminders'
  ) {
    return next();
  }
  const authUser = req.headers['x-auth-user'] as string;
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required. Please log in first.' });
  }
  // Validate the user is one of our known users
  const knownUsers = ['hamid', 'fati', 'fatemeh'];
  const cleanUser = authUser.toLowerCase().trim();
  if (!knownUsers.includes(cleanUser)) {
    return res.status(401).json({ error: 'Invalid user session. Please log in again.' });
  }
  req.authUser = cleanUser;
  next();
};

// Apply auth middleware to all routes.
apiRouter.use(authMiddleware);

// --- AUTHENTICATION ---
apiRouter.get('/version', (_req, res) => {
  res.json({
    version: APP_VERSION,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || '',
    minTransactionAmount: MIN_TRANSACTION_AMOUNT_TOMAN,
  });
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const u = (username||'').toString().trim().toLowerCase();
    const p = (password||'').toString();
    if (!u || !p) return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    let hash: string|null = null;
    let profile: any = null;
    if (u === 'hamid') { hash = AUTH_HAMID_HASH; profile = { username:'hamid', name:'کاربر اول', partnerId:'partner_a', avatar:'👨‍💼' }; }
    else if (u === 'fati'||u === 'fatemeh') { hash = AUTH_FATI_HASH; profile = { username:'fati', name:'کاربر دوم', partnerId:'partner_b', avatar:'👩‍⚕️' }; }
    if (!hash) { await bcrypt.compare('x','$2b$12$invalidhashfortimingprotection000000000000000000000000'); return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' }); }
    if (!await bcrypt.compare(p, hash)) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    return res.json({ success: true, user: profile });
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

// --- SETTINGS ---
apiRouter.get('/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    const storageMode = typeof db.getStorageMode === 'function' ? db.getStorageMode() : ((process.env.DATABASE_URL || process.env.POSTGRES_URL) ? 'postgresql' : 'local_file');
    const maskedKey = settings.geminiApiKey
      ? `${settings.geminiApiKey.substring(0, 4)}...${settings.geminiApiKey.substring(settings.geminiApiKey.length - 4)}`
      : '';
    res.json({
      ...settings,
      hasEnvKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      maskedKey,
      hasCustomKey: Boolean(settings.geminiApiKey),
      storageMode,
      appVersion: APP_VERSION,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || '',
      minTransactionAmount: MIN_TRANSACTION_AMOUNT_TOMAN,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/settings', async (req, res) => {
  try { res.json(await db.updateSettings(req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/settings/test-key', async (req, res) => {
  try {
    const customKey = req.body.geminiApiKey || req.headers['x-gemini-key'] as string;
    const settings = await db.getSettings();
    const result = await parseVoiceMemo('Test connection $10 coffee', settings.partnerA, settings.partnerB, settings.currencySymbol || 'تومان', customKey);
    res.json({ success: true, message: 'Gemini API key verified successfully!', sampleParsed: result });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message || 'Failed to verify Gemini API Key' }); }
});

// --- TRANSACTIONS ---
apiRouter.post('/transactions/process-recurring', async (req, res) => {
  try {
    const month = req.body.month || new Date().toISOString().substring(0, 7);
    const added = await db.processRecurringExpenses(month);
    res.json({ success: true, month, addedCount: added.length, added });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/transactions', async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    res.json(await db.getTransactions(month));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

function isBelowMinTransactionAmount(tx: any): boolean {
  return Number(tx?.amount || 0) > 0 && Number(tx.amount) < MIN_TRANSACTION_AMOUNT_TOMAN;
}

apiRouter.post('/transactions/batch', async (req, res) => {
  try {
    const items = req.body.transactions;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'transactions array is required' });
    const filteredItems = items.filter((tx) => !isBelowMinTransactionAmount(tx));
    const ignoredCount = items.length - filteredItems.length;
    const createdList = filteredItems.length > 0 ? await db.batchAddTransactions(filteredItems) : [];
    res.json({ success: true, count: createdList.length, ignoredCount, minAmount: MIN_TRANSACTION_AMOUNT_TOMAN, created: createdList });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.post('/transactions', async (req, res) => {
  try {
    if (isBelowMinTransactionAmount(req.body)) {
      return res.json({
        ignored: true,
        reason: `Transactions below ${MIN_TRANSACTION_AMOUNT_TOMAN} تومان are ignored.`,
        minAmount: MIN_TRANSACTION_AMOUNT_TOMAN,
      });
    }
    res.json(await db.addTransaction(req.body));
  }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.put('/transactions/:id', async (req, res) => {
  try {
    const updated = await db.updateTransaction(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });
    res.json(updated);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.delete('/transactions/:id', async (req, res) => {
  try {
    const success = await db.deleteTransaction(req.params.id);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- HOUSEHOLD / SETTLEMENT SUMMARY ---
apiRouter.get(['/household/summary', '/settlements/summary'], async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    res.json(await db.calculateHouseholdSummary(month));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- BUDGETS ---
apiRouter.get('/budgets', async (req, res) => {
  try { res.json(await db.getBudgets()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/budgets', async (req, res) => {
  try { res.json(await db.updateBudgets(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// --- RECURRING EXPENSES ---
apiRouter.get('/recurring-expenses', async (req, res) => {
  try { res.json(await db.getRecurringExpenses()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/recurring-expenses', async (req, res) => {
  try { res.json(await db.addRecurringExpense(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.patch('/recurring-expenses/:id/toggle-active', async (req, res) => {
  try {
    const updated = await db.toggleRecurringExpenseActive(req.params.id, Boolean(req.body.isActive));
    if (!updated) return res.status(404).json({ error: 'Recurring expense not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/recurring-expenses/:id', async (req, res) => {
  try {
    const success = await db.deleteRecurringExpense(req.params.id);
    if (!success) return res.status(404).json({ error: 'Recurring expense not found' });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- BILLS ---
apiRouter.get('/bills', async (req, res) => {
  try { res.json(await db.getBills()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/bills', async (req, res) => {
  try { res.json(await db.addBill(req.body)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

apiRouter.patch('/bills/:id/toggle-paid', async (req, res) => {
  try {
    const updated = await db.toggleBillPaid(req.params.id, Boolean(req.body.isPaid));
    if (!updated) return res.status(404).json({ error: 'Bill not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/bills/:id', async (req, res) => {
  try {
    const success = await db.deleteBill(req.params.id);
    if (!success) return res.status(404).json({ error: 'Bill not found' });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- GEMINI AI ENDPOINTS ---
apiRouter.post('/ai/parse-voice', async (req, res) => {
  try {
    const { transcript, audioBase64, mimeType, speechLang } = req.body;
    if (!transcript && !audioBase64) return res.status(400).json({ error: 'Transcript or audio data is required' });
    const settings = await db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;
    const input = audioBase64 ? { audioBase64, mimeType, speechLang } : transcript;
    const parsed = await parseVoiceMemo(input as any, settings.partnerA, settings.partnerB, settings.currencySymbol || 'تومان', customKey);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error parsing voice memo:', err);
    res.status(500).json({ error: err.message || 'Failed to process voice input' });
  }
});

apiRouter.post('/ai/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Base64 image data is required' });
    const settings = await db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const scanResult = await scanReceiptImage(cleanBase64, mimeType || 'image/jpeg', settings.partnerA.name, settings.partnerB.name, settings.currencySymbol || 'تومان', customKey);
    res.json(scanResult);
  } catch (err: any) {
    console.error('Error scanning receipt:', err);
    res.status(500).json({ error: err.message || 'Failed to scan receipt image' });
  }
});

apiRouter.get('/ai/insights', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const settings = await db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;
    const txs = (await db.getTransactions(month)).filter((t) => t.type === 'EXPENSE');
    const budgets = await db.getBudgets();
    const summary = await db.calculateHouseholdSummary(month);

    const categoryBreakdown: Record<string, number> = {};
    let totalSpent = 0;
    for (const t of txs) {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      totalSpent += t.amount;
    }

    const budgetComparisons = budgets.map((b) => {
      const spent = categoryBreakdown[b.category] || 0;
      return {
        category: b.category,
        spent: Math.round(spent * 100) / 100,
        limit: b.monthlyLimit,
        pct: b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0,
      };
    });

    const insights = await analyzeSpendingInsights(
      {
        month,
        partnerAName: settings.partnerA.name,
        partnerBName: settings.partnerB.name,
        totalSpent,
        partnerAPaid: summary.partnerATotalPaid,
        partnerBPaid: summary.partnerBTotalPaid,
        categoryBreakdown,
        budgetComparisons,
      },
      customKey
    );
    res.json(insights);
  } catch (err: any) {
    console.error('Error generating insights:', err);
    res.status(500).json({ error: err.message || 'Failed to generate insights' });
  }
});

apiRouter.post('/ai/cycle-insights', async (req, res) => {
  try {
    const cycleSettings = await db.getCycleSettings();
    if (!cycleSettings.healthInsightsConsent) return res.status(403).json({ error: 'Health insight consent is required.' });
    const cycleDays = Array.isArray(req.body?.cycleDays) ? req.body.cycleDays.slice(-120) : [];
    if (cycleDays.length < 7) return res.json({ insights: [] });
    const transactions = (await db.getTransactions()).filter((transaction) => transaction.type === 'EXPENSE');
    const expenseTotalsByPhase: Record<string, Record<string, number>> = { period: {}, fertile: {}, ovulation: {}, safe: {} };
    for (const transaction of transactions) {
      const phase = getCalendarPhase(transaction.date, cycleDays, cycleSettings);
      expenseTotalsByPhase[phase][transaction.category] = (expenseTotalsByPhase[phase][transaction.category] || 0) + transaction.amount;
    }
    const settings = await db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;
    const insights = await analyzeCycleSpendingPatterns({
      cycleDays: cycleDays.map((day: any) => ({ date: day.date, flow: day.flow, symptoms: Array.isArray(day.symptoms) ? day.symptoms.slice(0, 4) : [], mood: Array.isArray(day.mood) ? day.mood.slice(0, 2) : [] })),
      expenseTotalsByPhase,
    }, customKey);
    res.json({ insights });
  } catch (err: any) {
    console.error('Error generating cycle insights:', err);
    res.status(500).json({ error: err.message || 'Failed to generate cycle insights' });
  }
});

apiRouter.post('/ai/import-sheet', async (req, res) => {
  try {
    const { fileBase64, pastedText } = req.body;
    if (!fileBase64 && !pastedText) return res.status(400).json({ error: 'File or pasted text is required' });
    const settings = await db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;
    let sheetText = pastedText || '';
    if (fileBase64) {
      const xlsx = await import('xlsx');
      const cleanB64 = fileBase64.replace(/^data:.*?;base64,/, '');
      const binary = Buffer.from(cleanB64, 'base64');
      const workbook = xlsx.read(binary, { type: 'buffer' });
      const firstSheet = workbook.SheetNames[0];
      if (firstSheet) sheetText = xlsx.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
    }
    const result = await parseExcelOrSheetWithGemini(sheetText, settings.partnerA, settings.partnerB, settings.currencySymbol || 'تومان', customKey);
    res.json(result);
  } catch (err: any) {
    console.error('Error importing sheet:', err);
    res.status(500).json({ error: err.message || 'Failed to import sheet' });
  }
});

// --- ANALYTICS TRENDS ---
apiRouter.get('/analytics/three-months', async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    res.json(await db.getThreeMonthTrends(month));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- CYCLE & PERIOD TRACKER ---
apiRouter.get('/cycle/logs', async (_req, res) => {
  try {
    const logs = await db.getCycleLogs();
    res.json(logs);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/cycle/logs', async (req, res) => {
  try {
    const log = req.body;
    if (!log || !log.date) return res.status(400).json({ error: 'Date is required for cycle log' });
    const saved = await db.saveCycleLog(log);
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/cycle/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const success = await db.deleteCycleLog(date);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/cycle/settings', async (_req, res) => {
  try {
    const settings = await db.getCycleSettings();
    res.json(settings);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/cycle/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    const updated = await db.updateCycleSettings(newSettings);
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- PUSH REMINDERS ---
apiRouter.get('/push/public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push reminders are not configured on this deployment.' });
  res.json({ publicKey: key });
});

apiRouter.get('/push/preferences', async (req: any, res) => {
  try { res.json(await db.getNotificationPreferences(req.authUser)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/push/preferences', async (req: any, res) => {
  try {
    const input = req.body || {};
    if (input.dailyLogTime && !/^\d{2}:\d{2}$/.test(input.dailyLogTime)) return res.status(400).json({ error: 'dailyLogTime must be HH:mm' });
    if (input.timezone && typeof input.timezone !== 'string') return res.status(400).json({ error: 'timezone must be a string' });
    res.json(await db.updateNotificationPreferences(req.authUser, input));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/push/subscriptions', async (req: any, res) => {
  try {
    const subscription = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: 'A valid push subscription is required.' });
    await db.upsertPushSubscription(req.authUser, subscription);
    res.status(201).json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/push/subscriptions', async (req: any, res) => {
  try {
    if (!req.body?.endpoint) return res.status(400).json({ error: 'Subscription endpoint is required.' });
    await db.deletePushSubscription(req.authUser, req.body.endpoint);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// Couple Hub Feature Routes
// ──────────────────────────────────────────────

// Grocery
apiRouter.get('/grocery', async (_req, res) => {
  try {
    res.json(await db.getGroceryItems());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/grocery', async (req: any, res) => {
  try {
    const item = req.body;
    if (!item || !item.title) return res.status(400).json({ error: 'Title is required' });
    const addedBy = req.authUser || item.addedBy || 'partner_a';
    const saved = await db.addGroceryItem({ ...item, addedBy });
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.patch('/grocery/:id/toggle', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isChecked } = req.body;
    const updated = await db.toggleGroceryItem(id, Boolean(isChecked), req.authUser);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/grocery/checked/clear', async (_req, res) => {
  try {
    await db.clearCheckedGroceryItems();
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/grocery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteGroceryItem(id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Todos
apiRouter.get('/todos', async (_req, res) => {
  try {
    res.json(await db.getTodos());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/todos', async (req: any, res) => {
  try {
    const item = req.body;
    if (!item || !item.title) return res.status(400).json({ error: 'Title is required' });
    const createdBy = req.authUser || item.createdBy || 'partner_a';
    const saved = await db.addTodo({ ...item, createdBy });
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.patch('/todos/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.updateTodo(id, updates, req.authUser);
    if (!updated) return res.status(404).json({ error: 'Todo not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteTodo(id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Notes
apiRouter.get('/notes', async (_req, res) => {
  try {
    res.json(await db.getCoupleNotes());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/notes', async (req: any, res) => {
  try {
    const note = req.body;
    if (!note || !note.title || !note.content) return res.status(400).json({ error: 'Title and content are required' });
    const author = req.authUser || note.author || 'partner_a';
    const saved = await db.addCoupleNote({ ...note, author });
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.updateCoupleNote(id, updates);
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.patch('/notes/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;
    const updated = await db.toggleNotePin(id, Boolean(isPinned));
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteCoupleNote(id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Goals
apiRouter.get('/goals', async (_req, res) => {
  try {
    res.json(await db.getWishGoals());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/goals', async (req: any, res) => {
  try {
    const goal = req.body;
    if (!goal || !goal.title || goal.targetAmount === undefined) return res.status(400).json({ error: 'Title and targetAmount are required' });
    const owner = req.authUser || goal.owner || 'partner_a';
    const saved = await db.addWishGoal({ ...goal, owner });
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.patch('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.updateWishGoal(id, updates);
    if (!updated) return res.status(404).json({ error: 'Goal not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteWishGoal(id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Important Dates
apiRouter.get('/dates', async (_req, res) => {
  try {
    res.json(await db.getImportantDates());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/dates', async (req: any, res) => {
  try {
    const date = req.body;
    if (!date || !date.title || !date.date) return res.status(400).json({ error: 'Title and date are required' });
    const createdBy = req.authUser || date.createdBy || 'partner_a';
    const saved = await db.addImportantDate({ ...date, createdBy });
    res.json(saved);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.put('/dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.updateImportantDate(id, updates);
    if (!updated) return res.status(404).json({ error: 'Date not found' });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteImportantDate(id);
    res.json({ success });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/internal/run-reminders', async (req, res) => {
  const schedulerSecret = req.headers['x-reminder-job-secret'];
  if (!process.env.REMINDER_JOB_SECRET || schedulerSecret !== process.env.REMINDER_JOB_SECRET) return res.status(401).json({ error: 'Scheduler authorization required.' });
  try { res.json(await sendDueReminders()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

