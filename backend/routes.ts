import { Router } from 'express';
import * as xlsx from 'xlsx';
import { db } from './db.js';
import { analyzeSpendingInsights, parseExcelOrSheetWithGemini, parseVoiceMemo, scanReceiptImage } from './geminiService.js';

export const apiRouter = Router();

// --- AUTHENTICATION ---
apiRouter.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').toString().trim().toLowerCase();
    const cleanPass = (password || '').toString().trim();

    if (cleanUser === 'hamid' && cleanPass === '19981998') {
      return res.json({
        success: true,
        user: {
          username: 'hamid',
          name: 'سیدحمید عقل مندصرمی',
          partnerId: 'partner_a',
          avatar: '👨‍💼',
        },
      });
    }

    if ((cleanUser === 'fati' || cleanUser === 'fatemeh') && cleanPass === '13771377') {
      return res.json({
        success: true,
        user: {
          username: 'fati',
          name: 'فاطمه نیک سرشت',
          partnerId: 'partner_b',
          avatar: '👩‍⚕️',
        },
      });
    }

    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است (Invalid username or password)' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS ---
apiRouter.get('/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    // Return masked key for security in response
    const maskedKey = settings.geminiApiKey
      ? `${settings.geminiApiKey.substring(0, 4)}...${settings.geminiApiKey.substring(settings.geminiApiKey.length - 4)}`
      : '';
    const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);

    res.json({
      ...settings,
      hasEnvKey,
      maskedKey,
      hasCustomKey: Boolean(settings.geminiApiKey),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Gemini API Key Connection
apiRouter.post('/settings/test-key', async (req, res) => {
  try {
    const customKey = req.body.geminiApiKey || req.headers['x-gemini-key'] as string;
    const settings = db.getSettings();
    const result = await parseVoiceMemo(
      'Test connection $10 coffee paid by Alex',
      settings.partnerA,
      settings.partnerB,
      customKey
    );
    res.json({ success: true, message: 'Gemini API key verified successfully!', sampleParsed: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to verify Gemini API Key' });
  }
});

// --- TRANSACTIONS ---
apiRouter.post('/transactions/process-recurring', (req, res) => {
  try {
    const month = req.body.month || new Date().toISOString().substring(0, 7);
    const added = db.processRecurringExpenses(month);
    res.json({ success: true, month, addedCount: added.length, added });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/transactions', (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const transactions = db.getTransactions(month);
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/transactions/batch', (req, res) => {
  try {
    const items = req.body.transactions;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'transactions array is required' });
    }
    const createdList = db.batchAddTransactions(items);
    res.json({ success: true, count: createdList.length, created: createdList });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/transactions', (req, res) => {
  try {
    const created = db.addTransaction(req.body);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/transactions/:id', (req, res) => {
  try {
    const updated = db.updateTransaction(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/transactions/:id', (req, res) => {
  try {
    const success = db.deleteTransaction(req.params.id);
    if (!success) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- HOUSEHOLD / SETTLEMENT SUMMARY ---
apiRouter.get(['/household/summary', '/settlements/summary'], (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const summary = db.calculateHouseholdSummary(month);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// --- BUDGETS ---
apiRouter.get('/budgets', (req, res) => {
  try {
    const budgets = db.getBudgets();
    res.json(budgets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/budgets', (req, res) => {
  try {
    const updated = db.updateBudgets(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- RECURRING EXPENSES ---
apiRouter.get('/recurring-expenses', (req, res) => {
  try {
    const list = db.getRecurringExpenses();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/recurring-expenses', (req, res) => {
  try {
    const created = db.addRecurringExpense(req.body);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/recurring-expenses/:id/toggle-active', (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = db.toggleRecurringExpenseActive(req.params.id, Boolean(isActive));
    if (!updated) return res.status(404).json({ error: 'Recurring expense not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/recurring-expenses/:id', (req, res) => {
  try {
    const success = db.deleteRecurringExpense(req.params.id);
    if (!success) return res.status(404).json({ error: 'Recurring expense not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
apiRouter.get('/bills', (req, res) => {
  try {
    const bills = db.getBills();
    res.json(bills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/bills', (req, res) => {
  try {
    const created = db.addBill(req.body);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/bills/:id/toggle-paid', (req, res) => {
  try {
    const { isPaid } = req.body;
    const updated = db.toggleBillPaid(req.params.id, Boolean(isPaid));
    if (!updated) return res.status(404).json({ error: 'Bill not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/bills/:id', (req, res) => {
  try {
    const success = db.deleteBill(req.params.id);
    if (!success) return res.status(404).json({ error: 'Bill not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GEMINI AI ENDPOINTS ---

// Voice / Transcript Parsing
apiRouter.post('/ai/parse-voice', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript string is required' });
    }

    const settings = db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;

    const parsed = await parseVoiceMemo(
      transcript,
      settings.partnerA,
      settings.partnerB,
      settings.currencySymbol || 'تومان',
      customKey
    );
    res.json(parsed);
  } catch (err: any) {
    console.error('Error parsing voice memo with Gemini:', err);
    res.status(500).json({ error: err.message || 'Failed to process voice transcript' });
  }
});

// Receipt Scanning (Gemini Vision)
apiRouter.post('/ai/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Base64 image data is required' });
    }

    const settings = db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const scanResult = await scanReceiptImage(
      cleanBase64,
      mimeType || 'image/jpeg',
      settings.partnerA.name,
      settings.partnerB.name,
      settings.currencySymbol || 'تومان',
      customKey
    );

    res.json(scanResult);
  } catch (err: any) {
    console.error('Error scanning receipt with Gemini Vision:', err);
    res.status(500).json({ error: err.message || 'Failed to scan receipt image' });
  }
});

// AI Financial Insights & Advice
apiRouter.get('/ai/insights', async (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const settings = db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;

    const txs = db.getTransactions(month).filter((t) => t.type === 'EXPENSE');
    const budgets = db.getBudgets();
    const summary = db.calculateHouseholdSummary(month);

    // Compute category breakdown
    const categoryBreakdown: Record<string, number> = {};
    let totalSpent = 0;

    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      totalSpent += amt;
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
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
    console.error('Error generating AI spending insights:', err);
    res.status(500).json({ error: err.message || 'Failed to generate financial insights' });
  }
});

// AI Auto Import Spreadsheet / Excel / Sheet
apiRouter.post('/ai/import-sheet', async (req, res) => {
  try {
    const { fileBase64, pastedText } = req.body;
    let contentToAnalyze = pastedText || '';

    if (fileBase64) {
      try {
        const cleanB64 = fileBase64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanB64, 'base64');
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (sheetName) {
          const sheet = workbook.Sheets[sheetName];
          contentToAnalyze = xlsx.utils.sheet_to_csv(sheet);
        }
      } catch (err: any) {
        console.warn('Failed binary xlsx read, fallback to text decode:', err);
        const cleanB64 = fileBase64.replace(/^data:.*?;base64,/, '');
        contentToAnalyze = Buffer.from(cleanB64, 'base64').toString('utf-8');
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      return res.status(400).json({ error: 'Please upload an Excel/CSV file or paste spreadsheet rows.' });
    }

    const settings = db.getSettings();
    const customKey = (req.headers['x-gemini-key'] as string) || settings.geminiApiKey;

    const parsed = await parseExcelOrSheetWithGemini(
      contentToAnalyze,
      settings.partnerA,
      settings.partnerB,
      settings.currencySymbol || 'تومان',
      customKey
    );

    res.json(parsed);
  } catch (err: any) {
    console.error('Error auto-importing spreadsheet with Gemini:', err);
    res.status(500).json({ error: err.message || 'Failed to parse spreadsheet with Gemini' });
  }
});

// Analytics - 3 Month Comparative View Trends
apiRouter.get('/analytics/three-months', (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const trends = db.getThreeMonthTrends(month);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
