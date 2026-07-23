import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle2, Edit2, Save, Repeat, Plus, Trash2, Calendar, Power } from 'lucide-react';
import { AppSettings, Budget, Category, RecurringExpense, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';
import { api } from '../services/api';

interface BudgetPlannerProps {
  budgets: Budget[];
  transactions: Transaction[];
  settings: AppSettings;
  onUpdateBudgets: (budgets: Budget[]) => Promise<void>;
  onRefreshTransactions?: () => void;
}

const CATEGORIES: Category[] = [
  'Groceries',
  'Dining & Takeout',
  'Rent & Mortgage',
  'Utilities & Internet',
  'Household & Supplies',
  'Entertainment & Subscriptions',
  'Travel & Transport',
  'Healthcare & Wellness',
  'Shopping & Personal',
  'Other',
];

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgets,
  transactions,
  settings,
  onUpdateBudgets,
  onRefreshTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'recurring'>('targets');

  // Budget targets editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState<Budget[]>(budgets);
  const [isSaving, setIsSaving] = useState(false);

  // Recurring expenses state
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
  const [isProcessingDue, setIsProcessingDue] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);

  // New recurring form
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<Category>('Rent & Mortgage');
  const [paidBy, setPaidBy] = useState(settings.partnerA.id);
  const [interval, setInterval] = useState<'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const symbol = settings.currencySymbol || 'تومان';

  useEffect(() => {
    loadRecurringExpenses();
  }, []);

  const loadRecurringExpenses = async () => {
    setIsLoadingRecurring(true);
    try {
      const list = await api.getRecurringExpenses();
      setRecurringExpenses(list);
    } catch (err) {
      console.error('Failed to load recurring expenses:', err);
    } finally {
      setIsLoadingRecurring(false);
    }
  };

  // Calculate actual spending per category in current month
  const categorySpentMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    const expenseTxs = (transactions || []).filter((t) => t.type === 'EXPENSE');
    for (const t of expenseTxs) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    }
    return map;
  }, [transactions]);

  const handleLimitChange = (category: string, newLimit: string) => {
    const val = parseFloat(newLimit) || 0;
    setEditedBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, monthlyLimit: val } : b))
    );
  };

  const handleSaveBudgets = async () => {
    setIsSaving(true);
    try {
      await onUpdateBudgets(editedBudgets);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update budgets:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    if (!title.trim() || numAmt <= 0) return;

    try {
      const newRec = await api.addRecurringExpense({
        title: title.trim(),
        amount: numAmt,
        category,
        paidBy,
        interval,
        startDate,
        isActive: true,
        notes: notes.trim(),
      });
      setRecurringExpenses((prev) => [...prev, newRec]);
      setTitle('');
      setAmount('');
      setNotes('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create recurring expense:', err);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await api.toggleRecurringExpenseActive(id, !currentStatus);
      setRecurringExpenses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: updated.isActive } : r))
      );
    } catch (err) {
      console.error('Failed to toggle active state:', err);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await api.deleteRecurringExpense(id);
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete recurring expense:', err);
    }
  };

  const handleProcessDueExpenses = async () => {
    setIsProcessingDue(true);
    setProcessStatus(null);
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const res = await api.processRecurringTransactions(currentMonth);
      if (res.addedCount > 0) {
        setProcessStatus(`Generated ${res.addedCount} due recurring expense(s) for this month!`);
        if (onRefreshTransactions) onRefreshTransactions();
      } else {
        setProcessStatus('All recurring expenses are already logged for this month.');
      }
    } catch (err: any) {
      setProcessStatus(`Error: ${err.message || 'Failed to auto-process'}`);
    } finally {
      setIsProcessingDue(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Tab Header Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Budget Planner & Recurring Expenses</h2>
            <p className="text-xs text-slate-500">Target limits and automated recurring household costs</p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('targets')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'targets'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Targets
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === 'recurring'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurring ({recurringExpenses.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Monthly Targets */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {isEditing ? (
              <button
                onClick={handleSaveBudgets}
                disabled={isSaving}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-emerald-100"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Target Limits'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditedBudgets(budgets);
                  setIsEditing(true);
                }}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-semibold px-4 py-2 rounded-xl border border-indigo-200 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Target Limits</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(isEditing ? editedBudgets : budgets).map((b) => {
              const spent = categorySpentMap[b.category] || 0;
              const limit = b.monthlyLimit;
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = spent > limit && limit > 0;

              return (
                <div
                  key={b.category}
                  className={`p-4 rounded-xl border transition ${
                    isOver ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{b.category}</span>

                    {isEditing ? (
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-slate-400">{symbol}</span>
                        <input
                          type="number"
                          step="1000"
                          value={b.monthlyLimit}
                          onChange={(e) => handleLimitChange(b.category, e.target.value)}
                          className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        {isOver ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Over Budget</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>On Track</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                      <span className={isOver ? 'text-rose-700 font-bold' : 'text-slate-800'}>
                        {formatMoney(spent, symbol)} spent
                      </span>
                      <span className="text-slate-500">
                        of {formatMoney(limit, symbol)} target ({pct}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Recurring Expenses */}
      {activeTab === 'recurring' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Automated Recurring Expenses (هزینه‌های دوره‌ای)
              </h3>
              <p className="text-xs text-slate-500">Rent, internet, subscriptions & recurring bills</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleProcessDueExpenses}
                disabled={isProcessingDue}
                className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{isProcessingDue ? 'Processing...' : 'Post Due Expenses for Current Month'}</span>
              </button>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Recurring</span>
              </button>
            </div>
          </div>

          {processStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold">
              {processStatus}
            </div>
          )}

          {/* New Recurring Form */}
          {showAddForm && (
            <form onSubmit={handleCreateRecurring} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Expense Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Monthly Rent / Shatel Internet"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount ({symbol})</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 35000000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Default Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  >
                    <option value={settings.partnerA.id}>{settings.partnerA.name}</option>
                    <option value={settings.partnerB.id}>{settings.partnerB.name}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Recurrence Interval</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  >
                    <option value="MONTHLY">Monthly (ماهانه)</option>
                    <option value="BI_MONTHLY">Bi-Monthly (هر دو ماه)</option>
                    <option value="QUARTERLY">Quarterly (سه ماهه)</option>
                    <option value="YEARLY">Yearly (سالانه)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  Save Recurring Rule
                </button>
              </div>
            </form>
          )}

          {/* List of Recurring Expenses */}
          <div className="space-y-3">
            {recurringExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No recurring expenses configured yet.</p>
            ) : (
              recurringExpenses.map((rec) => {
                const payer = rec.paidBy === settings.partnerA.id ? settings.partnerA : settings.partnerB;
                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition ${
                      rec.isActive ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{rec.title}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                          {rec.category}
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                          {rec.interval}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                        <span>Payer: <strong className="text-slate-800 font-sans">{payer.name}</strong></span>
                        <span>•</span>
                        <span>Start: {rec.startDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-extrabold text-slate-900 font-mono">
                        {formatMoney(rec.amount, symbol)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(rec.id, rec.isActive)}
                        title={rec.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-xl transition ${
                          rec.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecurring(rec.id)}
                        title="Delete"
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
