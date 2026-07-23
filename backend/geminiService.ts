import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db.js';
import { AIParsedVoice, AIScanReceipt, AIInsightResponse, AIParsedSheetResult } from '../src/types.js';

const MODEL = 'gemini-3.5-flash-lite';

// ──────────────────────────────────────────────
// Gemini Client Factory
// ──────────────────────────────────────────────

function getGeminiClient(customKey?: string) {
  const settingsKey = db.getSettings()?.geminiApiKey;
  const rawKey = (customKey && customKey.trim()) || (settingsKey && settingsKey.trim()) || process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    throw new Error(
      'کلید API جمینای تنظیم نشده است. لطفا کلید خود را در قسمت تنظیمات (Settings) وارد کرده و ذخیره کنید.'
    );
  }

  if (!apiKey.startsWith('AIzaSy')) {
    throw new Error(
      'فرمت کلید API اشتباه است. کلید معتبر Gemini API همیشه با عبارت "AIzaSy" شروع می‌شود (توکن‌های session مرورگر یا OAuth قابل استفاده نیستند). لطفاً کلید جدید را از aistudio.google.com/app/apikey دریافت کنید.'
    );
  }

  return new GoogleGenAI({ apiKey });
}

// ──────────────────────────────────────────────
// Persian/Arabic Digit Normalization
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
// Eval/Retry Loop — Core AI Call Engine
// ──────────────────────────────────────────────

interface RetryOptions<T> {
  /** Max number of attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms between retries (doubles each attempt) */
  baseDelayMs?: number;
  /** Validates parsed response; returns reason string if invalid, null if valid */
  validate?: (data: T) => string | null;
  /** Label for logging */
  label?: string;
}

/**
 * Calls a Gemini AI function with automatic retry + response validation.
 *
 * Flow per attempt:
 *   1. Execute the AI call
 *   2. Parse JSON response
 *   3. Run validator on parsed data
 *   4. If invalid → log reason, wait (exponential backoff), retry
 *   5. After maxRetries exhausted → return best result or throw
 */
async function callGeminiWithRetry<T>(
  callFn: () => Promise<T>,
  options: RetryOptions<T> = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 800, validate, label = 'Gemini' } = options;

  let lastError: Error | null = null;
  let bestResult: T | null = null;
  let bestValidationReason: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await callFn();

      // If no validator, accept immediately
      if (!validate) return result;

      const reason = validate(result);
      if (!reason) return result; // Valid — return immediately

      // Invalid but we have a result — store as fallback
      console.warn(
        `[${label}] Attempt ${attempt}/${maxRetries} — validation failed: ${reason}`
      );
      bestResult = result;
      bestValidationReason = reason;
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || '';
      console.error(
        `[${label}] Attempt ${attempt}/${maxRetries} — error: ${errMsg}`
      );
      if (
        errMsg.includes('403') ||
        errMsg.includes('401') ||
        errMsg.includes('API key') ||
        errMsg.includes('Forbidden') ||
        errMsg.includes('UNAUTHENTICATED') ||
        errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')
      ) {
        throw new Error(
          'کلید API معتبر نیست (ارور ۴۰۱/۴۰۳). کلید معتبر Gemini همیشه با "AIzaSy" شروع می‌شود. لطفاً از لینک aistudio.google.com/app/apikey کلید جدید دریافت کرده و در تنظیمات وارد کنید.'
        );
      }
    }

    // Exponential backoff before retry (skip delay on last attempt)
    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted — return best partial result if we have one
  if (bestResult) {
    console.warn(
      `[${label}] Returning best-effort result after ${maxRetries} attempts (${bestValidationReason})`
    );
    return bestResult;
  }

  throw lastError || new Error(`[${label}] All ${maxRetries} attempts failed`);
}

// ──────────────────────────────────────────────
// Response Validators
// ──────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Groceries', 'Dining & Takeout', 'Rent & Mortgage', 'Utilities & Internet',
  'Household & Supplies', 'Entertainment & Subscriptions', 'Travel & Transport',
  'Healthcare & Wellness', 'Shopping & Personal', 'Income & Salary',
  'Internal Transfer', 'Other',
];

function validateVoiceResult(data: AIParsedVoice): string | null {
  if (data.actionType === 'SET_BUDGET') {
    if (!data.category) return 'Missing category for SET_BUDGET';
    if (!data.monthlyLimit || data.monthlyLimit <= 0) return `Invalid monthlyLimit: ${data.monthlyLimit}`;
    return null;
  }
  if (data.actionType === 'ADD_RECURRING') {
    if (!data.title || data.title.trim().length === 0) return 'Missing title for ADD_RECURRING';
    if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
    return null;
  }
  if (data.actionType === 'ADD_BILL') {
    if (!data.title || data.title.trim().length === 0) return 'Missing title for ADD_BILL';
    if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
    return null;
  }
  if (!data.title || data.title.trim().length === 0) return 'Missing title';
  if (!data.amount || data.amount <= 0) return `Invalid amount: ${data.amount}`;
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return `Invalid date: ${data.date}`;
  if (!data.paidBy) return 'Missing paidBy';
  if (!data.category) return 'Missing category';
  return null;
}

function validateReceiptResult(data: AIScanReceipt): string | null {
  if (!data.vendor || data.vendor.trim().length === 0) return 'Missing vendor';
  if (!data.totalAmount || data.totalAmount <= 0) return `Invalid totalAmount: ${data.totalAmount}`;
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return `Invalid date: ${data.date}`;
  if (!data.category) return 'Missing category';
  return null;
}

function validateInsightsResult(data: AIInsightResponse): string | null {
  if (!data.summary || data.summary.trim().length < 10) return 'Summary too short or missing';
  if (!data.keyInsights || data.keyInsights.length === 0) return 'No key insights returned';
  if (!data.savingTips || data.savingTips.length === 0) return 'No saving tips returned';
  return null;
}

function validateSheetResult(data: AIParsedSheetResult): string | null {
  if (!data.transactions || data.transactions.length === 0) return 'No transactions parsed';
  const invalidTx = data.transactions.find((t) => !t.title || !t.amount || t.amount <= 0);
  if (invalidTx) return `Transaction with invalid title/amount: ${JSON.stringify(invalidTx)}`;
  return null;
}

// ──────────────────────────────────────────────
// Voice Memo Parser
// ──────────────────────────────────────────────

export async function parseVoiceMemo(
  transcript: string,
  partnerA: { id: string; name: string },
  partnerB: { id: string; name: string },
  currencySymbol: string = 'تومان',
  customKey?: string
): Promise<AIParsedVoice> {
  const ai = getGeminiClient(customKey);
  const todayStr = new Date().toISOString().split('T')[0];
  const cleanedTranscript = normalizePersianInput(transcript);

  const prompt = `
You are an intelligent household expense & budget assistant fluent in both PERSIAN (Farsi) and ENGLISH for a couple (${partnerA.name} [id: ${partnerA.id}] and ${partnerB.name} [id: ${partnerB.id}]).
Analyze the input memo and detect the user's INTENTION (actionType):

ORIGINAL INPUT: "${transcript}"
CLEANED TRANSCRIPT: "${cleanedTranscript}"

CONTEXT:
- Today's date is: ${todayStr}
- Target Currency: "${currencySymbol}"
- Partner A: ${partnerA.name} / "حمید" / "Hamid" (id: ${partnerA.id})
- Partner B: ${partnerB.name} / "فاطمه" / "Fatemeh" (id: ${partnerB.id})

INTENT CLASSIFICATION RULES (actionType):
1. 'LOG_EXPENSE': One-off transaction entry (e.g. "حمید ۳۵۰ هزار تومان خرید کرد").
2. 'SET_BUDGET': User wants to change or set a monthly budget limit (e.g. "بودجه سوپرمارکت رو کن ۱۰ میلیون تومان", "set groceries budget to 500").
3. 'ADD_RECURRING': User wants to set up a regular recurring expense rule (e.g. "هر ماه ۱۵ میلیون اجاره اضافه کن", "recurring rent 1000 every month").
4. 'ADD_BILL': User wants to add a monthly recurring bill reminder (e.g. "قبض اینترنت ماهانه سی‌ام ۲۰۰ هزار تومان", "add internet bill due 25th").

FARSI / ENGLISH MATCHING RULES:
- Identify who paid:
  - Match '${partnerA.id}' if transcript mentions "${partnerA.name}", "حمید", "Hamid", "پسر", "من".
  - Match '${partnerB.id}' if transcript mentions "${partnerB.name}", "فاطمه", "Fatemeh", "خانم".
  - Default to '${partnerA.id}' if unspecified.

- Amount & Currency Rules:
  - Extract numeric monetary amount in Target Currency "${currencySymbol}".
  - PERSIAN VERBAL CONVERSIONS: "هزار" = 1,000 | "میلیون" = 1,000,000.
  - If in Rials (ریال), convert to Tomans by DIVIDING BY 10.

- Categories:
  Groceries, Dining & Takeout, Rent & Mortgage, Utilities & Internet, Household & Supplies,
  Entertainment & Subscriptions, Travel & Transport, Healthcare & Wellness, Shopping & Personal,
  Income & Salary, Internal Transfer, Other.

Output valid JSON matching the schema.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      actionType: {
        type: Type.STRING,
        description: 'LOG_EXPENSE, SET_BUDGET, ADD_RECURRING, or ADD_BILL',
      },
      title: { type: Type.STRING, description: 'Descriptive title' },
      amount: { type: Type.NUMBER, description: 'Total numeric monetary amount' },
      category: { type: Type.STRING, description: 'Category name' },
      paidBy: { type: Type.STRING, description: `'${partnerA.id}' or '${partnerB.id}'` },
      date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
      vendor: { type: Type.STRING, description: 'Vendor name' },
      confidenceNotes: { type: Type.STRING, description: 'Brief note on detection' },
      monthlyLimit: { type: Type.NUMBER, description: 'Target budget limit if actionType is SET_BUDGET' },
      interval: { type: Type.STRING, description: 'MONTHLY, BI_MONTHLY, QUARTERLY, or YEARLY if actionType is ADD_RECURRING' },
      dueDateDay: { type: Type.NUMBER, description: 'Day of month (1-31) if actionType is ADD_BILL' },
      autopay: { type: Type.BOOLEAN, description: 'True if bill is on autopay' },
    },
    required: ['actionType', 'title', 'amount', 'category', 'paidBy', 'date'],
  };

  return callGeminiWithRetry<AIParsedVoice>(
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
    { validate: validateVoiceResult, label: 'VoiceParser', maxRetries: 3 }
  );
}

// ──────────────────────────────────────────────
// Receipt Image Scanner (Gemini Vision)
// ──────────────────────────────────────────────

export async function scanReceiptImage(
  base64Data: string,
  mimeType: string,
  partnerAName: string,
  partnerBName: string,
  currencySymbol: string = 'تومان',
  customKey?: string
): Promise<AIScanReceipt> {
  const ai = getGeminiClient(customKey);
  const todayStr = new Date().toISOString().split('T')[0];

  const promptText = `
You are an expert OCR and financial document analyzer specialized in reading receipts, invoices, and Iranian bank card reader slips (کارتخوان / فاکتور خرید).
Analyze this receipt or invoice image and extract structured expense details for a household budget shared between ${partnerAName} and ${partnerBName}.

Target App Currency: "${currencySymbol}"
Today's reference date is: ${todayStr}.

CRITICAL IRANIAN CURRENCY CONVERSION RULES:
1. Receipts from bank card POS terminals in Iran print totals in IRANIAN RIALS (ریال).
2. When Target Currency is Toman (تومان): DIVIDE Rial amounts BY 10 to get Tomans.
   - 1,000,000 Rials → 100,000 Tomans
   - 2,500,000 Rials → 250,000 Tomans
   - DO NOT strip 3 zeros! Divide by 10 only.

Extract:
1. Vendor / Merchant name
2. Date on receipt in YYYY-MM-DD (if missing, use ${todayStr})
3. Total final amount (converted to Target Currency)
4. Tax amount (if shown, in Target Currency)
5. Category (Groceries, Dining & Takeout, Utilities & Internet, etc.)
6. Itemized list of purchased items with prices
7. Brief confidence notes about detected currency and conversion
`;

  const imagePart = {
    inlineData: { data: base64Data, mimeType: mimeType || 'image/jpeg' },
  };

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
        items: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING }, price: { type: Type.NUMBER } },
        },
      },
      confidenceNotes: { type: Type.STRING },
    },
    required: ['vendor', 'date', 'totalAmount', 'category', 'items'],
  };

  return callGeminiWithRetry<AIScanReceipt>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: { parts: [imagePart, { text: promptText }] },
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIScanReceipt;
    },
    { validate: validateReceiptResult, label: 'ReceiptScanner', maxRetries: 3 }
  );
}

// ──────────────────────────────────────────────
// AI Financial Insights Analyzer
// ──────────────────────────────────────────────

export async function analyzeSpendingInsights(
  ledgerData: {
    month: string;
    partnerAName: string;
    partnerBName: string;
    totalSpent: number;
    partnerAPaid: number;
    partnerBPaid: number;
    categoryBreakdown: Record<string, number>;
    budgetComparisons: Array<{ category: string; spent: number; limit: number; pct: number }>;
  },
  customKey?: string
): Promise<AIInsightResponse> {
  const ai = getGeminiClient(customKey);

  const prompt = `
You are an empathetic, sharp household financial advisor for a couple (${ledgerData.partnerAName} and ${ledgerData.partnerBName}).
Analyze their spending ledger for month ${ledgerData.month}:

FINANCIAL LEDGER SUMMARY:
- Total Household Spent: ${ledgerData.totalSpent}
- ${ledgerData.partnerAName} Paid: ${ledgerData.partnerAPaid}
- ${ledgerData.partnerBName} Paid: ${ledgerData.partnerBPaid}
- Category Breakdown: ${JSON.stringify(ledgerData.categoryBreakdown, null, 2)}
- Budget vs Actuals: ${JSON.stringify(ledgerData.budgetComparisons, null, 2)}

TASK:
1. Executive Summary (2 sentences max).
2. 3-4 Key Insights (e.g. top spending driver). Do not talk about splitting or who owes whom.
3. Any Spending Anomalies or Over-budget warnings.
4. 3 Actionable Savings Tips for this couple's habits.
5. Recommended budget tweaks if any category is severely over/under budget.
`;

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

  return callGeminiWithRetry<AIInsightResponse>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIInsightResponse;
    },
    { validate: validateInsightsResult, label: 'SpendingInsights', maxRetries: 3 }
  );
}

// ──────────────────────────────────────────────
// Excel / Sheet AI Parser
// ──────────────────────────────────────────────

export async function parseExcelOrSheetWithGemini(
  tabularText: string,
  partnerA: { id: string; name: string },
  partnerB: { id: string; name: string },
  currencySymbol: string = 'تومان',
  customKey?: string
): Promise<AIParsedSheetResult> {
  const ai = getGeminiClient(customKey);
  const todayStr = new Date().toISOString().split('T')[0];

  const prompt = `
You are an expert financial spreadsheet analyzer fluent in PERSIAN (Farsi) and ENGLISH for a household budget shared between ${partnerA.name} [id: ${partnerA.id}] and ${partnerB.name} [id: ${partnerB.id}].

Examine the following raw spreadsheet / CSV tabular data and extract clean, standardized transaction records:

RAW SPREADSHEET INPUT:
"""
${tabularText.substring(0, 15000)}
"""

RULES:
1. Identify all valid transaction rows. Skip headers, totals, or empty rows.
2. Target currency: "${currencySymbol}".
   - If input values are in Rials, DIVIDE BY 10 to output Tomans.
   - Convert Farsi/Arabic digits and terms like "هزار" (x1000) or "میلیون" (x1000000).
3. Identify who paid:
   - Match '${partnerA.id}' for "${partnerA.name}", "حمید", "Hamid".
   - Match '${partnerB.id}' for "${partnerB.name}", "فاطمه", "Fatemeh", "Fati".
   - Default to '${partnerA.id}' if unclear.
4. Normalize Date: YYYY-MM-DD. Convert Jalali dates if present. Default: ${todayStr}.
5. Card-to-Card Transfers: Set type='TRANSFER', category='Internal Transfer'.
6. Categorize accurately using standard categories.
7. Transaction Type: 'EXPENSE', 'INCOME', or 'TRANSFER'.
`;

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

  return callGeminiWithRetry<AIParsedSheetResult>(
    async () => {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema },
      });
      return JSON.parse(response.text || '{}') as AIParsedSheetResult;
    },
    { validate: validateSheetResult, label: 'SheetParser', maxRetries: 3 }
  );
}
