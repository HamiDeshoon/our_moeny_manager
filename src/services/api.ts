import {
  AIInsightResponse,
  AIParsedSheetResult,
  AIParsedVoice,
  AIScanReceipt,
  AppSettings,
  AuthUser,
  Bill,
  Budget,
  MonthTrendData,
  RecurringExpense,
  HouseholdSummary,
  Transaction,
} from '../types';
import { offlineDb } from './offlineStore';
import {
  parseVoiceOffline,
  scanReceiptOffline,
  getInsightsOffline,
  importSheetOffline,
  testApiKeyOffline,
} from './offlineAI';

const API_BASE = '/api';

// Helper to retrieve custom API Key saved in LocalStorage if user set one in UI Settings
export function getSavedCustomApiKey(): string {
  try {
    return localStorage.getItem('duospend_gemini_key') || '';
  } catch {
    return '';
  }
}

export function saveCustomApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem('duospend_gemini_key', key);
    } else {
      localStorage.removeItem('duospend_gemini_key');
    }
  } catch (err) {
    console.error('Failed to save custom API key in localStorage:', err);
  }
}

/**
 * Detect whether we are running on static hosting (GitHub Pages) where there
 * is no backend. Once a backend call is confirmed unreachable (non-JSON HTML
 * response), we lock into offline mode for the session so we skip pointless
 * network round-trips that just return the SPA index.html.
 */
let offlineMode = false;

export function isOfflineMode(): boolean {
  return offlineMode;
}

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const customKey = getSavedCustomApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (customKey) {
    headers['x-gemini-key'] = customKey;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    // GitHub Pages returns the SPA index.html for /api/* routes — mark offline.
    offlineMode = true;
    throw new Error(
      `Server returned non-JSON response (${res.status}): ${text.slice(0, 80)}`,
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Request failed`);
  }
  // A successful JSON response means the backend is alive.
  offlineMode = false;
  return data as T;
}

/**
 * Try the backend first; on any failure (including the non-JSON HTML fallback
 * on GitHub Pages), fall back to the offline localStorage layer.
 */
async function withOfflineFallback<T>(
  onlineCall: () => Promise<T>,
  offlineCall: () => T | Promise<T>,
): Promise<T> {
  if (offlineMode) {
    return offlineCall();
  }
  try {
    return await onlineCall();
  } catch (err) {
    // non-JSON HTML or network failure → offline.
    offlineMode = true;
    console.warn('[api] Falling back to offline layer:', (err as Error).message);
    return offlineCall();
  }
}

// ──────────────────────────────────────────────
// In-browser xlsx → CSV text helper for offline import
// ──────────────────────────────────────────────

let xlsxLib: typeof import('xlsx') | null = null;
async function loadXlsx() {
  if (!xlsxLib) {
    xlsxLib = await import('xlsx');
  }
  return xlsxLib;
}

function fileBase64ToSheetText(base64: string): string {
  try {
    const cleanB64 = base64.replace(/^data:.*?;base64,/, '');
    // atob + binary string for xlsx
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // dynamic access via global (xlsx is a CJS lib)
    const wb = (window as any).__xlsx_readBuffer
      ? (window as any).__xlsx_readBuffer(bytes)
      : null;
    if (wb) return wb;
  } catch {
    /* noop */
  }
  try {
    const cleanB64 = base64.replace(/^data:.*?;base64,/, '');
    return atob(cleanB64);
  } catch {
    return '';
  }
}

// Synchronous variant using the loaded xlsx lib (called from offlineAI helper).
function fileBase64ToSheetTextSync(base64: string): string {
  let content = '';
  try {
    const cleanB64 = base64.replace(/^data:.*?;base64,/, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const XLSX = (window as any).__xlsxModule;
    if (XLSX) {
      const workbook = XLSX.read(bytes, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (firstSheet) {
        const sheet = workbook.Sheets[firstSheet];
        content = XLSX.utils.sheet_to_csv(sheet);
        return content;
      }
    }
    content = binary;
  } catch {
    // fall through
  }
  return content;
}

export const api = {
  // Settings
  getSettings: () =>
    withOfflineFallback(
      () => fetchJSON<AppSettings & { hasEnvKey: boolean; maskedKey: string; hasCustomKey: boolean }>('/settings'),
      () => offlineDb.getSettings(),
    ),
  updateSettings: (settings: Partial<AppSettings>) =>
    withOfflineFallback(
      () => fetchJSON<AppSettings>('/settings', { method: 'POST', body: JSON.stringify(settings) }),
      () => offlineDb.updateSettings(settings),
    ),
  testApiKey: (geminiApiKey?: string) =>
    withOfflineFallback(
      () =>
        fetchJSON<{ success: boolean; message: string; sampleParsed: any }>('/settings/test-key', {
          method: 'POST',
          body: JSON.stringify({ geminiApiKey }),
        }),
      async () => {
        const key = geminiApiKey || getSavedCustomApiKey();
        return testApiKeyOffline(key);
      },
    ),

  // Transactions
  getTransactions: (month?: string) =>
    withOfflineFallback(
      () => fetchJSON<Transaction[]>(`/transactions${month ? `?month=${month}` : ''}`),
      () => offlineDb.getTransactions(month),
    ),
  processRecurringTransactions: (month: string) =>
    withOfflineFallback(
      () =>
        fetchJSON<{ success: boolean; month: string; addedCount: number; added: Transaction[] }>(
          '/transactions/process-recurring',
          { method: 'POST', body: JSON.stringify({ month }) },
        ),
      () => offlineDb.processRecurringTransactions(month),
    ),
  batchAddTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) =>
    withOfflineFallback(
      () =>
        fetchJSON<{ success: boolean; count: number; created: Transaction[] }>('/transactions/batch', {
          method: 'POST',
          body: JSON.stringify({ transactions }),
        }),
      () => offlineDb.batchAddTransactions(transactions),
    ),
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) =>
    withOfflineFallback(
      () => fetchJSON<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(tx) }),
      () => offlineDb.addTransaction(tx),
    ),
  updateTransaction: (id: string, tx: Partial<Transaction>) =>
    withOfflineFallback(
      () => fetchJSON<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(tx) }),
      () => offlineDb.updateTransaction(id, tx) as Transaction,
    ),
  deleteTransaction: (id: string) =>
    withOfflineFallback(
      () => fetchJSON<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),
      () => offlineDb.deleteTransaction(id),
    ),

  // Settlements ("Who Paid / Who Owes")
  getHouseholdSummary: (month?: string) =>
    withOfflineFallback(
      () => fetchJSON<HouseholdSummary>(`/household/summary${month ? `?month=${month}` : ''}`),
      () => offlineDb.calculateHouseholdSummary(month),
    ),

  // Recurring Expenses
  getRecurringExpenses: () =>
    withOfflineFallback(
      () => fetchJSON<RecurringExpense[]>('/recurring-expenses'),
      () => offlineDb.getRecurringExpenses(),
    ),
  addRecurringExpense: (item: Omit<RecurringExpense, 'id'>) =>
    withOfflineFallback(
      () => fetchJSON<RecurringExpense>('/recurring-expenses', { method: 'POST', body: JSON.stringify(item) }),
      () => offlineDb.addRecurringExpense(item),
    ),
  toggleRecurringExpenseActive: (id: string, isActive: boolean) =>
    withOfflineFallback(
      () =>
        fetchJSON<RecurringExpense>(`/recurring-expenses/${id}/toggle-active`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive }),
        }),
      () => offlineDb.toggleRecurringExpenseActive(id, isActive) as RecurringExpense,
    ),
  deleteRecurringExpense: (id: string) =>
    withOfflineFallback(
      () => fetchJSON<{ success: boolean }>(`/recurring-expenses/${id}`, { method: 'DELETE' }),
      () => offlineDb.deleteRecurringExpense(id),
    ),

  // Budgets
  getBudgets: () =>
    withOfflineFallback(
      () => fetchJSON<Budget[]>('/budgets'),
      () => offlineDb.getBudgets(),
    ),
  updateBudgets: (budgets: Budget[]) =>
    withOfflineFallback(
      () => fetchJSON<Budget[]>('/budgets', { method: 'POST', body: JSON.stringify(budgets) }),
      () => offlineDb.updateBudgets(budgets),
    ),

  // Bills
  getBills: () =>
    withOfflineFallback(
      () => fetchJSON<Bill[]>('/bills'),
      () => offlineDb.getBills(),
    ),
  addBill: (bill: Omit<Bill, 'id'>) =>
    withOfflineFallback(
      () => fetchJSON<Bill>('/bills', { method: 'POST', body: JSON.stringify(bill) }),
      () => offlineDb.addBill(bill),
    ),
  toggleBillPaid: (id: string, isPaid: boolean) =>
    withOfflineFallback(
      () =>
        fetchJSON<Bill>(`/bills/${id}/toggle-paid`, { method: 'PATCH', body: JSON.stringify({ isPaid }) }),
      () => offlineDb.toggleBillPaid(id, isPaid) as Bill,
    ),
  deleteBill: (id: string) =>
    withOfflineFallback(
      () => fetchJSON<{ success: boolean }>(`/bills/${id}`, { method: 'DELETE' }),
      () => offlineDb.deleteBill(id),
    ),

  // Gemini AI Features — fall back to direct browser Gemini calls.
  parseVoice: (transcript: string) =>
    withOfflineFallback(
      () => fetchJSON<AIParsedVoice>('/ai/parse-voice', { method: 'POST', body: JSON.stringify({ transcript }) }),
      () => parseVoiceOffline(transcript, offlineDb.getSettings()),
    ),
  scanReceipt: (imageBase64: string, mimeType: string) =>
    withOfflineFallback(
      () =>
        fetchJSON<AIScanReceipt>('/ai/scan-receipt', {
          method: 'POST',
          body: JSON.stringify({ imageBase64, mimeType }),
        }),
      () => scanReceiptOffline(imageBase64, mimeType, offlineDb.getSettings()),
    ),
  getInsights: (month?: string) =>
    withOfflineFallback(
      () => fetchJSON<AIInsightResponse>(`/ai/insights${month ? `?month=${month}` : ''}`),
      () =>
        getInsightsOffline(
          month || '',
          offlineDb.getSettings(),
          (m) => offlineDb.getTransactions(m),
          () => offlineDb.getBudgets(),
          (m) => offlineDb.calculateHouseholdSummary(m),
        ),
    ),
  importSheet: (data: { fileBase64?: string; pastedText?: string }) =>
    withOfflineFallback(
      () =>
        fetchJSON<AIParsedSheetResult>('/ai/import-sheet', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      async () => {
        // Ensure xlsx lib (lazy) is available for the synchronous parsing helper.
        try {
          const XLSX = await loadXlsx();
          (window as any).__xlsxModule = XLSX;
        } catch {
          /* ignore — text fallback used */
        }
        return importSheetOffline(
          data,
          offlineDb.getSettings(),
          fileBase64ToSheetTextSync,
        );
      },
    ),

  // Auth
  login: (username: string, pass: string) =>
    withOfflineFallback(
      () =>
        fetchJSON<{ success: boolean; user: AuthUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password: pass }),
        }),
      () => offlineDb.login(username, pass),
    ),

  // Analytics Trends
  getThreeMonthTrends: (month?: string) =>
    withOfflineFallback(
      () => fetchJSON<MonthTrendData[]>(`/analytics/three-months${month ? `?month=${month}` : ''}`),
      () => offlineDb.getThreeMonthTrends(month),
    ),
};

// Exported for completeness (unused helpers can be shaken out by the bundler).
export { loadXlsx, fileBase64ToSheetText };
