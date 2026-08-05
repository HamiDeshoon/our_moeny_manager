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

const API_BASE = '/api';

export function getSavedCustomApiKey(): string {
  try {
    return localStorage.getItem('duospend_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  } catch {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
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

function getAuthUser(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('duospend_auth_user') || 'null');
    return user ? user.username : null;
  } catch {
    return null;
  }
}

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const customKey = getSavedCustomApiKey();
  const authUser = getAuthUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (customKey) {
    headers['x-gemini-key'] = customKey;
  }

  if (authUser) {
    headers['x-auth-user'] = authUser;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 80)}`);
  }

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      try {
        localStorage.removeItem('duospend_auth_user');
      } catch {
        // ignore storage failures
      }
    }
    throw new Error(data.error || `HTTP ${res.status}: Request failed`);
  }

  return data as T;
}

export const api = {
  // Settings
  getSettings: () =>
    fetchJSON<AppSettings & { hasEnvKey: boolean; maskedKey: string; hasCustomKey: boolean }>('/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    fetchJSON<AppSettings>('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  testApiKey: (geminiApiKey?: string) =>
    fetchJSON<{ success: boolean; message: string; sampleParsed: any }>('/settings/test-key', {
      method: 'POST',
      body: JSON.stringify({ geminiApiKey }),
    }),

  // Transactions
  getTransactions: (month?: string) =>
    fetchJSON<Transaction[]>(`/transactions${month ? `?month=${month}` : ''}`),
  processRecurringTransactions: (month: string) =>
    fetchJSON<{ success: boolean; month: string; addedCount: number; added: Transaction[] }>(
      '/transactions/process-recurring',
      { method: 'POST', body: JSON.stringify({ month }) },
    ),
  batchAddTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) =>
    fetchJSON<{ success: boolean; count: number; created: Transaction[] }>('/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    }),
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) =>
    fetchJSON<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(tx) }),
  updateTransaction: (id: string, tx: Partial<Transaction>) =>
    fetchJSON<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(tx) }),
  deleteTransaction: (id: string) =>
    fetchJSON<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  // Settlements ("Who Paid / Who Owes")
  getHouseholdSummary: (month?: string) =>
    fetchJSON<HouseholdSummary>(`/household/summary${month ? `?month=${month}` : ''}`),

  // Recurring Expenses
  getRecurringExpenses: () => fetchJSON<RecurringExpense[]>('/recurring-expenses'),
  addRecurringExpense: (item: Omit<RecurringExpense, 'id'>) =>
    fetchJSON<RecurringExpense>('/recurring-expenses', { method: 'POST', body: JSON.stringify(item) }),
  toggleRecurringExpenseActive: (id: string, isActive: boolean) =>
    fetchJSON<RecurringExpense>(`/recurring-expenses/${id}/toggle-active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  deleteRecurringExpense: (id: string) =>
    fetchJSON<{ success: boolean }>(`/recurring-expenses/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: () => fetchJSON<Budget[]>('/budgets'),
  updateBudgets: (budgets: Budget[]) =>
    fetchJSON<Budget[]>('/budgets', { method: 'POST', body: JSON.stringify(budgets) }),

  // Bills
  getBills: () => fetchJSON<Bill[]>('/bills'),
  addBill: (bill: Omit<Bill, 'id'>) =>
    fetchJSON<Bill>('/bills', { method: 'POST', body: JSON.stringify(bill) }),
  toggleBillPaid: (id: string, isPaid: boolean) =>
    fetchJSON<Bill>(`/bills/${id}/toggle-paid`, { method: 'PATCH', body: JSON.stringify({ isPaid }) }),
  deleteBill: (id: string) =>
    fetchJSON<{ success: boolean }>(`/bills/${id}`, { method: 'DELETE' }),

  // Gemini AI Features
  parseVoice: (input: string | { audioBase64: string; mimeType: string }) =>
    fetchJSON<AIParsedVoice>('/ai/parse-voice', {
      method: 'POST',
      body: JSON.stringify(typeof input === 'string' ? { transcript: input } : input),
    }),
  scanReceipt: (imageBase64: string, mimeType: string) =>
    fetchJSON<AIScanReceipt>('/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    }),
  getInsights: (month?: string) =>
    fetchJSON<AIInsightResponse>(`/ai/insights${month ? `?month=${month}` : ''}`),
  importSheet: (data: { fileBase64?: string; pastedText?: string }) =>
    fetchJSON<AIParsedSheetResult>('/ai/import-sheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auth
  login: (username: string, pass: string) =>
    fetchJSON<{ success: boolean; user: AuthUser }>('/auth/login', {
      method: 'POST',
      headers: { 'x-auth-user': username },
      body: JSON.stringify({ username, password: pass }),
    }),

  // Analytics Trends
  getThreeMonthTrends: (month?: string) =>
    fetchJSON<MonthTrendData[]>(`/analytics/three-months${month ? `?month=${month}` : ''}`),
};
