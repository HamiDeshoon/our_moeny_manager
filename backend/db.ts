import fs from 'fs';
import path from 'path';
import { AppSettings, Bill, Budget, MonthTrendData, RecurringExpense, Transaction } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface DatabaseStore {
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  recurringExpenses: RecurringExpense[];
}

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: {
    id: 'partner_a',
    name: 'سیدحمید عقل مندصرمی',
    avatar: '👨‍💼',
    color: '#0284c7', // Sky blue
  },
  partnerB: {
    id: 'partner_b',
    name: 'فاطمه نیک سرشت',
    avatar: '👩‍⚕️',
    color: '#16a34a', // Emerald green
  },
  isRtl: true,

  useJalaliDate: true,
};

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

// Helper to generate current month YYYY-MM
const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Hyperstar Weekly Groceries (خریدهای هایپراستار)',
    amount: 1850000,
    type: 'EXPENSE',
    category: 'Groceries',
    paidBy: 'partner_a',
    date: `${getCurrentMonthStr()}-03`,
    vendor: 'Hyperstar',
    notes: 'Fresh fruits, vegetables, dairy, and pantry items',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    title: 'Cafe Tehroon Date Night (شام و کافه طهرون)',
    amount: 780000,
    type: 'EXPENSE',
    category: 'Dining & Takeout',
    paidBy: 'partner_b',
    date: `${getCurrentMonthStr()}-05`,
    vendor: 'Cafe Tehroon',
    notes: 'Dinner and beverages date for Hamid & Fatemeh',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    title: 'Monthly Apartment Rent (اجاره ماهانه)',
    amount: 35000000,
    type: 'EXPENSE',
    category: 'Rent & Mortgage',
    paidBy: 'partner_a',
    date: `${getCurrentMonthStr()}-01`,
    vendor: 'Apartment Landlord',
    notes: 'Direct transfer for this month rent',
    isRecurring: true,
    recurringDay: 1,
    recurringFrequency: 'MONTHLY',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-4',
    title: 'Electric & Gas Utility Bill (قبوض برق و گاز)',
    amount: 450000,
    type: 'EXPENSE',
    category: 'Utilities & Internet',
    paidBy: 'partner_b',
    date: `${getCurrentMonthStr()}-08`,
    vendor: 'Power & Gas Authority',
    notes: 'Paid via mobile bank app',
    isRecurring: true,
    recurringDay: 8,
    recurringFrequency: 'MONTHLY',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-5',
    title: 'Digikala Home Supplies (خریدهای دیجی‌کالا)',
    amount: 1420000,
    type: 'EXPENSE',
    category: 'Household & Supplies',
    paidBy: 'partner_b',
    date: `${getCurrentMonthStr()}-10`,
    vendor: 'Digikala',
    notes: 'Kitchen blender and filter cartridges',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-6',
    title: 'Ofogh Kourosh Supermarket (افق کوروش)',
    amount: 640000,
    type: 'EXPENSE',
    category: 'Groceries',
    paidBy: 'partner_a',
    date: `${getCurrentMonthStr()}-12`,
    vendor: 'Ofogh Kourosh',
    notes: 'Cooking oil, rice, and breakfast goods',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-7',
    title: 'Book Garden Cinema & Books (باغ کتاب)',
    amount: 450000,
    type: 'EXPENSE',
    category: 'Entertainment & Subscriptions',
    paidBy: 'partner_b',
    date: `${getCurrentMonthStr()}-14`,
    vendor: 'Book Garden',
    notes: 'Movie tickets & novel purchase',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-8',
    title: 'Snapp / Tapsi Rides & Fuel (اسنپ و بنزین)',
    amount: 320000,
    type: 'EXPENSE',
    category: 'Travel & Transport',
    paidBy: 'partner_a',
    date: `${getCurrentMonthStr()}-16`,
    vendor: 'Snapp / Gas Station',
    notes: 'Commute and vehicle gas refill',
    createdAt: new Date().toISOString(),
  }
];

class Database {
  private data: DatabaseStore;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          transactions: parsed.transactions || INITIAL_TRANSACTIONS,
          budgets: parsed.budgets || DEFAULT_BUDGETS,
          bills: parsed.bills || DEFAULT_BILLS,
          recurringExpenses: parsed.recurringExpenses || DEFAULT_RECURRING_EXPENSES,
        };
      }
    } catch (err) {
      console.error('Error loading database file, falling back to defaults:', err);
    }

    const initialStore: DatabaseStore = {
      settings: DEFAULT_SETTINGS,
      transactions: INITIAL_TRANSACTIONS,
      budgets: DEFAULT_BUDGETS,
      bills: DEFAULT_BILLS,
      recurringExpenses: DEFAULT_RECURRING_EXPENSES,
    };
    this.saveData(initialStore);
    return initialStore;
  }

  private saveData(dataToSave: DatabaseStore = this.data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  // --- SETTINGS ---
  getSettings(): AppSettings {
    if (!this.data.settings.partnerA.name || this.data.settings.partnerA.name === 'Hamid') {
      this.data.settings.partnerA.name = 'سیدحمید عقل مندصرمی';
    }
    if (!this.data.settings.partnerB.name || this.data.settings.partnerB.name === 'Fatemeh' || this.data.settings.partnerB.name === 'Fati') {
      this.data.settings.partnerB.name = 'فاطمه نیک سرشت';
    }
    return this.data.settings;
  }

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
    return this.data.settings;
  }

  // --- TRANSACTIONS ---
  processRecurringExpenses(targetMonth: string): Transaction[] {
    if (!targetMonth || !targetMonth.match(/^\d{4}-\d{2}$/)) return [];

    // Find all recurring transaction templates across the database
    const recurringTemplates = this.data.transactions.filter(t => t.isRecurring);
    const added: Transaction[] = [];

    // Deduplicate templates by title
    const uniqueTemplates = new Map<string, Transaction>();
    for (const t of recurringTemplates) {
      if (!uniqueTemplates.has(t.title)) {
        uniqueTemplates.set(t.title, t);
      }
    }

    for (const template of uniqueTemplates.values()) {
      const dayNum = template.recurringDay || 1;
      const formattedDay = String(dayNum).padStart(2, '0');
      const newDate = `${targetMonth}-${formattedDay}`;

      // Check if already created for this targetMonth
      const exists = this.data.transactions.some(
        t => t.title === template.title && t.date.startsWith(targetMonth)
      );

      if (!exists) {
        const newTx: Transaction = {
          id: `tx-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
        this.data.transactions.unshift(newTx);
        added.push(newTx);
      }
    }

    if (added.length > 0) {
      this.saveData();
    }
    return added;
  }

  getTransactions(monthFilter?: string): Transaction[] {
    if (monthFilter) {
      if (monthFilter.includes('..')) {
        const [start, end] = monthFilter.split('..');
        this.processRecurringExpenses(start.substring(0, 7));
        return this.data.transactions
          .filter((t) => t.date >= start && t.date <= end)
          .sort((a, b) => b.date.localeCompare(a.date));
      }
      // Auto-process recurring expenses for requested month
      this.processRecurringExpenses(monthFilter);
      return this.data.transactions
        .filter((t) => t.date.startsWith(monthFilter))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    return [...this.data.transactions].sort((a, b) => b.date.localeCompare(a.date));
  }

  getThreeMonthTrends(referenceMonth?: string): MonthTrendData[] {
    const ref = referenceMonth && referenceMonth.length >= 7 ? new Date(`${referenceMonth.substring(0, 7)}-01`) : new Date();
    const months: string[] = [];

    for (let i = 2; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}`);
    }

    const jalaliMonthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    return months.map((mKey) => {
      this.processRecurringExpenses(mKey);
      const txs = this.data.transactions.filter((t) => t.date.startsWith(mKey));

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
          if (t.paidBy === this.data.settings.partnerA.id) {
            partnerAExpense += amt;
          } else {
            partnerBExpense += amt;
          }
        }
      }

      const totalBudget = this.data.budgets.reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
      const effectiveIncome = totalIncome > 0 ? totalIncome : Math.max(totalBudget, totalExpense * 1.25, 10000000);

      const totalSavings = Math.max(0, effectiveIncome - totalExpense);
      const savingsRatePct = effectiveIncome > 0 ? Math.round((totalSavings / effectiveIncome) * 100) : 0;

      const [y, m] = mKey.split('-').map(Number);
      const mLabel = `${mKey} (${jalaliMonthNames[(m + 2) % 12]})`;

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
  }

  addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(newTx);
    this.saveData();
    return newTx;
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.transactions[idx] = { ...this.data.transactions[idx], ...updates };
    this.saveData();
    return this.data.transactions[idx];
  }

  deleteTransaction(id: string): boolean {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.data.transactions.splice(idx, 1);
    this.saveData();
    return true;
  }

  // --- BUDGETS ---
  getBudgets(): Budget[] {
    return this.data.budgets;
  }

  updateBudgets(budgets: Budget[]): Budget[] {
    this.data.budgets = budgets;
    this.saveData();
    return this.data.budgets;
  }

  // --- BILLS ---
  getBills(): Bill[] {
    return this.data.bills;
  }

  addBill(bill: Omit<Bill, 'id'>): Bill {
    const newBill: Bill = {
      ...bill,
      id: `bill-${Date.now()}`,
    };
    this.data.bills.push(newBill);
    this.saveData();
    return newBill;
  }

  toggleBillPaid(id: string, isPaid: boolean): Bill | null {
    const bill = this.data.bills.find((b) => b.id === id);
    if (!bill) return null;
    bill.isPaidThisMonth = isPaid;
    this.saveData();
    return bill;
  }

  deleteBill(id: string): boolean {
    const idx = this.data.bills.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.data.bills.splice(idx, 1);
    this.saveData();
    return true;
  }

    // --- HOUSEHOLD SUMMARY ---
  calculateHouseholdSummary(monthFilter?: string) {
    const txs = this.getTransactions(monthFilter).filter((t) => t.type === 'EXPENSE');
    const partnerA = this.data.settings.partnerA;
    const partnerB = this.data.settings.partnerB;

    let partnerATotalPaid = 0;
    let partnerBTotalPaid = 0;

    for (const t of txs) {
      const amount = Number(t.amount) || 0;
      if (t.paidBy === partnerA.id) {
        partnerATotalPaid += amount;
      } else if (t.paidBy === partnerB.id) {
        partnerBTotalPaid += amount;
      }
    }

    return {
      partnerATotalPaid: Math.round(partnerATotalPaid * 100) / 100,
      partnerBTotalPaid: Math.round(partnerBTotalPaid * 100) / 100,
    };
  }
  batchAddTransactions(items: Omit<Transaction, 'id' | 'createdAt'>[]): Transaction[] {
    const createdList: Transaction[] = [];
    for (const item of items) {
      const newTx: Transaction = {
        ...item,
        id: `tx-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      this.data.transactions.unshift(newTx);
      createdList.push(newTx);
    }
    this.saveData();
    return createdList;
  }

  // --- RECURRING EXPENSES ---
  getRecurringExpenses(): RecurringExpense[] {
    return this.data.recurringExpenses || [];
  }

  addRecurringExpense(item: Omit<RecurringExpense, 'id'>): RecurringExpense {
    const newRec: RecurringExpense = {
      ...item,
      id: `rec-${Date.now()}`,
    };
    if (!this.data.recurringExpenses) this.data.recurringExpenses = [];
    this.data.recurringExpenses.push(newRec);
    this.saveData();
    return newRec;
  }

  deleteRecurringExpense(id: string): boolean {
    if (!this.data.recurringExpenses) return false;
    const idx = this.data.recurringExpenses.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.data.recurringExpenses.splice(idx, 1);
    this.saveData();
    return true;
  }

  toggleRecurringExpenseActive(id: string, isActive: boolean): RecurringExpense | null {
    if (!this.data.recurringExpenses) return null;
    const item = this.data.recurringExpenses.find((r) => r.id === id);
    if (!item) return null;
    item.isActive = isActive;
    this.saveData();
    return item;
  }

  
}

export const db = new Database();
