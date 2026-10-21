import { describe, it, expect, vi } from 'vitest';
import { db, PostgresDB, LocalFileDB } from './db.js';

describe('Database layer - Recurring expenses & batch transactions', () => {
  it('processes recurring expenses in LocalFileDB correctly', async () => {
    const targetMonth = '2026-03';
    const added = await db.processRecurringExpenses(targetMonth);
    expect(Array.isArray(added)).toBe(true);

    const addedSecondTime = await db.processRecurringExpenses(targetMonth);
    expect(addedSecondTime.length).toBe(0);
  });

  it('verifies PostgresDB query count when processing recurring expenses', async () => {
    const queriesExecuted: { sql: string; params?: any[] }[] = [];

    const pgDb = Object.create(PostgresDB.prototype);
    pgDb.ready = Promise.resolve();
    pgDb.rowToTx = (row: any) => ({
      id: row.id, title: row.title, amount: Number(row.amount), type: row.type,
      category: row.category, paidBy: row.paid_by, date: row.date,
      notes: row.notes || undefined, vendor: row.vendor || undefined,
      receiptUrl: row.receipt_url || undefined, isRecurring: row.is_recurring || false,
      recurringDay: row.recurring_day || undefined, recurringFrequency: row.recurring_frequency || undefined,
      createdAt: row.created_at,
    });

    const N = 50;
    const sampleTemplates = Array.from({ length: N }, (_, i) => ({
      id: `tx-rec-${i}`,
      title: `Recurring Item ${i}`,
      amount: 1000 + i,
      type: 'EXPENSE',
      category: 'Utilities',
      paid_by: 'partner_a',
      date: '2026-01-01',
      notes: 'Monthly utility',
      vendor: 'Vendor',
      receipt_url: null,
      is_recurring: true,
      recurring_day: (i % 28) + 1,
      recurring_frequency: 'MONTHLY',
      created_at: new Date().toISOString(),
    }));

    pgDb.pool = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        queriesExecuted.push({ sql, params });
        if (sql.includes('SELECT * FROM transactions WHERE is_recurring = true')) {
          return { rows: sampleTemplates, rowCount: N };
        }
        if (sql.includes('SELECT DISTINCT title FROM transactions WHERE date LIKE')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('INSERT INTO transactions')) {
          return { rows: [], rowCount: params ? params.length / 14 : 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };

    const targetMonth = '2026-03';
    const added = await pgDb.processRecurringExpenses(targetMonth);

    expect(added.length).toBe(N);
    expect(queriesExecuted.length).toBe(3); // 1 select templates + 1 select existing + 1 bulk insert
  });

  it('verifies 2 queries when all recurring expenses already exist', async () => {
    const queriesExecuted: { sql: string; params?: any[] }[] = [];

    const pgDb = Object.create(PostgresDB.prototype);
    pgDb.ready = Promise.resolve();
    pgDb.rowToTx = (row: any) => ({
      id: row.id, title: row.title, amount: Number(row.amount), type: row.type,
      category: row.category, paidBy: row.paid_by, date: row.date,
      notes: row.notes || undefined, vendor: row.vendor || undefined,
      receiptUrl: row.receipt_url || undefined, isRecurring: row.is_recurring || false,
      recurringDay: row.recurring_day || undefined, recurringFrequency: row.recurring_frequency || undefined,
      createdAt: row.created_at,
    });

    const sampleTemplates = [
      {
        id: 'tx-rec-1', title: 'Internet', amount: 50, type: 'EXPENSE', category: 'Utilities',
        paid_by: 'partner_a', date: '2026-01-01', is_recurring: true, recurring_day: 1, created_at: new Date().toISOString(),
      },
    ];

    pgDb.pool = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        queriesExecuted.push({ sql, params });
        if (sql.includes('SELECT * FROM transactions WHERE is_recurring = true')) {
          return { rows: sampleTemplates, rowCount: 1 };
        }
        if (sql.includes('SELECT DISTINCT title FROM transactions WHERE date LIKE')) {
          return { rows: [{ title: 'Internet' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };

    const added = await pgDb.processRecurringExpenses('2026-03');
    expect(added.length).toBe(0);
    expect(queriesExecuted.length).toBe(2); // Only template fetch and existence check
  });

  it('verifies PostgresDB batchAddTransactions builds single bulk insert statement', async () => {
    const queriesExecuted: { sql: string; params?: any[] }[] = [];

    const pgDb = Object.create(PostgresDB.prototype);
    pgDb.ready = Promise.resolve();
    pgDb.pool = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        queriesExecuted.push({ sql, params });
        return { rows: [], rowCount: params ? params.length / 14 : 0 };
      }),
    };

    const itemsToAdd = [
      { title: 'A', amount: 10, category: 'Food', paidBy: 'partner_a', date: '2026-03-01' },
      { title: 'B', amount: 20, category: 'Food', paidBy: 'partner_b', date: '2026-03-02' },
      { title: 'C', amount: 30, category: 'Tech', paidBy: 'partner_a', date: '2026-03-03' },
    ];

    const res = await pgDb.batchAddTransactions(itemsToAdd);

    expect(res.length).toBe(3);
    expect(queriesExecuted.length).toBe(1);
    expect(queriesExecuted[0].sql).toContain('INSERT INTO transactions');
    expect(queriesExecuted[0].params?.length).toBe(3 * 14);
  });

  it('throws an error when initialized with an HTTPS web URL instead of a PostgreSQL URI', () => {
    const origUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'https://isubjxutyjpgsrtdiihl.supabase.co';
    try {
      const dbInstance = new PostgresDB();
      expect(dbInstance.getInitError()?.message).toContain('آدرس Supabase وارد شده یک URL وب است');
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl; else delete process.env.DATABASE_URL;
    }
  });

  it('exports and imports backup data in LocalFileDB correctly', async () => {
    const localDb = new LocalFileDB();
    const backup = await localDb.exportBackup();
    expect(backup).toHaveProperty('version');
    expect(backup).toHaveProperty('data');
    expect(backup.data).toHaveProperty('settings');

    const success = await localDb.importBackup(backup);
    expect(success).toBe(true);
  });

  it('executes full table restore inside transaction block during PostgresDB importBackup', async () => {
    const queriesExecuted: { sql: string; params?: any[] }[] = [];
    let released = false;

    const mockClient = {
      query: vi.fn(async (sql: string, params?: any[]) => {
        queriesExecuted.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn(() => {
        released = true;
      }),
    };

    const pgDb = Object.create(PostgresDB.prototype);
    pgDb.ready = Promise.resolve();
    pgDb.pool = {
      connect: vi.fn(async () => mockClient),
    };

    const dummyBackup = {
      version: '1.4.0',
      data: {
        settings: {},
        budgets: [{ category: 'Food', monthlyLimit: 500 }],
        transactions: [{ id: 'tx-1', title: 'Test Tx', amount: 50, category: 'Food', paidBy: 'partner_a', date: '2026-03-01' }],
        bills: [{ id: 'b-1', title: 'Test Bill', amount: 100, category: 'Utilities', paidBy: 'partner_a', dueDateDay: 5, isPaidThisMonth: false, autopay: false }],
        recurringExpenses: [{ id: 'r-1', title: 'Test Rec', amount: 200, category: 'Rent', paidBy: 'partner_a', startDate: '2026-01-01', interval: 'MONTHLY', isActive: true }],
        cycleLogs: [{ date: '2026-03-01', flow: 'medium' }],
        groceryItems: [{ id: 'g-1', title: 'Apples', category: 'Food', addedBy: 'partner_a' }],
        todos: [{ id: 't-1', title: 'Clean house', category: 'Chore', createdBy: 'partner_a' }],
        coupleNotes: [{ id: 'n-1', title: 'Note', content: 'Text', author: 'partner_a' }],
        wishGoals: [{ id: 'w-1', title: 'Trip', targetAmount: 1000, owner: 'partner_a' }],
        importantDates: [{ id: 'd-1', title: 'Birthday', date: '2026-05-01', createdBy: 'partner_a' }],
      },
    };

    const success = await pgDb.importBackup(dummyBackup);
    expect(success).toBe(true);
    expect(released).toBe(true);

    const sqls = queriesExecuted.map((q) => q.sql);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');

    const deleteQueries = queriesExecuted.filter((q) => q.sql.startsWith('DELETE FROM'));
    expect(deleteQueries.length).toBe(10); // budgets, transactions, bills, recurring_expenses, cycle_logs, grocery_items, todos, couple_notes, wish_goals, important_dates
  });
});
