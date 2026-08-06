import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { AppSettings, Bill, Budget, MonthTrendData, RecurringExpense, Transaction } from '../src/types.js';

// ──────────────────────────────────────────────
// Default data (shared between both storage modes)
// ──────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: { id: 'partner_a', name: 'کاربر اول', avatar: '👨‍💼', color: '#0284c7' },
  partnerB: { id: 'partner_b', name: 'کاربر دوم', avatar: '👩‍⚕️', color: '#16a34a' },
  isRtl: true,
  useJalaliDate: true,
};

const getCurrentMonthStr = () => {
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
  { id: 'bill-1', title: 'Apartment Rent (اجاره مسکن)', amount: 35000000, category: 'Rent & Mortgage', paidBy: 'partner_a', dueDateDay: 1, isPaidThisMonth: true, autopay: true, provider: 'Home Landlord' },
  { id: 'bill-2', title: 'Electric & Gas Bill (قبوض آب، برق و گاز)', amount: 450000, category: 'Utilities & Internet', paidBy: 'partner_b', dueDateDay: 15, isPaidThisMonth: true, autopay: false, provider: 'City Power & Gas' },
  { id: 'bill-3', title: 'High-Speed Fibre Internet (اینترنت پرسرعت)', amount: 380000, category: 'Utilities & Internet', paidBy: 'partner_a', dueDateDay: 20, isPaidThisMonth: false, autopay: true, provider: 'Shatel / Irancell' },
  { id: 'bill-4', title: 'Filimo & Music Subscriptions (اشتراک فیلیمو)', amount: 250000, category: 'Entertainment & Subscriptions', paidBy: 'partner_b', dueDateDay: 25, isPaidThisMonth: false, autopay: true, provider: 'Filimo & Media' },
];

const DEFAULT_RECURRING_EXPENSES: RecurringExpense[] = [
  { id: 'rec-1', title: 'Apartment Monthly Rent (اجاره مسکن)', amount: 35000000, category: 'Rent & Mortgage', paidBy: 'partner_a', startDate: '2026-01-01', interval: 'MONTHLY', isActive: true, notes: 'Direct landlord transfer' },
  { id: 'rec-2', title: 'Fibre Optic Internet (اینترنت ثابت شاتل)', amount: 380000, category: 'Utilities & Internet', paidBy: 'partner_a', startDate: '2026-01-01', interval: 'MONTHLY', isActive: true, notes: 'High speed fibre connection' },
  { id: 'rec-3', title: 'Filimo & VOD Subscriptions (اشتراک فیلیمو)', amount: 250000, category: 'Entertainment & Subscriptions', paidBy: 'partner_b', startDate: '2026-01-01', interval: 'MONTHLY', isActive: true, notes: 'Monthly streaming service' },
];

function seedTransactions(): Transaction[] {
  const m = getCurrentMonthStr();
  const now = new Date().toISOString();
  return [
    { id: 'tx-1', title: 'Hyperstar Weekly Groceries (خریدهای هایپراستار)', amount: 1850000, type: 'EXPENSE', category: 'Groceries', paidBy: 'partner_a', date: `${m}-03`, vendor: 'Hyperstar', notes: 'Fresh fruits, vegetables, dairy, and pantry items', createdAt: now },
    { id: 'tx-2', title: 'Cafe Tehroon Date Night (شام و کافه طهرون)', amount: 780000, type: 'EXPENSE', category: 'Dining & Takeout', paidBy: 'partner_b', date: `${m}-05`, vendor: 'Cafe Tehroon', notes: 'Dinner and beverages date', createdAt: now },
    { id: 'tx-3', title: 'Monthly Apartment Rent (اجاره ماهانه)', amount: 35000000, type: 'EXPENSE', category: 'Rent & Mortgage', paidBy: 'partner_a', date: `${m}-01`, vendor: 'Apartment Landlord', notes: 'Direct transfer for this month rent', isRecurring: true, recurringDay: 1, recurringFrequency: 'MONTHLY', createdAt: now },
    { id: 'tx-4', title: 'Electric & Gas Utility Bill (قبوض برق و گاز)', amount: 450000, type: 'EXPENSE', category: 'Utilities & Internet', paidBy: 'partner_b', date: `${m}-08`, vendor: 'Power & Gas Authority', notes: 'Paid via mobile bank app', isRecurring: true, recurringDay: 8, recurringFrequency: 'MONTHLY', createdAt: now },
    { id: 'tx-5', title: 'Digikala Home Supplies (خریدهای دیجی‌کالا)', amount: 1420000, type: 'EXPENSE', category: 'Household & Supplies', paidBy: 'partner_b', date: `${m}-10`, vendor: 'Digikala', notes: 'Kitchen blender and filter cartridges', createdAt: now },
    { id: 'tx-6', title: 'Ofogh Kourosh Supermarket (افق کوروش)', amount: 640000, type: 'EXPENSE', category: 'Groceries', paidBy: 'partner_a', date: `${m}-12`, vendor: 'Ofogh Kourosh', notes: 'Cooking oil, rice, and breakfast goods', createdAt: now },
    { id: 'tx-7', title: 'Book Garden Cinema & Books (باغ کتاب)', amount: 450000, type: 'EXPENSE', category: 'Entertainment & Subscriptions', paidBy: 'partner_b', date: `${m}-14`, vendor: 'Book Garden', notes: 'Movie tickets & novel purchase', createdAt: now },
    { id: 'tx-8', title: 'Snapp / Tapsi Rides & Fuel (اسنپ و بنزین)', amount: 320000, type: 'EXPENSE', category: 'Travel & Transport', paidBy: 'partner_a', date: `${m}-16`, vendor: 'Snapp / Gas Station', notes: 'Commute and vehicle gas refill', createdAt: now },
  ];
}

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// ──────────────────────────────────────────────
// PostgreSQL Database Layer
// ──────────────────────────────────────────────

class PostgresDB {
  private pool: Pool;
  private ready: Promise<void>;

  constructor() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl && !dbUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    this.ready = this.init();
  }

  getStorageMode(): 'postgresql' | 'local_file' {
    return 'postgresql';
  }

  private async init() {
    try {
      await this.migrate();
      await this.seed();
      console.log('[PostgresDB] Ready');
    } catch (err) {
      console.error('[PostgresDB] Initialization Error:', err);
      throw err;
    }
  }

  private async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL DEFAULT 'EXPENSE',
        category TEXT NOT NULL,
        paid_by TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        vendor TEXT,
        receipt_url TEXT,
        is_recurring BOOLEAN DEFAULT false,
        recurring_day INTEGER,
        recurring_frequency TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_tx_paid_by ON transactions(paid_by);
      CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);

      CREATE TABLE IF NOT EXISTS budgets (
        category TEXT PRIMARY KEY,
        monthly_limit NUMERIC NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        category TEXT NOT NULL,
        paid_by TEXT NOT NULL,
        due_date_day INTEGER NOT NULL,
        is_paid_this_month BOOLEAN DEFAULT false,
        autopay BOOLEAN DEFAULT false,
        provider TEXT
      );

      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        category TEXT NOT NULL,
        paid_by TEXT NOT NULL,
        start_date TEXT NOT NULL,
        interval TEXT NOT NULL DEFAULT 'MONTHLY',
        is_active BOOLEAN DEFAULT true,
        notes TEXT
      );
    `);
  }

  private async seed() {
    // Seed settings
    const settingsExist = await this.pool.query('SELECT 1 FROM settings WHERE id = 1');
    if (settingsExist.rowCount === 0) {
      await this.pool.query('INSERT INTO settings (id, data) VALUES (1, $1)', [JSON.stringify(DEFAULT_SETTINGS)]);
    }

    // Seed transactions
    const txExist = await this.pool.query('SELECT COUNT(*) as cnt FROM transactions');
    if (Number(txExist.rows[0].cnt) === 0) {
      const seeds = seedTransactions();
      for (const tx of seeds) {
        await this.pool.query(
          `INSERT INTO transactions (id, title, amount, type, category, paid_by, date, notes, vendor, is_recurring, recurring_day, recurring_frequency, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [tx.id, tx.title, tx.amount, tx.type, tx.category, tx.paidBy, tx.date, tx.notes || null, tx.vendor || null, tx.isRecurring || false, tx.recurringDay || null, tx.recurringFrequency || null, tx.createdAt]
        );
      }
    }

    // Seed budgets
    const budgetExist = await this.pool.query('SELECT COUNT(*) as cnt FROM budgets');
    if (Number(budgetExist.rows[0].cnt) === 0) {
      for (const b of DEFAULT_BUDGETS) {
        await this.pool.query('INSERT INTO budgets (category, monthly_limit) VALUES ($1, $2)', [b.category, b.monthlyLimit]);
      }
    }

    // Seed bills
    const billExist = await this.pool.query('SELECT COUNT(*) as cnt FROM bills');
    if (Number(billExist.rows[0].cnt) === 0) {
      for (const b of DEFAULT_BILLS) {
        await this.pool.query(
          'INSERT INTO bills (id, title, amount, category, paid_by, due_date_day, is_paid_this_month, autopay, provider) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [b.id, b.title, b.amount, b.category, b.paidBy, b.dueDateDay, b.isPaidThisMonth, b.autopay, b.provider || null]
        );
      }
    }

    // Seed recurring expenses
    const recExist = await this.pool.query('SELECT COUNT(*) as cnt FROM recurring_expenses');
    if (Number(recExist.rows[0].cnt) === 0) {
      for (const r of DEFAULT_RECURRING_EXPENSES) {
        await this.pool.query(
          'INSERT INTO recurring_expenses (id, title, amount, category, paid_by, start_date, interval, is_active, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [r.id, r.title, r.amount, r.category, r.paidBy, r.startDate, r.interval, r.isActive, r.notes || null]
        );
      }
    }
  }

  private async ensureReady() { await this.ready; }

  private rowToTx(row: any): Transaction {
    return {
      id: row.id, title: row.title, amount: Number(row.amount), type: row.type,
      category: row.category, paidBy: row.paid_by, date: row.date,
      notes: row.notes || undefined, vendor: row.vendor || undefined,
      receiptUrl: row.receipt_url || undefined, isRecurring: row.is_recurring || false,
      recurringDay: row.recurring_day || undefined, recurringFrequency: row.recurring_frequency || undefined,
      createdAt: row.created_at,
    };
  }

  // ── Settings ──
  async getSettings(): Promise<AppSettings> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT data FROM settings WHERE id = 1');
    if (res.rows.length === 0) return { ...DEFAULT_SETTINGS };
    const s = res.rows[0].data as AppSettings;
    if (!s.partnerA?.name) s.partnerA.name = 'کاربر اول';
    if (!s.partnerB?.name) s.partnerB.name = 'کاربر دوم';
    return s;
  }

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    await this.ensureReady();
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    await this.pool.query('UPDATE settings SET data = $1, updated_at = now() WHERE id = 1', [JSON.stringify(merged)]);
    return merged;
  }

  // ── Transactions ──
  async getTransactions(month?: string): Promise<Transaction[]> {
    await this.ensureReady();
    if (!month) {
      const res = await this.pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
      return res.rows.map(this.rowToTx);
    }
    // Handle Jalali range format: "2026-01-01..2026-01-31"
    if (month.includes('..')) {
      const [start, end] = month.split('..');
      const res = await this.pool.query('SELECT * FROM transactions WHERE date >= $1 AND date <= $2 ORDER BY date DESC, created_at DESC', [start, end]);
      return res.rows.map(this.rowToTx);
    }
    const res = await this.pool.query('SELECT * FROM transactions WHERE date LIKE $1 ORDER BY date DESC, created_at DESC', [`${month}-%`]);
    return res.rows.map(this.rowToTx);
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    await this.ensureReady();
    const id = genId('tx');
    const createdAt = new Date().toISOString();
    const fullTx: Transaction = { ...tx, id, createdAt } as Transaction;
    await this.pool.query(
      `INSERT INTO transactions (id, title, amount, type, category, paid_by, date, notes, vendor, receipt_url, is_recurring, recurring_day, recurring_frequency, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, tx.title, tx.amount, tx.type || 'EXPENSE', tx.category, tx.paidBy, tx.date, tx.notes || null, tx.vendor || null, tx.receiptUrl || null, tx.isRecurring || false, tx.recurringDay || null, tx.recurringFrequency || null, createdAt]
    );
    return fullTx;
  }

  async batchAddTransactions(items: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    await this.ensureReady();
    const created: Transaction[] = [];
    for (const tx of items) {
      created.push(await this.addTransaction(tx));
    }
    return created;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    await this.ensureReady();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const map: Record<string, string> = { title: 'title', amount: 'amount', type: 'type', category: 'category', paidBy: 'paid_by', date: 'date', notes: 'notes', vendor: 'vendor', receiptUrl: 'receipt_url', isRecurring: 'is_recurring', recurringDay: 'recurring_day', recurringFrequency: 'recurring_frequency' };
    for (const [k, v] of Object.entries(updates)) {
      if (map[k] && v !== undefined) {
        fields.push(`${map[k]} = $${idx++}`);
        values.push(v);
      }
    }
    if (fields.length === 0) {
      const res = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
      return res.rows.length ? this.rowToTx(res.rows[0]) : null;
    }
    values.push(id);
    const res = await this.pool.query(`UPDATE transactions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    return res.rows.length ? this.rowToTx(res.rows[0]) : null;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async processRecurringExpenses(targetMonth: string): Promise<Transaction[]> {
    await this.ensureReady();
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) return [];

    const recurringTemplates = (await this.getTransactions()).filter(t => t.isRecurring);
    const uniqueTemplates = new Map<string, Transaction>();
    for (const t of recurringTemplates) {
      if (!uniqueTemplates.has(t.title)) uniqueTemplates.set(t.title, t);
    }

    const added: Transaction[] = [];
    for (const template of uniqueTemplates.values()) {
      const dayNum = template.recurringDay || 1;
      const formattedDay = String(dayNum).padStart(2, '0');
      const newDate = `${targetMonth}-${formattedDay}`;
      const exists = (await this.pool.query('SELECT 1 FROM transactions WHERE title = $1 AND date LIKE $2', [template.title, `${targetMonth}-%`])).rowCount ?? 0 > 0;
      if (!exists) {
        const newTx = await this.addTransaction({
          title: template.title, amount: template.amount, type: template.type || 'EXPENSE',
          category: template.category, paidBy: template.paidBy, date: newDate,
          vendor: template.vendor, notes: template.notes ? `${template.notes} (Auto Recurring)` : 'Auto generated monthly recurring',
          isRecurring: false,
        });
        added.push(newTx);
      }
    }
    return added;
  }

  // ── Budgets ──
  async getBudgets(): Promise<Budget[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM budgets');
    return res.rows.map((r: any) => ({ category: r.category, monthlyLimit: Number(r.monthly_limit) }));
  }

  async updateBudgets(budgets: Budget[]): Promise<Budget[]> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM budgets');
    for (const b of budgets) {
      await this.pool.query('INSERT INTO budgets (category, monthly_limit) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET monthly_limit = $2', [b.category, b.monthlyLimit]);
    }
    return budgets;
  }

  // ── Bills ──
  async getBills(): Promise<Bill[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM bills');
    return res.rows.map((r: any) => ({ id: r.id, title: r.title, amount: Number(r.amount), category: r.category, paidBy: r.paid_by, dueDateDay: r.due_date_day, isPaidThisMonth: r.is_paid_this_month, autopay: r.autopay, provider: r.provider || undefined }));
  }

  async addBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
    await this.ensureReady();
    const id = genId('bill');
    await this.pool.query(
      'INSERT INTO bills (id, title, amount, category, paid_by, due_date_day, is_paid_this_month, autopay, provider) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, bill.title, bill.amount, bill.category, bill.paidBy, bill.dueDateDay, bill.isPaidThisMonth, bill.autopay, bill.provider || null]
    );
    return { ...bill, id };
  }

  async toggleBillPaid(id: string, isPaid: boolean): Promise<Bill | null> {
    await this.ensureReady();
    const res = await this.pool.query('UPDATE bills SET is_paid_this_month = $1 WHERE id = $2 RETURNING *', [isPaid, id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return { id: r.id, title: r.title, amount: Number(r.amount), category: r.category, paidBy: r.paid_by, dueDateDay: r.due_date_day, isPaidThisMonth: r.is_paid_this_month, autopay: r.autopay, provider: r.provider || undefined };
  }

  async deleteBill(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM bills WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ── Recurring Expenses ──
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM recurring_expenses');
    return res.rows.map((r: any) => ({ id: r.id, title: r.title, amount: Number(r.amount), category: r.category, paidBy: r.paid_by, startDate: r.start_date, interval: r.interval, isActive: r.is_active, notes: r.notes || undefined }));
  }

  async addRecurringExpense(item: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
    await this.ensureReady();
    const id = genId('rec');
    await this.pool.query(
      'INSERT INTO recurring_expenses (id, title, amount, category, paid_by, start_date, interval, is_active, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, item.title, item.amount, item.category, item.paidBy, item.startDate, item.interval, item.isActive, item.notes || null]
    );
    return { ...item, id };
  }

  async toggleRecurringExpenseActive(id: string, isActive: boolean): Promise<RecurringExpense | null> {
    await this.ensureReady();
    const res = await this.pool.query('UPDATE recurring_expenses SET is_active = $1 WHERE id = $2 RETURNING *', [isActive, id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return { id: r.id, title: r.title, amount: Number(r.amount), category: r.category, paidBy: r.paid_by, startDate: r.start_date, interval: r.interval, isActive: r.is_active, notes: r.notes || undefined };
  }

  async deleteRecurringExpense(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM recurring_expenses WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ── Household Summary ──
  async calculateHouseholdSummary(month?: string): Promise<{ partnerATotalPaid: number; partnerBTotalPaid: number }> {
    await this.ensureReady();
    let query = 'SELECT paid_by, SUM(amount) as total FROM transactions WHERE type = $1';
    const params: any[] = ['EXPENSE'];
    if (month) {
      if (month.includes('..')) {
        const [start, end] = month.split('..');
        query += ' AND date >= $2 AND date <= $3';
        params.push(start, end);
      } else {
        query += ' AND date LIKE $2';
        params.push(`${month}-%`);
      }
    }
    query += ' GROUP BY paid_by';
    const res = await this.pool.query(query, params);
    let partnerATotalPaid = 0, partnerBTotalPaid = 0;
    for (const row of res.rows) {
      if (row.paid_by === 'partner_a') partnerATotalPaid = Number(row.total);
      if (row.paid_by === 'partner_b') partnerBTotalPaid = Number(row.total);
    }
    return { partnerATotalPaid, partnerBTotalPaid };
  }

  // ── Three Month Trends ──
  async getThreeMonthTrends(month?: string): Promise<MonthTrendData[]> {
    await this.ensureReady();
    const now = new Date();
    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const trends: MonthTrendData[] = [];
    for (const m of months) {
      const txs = await this.getTransactions(m);
      const expenses = txs.filter(t => t.type === 'EXPENSE');
      const income = txs.filter(t => t.type === 'INCOME');
      const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
      const totalIncome = income.reduce((s, t) => s + t.amount, 0);
      const partnerAExpense = expenses.filter(t => t.paidBy === 'partner_a').reduce((s, t) => s + t.amount, 0);
      const partnerBExpense = expenses.filter(t => t.paidBy === 'partner_b').reduce((s, t) => s + t.amount, 0);

      const categoryBreakdown: Record<string, number> = {};
      for (const t of expenses) {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      }

      trends.push({
        monthKey: m,
        monthLabel: m,
        totalExpense, totalIncome,
        totalSavings: totalIncome - totalExpense,
        savingsRatePct: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        partnerAExpense, partnerBExpense,
        categoryBreakdown,
      });
    }
    return trends;
  }
}

// ──────────────────────────────────────────────
// File-based Database (fallback when no DATABASE_URL)
// ──────────────────────────────────────────────

interface DatabaseStore {
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  recurringExpenses: RecurringExpense[];
}

class FileDB {
  private data: DatabaseStore;

  constructor() {
    this.data = this.loadData();
    console.log('[FileDB] Using file-based store (no DATABASE_URL set)');
  }

  private loadData(): DatabaseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(DATA_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        return {
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          transactions: parsed.transactions || seedTransactions(),
          budgets: parsed.budgets || [...DEFAULT_BUDGETS],
          bills: parsed.bills || [...DEFAULT_BILLS],
          recurringExpenses: parsed.recurringExpenses || [...DEFAULT_RECURRING_EXPENSES],
        };
      }
    } catch (err) { console.error('Error loading database file:', err); }
    const initial = { settings: { ...DEFAULT_SETTINGS }, transactions: seedTransactions(), budgets: [...DEFAULT_BUDGETS], bills: [...DEFAULT_BILLS], recurringExpenses: [...DEFAULT_RECURRING_EXPENSES] };
    this.saveData(initial);
    return initial;
  }

  getStorageMode(): 'postgresql' | 'local_file' {
    return 'local_file';
  }

  private saveData(d: DatabaseStore = this.data) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf-8');
    } catch (err) {
      // Fallback for read-only serverless filesystems (e.g. Vercel)
      try {
        const tmpFile = path.join('/tmp', 'store.json');
        fs.writeFileSync(tmpFile, JSON.stringify(d, null, 2), 'utf-8');
      } catch (tmpErr) {
        console.warn('[FileDB] Notice: File persistence unavailable in read-only environment. Operating in memory.');
      }
    }
  }

  async getSettings(): Promise<AppSettings> {
    if (!this.data.settings.partnerA?.name) this.data.settings.partnerA.name = 'کاربر اول';
    if (!this.data.settings.partnerB?.name) this.data.settings.partnerB.name = 'کاربر دوم';
    return this.data.settings;
  }

  async updateSettings(s: Partial<AppSettings>): Promise<AppSettings> {
    this.data.settings = { ...this.data.settings, ...s };
    this.saveData();
    return this.data.settings;
  }

  async getTransactions(month?: string): Promise<Transaction[]> {
    if (!month) return [...this.data.transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (month.includes('..')) {
      const [start, end] = month.split('..');
      return this.data.transactions.filter(t => t.date >= start && t.date <= end).sort((a, b) => b.date.localeCompare(a.date));
    }
    return this.data.transactions.filter(t => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const fullTx: Transaction = { ...tx, id: genId('tx'), createdAt: new Date().toISOString() } as Transaction;
    this.data.transactions.push(fullTx);
    this.saveData();
    return fullTx;
  }

  async batchAddTransactions(items: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    const created = items.map(item => {
      const tx = { ...item, id: genId('tx'), createdAt: new Date().toISOString() } as Transaction;
      this.data.transactions.push(tx);
      return tx;
    });
    this.saveData();
    return created;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.data.transactions[idx] = { ...this.data.transactions[idx], ...updates };
    this.saveData();
    return this.data.transactions[idx];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const before = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    const deleted = this.data.transactions.length < before;
    if (deleted) this.saveData();
    return deleted;
  }

  async processRecurringExpenses(targetMonth: string): Promise<Transaction[]> {
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) return [];
    const templates = this.data.transactions.filter(t => t.isRecurring);
    const unique = new Map<string, Transaction>();
    for (const t of templates) { if (!unique.has(t.title)) unique.set(t.title, t); }
    const added: Transaction[] = [];
    for (const template of unique.values()) {
      const dayNum = template.recurringDay || 1;
      const newDate = `${targetMonth}-${String(dayNum).padStart(2, '0')}`;
      const exists = this.data.transactions.some(t => t.title === template.title && t.date.startsWith(targetMonth));
      if (!exists) {
        const newTx: Transaction = {
          id: genId('tx-rec'), title: template.title, amount: template.amount,
          type: template.type || 'EXPENSE', category: template.category, paidBy: template.paidBy,
          date: newDate, vendor: template.vendor,
          notes: template.notes ? `${template.notes} (Auto Recurring)` : 'Auto generated monthly recurring',
          isRecurring: false, createdAt: new Date().toISOString(),
        };
        this.data.transactions.push(newTx);
        added.push(newTx);
      }
    }
    if (added.length > 0) this.saveData();
    return added;
  }

  async getBudgets(): Promise<Budget[]> { return [...this.data.budgets]; }

  async updateBudgets(budgets: Budget[]): Promise<Budget[]> {
    this.data.budgets = budgets;
    this.saveData();
    return budgets;
  }

  async getBills(): Promise<Bill[]> { return [...this.data.bills]; }

  async addBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
    const newBill: Bill = { ...bill, id: genId('bill') };
    this.data.bills.push(newBill);
    this.saveData();
    return newBill;
  }

  async toggleBillPaid(id: string, isPaid: boolean): Promise<Bill | null> {
    const bill = this.data.bills.find(b => b.id === id);
    if (!bill) return null;
    bill.isPaidThisMonth = isPaid;
    this.saveData();
    return bill;
  }

  async deleteBill(id: string): Promise<boolean> {
    const before = this.data.bills.length;
    this.data.bills = this.data.bills.filter(b => b.id !== id);
    const deleted = this.data.bills.length < before;
    if (deleted) this.saveData();
    return deleted;
  }

  async getRecurringExpenses(): Promise<RecurringExpense[]> { return [...this.data.recurringExpenses]; }

  async addRecurringExpense(item: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
    const newItem: RecurringExpense = { ...item, id: genId('rec') };
    this.data.recurringExpenses.push(newItem);
    this.saveData();
    return newItem;
  }

  async toggleRecurringExpenseActive(id: string, isActive: boolean): Promise<RecurringExpense | null> {
    const item = this.data.recurringExpenses.find(r => r.id === id);
    if (!item) return null;
    item.isActive = isActive;
    this.saveData();
    return item;
  }

  async deleteRecurringExpense(id: string): Promise<boolean> {
    const before = this.data.recurringExpenses.length;
    this.data.recurringExpenses = this.data.recurringExpenses.filter(r => r.id !== id);
    const deleted = this.data.recurringExpenses.length < before;
    if (deleted) this.saveData();
    return deleted;
  }

  async calculateHouseholdSummary(month?: string): Promise<{ partnerATotalPaid: number; partnerBTotalPaid: number }> {
    let txs = this.data.transactions.filter(t => t.type === 'EXPENSE');
    if (month) {
      if (month.includes('..')) {
        const [start, end] = month.split('..');
        txs = txs.filter(t => t.date >= start && t.date <= end);
      } else {
        txs = txs.filter(t => t.date.startsWith(month));
      }
    }
    return {
      partnerATotalPaid: txs.filter(t => t.paidBy === 'partner_a').reduce((s, t) => s + t.amount, 0),
      partnerBTotalPaid: txs.filter(t => t.paidBy === 'partner_b').reduce((s, t) => s + t.amount, 0),
    };
  }

  async getThreeMonthTrends(month?: string): Promise<MonthTrendData[]> {
    const now = new Date();
    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const trends: MonthTrendData[] = [];
    for (const m of months) {
      const txs = await this.getTransactions(m);
      const expenses = txs.filter(t => t.type === 'EXPENSE');
      const income = txs.filter(t => t.type === 'INCOME');
      const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
      const totalIncome = income.reduce((s, t) => s + t.amount, 0);
      const partnerAExpense = expenses.filter(t => t.paidBy === 'partner_a').reduce((s, t) => s + t.amount, 0);
      const partnerBExpense = expenses.filter(t => t.paidBy === 'partner_b').reduce((s, t) => s + t.amount, 0);
      const categoryBreakdown: Record<string, number> = {};
      for (const t of expenses) categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      trends.push({
        monthKey: m, monthLabel: m, totalExpense, totalIncome,
        totalSavings: totalIncome - totalExpense,
        savingsRatePct: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        partnerAExpense, partnerBExpense, categoryBreakdown,
      });
    }
    return trends;
  }
}

// ──────────────────────────────────────────────
// Export: use PostgreSQL if DATABASE_URL is set, else file
// ──────────────────────────────────────────────

export const db = (process.env.DATABASE_URL || process.env.POSTGRES_URL) ? new PostgresDB() : new FileDB() as any;
