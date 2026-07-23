/**
 * localStorage-backed offline data layer.
 *
 * Mirrors the shape of `backend/db.ts` DatabaseStore and replicates the behavior
 * of `backend/routes.ts` so the app works full-featured on static hosting
 * (GitHub Pages) without a backend server.
 *
 * Design goals:
 *  - Identical APIs to the REST backend so `api.ts` can fall back transparently.
 *  - Persisted across reloads in localStorage under a single store key.
 *  - Seeds with the same default data as the backend on first run.
 *  - Replicates auth credentials (hamid/19981998, fati/13771377).
 *  - Replicates recurring-expense auto-processing & 3-month trend logic.
 */

import {
  AppSettings,
  AuthUser,
  Bill,
  Budget,
  HouseholdSummary,
  MonthTrendData,
  RecurringExpense,
  Transaction,
} from '../types';

const STORAGE_KEY = 'duospend_offline_store_v1';

interface OfflineStore {
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  recurringExpenses: RecurringExpense[];
}

// ──────────────────────────────────────────────
// Default Data (mirrors backend/db.ts)
// ──────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: {
    id: 'partner_a',
    name: 'سیدحمید عقل مندصرمی',
    avatar: '👨‍💼',
    color: '#0284c7',
  },
  partnerB: {
    id: 'partner_b',
    name: 'فاطمه نیک سرشت',
    avatar: '👩‍⚕️',
    color: '#16a34a',
  },
  isRtl: true,
  useJalaliDate: true,
};

const getCurrentMonthStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const DEFAULT_BUDGETS: Budget[] = [
  { category: 'Groceries', monthlyLimit: 15000000 },
  { category: 'Dining & Takeout', monthlyLimit: 6000000 },
  { category: 'Rent & Mortgage', monthlyLimit: 35000000 },
  { category: 'Utilities & Internet', monthlyLimit: 2500000 },
  { category: 'Entertainment & Subscriptions', monthlyLimit: 3000000 },
  { category: 'Travel & Transport', monthlyLimit: 4000000 },
  { category: 'Household & Supplies', monthlyLimit: 5000000 },
  { category: 'Shopping & Personal', monthlyLimit: 7000000 },
  { category: 'Healthcare & Wellness', monthlyLimit: 4000000 },
];

const DEFAULT_BILLS: Bill[] = [
  {
    id: 'bill-1',
    title: 'Apartment Rent (اجاره مسکن)',
    amount: 35000000,
    category: 'Rent & Mortgage',
    paidBy: 'partner_a',
    dueDateDay: 1,
    isPaidThisMonth: true,
    autopay: true,
    provider: 'Home Landlord',
  },
  {
    id: 'bill-2',
    title: 'Electric & Gas Bill (قبوض آب، برق و گاز)',
    amount: 450000,
    category: 'Utilities & Internet',
    paidBy: 'partner_b',
    dueDateDay: 15,
    isPaidThisMonth: true,
    autopay: false,
    provider: 'City Power & Gas',
  },
  {
    id: 'bill-3',
    title: 'High-Speed Fibre Internet (اینترنت پرسرعت)',
    amount: 380000,
    category: 'Utilities & Internet',
    paidBy: 'partner_a',
    dueDateDay: 20,
    isPaidThisMonth: false,
    autopay: true,
    provider: 'Shatel / Irancell',
  },
  {
    id: 'bill-4',
    title: 'Filimo & Music Subscriptions (اشتراک فیلیمو)',
    amount: 250000,
    category: 'Entertainment & Subscriptions',
    paidBy: 'partner_b',
    dueDateDay: 25,
    isPaidThisMonth: false,
    autopay: true,
    provider: 'Filimo & Media',
  },
];

const DEFAULT_RECURRING_EXPENSES: RecurringExpense[] = [
  {
    id: 'rec-1',
    title: 'Apartment Monthly Rent (اجاره مسکن)',
    amount: 35000000,
    category: 'Rent & Mortgage',
    paidBy: 'partner_a',
    startDate: '2026-01-01',
    interval: 'MONTHLY',
    isActive: true,
    notes: 'Direct landlord transfer',
  },
  {
    id: 'rec-2',
    title: 'Fibre Optic Internet (اینترنت ثابت شاتل)',
    amount: 380000,
    category: 'Utilities & Internet',
    paidBy: 'partner_a',
    startDate: '2026-01-01',
    interval: 'MONTHLY',
    isActive: true,
    notes: 'High speed fibre connection',
  },
  {
    id: 'rec-3',
    title: 'Filimo & VOD Subscriptions (اشتراک فیلیمو)',
    amount: 250000,
    category: 'Entertainment & Subscriptions',
    paidBy: 'partner_b',
    startDate: '2026-01-01',
    interval: 'MONTHLY',
    isActive: true,
    notes: 'Monthly streaming service',
  },
];

const seedTransactions = (): Transaction[] => {
  const m = getCurrentMonthStr();
  const now = new Date().toISOString();
  return [
    {
      id: 'tx-1',
      title: 'Hyperstar Weekly Groceries (خریدهای هایپراستار)',
      amount: 1850000,
      type: 'EXPENSE',
      category: 'Groceries',
      paidBy: 'partner_a',
      date: `${m}-03`,
      vendor: 'Hyperstar',
      notes: 'Fresh fruits, vegetables, dairy, and pantry items',
      createdAt: now,
    },
    {
      id: 'tx-2',
      title: 'Cafe Tehroon Date Night (شام و کافه طهرون)',
      amount: 780000,
      type: 'EXPENSE',
      category: 'Dining & Takeout',
      paidBy: 'partner_b',
      date: `${m}-05`,
      vendor: 'Cafe Tehroon',
      notes: 'Dinner and beverages date for Hamid & Fatemeh',
      createdAt: now,
    },
    {
      id: 'tx-3',
      title: 'Monthly Apartment Rent (اجاره ماهانه)',
      amount: 35000000,
      type: 'EXPENSE',
      category: 'Rent & Mortgage',
      paidBy: 'partner_a',
      date: `${m}-01`,
      vendor: 'Apartment Landlord',
      notes: 'Direct transfer for this month rent',
      isRecurring: true,
      recurringDay: 1,
      recurringFrequency: 'MONTHLY',
      createdAt: now,
    },
    {
      id: 'tx-4',
      title: 'Electric & Gas Utility Bill (قبوض برق و گاز)',
      amount: 450000,
      type: 'EXPENSE',
      category: 'Utilities & Internet',
      paidBy: 'partner_b',
      date: `${m}-08`,
      vendor: 'Power & Gas Authority',
      notes: 'Paid via mobile bank app',
      isRecurring: true,
      recurringDay: 8,
      recurringFrequency: 'MONTHLY',
      createdAt: now,
    },
    {
      id: 'tx-5',
      title: 'Digikala Home Supplies (خریدهای دیجی‌کالا)',
      amount: 1420000,
      type: 'EXPENSE',
      category: 'Household & Supplies',
      paidBy: 'partner_b',
      date: `${m}-10`,
      vendor: 'Digikala',
      notes: 'Kitchen blender and filter cartridges',
      createdAt: now,
    },
    {
      id: 'tx-6',
      title: 'Ofogh Kourosh Supermarket (افق کوروش)',
      amount: 640000,
      type: 'EXPENSE',
      category: 'Groceries',
      paidBy: 'partner_a',
      date: `${m}-12`,
      vendor: 'Ofogh Kourosh',
      notes: 'Cooking oil, rice, and breakfast goods',
      createdAt: now,
    },
    {
      id: 'tx-7',
      title: 'Book Garden Cinema & Books (باغ کتاب)',
      amount: 450000,
      type: 'EXPENSE',
      category: 'Entertainment & Subscriptions',
      paidBy: 'partner_b',
      date: `${m}-14`,
      vendor: 'Book Garden',
      notes: 'Movie tickets & novel purchase',
      createdAt: now,
    },
    {
      id: 'tx-8',
      title: 'Snapp / Tapsi Rides & Fuel (اسنپ و بنزین)',
      amount: 320000,
      type: 'EXPENSE',
      category: 'Travel & Transport',
      paidBy: 'partner_a',
      date: `${m}-16`,
      vendor: 'Snapp / Gas Station',
      notes: 'Commute and vehicle gas refill',
      createdAt: now,
    },
  ];
};

function defaultStore(): OfflineStore {
  return {
    settings: { ...DEFAULT_SETTINGS },
    transactions: seedTransactions(),
    budgets: [...DEFAULT_BUDGETS],
    bills: [...DEFAULT_BILLS],
    recurringExpenses: [...DEFAULT_RECURRING_EXPENSES],
  };
}

// ──────────────────────────────────────────────
// Load / Save
// ──────────────────────────────────────────────

function loadStore(): OfflineStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OfflineStore>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        transactions: parsed.transactions || seedTransactions(),
        budgets: parsed.budgets || [...DEFAULT_BUDGETS],
        bills: parsed.bills || [...DEFAULT_BILLS],
        recurringExpenses: parsed.recurringExpenses || [...DEFAULT_RECURRING_EXPENSES],
      };
    }
  } catch (err) {
    console.warn('[offlineStore] Failed to parse stored data, re-seeding:', err);
  }
  const fresh = defaultStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(store: OfflineStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('[offlineStore] Failed to persist store:', err);
  }
}

// Module-level mutable store (mirrors backend singleton db)
let store: OfflineStore = loadStore();

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// ──────────────────────────────────────────────
// Recurring Expense Processing (mirrors backend)
// ──────────────────────────────────────────────

function processRecurringExpenses(targetMonth: string): Transaction[] {
  if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) return [];

  const recurringTemplates = store.transactions.filter((t) => t.isRecurring);
  const uniqueTemplates = new Map<string, Transaction>();
  for (const t of recurringTemplates) {
    if (!uniqueTemplates.has(t.title)) uniqueTemplates.set(t.title, t);
  }

  const added: Transaction[] = [];
  for (const template of uniqueTemplates.values()) {
    const dayNum = template.recurringDay || 1;
    const formattedDay = String(dayNum).padStart(2, '0');
    const newDate = `${targetMonth}-${formattedDay}`;

    const exists = store.transactions.some(
      (t) => t.title === template.title && t.date.startsWith(targetMonth),
    );

    if (!exists) {
      const newTx: Transaction = {
        id: genId('tx-rec'),
        title: template.title,
        amount: template.amount,
        type: template.type || 'EXPENSE',
        category: template.category,
        paidBy: template.paidBy,
        date: newDate,
        vendor: template.vendor,
        notes: template.notes ? `${template.notes} (Auto Recurring)` : 'Auto generated monthly recurring expense',
        isRecurring: true,
        recurringDay: dayNum,
        recurringFrequency: template.recurringFrequency || 'MONTHLY',
        createdAt: new Date().toISOString(),
      };
      store.transactions.unshift(newTx);
      added.push(newTx);
    }
  }

  if (added.length > 0) saveStore(store);
  return added;
}

// ──────────────────────────────────────────────
// Public API (mirrors backend/db.ts methods + routes.ts responses)
// ──────────────────────────────────────────────

export const offlineDb = {
  // --- SETTINGS ---
  getSettings(): AppSettings & {
    hasEnvKey: boolean;
    maskedKey: string;
    hasCustomKey: boolean;
  } {
    const settings = store.settings;
    const customKey = localStorage.getItem('duospend_gemini_key') || '';
    const maskedKey = customKey
      ? `${customKey.substring(0, 4)}...${customKey.substring(customKey.length - 4)}`
      : '';
    return {
      ...settings,
      geminiApiKey: customKey,
      hasEnvKey: false,
      maskedKey,
      hasCustomKey: Boolean(customKey),
    };
  },

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    // Persist the gemini key to its dedicated localStorage slot (mirror api.ts logic)
    if ('geminiApiKey' in newSettings) {
      const key = newSettings.geminiApiKey;
      if (key) localStorage.setItem('duospend_gemini_key', key);
      else localStorage.removeItem('duospend_gemini_key');
      const { geminiApiKey: _omit, ...rest } = newSettings;
      store.settings = { ...store.settings, ...rest };
    } else {
      store.settings = { ...store.settings, ...newSettings };
    }
    saveStore(store);
    return store.settings;
  },

  // --- TRANSACTIONS ---
  processRecurringTransactions(month: string): {
    success: boolean;
    month: string;
    addedCount: number;
    added: Transaction[];
  } {
    const added = processRecurringExpenses(month);
    return { success: true, month, addedCount: added.length, added };
  },

  getTransactions(monthFilter?: string): Transaction[] {
    if (monthFilter) {
      if (monthFilter.includes('..')) {
        const [start, end] = monthFilter.split('..');
        processRecurringExpenses(start.substring(0, 7));
        return store.transactions
          .filter((t) => t.date >= start && t.date <= end)
          .sort((a, b) => b.date.localeCompare(a.date));
      }
      processRecurringExpenses(monthFilter);
      return store.transactions
        .filter((t) => t.date.startsWith(monthFilter))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return [...store.transactions].sort((a, b) => b.date.localeCompare(a.date));
  },

  batchAddTransactions(
    items: Omit<Transaction, 'id' | 'createdAt'>[],
  ): { success: boolean; count: number; created: Transaction[] } {
    const createdList: Transaction[] = [];
    for (const item of items) {
      const newTx: Transaction = {
        ...item,
        id: genId('tx-imp'),
        createdAt: new Date().toISOString(),
      };
      store.transactions.unshift(newTx);
      createdList.push(newTx);
    }
    saveStore(store);
    return { success: true, count: createdList.length, created: createdList };
  },

  addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: genId('tx'),
      createdAt: new Date().toISOString(),
    };
    store.transactions.unshift(newTx);
    saveStore(store);
    return newTx;
  },

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const idx = store.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    store.transactions[idx] = { ...store.transactions[idx], ...updates };
    saveStore(store);
    return store.transactions[idx];
  },

  deleteTransaction(id: string): { success: boolean } {
    const idx = store.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return { success: false };
    store.transactions.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // --- HOUSEHOLD SUMMARY ---
  calculateHouseholdSummary(monthFilter?: string): HouseholdSummary {
    const txs = offlineDb.getTransactions(monthFilter).filter((t) => t.type === 'EXPENSE');
    let partnerATotalPaid = 0;
    let partnerBTotalPaid = 0;
    for (const t of txs) {
      const amount = Number(t.amount) || 0;
      if (t.paidBy === store.settings.partnerA.id) partnerATotalPaid += amount;
      else if (t.paidBy === store.settings.partnerB.id) partnerBTotalPaid += amount;
    }
    return {
      partnerATotalPaid: Math.round(partnerATotalPaid * 100) / 100,
      partnerBTotalPaid: Math.round(partnerBTotalPaid * 100) / 100,
    };
  },

  // --- BUDGETS ---
  getBudgets(): Budget[] {
    return [...store.budgets];
  },

  updateBudgets(budgets: Budget[]): Budget[] {
    store.budgets = budgets;
    saveStore(store);
    return store.budgets;
  },

  // --- BILLS ---
  getBills(): Bill[] {
    return [...store.bills];
  },

  addBill(bill: Omit<Bill, 'id'>): Bill {
    const newBill: Bill = { ...bill, id: genId('bill') };
    store.bills.push(newBill);
    saveStore(store);
    return newBill;
  },

  toggleBillPaid(id: string, isPaid: boolean): Bill | null {
    const bill = store.bills.find((b) => b.id === id);
    if (!bill) return null;
    bill.isPaidThisMonth = isPaid;
    saveStore(store);
    return bill;
  },

  deleteBill(id: string): { success: boolean } {
    const idx = store.bills.findIndex((b) => b.id === id);
    if (idx === -1) return { success: false };
    store.bills.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // --- RECURRING EXPENSES ---
  getRecurringExpenses(): RecurringExpense[] {
    return [...(store.recurringExpenses || [])];
  },

  addRecurringExpense(item: Omit<RecurringExpense, 'id'>): RecurringExpense {
    const newRec: RecurringExpense = { ...item, id: genId('rec') };
    if (!store.recurringExpenses) store.recurringExpenses = [];
    store.recurringExpenses.push(newRec);
    saveStore(store);
    return newRec;
  },

  toggleRecurringExpenseActive(id: string, isActive: boolean): RecurringExpense | null {
    if (!store.recurringExpenses) return null;
    const item = store.recurringExpenses.find((r) => r.id === id);
    if (!item) return null;
    item.isActive = isActive;
    saveStore(store);
    return item;
  },

  deleteRecurringExpense(id: string): { success: boolean } {
    if (!store.recurringExpenses) return { success: false };
    const idx = store.recurringExpenses.findIndex((r) => r.id === id);
    if (idx === -1) return { success: false };
    store.recurringExpenses.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // --- ANALYTICS ---
  getThreeMonthTrends(referenceMonth?: string): MonthTrendData[] {
    let refYear: number;
    let refMonth: number;
    if (referenceMonth && /^\d{4}-\d{2}/.test(referenceMonth)) {
      const [y, m] = referenceMonth.substring(0, 7).split('-').map(Number);
      refYear = y;
      refMonth = m - 1;
    } else {
      const now = new Date();
      refYear = now.getFullYear();
      refMonth = now.getMonth();
    }

    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(refYear, refMonth - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}`);
    }

    return months.map((mKey) => {
      processRecurringExpenses(mKey);
      const txs = store.transactions.filter((t) => t.date.startsWith(mKey));

      let totalExpense = 0;
      let totalIncome = 0;
      let partnerAExpense = 0;
      let partnerBExpense = 0;
      const categoryBreakdown: Record<string, number> = {};

      for (const t of txs) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'INCOME') {
          totalIncome += amt;
        } else if (t.type === 'EXPENSE') {
          totalExpense += amt;
          categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
          if (t.paidBy === store.settings.partnerA.id) partnerAExpense += amt;
          else partnerBExpense += amt;
        }
      }

      const totalBudget = store.budgets.reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
      const effectiveIncome = totalIncome > 0 ? totalIncome : Math.max(totalBudget, totalExpense * 1.25, 10000000);
      const totalSavings = Math.max(0, effectiveIncome - totalExpense);
      const savingsRatePct = effectiveIncome > 0 ? Math.round((totalSavings / effectiveIncome) * 100) : 0;

      const [, m] = mKey.split('-').map(Number);
      // Correct Jalali month label via proper gregorian->jalali conversion (m is 1-12)
      const midDay = 15;
      const safeDay = Math.min(midDay, new Date(Number(mKey.substring(0, 4)), Number(mKey.substring(5, 7)) - 1, 0).getDate() || 28);
      const mLabel = getJalaliTrendLabel(mKey.substring(0, 4), m, safeDay);

      return {
        monthKey: mKey,
        monthLabel: mLabel,
        totalExpense: Math.round(totalExpense * 100) / 100,
        totalIncome: Math.round(effectiveIncome * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        savingsRatePct,
        partnerAExpense: Math.round(partnerAExpense * 100) / 100,
        partnerBExpense: Math.round(partnerBExpense * 100) / 100,
        categoryBreakdown,
      };
    });
  },

  // --- AUTH ---
  login(username: string, password: string): { success: boolean; user: AuthUser } {
    const cleanUser = (username || '').toString().trim().toLowerCase();
    const cleanPass = (password || '').toString().trim();

    if (cleanUser === 'hamid' && cleanPass === '19981998') {
      return {
        success: true,
        user: {
          username: 'hamid',
          name: 'سیدحمید عقل مندصرمی',
          partnerId: 'partner_a',
          avatar: '👨‍💼',
        },
      };
    }
    if ((cleanUser === 'fati' || cleanUser === 'fatemeh') && cleanPass === '13771377') {
      return {
        success: true,
        user: {
          username: 'fati',
          name: 'فاطمه نیک سرشت',
          partnerId: 'partner_b',
          avatar: '👩‍⚕️',
        },
      };
    }
    throw new Error('نام کاربری یا رمز عبور اشتباه است (Invalid username or password)');
  },
};

/**
 * Accurate Jalali month label for trend charts.
 * Converts the middle of the Gregorian month to Jalali and reads the month name,
 * instead of the inaccurate (m + 2) % 12 heuristic used in the original backend.
 */
function getJalaliTrendLabel(gyStr: string, gm: number, gd: number): string {
  const gy = Number(gyStr);
  // Inline gregorianToJalali to avoid a circular import cycle into formatters.
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let workGy = gy - (gy <= 1600 ? 621 : 1600);
  const gy2 = gm > 2 ? workGy + 1 : workGy;
  let days =
    365 * workGy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
  return `${gyStr}-${String(gm).padStart(2, '0')} (${monthName})`;
}
