import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import {
  AppSettings,
  Bill,
  Budget,
  CoupleNote,
  CycleLog,
  CycleSettings,
  GroceryItem,
  ImportantDate,
  MonthTrendData,
  NoteColor,
  NotificationPreferences,
  PushSubscriptionInput,
  RecurringExpense,
  TodoItem,
  Transaction,
  WishGoal,
} from '../src/types.js';

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
  return [];
}

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

function matchesMonth(date: string, month?: string): boolean {
  if (!month) return true;
  if (month.includes('..')) {
    const [start, end] = month.split('..');
    return date >= start && date <= end;
  }
  return date.startsWith(`${month}-`);
}

function getThreeCalendarMonths(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function normalizeSettings(settings: AppSettings): AppSettings {
  const normalized = { ...DEFAULT_SETTINGS, ...settings };
  if (!normalized.partnerA?.name) normalized.partnerA = { ...DEFAULT_SETTINGS.partnerA };
  if (!normalized.partnerB?.name) normalized.partnerB = { ...DEFAULT_SETTINGS.partnerB };
  if (normalized.geminiApiKey?.startsWith('Gemini API key is missing')) normalized.geminiApiKey = '';
  return normalized;
}

const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14,
  lastPeriodStart: '',
  trackPartnerId: 'partner_b',
  partnerNotes: 'چرخه سلامت و تقویم قاعدگی',
};

type StoreData = {
  settings: AppSettings;
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  recurringExpenses: RecurringExpense[];
  cycleLogs: CycleLog[];
  cycleSettings: CycleSettings;
  groceryItems: GroceryItem[];
  todos: TodoItem[];
  coupleNotes: CoupleNote[];
  wishGoals: WishGoal[];
  importantDates: ImportantDate[];
  pushSubscriptions: StoredPushSubscription[];
  notificationPreferences: Record<string, NotificationPreferences>;
  notificationDeliveries: string[];
};

type StoredPushSubscription = PushSubscriptionInput & { userName: string; updatedAt: string };

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyLogEnabled: false,
  dailyLogTime: '20:00',
  ovulationEnabled: false,
  nightlyExpenseEnabled: true,
  nightlyExpenseTime: '21:00',
  groceryAlertsEnabled: true,
  occasionAlertsEnabled: true,
  timezone: 'Asia/Tehran',
};

// ──────────────────────────────────────────────
// PostgreSQL Database Layer
// ──────────────────────────────────────────────

class PostgresDB {
  private pool: Pool;
  private ready: Promise<void>;

  constructor() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
    if (!dbUrl) {
      throw new Error('Database connection is not configured. Set DATABASE_URL or DATABASE_URL_UNPOOLED.');
    }
    const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true,
    });

    this.ready = this.init().catch(err => {
      console.error('[PostgresDB] Initialization connection failed:', err);
      throw new Error('Database initialization failed. Check the Neon connection and migrations.', { cause: err });
    });
  }

  getStorageMode(): 'postgresql' | 'local_file' {
    return 'postgresql';
  }

  private async init() {
    try {
      await this.migrate();
      await this.seed();
      console.log('[PostgresDB] Connected and Ready');
    } catch (err) {
      console.error('[PostgresDB] Initialization Migration Error:', err);
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

      CREATE TABLE IF NOT EXISTS cycle_logs (
        date TEXT PRIMARY KEY,
        flow TEXT,
        symptoms JSONB,
        mood JSONB,
        pain_level INTEGER DEFAULT 0,
        notes TEXT,
        is_period_start BOOLEAN DEFAULT false,
        is_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS cycle_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS grocery_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        quantity TEXT,
        is_checked BOOLEAN DEFAULT false,
        checked_at TEXT,
        checked_by TEXT,
        assigned_to TEXT,
        added_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to TEXT,
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        due_date TEXT,
        is_completed BOOLEAN DEFAULT false,
        completed_at TEXT,
        completed_by TEXT,
        category TEXT NOT NULL DEFAULT 'Other',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS couple_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        color TEXT NOT NULL DEFAULT 'zinc',
        is_pinned BOOLEAN DEFAULT false,
        author TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wish_goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        target_amount NUMERIC NOT NULL,
        current_amount NUMERIC NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'Other',
        icon TEXT,
        target_date TEXT,
        is_completed BOOLEAN DEFAULT false,
        completed_at TEXT,
        is_shared BOOLEAN DEFAULT true,
        owner TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS important_dates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'EVENT',
        is_recurring_yearly BOOLEAN DEFAULT false,
        notes TEXT,
        reminder_days_before INTEGER DEFAULT 1,
        icon TEXT,
        color TEXT DEFAULT 'indigo',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_name TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS notification_deliveries (
        delivery_key TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await this.pool.query('ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS medications JSONB');
  }

  private async seed() {
    // Seed settings
    const settingsExist = await this.pool.query('SELECT 1 FROM settings WHERE id = 1');
    if (settingsExist.rowCount === 0) {
      await this.pool.query('INSERT INTO settings (id, data) VALUES (1, $1)', [JSON.stringify(DEFAULT_SETTINGS)]);
    }

    // Seed cycle settings
    const cycleSetExist = await this.pool.query('SELECT 1 FROM cycle_settings WHERE id = 1');
    if (cycleSetExist.rowCount === 0) {
      await this.pool.query('INSERT INTO cycle_settings (id, data) VALUES (1, $1)', [JSON.stringify(DEFAULT_CYCLE_SETTINGS)]);
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
    return normalizeSettings(res.rows[0].data as AppSettings);
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
    const months = getThreeCalendarMonths();

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

  // ── Cycle & Period Tracking ──
  async getCycleLogs(): Promise<CycleLog[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM cycle_logs ORDER BY date DESC');
    return res.rows.map(r => ({
      date: r.date,
      flow: r.flow || undefined,
      symptoms: Array.isArray(r.symptoms) ? r.symptoms : (typeof r.symptoms === 'string' ? JSON.parse(r.symptoms) : []),
      mood: Array.isArray(r.mood) ? r.mood : (typeof r.mood === 'string' ? JSON.parse(r.mood) : []),
      medications: Array.isArray(r.medications) ? r.medications : (typeof r.medications === 'string' ? JSON.parse(r.medications) : []),
      painLevel: Number(r.pain_level || 0),
      notes: r.notes || undefined,
      isPeriodStart: Boolean(r.is_period_start),
      isPeriodEnd: Boolean(r.is_period_end),
    }));
  }

  async saveCycleLog(log: CycleLog): Promise<CycleLog> {
    await this.ensureReady();
    await this.pool.query(
      `INSERT INTO cycle_logs (date, flow, symptoms, mood, medications, pain_level, notes, is_period_start, is_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (date) DO UPDATE SET
         flow = EXCLUDED.flow,
         symptoms = EXCLUDED.symptoms,
         mood = EXCLUDED.mood,
         medications = EXCLUDED.medications,
         pain_level = EXCLUDED.pain_level,
         notes = EXCLUDED.notes,
         is_period_start = EXCLUDED.is_period_start,
         is_period_end = EXCLUDED.is_period_end`,
      [
        log.date,
        log.flow || null,
        JSON.stringify(log.symptoms || []),
        JSON.stringify(log.mood || []),
        JSON.stringify(log.medications || []),
        log.painLevel || 0,
        log.notes || null,
        log.isPeriodStart || false,
        log.isPeriodEnd || false,
      ]
    );
    return log;
  }

  async deleteCycleLog(date: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM cycle_logs WHERE date = $1', [date]);
    return (res.rowCount || 0) > 0;
  }

  async getCycleSettings(): Promise<CycleSettings> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT data FROM cycle_settings WHERE id = 1');
    if (res.rows[0]) return { ...DEFAULT_CYCLE_SETTINGS, ...res.rows[0].data };
    return DEFAULT_CYCLE_SETTINGS;
  }

  async updateCycleSettings(newSettings: Partial<CycleSettings>): Promise<CycleSettings> {
    await this.ensureReady();
    const current = await this.getCycleSettings();
    const updated = { ...current, ...newSettings };
    await this.pool.query(
      'INSERT INTO cycle_settings (id, data, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()',
      [JSON.stringify(updated)]
    );
    return updated;
  }

  // ── Helper Row Transformers for Couple Features ──
  private rowToGrocery(r: any): GroceryItem {
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      quantity: r.quantity || undefined,
      isChecked: Boolean(r.is_checked),
      checkedAt: r.checked_at || undefined,
      checkedBy: r.checked_by || undefined,
      assignedTo: r.assigned_to || undefined,
      addedBy: r.added_by,
      createdAt: r.created_at,
    };
  }

  private rowToTodo(r: any): TodoItem {
    return {
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      assignedTo: r.assigned_to || undefined,
      priority: r.priority,
      dueDate: r.due_date || undefined,
      isCompleted: Boolean(r.is_completed),
      completedAt: r.completed_at || undefined,
      completedBy: r.completed_by || undefined,
      category: r.category,
      createdBy: r.created_by,
      createdAt: r.created_at,
    };
  }

  private rowToNote(r: any): CoupleNote {
    return {
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      color: r.color,
      isPinned: Boolean(r.is_pinned),
      author: r.author,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private rowToGoal(r: any): WishGoal {
    return {
      id: r.id,
      title: r.title,
      targetAmount: Number(r.target_amount),
      currentAmount: Number(r.current_amount || 0),
      category: r.category,
      icon: r.icon || undefined,
      targetDate: r.target_date || undefined,
      isCompleted: Boolean(r.is_completed),
      completedAt: r.completed_at || undefined,
      isShared: Boolean(r.is_shared),
      owner: r.owner,
      priority: r.priority,
      notes: r.notes || undefined,
      createdAt: r.created_at,
    };
  }

  private rowToDate(r: any): ImportantDate {
    return {
      id: r.id,
      title: r.title,
      date: r.date,
      type: r.type,
      isRecurringYearly: Boolean(r.is_recurring_yearly),
      notes: r.notes || undefined,
      reminderDaysBefore: r.reminder_days_before !== null && r.reminder_days_before !== undefined ? Number(r.reminder_days_before) : undefined,
      icon: r.icon || undefined,
      color: r.color || undefined,
      createdBy: r.created_by,
      createdAt: r.created_at,
    };
  }

  // ── Grocery Items ──
  async getGroceryItems(): Promise<GroceryItem[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM grocery_items ORDER BY created_at DESC');
    return res.rows.map(r => this.rowToGrocery(r));
  }

  async addGroceryItem(item: Omit<GroceryItem, 'id' | 'createdAt' | 'isChecked'>): Promise<GroceryItem> {
    await this.ensureReady();
    const id = genId('groc');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO grocery_items (id, title, category, quantity, is_checked, checked_at, checked_by, assigned_to, added_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, item.title, item.category, item.quantity || null, false, null, null, item.assignedTo || null, item.addedBy, createdAt]
    );
    return { ...item, id, isChecked: false, createdAt };
  }

  async toggleGroceryItem(id: string, isChecked: boolean, checkedBy?: string): Promise<GroceryItem | null> {
    await this.ensureReady();
    const checkedAt = isChecked ? new Date().toISOString() : null;
    const checkedByVal = isChecked ? (checkedBy || null) : null;
    const res = await this.pool.query(
      'UPDATE grocery_items SET is_checked = $1, checked_at = $2, checked_by = $3 WHERE id = $4 RETURNING *',
      [isChecked, checkedAt, checkedByVal, id]
    );
    if (res.rows.length === 0) return null;
    return this.rowToGrocery(res.rows[0]);
  }

  async deleteGroceryItem(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM grocery_items WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async clearCheckedGroceryItems(): Promise<boolean> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM grocery_items WHERE is_checked = true');
    return true;
  }

  // ── Todos & Chores ──
  async getTodos(): Promise<TodoItem[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    return res.rows.map(r => this.rowToTodo(r));
  }

  async addTodo(item: Omit<TodoItem, 'id' | 'createdAt' | 'isCompleted'>): Promise<TodoItem> {
    await this.ensureReady();
    const id = genId('todo');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO todos (id, title, description, assigned_to, priority, due_date, is_completed, completed_at, completed_by, category, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        item.title,
        item.description || null,
        item.assignedTo || null,
        item.priority || 'MEDIUM',
        item.dueDate || null,
        false,
        null,
        null,
        item.category || 'Other',
        item.createdBy,
        createdAt,
      ]
    );
    return { ...item, id, isCompleted: false, createdAt };
  }

  async updateTodo(id: string, updates: Partial<TodoItem>, completedBy?: string): Promise<TodoItem | null> {
    await this.ensureReady();
    const curRes = await this.pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (curRes.rows.length === 0) return null;
    const current = this.rowToTodo(curRes.rows[0]);
    const merged: TodoItem = { ...current, ...updates };
    if (updates.isCompleted !== undefined) {
      merged.isCompleted = updates.isCompleted;
      merged.completedAt = updates.isCompleted ? new Date().toISOString() : undefined;
      merged.completedBy = updates.isCompleted ? (completedBy || updates.completedBy || current.completedBy) : undefined;
    }
    await this.pool.query(
      `UPDATE todos SET title=$1, description=$2, assigned_to=$3, priority=$4, due_date=$5, is_completed=$6, completed_at=$7, completed_by=$8, category=$9 WHERE id=$10`,
      [
        merged.title,
        merged.description || null,
        merged.assignedTo || null,
        merged.priority,
        merged.dueDate || null,
        merged.isCompleted,
        merged.completedAt || null,
        merged.completedBy || null,
        merged.category,
        id,
      ]
    );
    return merged;
  }

  async deleteTodo(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM todos WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ── Couple Notes ──
  async getCoupleNotes(): Promise<CoupleNote[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM couple_notes ORDER BY is_pinned DESC, updated_at DESC');
    return res.rows.map(r => this.rowToNote(r));
  }

  async addCoupleNote(note: Omit<CoupleNote, 'id' | 'createdAt' | 'updatedAt' | 'isPinned'>): Promise<CoupleNote> {
    await this.ensureReady();
    const id = genId('note');
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO couple_notes (id, title, content, category, color, is_pinned, author, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, note.title, note.content, note.category || 'General', note.color || 'zinc', false, note.author, now, now]
    );
    return { ...note, id, isPinned: false, createdAt: now, updatedAt: now };
  }

  async updateCoupleNote(id: string, updates: Partial<CoupleNote>): Promise<CoupleNote | null> {
    await this.ensureReady();
    const curRes = await this.pool.query('SELECT * FROM couple_notes WHERE id = $1', [id]);
    if (curRes.rows.length === 0) return null;
    const current = this.rowToNote(curRes.rows[0]);
    const merged: CoupleNote = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.pool.query(
      `UPDATE couple_notes SET title=$1, content=$2, category=$3, color=$4, is_pinned=$5, updated_at=$6 WHERE id=$7`,
      [merged.title, merged.content, merged.category, merged.color, merged.isPinned, merged.updatedAt, id]
    );
    return merged;
  }

  async toggleNotePin(id: string, isPinned: boolean): Promise<CoupleNote | null> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const res = await this.pool.query(
      'UPDATE couple_notes SET is_pinned = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [isPinned, now, id]
    );
    if (res.rows.length === 0) return null;
    return this.rowToNote(res.rows[0]);
  }

  async deleteCoupleNote(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM couple_notes WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ── Wish Goals ──
  async getWishGoals(): Promise<WishGoal[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM wish_goals ORDER BY created_at DESC');
    return res.rows.map(r => this.rowToGoal(r));
  }

  async addWishGoal(goal: Omit<WishGoal, 'id' | 'createdAt' | 'isCompleted' | 'currentAmount'>): Promise<WishGoal> {
    await this.ensureReady();
    const id = genId('goal');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO wish_goals (id, title, target_amount, current_amount, category, icon, target_date, is_completed, completed_at, is_shared, owner, priority, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        goal.title,
        goal.targetAmount,
        0,
        goal.category,
        goal.icon || null,
        goal.targetDate || null,
        false,
        null,
        goal.isShared !== undefined ? goal.isShared : true,
        goal.owner,
        goal.priority || 'MEDIUM',
        goal.notes || null,
        createdAt,
      ]
    );
    return { ...goal, id, currentAmount: 0, isCompleted: false, createdAt };
  }

  async updateWishGoal(id: string, updates: Partial<WishGoal>): Promise<WishGoal | null> {
    await this.ensureReady();
    const curRes = await this.pool.query('SELECT * FROM wish_goals WHERE id = $1', [id]);
    if (curRes.rows.length === 0) return null;
    const current = this.rowToGoal(curRes.rows[0]);
    const merged: WishGoal = { ...current, ...updates };
    if (updates.isCompleted !== undefined) {
      merged.isCompleted = updates.isCompleted;
      merged.completedAt = updates.isCompleted ? new Date().toISOString() : undefined;
    }
    await this.pool.query(
      `UPDATE wish_goals SET title=$1, target_amount=$2, current_amount=$3, category=$4, icon=$5, target_date=$6, is_completed=$7, completed_at=$8, is_shared=$9, priority=$10, notes=$11 WHERE id=$12`,
      [
        merged.title,
        merged.targetAmount,
        merged.currentAmount,
        merged.category,
        merged.icon || null,
        merged.targetDate || null,
        merged.isCompleted,
        merged.completedAt || null,
        merged.isShared,
        merged.priority,
        merged.notes || null,
        id,
      ]
    );
    return merged;
  }

  async deleteWishGoal(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM wish_goals WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ── Important Dates ──
  async getImportantDates(): Promise<ImportantDate[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT * FROM important_dates ORDER BY date ASC');
    return res.rows.map(r => this.rowToDate(r));
  }

  async addImportantDate(date: Omit<ImportantDate, 'id' | 'createdAt'>): Promise<ImportantDate> {
    await this.ensureReady();
    const id = genId('date');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO important_dates (id, title, date, type, is_recurring_yearly, notes, reminder_days_before, icon, color, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        date.title,
        date.date,
        date.type || 'EVENT',
        date.isRecurringYearly !== undefined ? date.isRecurringYearly : false,
        date.notes || null,
        date.reminderDaysBefore !== undefined ? date.reminderDaysBefore : 1,
        date.icon || null,
        date.color || 'indigo',
        date.createdBy,
        createdAt,
      ]
    );
    return { ...date, id, createdAt };
  }

  async updateImportantDate(id: string, updates: Partial<ImportantDate>): Promise<ImportantDate | null> {
    await this.ensureReady();
    const curRes = await this.pool.query('SELECT * FROM important_dates WHERE id = $1', [id]);
    if (curRes.rows.length === 0) return null;
    const current = this.rowToDate(curRes.rows[0]);
    const merged: ImportantDate = { ...current, ...updates };
    await this.pool.query(
      `UPDATE important_dates SET title=$1, date=$2, type=$3, is_recurring_yearly=$4, notes=$5, reminder_days_before=$6, icon=$7, color=$8 WHERE id=$9`,
      [
        merged.title,
        merged.date,
        merged.type,
        merged.isRecurringYearly,
        merged.notes || null,
        merged.reminderDaysBefore !== undefined ? merged.reminderDaysBefore : 1,
        merged.icon || null,
        merged.color || 'indigo',
        id,
      ]
    );
    return merged;
  }

  async deleteImportantDate(id: string): Promise<boolean> {
    await this.ensureReady();
    const res = await this.pool.query('DELETE FROM important_dates WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async upsertPushSubscription(userName: string, subscription: PushSubscriptionInput): Promise<void> {
    await this.ensureReady();
    await this.pool.query(
      `INSERT INTO push_subscriptions (endpoint, user_name, p256dh, auth, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (endpoint) DO UPDATE SET user_name = EXCLUDED.user_name, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = now()`,
      [subscription.endpoint, userName, subscription.keys.p256dh, subscription.keys.auth],
    );
  }

  async deletePushSubscription(userName: string, endpoint: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_name = $2', [endpoint, userName]);
  }

  async getPushSubscriptions(): Promise<StoredPushSubscription[]> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT endpoint, user_name, p256dh, auth, updated_at FROM push_subscriptions');
    return res.rows.map((row) => ({ endpoint: row.endpoint, userName: row.user_name, keys: { p256dh: row.p256dh, auth: row.auth }, updatedAt: row.updated_at?.toISOString?.() || String(row.updated_at) }));
  }

  async getNotificationPreferences(userName: string): Promise<NotificationPreferences> {
    await this.ensureReady();
    const res = await this.pool.query('SELECT data FROM notification_preferences WHERE user_name = $1', [userName]);
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(res.rows[0]?.data || {}) };
  }

  async updateNotificationPreferences(userName: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    await this.ensureReady();
    const merged = { ...(await this.getNotificationPreferences(userName)), ...preferences };
    await this.pool.query(
      'INSERT INTO notification_preferences (user_name, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (user_name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()',
      [userName, JSON.stringify(merged)],
    );
    return merged;
  }

  async claimNotificationDelivery(deliveryKey: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query('INSERT INTO notification_deliveries (delivery_key) VALUES ($1) ON CONFLICT DO NOTHING', [deliveryKey]);
    return (result.rowCount || 0) > 0;
  }

  async removePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  }

  async exportBackup(): Promise<any> {
    await this.ensureReady();
    const settings = await this.getSettings();
    const transactions = await this.getTransactions();
    const budgets = await this.getBudgets();
    const bills = await this.getBills();
    const recurringExpenses = await this.getRecurringExpenses();
    const cycleLogs = await this.getCycleLogs();
    const cycleSettings = await this.getCycleSettings();
    const groceryItems = await this.getGroceryItems();
    const todos = await this.getTodos();
    const coupleNotes = await this.getCoupleNotes();
    const wishGoals = await this.getWishGoals();
    const importantDates = await this.getImportantDates();
    return {
      version: '1.4.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        transactions,
        budgets,
        bills,
        recurringExpenses,
        cycleLogs,
        cycleSettings,
        groceryItems,
        todos,
        coupleNotes,
        wishGoals,
        importantDates,
      }
    };
  }

  async importBackup(backup: any): Promise<boolean> {
    await this.ensureReady();
    const data = backup?.data || backup;
    if (!data) return false;
    if (data.settings) await this.updateSettings(data.settings);
    if (Array.isArray(data.budgets)) await this.updateBudgets(data.budgets);
    if (data.cycleSettings) await this.updateCycleSettings(data.cycleSettings);
    return true;
  }
}

// ────��─────────────────────────────────────────
// Local JSON Database Layer
// ──────────────────────────────────────────────

class LocalFileDB {
  private store: StoreData;

  constructor() {
    this.store = this.load();
    console.log(`[LocalFileDB] Ready at ${DATA_FILE}`);
  }

  getStorageMode(): 'postgresql' | 'local_file' {
    return 'local_file';
  }

  private load(): StoreData {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const createStore = (): StoreData => ({
      settings: { ...DEFAULT_SETTINGS },
      transactions: seedTransactions(),
      budgets: [...DEFAULT_BUDGETS],
      bills: [...DEFAULT_BILLS],
      recurringExpenses: [...DEFAULT_RECURRING_EXPENSES],
      cycleLogs: [],
      cycleSettings: { ...DEFAULT_CYCLE_SETTINGS },
      groceryItems: [],
      todos: [],
      coupleNotes: [],
      wishGoals: [],
      importantDates: [],
      pushSubscriptions: [],
      notificationPreferences: {},
      notificationDeliveries: [],
    });
    if (!fs.existsSync(DATA_FILE)) {
      const initialStore = createStore();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2));
      return initialStore;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Partial<StoreData>;
      return {
        settings: normalizeSettings((parsed.settings || DEFAULT_SETTINGS) as AppSettings),
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : seedTransactions(),
        budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [...DEFAULT_BUDGETS],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [...DEFAULT_BILLS],
        recurringExpenses: Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [...DEFAULT_RECURRING_EXPENSES],
        cycleLogs: Array.isArray(parsed.cycleLogs) ? parsed.cycleLogs : [],
        cycleSettings: parsed.cycleSettings ? { ...DEFAULT_CYCLE_SETTINGS, ...parsed.cycleSettings } : { ...DEFAULT_CYCLE_SETTINGS },
        groceryItems: Array.isArray(parsed.groceryItems) ? parsed.groceryItems : [],
        todos: Array.isArray(parsed.todos) ? parsed.todos : [],
        coupleNotes: Array.isArray(parsed.coupleNotes) ? parsed.coupleNotes : [],
        wishGoals: Array.isArray(parsed.wishGoals) ? parsed.wishGoals : [],
        importantDates: Array.isArray(parsed.importantDates) ? parsed.importantDates : [],
        pushSubscriptions: Array.isArray(parsed.pushSubscriptions) ? parsed.pushSubscriptions : [],
        notificationPreferences: parsed.notificationPreferences || {},
        notificationDeliveries: Array.isArray(parsed.notificationDeliveries) ? parsed.notificationDeliveries : [],
      };
    } catch (err) {
      console.error('[LocalFileDB] Failed to read store.json; using defaults:', err);
      const fallbackStore = createStore();
      fs.writeFileSync(DATA_FILE, JSON.stringify(fallbackStore, null, 2));
      return fallbackStore;
    }
  }

  private saveTimer: NodeJS.Timeout | null = null;

  private async saveAsync(): Promise<void> {
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tempFile, JSON.stringify(this.store, null, 2), 'utf8');
      await fs.promises.rename(tempFile, DATA_FILE);
    } catch (err) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2));
      } catch (syncErr) {
        console.error('[LocalFileDB] Failed to save store:', syncErr);
      }
    }
  }

  private save(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveAsync();
    }, 40);
  }

  async getSettings(): Promise<AppSettings> {
    return normalizeSettings(this.store.settings);
  }

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    this.store.settings = normalizeSettings({ ...this.store.settings, ...newSettings });
    this.save();
    return this.store.settings;
  }

  async getTransactions(month?: string): Promise<Transaction[]> {
    return this.store.transactions
      .filter(tx => matchesMonth(tx.date, month))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const created: Transaction = {
      ...tx,
      id: genId('tx'),
      type: tx.type || 'EXPENSE',
      createdAt: new Date().toISOString(),
    } as Transaction;
    this.store.transactions.push(created);
    this.save();
    return created;
  }

  async batchAddTransactions(items: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    const created: Transaction[] = [];
    const now = new Date().toISOString();
    for (const item of items) {
      const tx: Transaction = {
        ...item,
        id: genId('tx'),
        type: item.type || 'EXPENSE',
        createdAt: now,
      } as Transaction;
      created.push(tx);
      this.store.transactions.push(tx);
    }
    this.save();
    return created;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const idx = this.store.transactions.findIndex(tx => tx.id === id);
    if (idx === -1) return null;
    this.store.transactions[idx] = { ...this.store.transactions[idx], ...updates };
    this.save();
    return this.store.transactions[idx];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const before = this.store.transactions.length;
    this.store.transactions = this.store.transactions.filter(tx => tx.id !== id);
    const deleted = this.store.transactions.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async processRecurringExpenses(targetMonth: string): Promise<Transaction[]> {
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) return [];

    const uniqueTemplates = new Map<string, Transaction>();
    for (const tx of this.store.transactions.filter(t => t.isRecurring)) {
      if (!uniqueTemplates.has(tx.title)) uniqueTemplates.set(tx.title, tx);
    }

    const added: Transaction[] = [];
    for (const template of uniqueTemplates.values()) {
      const dayNum = template.recurringDay || 1;
      const date = `${targetMonth}-${String(dayNum).padStart(2, '0')}`;
      const exists = this.store.transactions.some(tx => tx.title === template.title && matchesMonth(tx.date, targetMonth));
      if (!exists) {
        added.push(await this.addTransaction({
          title: template.title,
          amount: template.amount,
          type: template.type || 'EXPENSE',
          category: template.category,
          paidBy: template.paidBy,
          date,
          vendor: template.vendor,
          notes: template.notes ? `${template.notes} (Auto Recurring)` : 'Auto generated monthly recurring',
          isRecurring: false,
        }));
      }
    }
    return added;
  }

  async getBudgets(): Promise<Budget[]> {
    return [...this.store.budgets];
  }

  async updateBudgets(budgets: Budget[]): Promise<Budget[]> {
    this.store.budgets = budgets;
    this.save();
    return this.store.budgets;
  }

  async getBills(): Promise<Bill[]> {
    return [...this.store.bills];
  }

  async addBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
    const created = { ...bill, id: genId('bill') };
    this.store.bills.push(created);
    this.save();
    return created;
  }

  async toggleBillPaid(id: string, isPaid: boolean): Promise<Bill | null> {
    const bill = this.store.bills.find(b => b.id === id);
    if (!bill) return null;
    bill.isPaidThisMonth = isPaid;
    this.save();
    return bill;
  }

  async deleteBill(id: string): Promise<boolean> {
    const before = this.store.bills.length;
    this.store.bills = this.store.bills.filter(bill => bill.id !== id);
    const deleted = this.store.bills.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    return [...this.store.recurringExpenses];
  }

  async addRecurringExpense(item: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
    const created = { ...item, id: genId('rec') };
    this.store.recurringExpenses.push(created);
    this.save();
    return created;
  }

  async toggleRecurringExpenseActive(id: string, isActive: boolean): Promise<RecurringExpense | null> {
    const item = this.store.recurringExpenses.find(rec => rec.id === id);
    if (!item) return null;
    item.isActive = isActive;
    this.save();
    return item;
  }

  async deleteRecurringExpense(id: string): Promise<boolean> {
    const before = this.store.recurringExpenses.length;
    this.store.recurringExpenses = this.store.recurringExpenses.filter(rec => rec.id !== id);
    const deleted = this.store.recurringExpenses.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async calculateHouseholdSummary(month?: string): Promise<{ partnerATotalPaid: number; partnerBTotalPaid: number }> {
    const expenses = this.store.transactions.filter(tx => tx.type === 'EXPENSE' && matchesMonth(tx.date, month));
    return expenses.reduce(
      (summary, tx) => {
        if (tx.paidBy === 'partner_a') summary.partnerATotalPaid += tx.amount;
        if (tx.paidBy === 'partner_b') summary.partnerBTotalPaid += tx.amount;
        return summary;
      },
      { partnerATotalPaid: 0, partnerBTotalPaid: 0 },
    );
  }

  async getThreeMonthTrends(month?: string): Promise<MonthTrendData[]> {
    const months = month && /^\d{4}-\d{2}$/.test(month) ? [month] : getThreeCalendarMonths();
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
        monthKey: m,
        monthLabel: m,
        totalExpense,
        totalIncome,
        totalSavings: totalIncome - totalExpense,
        savingsRatePct: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        partnerAExpense,
        partnerBExpense,
        categoryBreakdown,
      });
    }

    return trends;
  }

  // ── Cycle & Period Tracking ──
  async getCycleLogs(): Promise<CycleLog[]> {
    return (this.store.cycleLogs || []).sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveCycleLog(log: CycleLog): Promise<CycleLog> {
    if (!this.store.cycleLogs) this.store.cycleLogs = [];
    const idx = this.store.cycleLogs.findIndex(l => l.date === log.date);
    if (idx >= 0) {
      this.store.cycleLogs[idx] = { ...this.store.cycleLogs[idx], ...log };
    } else {
      this.store.cycleLogs.push(log);
    }
    this.save();
    return log;
  }

  async deleteCycleLog(date: string): Promise<boolean> {
    if (!this.store.cycleLogs) return false;
    const before = this.store.cycleLogs.length;
    this.store.cycleLogs = this.store.cycleLogs.filter(l => l.date !== date);
    const deleted = this.store.cycleLogs.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async getCycleSettings(): Promise<CycleSettings> {
    return { ...DEFAULT_CYCLE_SETTINGS, ...(this.store.cycleSettings || {}) };
  }

  async updateCycleSettings(newSettings: Partial<CycleSettings>): Promise<CycleSettings> {
    this.store.cycleSettings = { ...DEFAULT_CYCLE_SETTINGS, ...(this.store.cycleSettings || {}), ...newSettings };
    this.save();
    return this.store.cycleSettings;
  }

  // ── Grocery Items ──
  async getGroceryItems(): Promise<GroceryItem[]> {
    return [...(this.store.groceryItems || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addGroceryItem(item: Omit<GroceryItem, 'id' | 'createdAt' | 'isChecked'>): Promise<GroceryItem> {
    if (!this.store.groceryItems) this.store.groceryItems = [];
    const id = genId('groc');
    const createdAt = new Date().toISOString();
    const newItem: GroceryItem = { ...item, id, isChecked: false, createdAt };
    this.store.groceryItems.unshift(newItem);
    this.save();
    return newItem;
  }

  async toggleGroceryItem(id: string, isChecked: boolean, checkedBy?: string): Promise<GroceryItem | null> {
    if (!this.store.groceryItems) this.store.groceryItems = [];
    const idx = this.store.groceryItems.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.store.groceryItems[idx].isChecked = isChecked;
    this.store.groceryItems[idx].checkedAt = isChecked ? new Date().toISOString() : undefined;
    this.store.groceryItems[idx].checkedBy = isChecked ? checkedBy : undefined;
    this.save();
    return this.store.groceryItems[idx];
  }

  async deleteGroceryItem(id: string): Promise<boolean> {
    if (!this.store.groceryItems) return false;
    const before = this.store.groceryItems.length;
    this.store.groceryItems = this.store.groceryItems.filter(i => i.id !== id);
    const deleted = this.store.groceryItems.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async clearCheckedGroceryItems(): Promise<boolean> {
    if (!this.store.groceryItems) return true;
    this.store.groceryItems = this.store.groceryItems.filter(i => !i.isChecked);
    this.save();
    return true;
  }

  // ── Todos & Chores ──
  async getTodos(): Promise<TodoItem[]> {
    return [...(this.store.todos || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addTodo(item: Omit<TodoItem, 'id' | 'createdAt' | 'isCompleted'>): Promise<TodoItem> {
    if (!this.store.todos) this.store.todos = [];
    const id = genId('todo');
    const createdAt = new Date().toISOString();
    const newItem: TodoItem = { ...item, id, isCompleted: false, createdAt };
    this.store.todos.unshift(newItem);
    this.save();
    return newItem;
  }

  async updateTodo(id: string, updates: Partial<TodoItem>, completedBy?: string): Promise<TodoItem | null> {
    if (!this.store.todos) this.store.todos = [];
    const idx = this.store.todos.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const current = this.store.todos[idx];
    const isCompleted = updates.isCompleted !== undefined ? updates.isCompleted : current.isCompleted;
    const completedAt = updates.isCompleted !== undefined ? (updates.isCompleted ? new Date().toISOString() : undefined) : current.completedAt;
    const completedByVal = updates.isCompleted !== undefined ? (updates.isCompleted ? (completedBy || updates.completedBy || current.completedBy) : undefined) : current.completedBy;
    const updated: TodoItem = {
      ...current,
      ...updates,
      isCompleted,
      completedAt,
      completedBy: completedByVal,
    };
    this.store.todos[idx] = updated;
    this.save();
    return updated;
  }

  async deleteTodo(id: string): Promise<boolean> {
    if (!this.store.todos) return false;
    const before = this.store.todos.length;
    this.store.todos = this.store.todos.filter(t => t.id !== id);
    const deleted = this.store.todos.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  // ── Couple Notes ──
  async getCoupleNotes(): Promise<CoupleNote[]> {
    return [...(this.store.coupleNotes || [])].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  async addCoupleNote(note: Omit<CoupleNote, 'id' | 'createdAt' | 'updatedAt' | 'isPinned'>): Promise<CoupleNote> {
    if (!this.store.coupleNotes) this.store.coupleNotes = [];
    const id = genId('note');
    const now = new Date().toISOString();
    const newNote: CoupleNote = { ...note, id, isPinned: false, createdAt: now, updatedAt: now };
    this.store.coupleNotes.unshift(newNote);
    this.save();
    return newNote;
  }

  async updateCoupleNote(id: string, updates: Partial<CoupleNote>): Promise<CoupleNote | null> {
    if (!this.store.coupleNotes) this.store.coupleNotes = [];
    const idx = this.store.coupleNotes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    const updated: CoupleNote = { ...this.store.coupleNotes[idx], ...updates, updatedAt: new Date().toISOString() };
    this.store.coupleNotes[idx] = updated;
    this.save();
    return updated;
  }

  async toggleNotePin(id: string, isPinned: boolean): Promise<CoupleNote | null> {
    if (!this.store.coupleNotes) this.store.coupleNotes = [];
    const idx = this.store.coupleNotes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.store.coupleNotes[idx].isPinned = isPinned;
    this.store.coupleNotes[idx].updatedAt = new Date().toISOString();
    this.save();
    return this.store.coupleNotes[idx];
  }

  async deleteCoupleNote(id: string): Promise<boolean> {
    if (!this.store.coupleNotes) return false;
    const before = this.store.coupleNotes.length;
    this.store.coupleNotes = this.store.coupleNotes.filter(n => n.id !== id);
    const deleted = this.store.coupleNotes.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  // ── Wish Goals ──
  async getWishGoals(): Promise<WishGoal[]> {
    return [...(this.store.wishGoals || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addWishGoal(goal: Omit<WishGoal, 'id' | 'createdAt' | 'isCompleted' | 'currentAmount'>): Promise<WishGoal> {
    if (!this.store.wishGoals) this.store.wishGoals = [];
    const id = genId('goal');
    const createdAt = new Date().toISOString();
    const newGoal: WishGoal = {
      ...goal,
      id,
      currentAmount: 0,
      isCompleted: false,
      isShared: goal.isShared !== undefined ? goal.isShared : true,
      createdAt,
    };
    this.store.wishGoals.unshift(newGoal);
    this.save();
    return newGoal;
  }

  async updateWishGoal(id: string, updates: Partial<WishGoal>): Promise<WishGoal | null> {
    if (!this.store.wishGoals) this.store.wishGoals = [];
    const idx = this.store.wishGoals.findIndex(g => g.id === id);
    if (idx === -1) return null;
    const cur = this.store.wishGoals[idx];
    const isCompleted = updates.isCompleted !== undefined ? updates.isCompleted : cur.isCompleted;
    const completedAt = updates.isCompleted !== undefined ? (updates.isCompleted ? new Date().toISOString() : undefined) : cur.completedAt;
    const updated: WishGoal = { ...cur, ...updates, isCompleted, completedAt };
    this.store.wishGoals[idx] = updated;
    this.save();
    return updated;
  }

  async deleteWishGoal(id: string): Promise<boolean> {
    if (!this.store.wishGoals) return false;
    const before = this.store.wishGoals.length;
    this.store.wishGoals = this.store.wishGoals.filter(g => g.id !== id);
    const deleted = this.store.wishGoals.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  // ── Important Dates ──
  async getImportantDates(): Promise<ImportantDate[]> {
    return [...(this.store.importantDates || [])].sort((a, b) => a.date.localeCompare(b.date));
  }

  async addImportantDate(date: Omit<ImportantDate, 'id' | 'createdAt'>): Promise<ImportantDate> {
    if (!this.store.importantDates) this.store.importantDates = [];
    const id = genId('date');
    const createdAt = new Date().toISOString();
    const newDate: ImportantDate = {
      ...date,
      id,
      isRecurringYearly: date.isRecurringYearly !== undefined ? date.isRecurringYearly : false,
      reminderDaysBefore: date.reminderDaysBefore !== undefined ? date.reminderDaysBefore : 1,
      createdAt,
    };
    this.store.importantDates.push(newDate);
    this.save();
    return newDate;
  }

  async updateImportantDate(id: string, updates: Partial<ImportantDate>): Promise<ImportantDate | null> {
    if (!this.store.importantDates) this.store.importantDates = [];
    const idx = this.store.importantDates.findIndex(d => d.id === id);
    if (idx === -1) return null;
    const updated: ImportantDate = { ...this.store.importantDates[idx], ...updates };
    this.store.importantDates[idx] = updated;
    this.save();
    return updated;
  }

  async deleteImportantDate(id: string): Promise<boolean> {
    if (!this.store.importantDates) return false;
    const before = this.store.importantDates.length;
    this.store.importantDates = this.store.importantDates.filter(d => d.id !== id);
    const deleted = this.store.importantDates.length !== before;
    if (deleted) this.save();
    return deleted;
  }

  async upsertPushSubscription(userName: string, subscription: PushSubscriptionInput): Promise<void> {
    this.store.pushSubscriptions = this.store.pushSubscriptions.filter((item) => item.endpoint !== subscription.endpoint);
    this.store.pushSubscriptions.push({ ...subscription, userName, updatedAt: new Date().toISOString() });
    this.save();
  }

  async deletePushSubscription(userName: string, endpoint: string): Promise<void> {
    this.store.pushSubscriptions = this.store.pushSubscriptions.filter((item) => !(item.endpoint === endpoint && item.userName === userName));
    this.save();
  }

  async getPushSubscriptions(): Promise<StoredPushSubscription[]> {
    return [...this.store.pushSubscriptions];
  }

  async getNotificationPreferences(userName: string): Promise<NotificationPreferences> {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(this.store.notificationPreferences[userName] || {}) };
  }

  async updateNotificationPreferences(userName: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const merged = { ...(await this.getNotificationPreferences(userName)), ...preferences };
    this.store.notificationPreferences[userName] = merged;
    this.save();
    return merged;
  }

  async claimNotificationDelivery(deliveryKey: string): Promise<boolean> {
    if (this.store.notificationDeliveries.includes(deliveryKey)) return false;
    this.store.notificationDeliveries.push(deliveryKey);
    this.store.notificationDeliveries = this.store.notificationDeliveries.slice(-1000);
    this.save();
    return true;
  }

  async removePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    this.store.pushSubscriptions = this.store.pushSubscriptions.filter((item) => item.endpoint !== endpoint);
    this.save();
  }

  async exportBackup(): Promise<any> {
    return {
      version: '1.4.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings: this.store.settings,
        transactions: this.store.transactions,
        budgets: this.store.budgets,
        bills: this.store.bills,
        recurringExpenses: this.store.recurringExpenses,
        cycleLogs: this.store.cycleLogs,
        cycleSettings: this.store.cycleSettings,
        groceryItems: this.store.groceryItems,
        todos: this.store.todos,
        coupleNotes: this.store.coupleNotes,
        wishGoals: this.store.wishGoals,
        importantDates: this.store.importantDates,
      }
    };
  }

  async importBackup(backup: any): Promise<boolean> {
    const data = backup?.data || backup;
    if (!data) return false;
    if (data.settings) this.store.settings = normalizeSettings(data.settings);
    if (Array.isArray(data.transactions)) this.store.transactions = data.transactions;
    if (Array.isArray(data.budgets)) this.store.budgets = data.budgets;
    if (Array.isArray(data.bills)) this.store.bills = data.bills;
    if (Array.isArray(data.recurringExpenses)) this.store.recurringExpenses = data.recurringExpenses;
    if (Array.isArray(data.cycleLogs)) this.store.cycleLogs = data.cycleLogs;
    if (data.cycleSettings) this.store.cycleSettings = { ...DEFAULT_CYCLE_SETTINGS, ...data.cycleSettings };
    if (Array.isArray(data.groceryItems)) this.store.groceryItems = data.groceryItems;
    if (Array.isArray(data.todos)) this.store.todos = data.todos;
    if (Array.isArray(data.coupleNotes)) this.store.coupleNotes = data.coupleNotes;
    if (Array.isArray(data.wishGoals)) this.store.wishGoals = data.wishGoals;
    if (Array.isArray(data.importantDates)) this.store.importantDates = data.importantDates;
    this.save();
    return true;
  }
}

// ──────────────────────────────────────────────
// Export: PostgreSQL when configured, otherwise local JSON fallback
// ──────────────────────────────────────────────

export const db = (process.env.DATABASE_URL || process.env.POSTGRES_URL) ? new PostgresDB() : new LocalFileDB();
