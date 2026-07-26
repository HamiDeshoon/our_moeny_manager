import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle2, Edit2, Save, Repeat, Plus, Trash2, Calendar, Power, Receipt } from 'lucide-react';
import { AppSettings, Budget, Category, RecurringExpense, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

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
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Tab Header Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">برنامه‌ریزی بودجه و هزینه‌های دوره‌ای</h2>
            <p className="text-xs text-zinc-500 mt-1">مدیریت سقف هزینه‌ها و پرداخت‌های خودکار</p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('targets')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'targets'
                ? 'bg-zinc-800 text-indigo-400 shadow-md shadow-black/20 border border-white/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            بودجه ماهانه
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'recurring'
                ? 'bg-zinc-800 text-indigo-400 shadow-md shadow-black/20 border border-white/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 ml-1.5" />
            <span>دوره‌ای ({recurringExpenses.length})</span>
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
                className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره سقف بودجه'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditedBudgets(budgets);
                  setIsEditing(true);
                }}
                className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-indigo-400 text-xs font-semibold px-4 py-2 rounded-xl border border-white/10 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ویرایش بودجه ماهانه</span>
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
                    isOver ? 'bg-rose-500/5 border-rose-500/20' : 'bg-black/20 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{b.category}</span>

                    {isEditing ? (
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-zinc-500 ml-2">{symbol}</span>
                        <input
                          type="number"
                          step="1000"
                          value={b.monthlyLimit}
                          onChange={(e) => handleLimitChange(b.category, e.target.value)}
                          className="w-28 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        {isOver ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3 ml-0.5" />
                            <span>بیش از بودجه</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 ml-0.5" />
                            <span>در محدوده مجاز</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                      <span className={isOver ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                        {formatMoney(spent, symbol)} مصرف شده
                      </span>
                      <span className="text-zinc-500">
                        از {formatMoney(limit, symbol)} هدف ({pct}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                هزینه‌های دوره‌ای (Automated Recurring)
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">اجاره، اینترنت و سایر پرداختی‌های مکرر</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleProcessDueExpenses}
                disabled={isProcessingDue}
                className="flex items-center space-x-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{isProcessingDue ? 'در حال بررسی...' : 'ثبت هزینه‌های سررسید شده این ماه'}</span>
              </button>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>هزینه دوره‌ای جدید</span>
              </button>
            </div>
          </div>

          {processStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
              {processStatus}
            </div>
          )}

          {/* New Recurring Form */}
          {showAddForm && (
            <form onSubmit={handleCreateRecurring} className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">عنوان هزینه</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلا: اجاره خانه"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">مبلغ ({symbol})</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مبلغ به عدد"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">دسته‌بندی</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">پرداخت کننده پیش‌فرض</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={settings.partnerA.id}>{settings.partnerA.name}</option>
                    <option value={settings.partnerB.id}>{settings.partnerB.name}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">دوره تکرار</label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MONTHLY">ماهانه</option>
                    <option value="BI_MONTHLY">هر دو ماه</option>
                    <option value="QUARTERLY">سه ماهه</option>
                    <option value="YEARLY">سالانه</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">تاریخ شروع</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl text-zinc-400 text-xs font-semibold hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-sm"
                >
                  ذخیره هزینه دوره‌ای
                </button>
              </div>
            </form>
          )}

          {/* List of Recurring Expenses */}
          <div className="space-y-3">
            {recurringExpenses.length === 0 ? (
              <EmptyState 
                icon={Receipt}
                title="هیچ هزینه دوره‌ای ثبت نشده است"
                description="می‌توانید پرداختی‌های ثابت مثل اجاره و قبوض را اینجا اضافه کنید تا خودکار ثبت شوند."
              />
            ) : (
              recurringExpenses.map((rec) => {
                const payer = rec.paidBy === settings.partnerA.id ? settings.partnerA : settings.partnerB;
                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                      rec.isActive ? 'bg-black/20 border-white/10' : 'bg-white/5 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-xs text-white ml-2">{rec.title}</span>
                        <span className="text-[10px] bg-white/5 text-zinc-300 px-2 py-0.5 rounded-full font-semibold border border-white/10">
                          {rec.category}
                        </span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {rec.interval}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-zinc-500">
                        <span>پرداخت‌کننده: <strong className="text-zinc-300 font-sans">{payer.name}</strong></span>
                        <span className="text-zinc-600">•</span>
                        <span>شروع: {rec.startDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end space-x-3">
                      <span className="text-sm font-extrabold text-white font-mono ml-4">
                        {formatMoney(rec.amount, symbol)}
                      </span>

                      <div className="flex space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rec.id, rec.isActive)}
                          title={rec.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                          className={`p-2 rounded-xl transition ${
                            rec.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                              : 'bg-white/5 text-zinc-500 hover:text-white border border-white/10'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecurring(rec.id)}
                          title="حذف"
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
