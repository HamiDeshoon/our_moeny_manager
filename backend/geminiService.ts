import { GoogleGenAI, Type } from '@google/genai';
import { AIParsedVoice, AIScanReceipt, AIInsightResponse, AIParsedSheetResult } from '../src/types.js';

function getGeminiClient(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY environment variable or enter your key in Settings.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Normalizes Persian/Arabic digits to standard ASCII digits
 * and expands Persian words like "هزار" (thousand -> *1000) and "میلیون" (million -> *1000000).
 */
function normalizePersianInput(input: string): string {
  if (!input) return '';
  let str = input;
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  for (let i = 0; i < 10; i++) {
    str = str.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    str = str.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }

  // Handle Persian number terms in transcript text
  str = str.replace(/(\d+)\s*هزار/g, (_, num) => `${parseInt(num, 10) * 1000}`);
  str = str.replace(/(\d+)\s*میلیون/g, (_, num) => `${parseInt(num, 10) * 1000000}`);

  return str;
}

/**
 * Parses natural language voice memos or text transcripts in Farsi/Persian or English into structured expense data.
 * Examples:
 * - "حمید ۲۵۰ هزار تومان خرج سوپرمارکت کرد ۵۰ ۵۰"
 * - "فاطمه ۱۲ میلیون تومان بابت اجاره داد"
 * - "I spent 540,000 Toman on Hyperstar groceries today paid by Hamid split 50/50"
 */
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
You are an intelligent household expense parser fluent in both PERSIAN (Farsi) and ENGLISH for a couple (${partnerA.name} [id: ${partnerA.id}] and ${partnerB.name} [id: ${partnerB.id}]).
Parse the following voice memo or text note into a structured transaction object:

ORIGINAL INPUT: "${transcript}"
CLEANED TRANSCRIPT: "${cleanedTranscript}"

CONTEXT:
- Today's date is: ${todayStr}
- Target Currency: "${currencySymbol}"
- Partner A: ${partnerA.name} / "حمید" / "Hamid" (id: ${partnerA.id})
- Partner B: ${partnerB.name} / "فاطمه" / "Fatemeh" (id: ${partnerB.id})

FARSI / ENGLISH MATCHING RULES:
- Identify who paid:
  - Match '${partnerA.id}' if transcript mentions "${partnerA.name}", "حمید", "Hamid", "پسر", "من" (if spoken by Hamid).
  - Match '${partnerB.id}' if transcript mentions "${partnerB.name}", "فاطمه", "Fatemeh", "خانم".
  - Default to '${partnerA.id}' if unspecified.

- Amount & Currency Rules:
  - Extract the total monetary amount in Target Currency: "${currencySymbol}".
  - PERSIAN VERBAL CONVERSIONS:
    * "هزار" means 1,000 (e.g. "۲۵۰ هزار تومان" = 250000).
    * "میلیون" means 1,000,000 (e.g. "12 میلیون تومان" = 12000000).
  - RIALS TO TOMANS CONVERSION RULE:
    * If spoken or written in Rials (ریال), convert to Tomans by DIVIDING BY 10 (strip 1 trailing zero). (e.g. "1,000,000 ریال" = 100,000 تومان).
    * ALWAYS strip 1 zero when converting Rials to Tomans.

- Date:
  - YYYY-MM-DD. Use today (${todayStr}) if "امروز", "today", or unspecified. "دیروز" / "yesterday" = 1 day before.

- Category Selection (Map Farsi/English terms):
  - "Groceries" (سوپرمارکت، خریدهای خانه، میوه، هایپراستار، افق کوروش، مواد غذایی)
  - "Dining & Takeout" (رستوران، کافه، شام، ناهار، فست فود، پیتزا)
  - "Rent & Mortgage" (اجاره، رهن، مسکن، اجاره خانه)
  - "Utilities & Internet" (قبوض، برق، آب، گاز، اینترنت، شاتل، همراه اول، ایرانسل)
  - "Household & Supplies" (وسایل خانه، لوازم شوینده، دیجی کالا)
  - "Entertainment & Subscriptions" (سینما، کتاب، فیلیمو، تفریح، بازی)
  - "Travel & Transport" (اسنپ، تپسی، بنزین، تاکسی، سفر، ماشین)
  - "Healthcare & Wellness" (داروخانه، دکتر، درمان، آزمایشگاه)
  - "Shopping & Personal" (لباس، پوشاک، خرید شخصی)
  - "Income & Salary" (حقوق، درآمد، واریز)
  - "Internal Transfer" (کارت به کارت، جابجایی کارت، انتقال به فاطمه، انتقال به حمید، شارژ کارت)
  - "Other" (سایر)

- Card-to-Card Transfer Rule:
  - If the input describes a card-to-card transfer or money transfer between cards/accounts (e.g. "کارت به کارت کردم", "واریز به کارت", "انتقال دادم"), set category to "Internal Transfer" . This is NOT household spending!

- Split Type:
  - Default to PAYER_ALL (unless "دونگی", "۵۰ ۵۰", "نصف نصف", "equal", "shared" is explicitly mentioned). Do NOT split money in half by default!

Output valid JSON matching the schema.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Descriptive title of the expense (in English or Farsi as appropriate)' },
          amount: { type: Type.NUMBER, description: 'Total numeric monetary amount' },
          category: { type: Type.STRING, description: 'Matching category name from list' },
          paidBy: { type: Type.STRING, description: `'${partnerA.id}' or '${partnerB.id}'` },
          date: { type: Type.STRING, description: 'YYYY-MM-DD date' },
          vendor: { type: Type.STRING, description: 'Vendor, store or service name' },
          confidenceNotes: { type: Type.STRING, description: 'Brief note on deduction' },
        },
        required: ['title', 'amount', 'category', 'paidBy', 'date'],
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text) as AIParsedVoice;
}

/**
 * Scans a receipt image using Gemini Vision to extract vendor, date, line items, tax, and category.
 */
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

CRITICAL IRANIAN CURRENCY CONVERSION RULES (MUST FOLLOW STRICTLY!):
1. Receipts printed by bank card POS terminals (کارتخوان), payment slips, and official store invoices in Iran ALWAYS print totals in IRANIAN RIALS (ریال / IRR) (e.g. "1,000,000 ریال", "1/000/000 Rials", or "1000000").
2. When Target App Currency is Toman (تومان / IRT):
   - To convert Rials (ریال) printed on the receipt into Tomans (تومان) for totalAmount:
     STRIP EXACTLY ONE TRAILING ZERO from the Rial amount (DIVIDE BY 10).
   - ACCURATE RIAL ➔ TOMAN CONVERSION EXAMPLES:
     * 1,000,000 Rials (ریال) ➔ 100,000 Tomans (تومان) [1000000 / 10 = 100000]
     * 2,500,000 Rials (ریال) ➔ 250,000 Tomans (تومان) [2500000 / 10 = 250000]
     * 500,000 Rials (ریال)   ➔ 50,000 Tomans (تومان)  [500000 / 10 = 50000]
     * 10,000,000 Rials (ریال) ➔ 1,000,000 Tomans (تومان) [10000000 / 10 = 1000000]
   - STRICT PROHIBITIONS:
     * DO NOT strip 3 zeros! You must divide by 10 (strip 1 zero).
     * If the receipt explicitly states "هزار تومان", multiply by 1000. If it says "تومان", use the exact printed number.
     * If the receipt is a standard POS slip (کارتخوان) in Rials or says "ریال", divide by 10.

Extract:
1. Vendor / Merchant name
2. Date on receipt in YYYY-MM-DD (if missing, use ${todayStr})
3. Total final monetary amount (converted accurately to Target Currency: ${currencySymbol})
4. Tax amount (if shown, converted to Target Currency)
5. Category (Groceries, Dining & Takeout, Utilities & Internet, Household & Supplies, Entertainment & Subscriptions, Travel & Transport, Healthcare & Wellness, Shopping & Personal, Other)
6. Itemized list of purchased items (item name and price in Target Currency)
7. Brief confidence notes detailing detected receipt currency (Rials vs Tomans) and conversion math used
`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || 'image/jpeg',
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: {
      parts: [imagePart, { text: promptText }],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
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
              properties: {
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
              },
            },
          },
          confidenceNotes: { type: Type.STRING },
        },
        required: ['vendor', 'date', 'totalAmount', 'category', 'items'],
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text) as AIScanReceipt;
}

/**
 * Analyzes household database ledger summary to generate tailored AI financial insights for couples.
 */
export async function analyzeSpendingInsights(
  ledgerData: {
    month: string;
    partnerAName: string;
    partnerBName: string;
    totalSpent: number;
    partnerAPaid: number;
    partnerBPaid: number;    categoryBreakdown: Record<string, number>;
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
Provide high-value financial analysis for the couple (${ledgerData.partnerAName} & ${ledgerData.partnerBName}):
1. Executive Summary (2 sentences max).
2. 3-4 Key Insights (e.g. top spending driver, month-to-month trends). Do not talk about splitting or who owes whom.
3. Any Spending Anomalies or Over-budget warnings.
4. 3 Actionable Savings Tips specifically for this couple's spending habits.
5. Recommended budget tweaks if any category is severely over/under budget.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
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
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text) as AIInsightResponse;
}

/**
 * Uses Gemini AI to intelligently process, parse, convert currency, and standardize raw tabular spreadsheet data (Excel / CSV / Google Sheets text).
 */
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

Examine the following raw spreadsheet / CSV tabular data and extract clean, standardized transaction records for auto-importing into the household ledger:

RAW SPREADSHEET INPUT:
"""
${tabularText.substring(0, 15000)}
"""

RULES & GUIDELINES:
1. Identify all valid transaction rows. Skip headers, totals, or empty summary rows.
2. Determine target currency: "${currencySymbol}".
   - CRITICAL RIAL TO TOMAN CONVERSION RULE:
     * Iranian spreadsheets often record amounts in Rials (ریال), which adds extra zeros (e.g., 12,000,000 Rials).
     * Since the target currency is Tomans (تومان), IF input values are in Rials or end in an extra trailing zero, DIVIDE BY 10 to output clean TOMANS (e.g., 1,200,000 Rials -> 120,000 Tomans).
     * If numbers contain Farsi/Arabic digits or terms like "هزار" (x1000) or "میلیون" (x1000000), convert to full numeric amounts in Tomans.
3. Identify who paid:
   - Match '${partnerA.id}' if column/cell mentions "${partnerA.name}", "سیدحمید", "حمید", "Hamid", "عقل مندصرمی", "من" (if Hamid).
   - Match '${partnerB.id}' if column/cell mentions "${partnerB.name}", "فاطمه", "فاطی", "Fatemeh", "Fati", "نیک سرشت", "خانم".
   - Default to '${partnerA.id}' if unspecified or unclear.
4. Normalize Date: YYYY-MM-DD. Convert Jalali dates (e.g. 1405/05/01) or standard dates if present. If date is missing, use ${todayStr}.
5. Identify Card-to-Card Transfers & Internal Moves:
   - If a row represents a transfer between cards/accounts or between Hamid and Fati (e.g. "کارت به کارت", "انتقال", "شارژ کارت", "واریز به کارت", "جابجایی حساب", "transfer", "c2c"):
     Set 'type' to 'TRANSFER', 'category' to 'Internal Transfer', .
     Transfers are budget management moves between cards, NOT household spending!
6. Categorize accurately for standard expenses:
   - "Groceries" (سوپرمارکت، خریدهای خانه، میوه، هایپراستار، میوه فروشی)
   - "Dining & Takeout" (رستوران، کافه، غذا، فست فود، پیتزا)
   - "Rent & Mortgage" (اجاره، رهن، مسکن)
   - "Utilities & Internet" (قبوض، برق، آب، گاز، اینترنت، شاتل، همراه اول)
   - "Household & Supplies" (وسایل خانه، لوازم شوینده)
   - "Entertainment & Subscriptions" (تفریح، فیلیمو، سینما)
   - "Travel & Transport" (اسنپ، بنزین، تاکسی، خودرو)
   - "Healthcare & Wellness" (داروخانه، درمان، پزشک)
   - "Shopping & Personal" (لباس، خرید)
   - "Income & Salary" (حقوق، درآمد، واریز)
   - "Internal Transfer" (کارت به کارت، جابجایی)
   - "Other" (سایر)
7. Transaction Type: 'EXPENSE', 'INCOME', or 'TRANSFER'.
   - 'TRANSFER' for card-to-card/internal transfers.
   - 'INCOME' for salary/income.
   - 'EXPENSE' for standard spending.
8. Split Type: DO NOT default to splitting money in half!
Provide structured JSON output matching the schema.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
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
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text) as AIParsedSheetResult;
}

