/**
 * Frontend Gemini AI service.
 *
 * On static hosting (GitHub Pages) there is no backend to proxy Gemini calls.
 * This module calls the Google GenAI SDK directly from the browser using the
 * user-supplied API key (stored in localStorage `duospend_gemini_key`).
 *
 * It replicates the prompts/schemas from `backend/geminiService.ts` so behavior
 * is consistent between hosted and offline deployments.
 *
 * Safety: the API key never leaves the user's browser. If no key is present
 * the functions throw a friendly Persian error so the UI can degrade gracefully.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  AIInsightResponse,
  AIParsedSheetResult,
  AIParsedVoice,
  AIScanReceipt,
  AppSettings,
  Transaction,
} from '../types';

const MODEL = 'gemini-2.5-flash';

function getKey(): string {
  try {
    const raw = localStorage.getItem('duospend_gemini_key') || '';
    return raw.trim().replace(/^["']|["']$/g, '');
  } catch {
    return '';
  }
}

function getClient(): { ai: GoogleGenAI; key: string } {
  const apiKey = getKey();
  if (!apiKey) {
    throw new Error(
      'کلید API جمینای تنظیم نشده است. لطفاً در بخش تنظیمات (Settings) کلید Gemini خود را وارد کنید.',
    );
  }
  return { ai: new GoogleGenAI({ apiKey }), key: apiKey };
}

// ──────────────────────────────────────────────
// Persian / Arabic digit normalization (mirror of backend)
// ──────────────────────────────────────────────

function normalizePersianInput(input: string): string {
  if (!input) return '';
  let str = input;
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    str = str.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  str = str.replace(/(\d+)\s*هزار/g, (_, num) => `${parseInt(num, 10) * 1000}`);
  str = str.replace(/(\d+)\s*میلیون/g, (_, num) => `${parseInt(num, 10) * 1000000}`);
  return str;
}

// ──────────────────────────────────────────────
// Retry + validate engine (mirror of backend callGeminiWithRetry)
// ──────────────────────────────────────────────

interface RetryOptions<T> {
  maxRetries?: number;
  baseDelayMs?: number;
  validate?: (data: T) => string | null;
  label?: string;
}

async function callWithRetry<T>(
  callFn: () => Promise<T>,
  options: RetryOptions<T> = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 800, validate, label = 'Gemini' } = options;
  let lastError: Error | null = null;
  let bestResult: T | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await callFn();
      if (!validate) return result;
      const reason = validate(result);
      if (!reason) return result;
      console.warn(`[${label}] Attempt ${attempt}/${maxRetries} — validation failed: ${reason}`);
      bestResult = result;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || '';
      console.error(`[${label}] Attempt ${attempt}/${maxRetries} — error: ${msg}`);
      if (/403|401|API key|Forbidden/i.test(msg)) {
        throw new Error(
          'کلید API نامعتبر است یا دسترسی آن مسدود شده است (403). لطفاً یک کلید معتبر از Google AI Studio دریافت کنید.',
        );
      }
    }
    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (bestResult) return bestResult;
  throw lastError || new Error(`[${label}] All ${maxRetries} attempts failed`);
}

// ──────────────────────────────────────────────
// Validators (mirror of backend)
// ──────────────────────────────────────────────

function validateVoice(data: AIParsedVoice): string | null {
  if (data.actionType === 'SET_BUDGET') {
    if (!data.category) return 'Missing category for SET_BUDGET';
    if (!data.monthlyLimit || data.monthlyLimit <= 0) return `Invalid monthlyLimit: ${data.monthlyLimit}`;
    return null;
  }
  if (data.actionType === 'ADD_RECURRING') {
    if (!data.title?.trim()) return 'Missing title for ADD_RECURRING';
    if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
    return null;
  }
  if (data.actionType === 'ADD_BILL') {
    if (!data.title?.trim()) return 'Missing title for ADD_BILL';
    if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
    return null;
  }
  if (!data.title?.trim()) return 'Missing title';
  if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return `Invalid date: ${data.date}`;
  if (!data.paidBy) return 'Missing paidBy';
  if (!data.category) return 'Missing category';
  return null;
}

function validateReceipt(data: AIScanReceipt): string | null {
  if (!data.vendor?.trim()) return 'Missing vendor';
  if (!data.totalAmount || data.totalAmount <= 0) return `Invalid totalAmount: ${data.totalAmount}`;
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return `Invalid date: ${data.date}`;
  if (!data.category) return 'Missing category';
  return null;
}

function validateInsights(data: AIInsightResponse): string | null {
  if (!data.summary || data.summary.trim().length < 10) return 'Summary too short or missing';
  if (!data.keyInsights || data.keyInsights.length === 0) return 'No key insights returned';
  if (!data.savingTips || data.savingTips.length === 0) return 'No saving tips returned';
  return null;
}

function validateSheet(data: AIParsedSheetResult): string | null {
  if (!data.transactions || data.transactions.length === 0) return 'No transactions parsed';
  if (data.transactions.find((t) => !t.title || !t.amount || t.amount <= 0)) return 'Invalid transaction row';
  return null;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export async function parseVoiceOffline(
  transcript: string,
  settings: AppSettings,
): Promise<AIParsedVoice> {
  const { ai } = getClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const cleaned = normalizePersianInput(transcript);
  const partnerA = settings.partnerA;
  const partnerB = settings.partnerB;
  const currency = settings.currencySymbol || 'تومان';

  const prompt = `You are an intelligent household expense & budget assistant fluent in both PERSIAN (Farsi) and ENGLISH for a couple (${partnerA.name} [id: ${partnerA.id}] and ${partnerB.name} [id: ${partnerB.id}]).
Analyze the input memo and detect the user's INTENTION (actionType):

ORIGINAL INPUT: "${transcript}"
CLEANED TRANSCRIPT: "${cleaned}"

CONTEXT:
- Today's date is: ${todayStr}
- Target Currency: "${currency}"
- Partner A: ${partnerA.name} / "حمید" / "Hamid" (id: ${partnerA.id})
- Partner B: ${partnerB.name} / "فاطمه" / "Fatemeh" (id: ${partnerB.id})

INTENT CLASSIFICATION RULES (actionType):
1. 'LOG_EXPENSE': One-off transaction entry.
2. 'SET_BUDGET': Set/change a monthly budget limit.
3. 'ADD_RECURRING': Set up a regular recurring expense rule.
4. 'ADD_BILL': Add a monthly recurring bill reminder.

MATCHING RULES:
- Match '${partnerA.id}' for "${partnerA.name}", "حمید", "Hamid", "من".
- Match '${partnerB.id}' for "${partnerB.name}", "فاطمه", "Fatemeh", "خانم".
- Default to '${partnerA.id}' if unspecified.
- "هزار"=1,000 | "میلیون"=1,000,000. If Rials, divide by 10.
- Categories: Groceries, Dining & Takeout, Rent & Mortgage, Utilities & Internet, Household & Supplies, Entertainment & Subscriptions, Travel & Transport, Healthcare & Wellness, Shopping & Personal, Income & Salary, Internal Transfer, Other.

Output valid JSON matching the schema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      actionType: { type: Type.STRING, description: 'LOG_EXPENSE, SET_BUDGET, ADD_RECURRING, or ADD_BILL' },
      title: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      category: { type: Type.STRING },
      paidBy: { type: Type.STRING, description: `'${partnerA.id}' or '${partnerB.id}'` },
      date: { type: Type.STRING, description: 'YYYY-MM-DD' },
      vendor: { type: Type.STRING },
      confidenceNotes: { type: Type.STRING },
      monthlyLimit: { type: Type.NUMBER },
      interval: { type: Type.STRING },
      dueDateDay: { type: Type.NUMBER },
      autopay: { type: Type.BOOLEAN },
    },
    required: ['actionType', 'title', 'amount', 'category', 'paidBy', 'date'],
  };

  return callWithRetry<AIParsedVoice>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      const parsed = JSON.parse(response.text || '{}') as AIParsedVoice;
      if (!parsed.actionType) parsed.actionType = 'LOG_EXPENSE';
      return parsed;
    },
    { validate: validateVoice, label: 'VoiceParser' },
  );
}

export async function scanReceiptOffline(
  imageBase64: string,
  mimeType: string,
  settings: AppSettings,
): Promise<AIScanReceipt> {
  const { ai } = getClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const partnerAName = settings.partnerA.name;
  const partnerBName = settings.partnerB.name;
  const currency = settings.currencySymbol || 'تومان';

  const promptText = `You are an expert OCR and financial document analyzer specialized in reading receipts, invoices, and Iranian bank card reader slips (کارتخوان / فاکتور خرید).
Analyze this receipt or invoice image and extract structured expense details for a household budget shared between ${partnerAName} and ${partnerBName}.

Target App Currency: "${currency}"
Today's reference date is: ${todayStr}.

CRITICAL IRANIAN CURRENCY RULES:
1. Iranian POS receipts print totals in RIALS (ریال).
2. When Target Currency is Toman (تومان): DIVIDE Rial amounts BY 10.
   - 1,000,000 Rials → 100,000 Tomans
   - DO NOT strip 3 zeros! Divide by 10 only.

Extract: Vendor, Date (YYYY-MM-DD), Total amount (converted), Tax, Category, Itemized list, Confidence notes.`;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imagePart = { inlineData: { data: cleanBase64, mimeType: mimeType || 'image/jpeg' } };

  const schema = {
    type: Type.OBJECT,
    properties: {
      vendor: { type: Type.STRING },
      date: { type: Type.STRING },
      totalAmount: { type: Type.NUMBER },
      taxAmount: { type: Type.NUMBER },
      category: { type: Type.STRING },
      items: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, price: { type: Type.NUMBER } } },
      },
      suggestedPayer: { type: Type.STRING },
      confidenceNotes: { type: Type.STRING },
    },
    required: ['vendor', 'date', 'totalAmount', 'category', 'items'],
  };

  return callWithRetry<AIScanReceipt>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts: [imagePart, { text: promptText }] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIScanReceipt;
    },
    { validate: validateReceipt, label: 'ReceiptScanner' },
  );
}

export async function getInsightsOffline(
  month: string,
  settings: AppSettings,
  getTransactions: (monthFilter?: string) => Transaction[],
  getBudgets: () => { category: string; monthlyLimit: number }[],
  getSummary: (monthFilter?: string) => { partnerATotalPaid: number; partnerBTotalPaid: number },
): Promise<AIInsightResponse> {
  const { ai } = getClient();
  const txs = getTransactions(month).filter((t) => t.type === 'EXPENSE');
  const budgets = getBudgets();
  const summary = getSummary(month);

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

  const prompt = `You are an empathetic, sharp household financial advisor for a couple (${settings.partnerA.name} and ${settings.partnerB.name}).
Analyze their spending ledger for month ${month}:

FINANCIAL LEDGER SUMMARY:
- Total Household Spent: ${totalSpent}
- ${settings.partnerA.name} Paid: ${summary.partnerATotalPaid}
- ${settings.partnerB.name} Paid: ${summary.partnerBTotalPaid}
- Category Breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}
- Budget vs Actuals: ${JSON.stringify(budgetComparisons, null, 2)}

TASK:
1. Executive Summary (2 sentences max).
2. 3-4 Key Insights (top spending driver). Do not talk about splitting or who owes whom.
3. Spending Anomalies or Over-budget warnings.
4. 3 Actionable Savings Tips.
5. Recommended budget tweaks if any category is severely over/under budget.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
      anomalies: { type: Type.ARRAY, items: { type: Type.STRING } },
      savingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestedBudgets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            suggestedLimit: { type: Type.NUMBER },
            reason: { type: Type.STRING },
          },
        },
      },
    },
    required: ['summary', 'keyInsights', 'anomalies', 'savingTips'],
  };

  return callWithRetry<AIInsightResponse>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIInsightResponse;
    },
    { validate: validateInsights, label: 'SpendingInsights' },
  );
}

export async function importSheetOffline(
  data: { fileBase64?: string; pastedText?: string },
  settings: AppSettings,
  parseFileToText: (base64: string) => string,
): Promise<AIParsedSheetResult> {
  const { ai } = getClient();
  const todayStr = new Date().toISOString().split('T')[0];
  let contentToAnalyze = pastedTextFromArgs(data, parseFileToText);

  if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
    throw new Error('Please upload an Excel/CSV file or paste spreadsheet rows.');
  }

  const partnerA = settings.partnerA;
  const partnerB = settings.partnerB;
  const currency = settings.currencySymbol || 'تومان';

  const prompt = `You are an expert financial spreadsheet analyzer fluent in PERSIAN (Farsi) and ENGLISH for a household budget shared between ${partnerA.name} [id: ${partnerA.id}] and ${partnerB.name} [id: ${partnerB.id}].

Examine the following raw spreadsheet / CSV tabular data and extract clean, standardized transaction records:

RAW SPREADSHEET INPUT:
"""
${contentToAnalyze.substring(0, 15000)}
"""

RULES:
1. Identify all valid transaction rows. Skip headers, totals, or empty rows.
2. Target currency: "${currency}". If Rials, divide by 10. Convert "هزار"/"میلیون".
3. Identify who paid: '${partnerA.id}' for "${partnerA.name}"/"حمید"; '${partnerB.id}' for "${partnerB.name}"/"فاطمه"/"Fati". Default '${partnerA.id}'.
4. Normalize Date: YYYY-MM-DD. Convert Jalali dates if present. Default: ${todayStr}.
5. Card-to-Card Transfers: type='TRANSFER', category='Internal Transfer'.
6. Categorize accurately.
7. Transaction Type: 'EXPENSE', 'INCOME', or 'TRANSFER'.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      detectedColumns: { type: Type.ARRAY, items: { type: Type.STRING } },
      totalRowsProcessed: { type: Type.NUMBER },
      currencyDetected: { type: Type.STRING },
      notes: { type: Type.STRING },
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, description: 'EXPENSE, INCOME, or TRANSFER' },
            category: { type: Type.STRING },
            paidBy: { type: Type.STRING, description: `'${partnerA.id}' or '${partnerB.id}'` },
            date: { type: Type.STRING, description: 'YYYY-MM-DD' },
            vendor: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ['title', 'amount', 'category', 'paidBy', 'date'],
        },
      },
    },
    required: ['detectedColumns', 'totalRowsProcessed', 'transactions'],
  };

  return callWithRetry<AIParsedSheetResult>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIParsedSheetResult;
    },
    { validate: validateSheet, label: 'SheetParser' },
  );
}

// Helper: extract text content from potential base64 file or pasted text.
function pastedTextFromArgs(
  data: { fileBase64?: string; pastedText?: string },
  parseFileToText: (base64: string) => string,
): string {
  let contentToAnalyze = data.pastedText || '';
  if (data.fileBase64) {
    try {
      contentToAnalyze = parseFileToText(data.fileBase64);
    } catch {
      const cleanB64 = data.fileBase64.replace(/^data:.*?;base64,/, '');
      try {
        contentToAnalyze = atob(cleanB64);
      } catch {
        // keep previous content
      }
    }
  }
  return contentToAnalyze;
}

export async function testApiKeyOffline(key: string): Promise<{
  success: boolean;
  message: string;
  sampleParsed: AIParsedVoice;
}> {
  const apiKey = (key || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) throw new Error('کلید API وارد نشده است.');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: 'Test connection: $10 coffee paid by Alex',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actionType: { type: Type.STRING },
          title: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          paidBy: { type: Type.STRING },
          date: { type: Type.STRING },
        },
        required: ['actionType', 'title', 'amount', 'category', 'paidBy', 'date'],
      },
    },
  });
  const sampleParsed = JSON.parse(response.text || '{}') as AIParsedVoice;
  return { success: true, message: 'Gemini API key verified successfully!', sampleParsed };
}
