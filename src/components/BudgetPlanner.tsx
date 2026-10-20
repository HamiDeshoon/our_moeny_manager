import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  Repeat,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Check,
  Building,
  User,
  Power
} from 'lucide-react';
import { AppSettings, Budget, Category, RecurringExpense, Transaction } from '../types';
import { formatMoney, gregorianToJalali } from '../utils/formatters';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface BudgetPlannerProps {
  budgets: Budget[];
  transactions: Transaction[];
  settings: AppSettings;
  onUpdateBudgets: (budgets: Budget[]) => Promise<void>;
  onRefreshTransactions?: () => void;
}

export interface LoanInstallment {
  id: string;
  title: string;
  monthlyAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  paidBy: string; // partner_a | partner_b | both
  notes?: string;
  createdAt: string;
}

const CATEGORY_MAP: Record<Category, { fa: string; icon: string; color: string }> = {
  'Groceries': { fa: 'خوراک و سوپرمارکت', icon: '🛒', color: 'from-emerald-500/20 to-emerald-500/5' },
  'Dining & Takeout': { fa: 'کافه و رستوران', icon: '☕', color: 'from-amber-500/20 to-amber-500/5' },
  'Rent & Mortgage': { fa: 'مسکن و اجاره', icon: '🏠', color: 'from-blue-500/20 to-blue-500/5' },
  'Utilities & Internet': { fa: 'قبوض، شارژ و نت', icon: '💡', color: 'from-cyan-500/20 to-cyan-500/5' },
  'Household & Supplies': { fa: 'لوازم خانه', icon: '🪴', color: 'from-teal-500/20 to-teal-500/5' },
  'Entertainment & Subscriptions': { fa: 'تفریح و سرگرمی', icon: '🎬', color: 'from-purple-500/20 to-purple-500/5' },
  'Travel & Transport': { fa: 'حمل‌ونقل و سوخت', icon: '🚗', color: 'from-sky-500/20 to-sky-500/5' },
  'Healthcare & Wellness': { fa: 'پزشکی و سلامتی', icon: '💊', color: 'from-rose-500/20 to-rose-500/5' },
  'Shopping & Personal': { fa: 'خرید و پوشاک', icon: '🛍️', color: 'from-pink-500/20 to-pink-500/5' },
  'Income & Salary': { fa: 'درآمد و حقوق', icon: '💰', color: 'from-emerald-500/20 to-emerald-500/5' },
  'Internal Transfer': { fa: 'انتقال داخلی', icon: '🔄', color: 'from-blue-500/20 to-blue-500/5' },
  'Other': { fa: 'سایر و متفرقه', icon: '📦', color: 'from-zinc-500/20 to-zinc-500/5' },
};

const CATEGORIES = Object.keys(CATEGORY_MAP) as Category[];

const LOANS_STORAGE_KEY = 'duospend_loans_installments_v1';

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgets,
  transactions,
  settings,
  onUpdateBudgets,
  onRefreshTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'loans' | 'recurring'>('budget');

  // Budget targets state
  const [isEditing, setIsEditing] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState<Budget[]>(budgets);
  const [isSaving, setIsSaving] = useState(false);

  // Recurring expenses state
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
  const [isProcessingDue, setIsProcessingDue] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);

  // Recurring Form
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState<number | ''>('');
  const [recCategory, setRecCategory] = useState<Category>('Rent & Mortgage');
  const [recPaidBy, setRecPaidBy] = useState(settings.partnerA?.id || 'partner_a');
  const [recInterval, setRecInterval] = useState<'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recNotes, setRecNotes] = useState('');

  // Loans / Installments State
  const [loans, setLoans] = useState<LoanInstallment[]>(() => {
    try {
      const saved = localStorage.getItem(LOANS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse loans:', e);
    }
    return [
      {
        id: 'loan-sample-1',
        title: 'وام ازدواج / مسکن',
        monthlyAmount: 3000000,
        totalInstallments: 24,
        paidInstallments: 8,
        dueDay: 15,
        startDate: '۱۴۰۳/۰۶',
        endDate: '۱۴۰۵/۰۶ (۲ ساله)',
        paidBy: 'partner_a',
        notes: 'پرداخت از حساب ملت',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // New Loan Form State
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [loanTitle, setLoanTitle] = useState('');
  const [loanMonthlyAmount, setLoanMonthlyAmount] = useState<number | ''>('');
  const [loanTotalInstallments, setLoanTotalInstallments] = useState<number>(12);
  const [loanPaidInstallments, setLoanPaidInstallments] = useState<number>(0);
  const [loanDueDay, setLoanDueDay] = useState<number>(5);
  const [loanDurationPreset, setLoanDurationPreset] = useState<'6' | '12' | '24' | '36' | 'custom'>('12');
  const [loanPaidBy, setLoanPaidBy] = useState(settings.partnerA?.id || 'partner_a');
  const [loanNotes, setLoanNotes] = useState('');

  const symbol = settings.currencySymbol || 'تومان';

  // Save loans to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    } catch (e) {
      console.error('Failed to save loans:', e);
    }
  }, [loans]);

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

  // Spending per category in current month
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    const expenseTxs = (transactions || []).filter((t) => t.type === 'EXPENSE');
    for (const t of expenseTxs) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    }
    return map;
  }, [transactions]);

  // Overall Budget calculations
  const totalBudgetLimit = useMemo(() => {
    return (budgets || []).reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);
  }, [budgets]);

  const totalSpent = useMemo(() => {
    return Object.values(categorySpentMap).reduce((acc, v) => acc + v, 0);
  }, [categorySpentMap]);

  const remainingBudget = Math.max(0, totalBudgetLimit - totalSpent);
  const overallPercentage = totalBudgetLimit > 0 ? Math.min(100, Math.round((totalSpent / totalBudgetLimit) * 100)) : 0;

  // Total monthly installments sum
  const totalMonthlyInstallments = useMemo(() => {
    return loans
      .filter((l) => l.paidInstallments < l.totalInstallments)
      .reduce((acc, l) => acc + l.monthlyAmount, 0);
  }, [loans]);

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

  // Loan Actions
  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = typeof loanMonthlyAmount === 'number' ? loanMonthlyAmount : parseFloat(loanMonthlyAmount) || 0;
    if (!loanTitle.trim() || amountNum <= 0 || loanTotalInstallments <= 0) return;

    const now = new Date();
    const [jy, jm] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    // Approximate Jalali end date
    const totalMonths = loanTotalInstallments;
    let endJm = jm + (totalMonths % 12);
    let endJy = jy + Math.floor(totalMonths / 12);
    if (endJm > 12) {
      endJm -= 12;
      endJy += 1;
    }

    const durationText =
      loanTotalInstallments === 6
        ? '۶ ماهه'
        : loanTotalInstallments === 12
        ? '۱ ساله'
        : loanTotalInstallments === 24
        ? '۲ ساله'
        : loanTotalInstallments === 36
        ? '۳ ساله'
        : `${loanTotalInstallments} ماهه`;

    const newLoan: LoanInstallment = {
      id: `loan-${Date.now()}`,
      title: loanTitle.trim(),
      monthlyAmount: amountNum,
      totalInstallments: loanTotalInstallments,
      paidInstallments: Math.min(loanTotalInstallments, Math.max(0, loanPaidInstallments)),
      dueDay: loanDueDay,
      startDate: `${jy}/${String(jm).padStart(2, '0')}`,
      endDate: `${endJy}/${String(endJm).padStart(2, '0')} (${durationText})`,
      paidBy: loanPaidBy,
      notes: loanNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setLoans((prev) => [newLoan, ...prev]);
    setLoanTitle('');
    setLoanMonthlyAmount('');
    setLoanTotalInstallments(12);
    setLoanPaidInstallments(0);
    setLoanDueDay(5);
    setLoanNotes('');
    setShowAddLoan(false);
  };

  const handleIncrementInstallment = (id: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id === id && l.paidInstallments < l.totalInstallments) {
          return { ...l, paidInstallments: l.paidInstallments + 1 };
        }
        return l;
      })
    );
  };

  const handleDecrementInstallment = (id: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id === id && l.paidInstallments > 0) {
          return { ...l, paidInstallments: l.paidInstallments - 1 };
        }
        return l;
      })
    );
  };

  const handleDeleteLoan = (id: string) => {
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  // Recurring Handlers
  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = typeof recAmount === 'number' ? recAmount : parseFloat(recAmount) || 0;
    if (!recTitle.trim() || numAmt <= 0) return;

    try {
      const newRec = await api.addRecurringExpense({
        title: recTitle.trim(),
        amount: numAmt,
        category: recCategory,
        paidBy: recPaidBy,
        interval: recInterval,
        startDate: recStartDate,
        isActive: true,
        notes: recNotes.trim(),
      });
      setRecurringExpenses((prev) => [...prev, newRec]);
      setRecTitle('');
      setRecAmount('');
      setRecNotes('');
      setShowAddRecurring(false);
    } catch (err) {
      console.error('Failed to create recurring expense:', err);
    }
  };

  const handleToggleActiveRecurring = async (id: string, currentStatus: boolean) => {
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
        setProcessStatus(`${res.addedCount} هزینه دوره‌ای سررسیدشده این ماه با موفقیت ثبت شد.`);
        if (onRefreshTransactions) onRefreshTransactions();
      } else {
        setProcessStatus('تمامی هزینه‌های دوره‌ای این ماه قبلاً ثبت شده‌اند.');
      }
    } catch (err: any) {
      setProcessStatus(`خطا: ${err.message || 'ثبت خودکار ناموفق بود'}`);
    } finally {
      setIsProcessingDue(false);
    }
  };

  const now = new Date();
  const todayDay = now.getDate();

  return (
    <div className="space-y-4 text-zinc-100">
      {/* 1. Header Navigation Tabs */}
      <div className="flex items-center justify-between gap-1 rounded-2xl bg-black/30 p-1.5 border border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('budget')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'budget'
              ? 'bg-teal-500/20 border border-teal-400/30 text-teal-200 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4 text-teal-300" />
          <span>سقف بودجه</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'loans'
              ? 'bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-300" />
          <span>وام‌ها و اقساط ({loans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'recurring'
              ? 'bg-amber-500/20 border border-amber-400/30 text-amber-200 shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Repeat className="w-4 h-4 text-amber-300" />
          <span>اشتراک‌ها ({recurringExpenses.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MONTHLY BUDGET TARGETS */}
      {/* ======================================================== */}
      {activeTab === 'budget' && (
        <div className="space-y-4">
          {/* Executive Overview Card */}
          <div className="rounded-[1.5rem] border border-teal-400/20 bg-gradient-to-br from-[#142822] to-[#0c1815] p-4 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-teal-300">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-bold">وضعیت کل بودجه این ماه</span>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                overallPercentage > 100
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : overallPercentage > 85
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
              }`}>
                {overallPercentage}% مصرف شده
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-2 bg-black/25 rounded-xl border border-white/5">
              <div>
                <p className="text-[10px] text-zinc-400">سقف کل</p>
                <p className="text-xs font-extrabold text-white mt-0.5">{formatMoney(totalBudgetLimit, symbol)}</p>
              </div>
              <div className="border-x border-white/5">
                <p className="text-[10px] text-zinc-400">خرج شده</p>
                <p className={`text-xs font-extrabold mt-0.5 ${overallPercentage > 100 ? 'text-rose-400' : 'text-amber-300'}`}>
                  {formatMoney(totalSpent, symbol)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400">باقیمانده آزاد</p>
                <p className="text-xs font-extrabold text-teal-300 mt-0.5">{formatMoney(remainingBudget, symbol)}</p>
              </div>
            </div>

            <div className="mt-3 w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                style={{ width: `${overallPercentage}%` }}
                className={`h-full transition-all duration-700 rounded-full ${
                  overallPercentage > 100 ? 'bg-rose-500' : overallPercentage > 85 ? 'bg-amber-500' : 'bg-teal-400'
                }`}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-zinc-300">سقف بودجه به تفکیک دسته‌ها</h3>
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveBudgets}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-teal-500 text-[#0a201a] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-teal-400 transition shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditedBudgets(budgets);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 bg-white/5 text-teal-300 hover:bg-white/10 font-bold text-xs px-3 py-1.5 rounded-xl border border-white/10 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ویرایش سقف‌ها</span>
              </button>
            )}
          </div>

          {/* Category Cards Grid */}
          <div className="space-y-2.5">
            {(isEditing ? editedBudgets : budgets).map((b) => {
              const info = CATEGORY_MAP[b.category] || { fa: b.category, icon: '🏷️', color: 'from-zinc-500/20 to-zinc-500/5' };
              const spent = categorySpentMap[b.category] || 0;
              const limit = b.monthlyLimit;
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = spent > limit && limit > 0;
              const left = Math.max(0, limit - spent);

              return (
                <div
                  key={b.category}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    isOver
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{info.fa}</p>
                        <p className="text-[10px] text-zinc-500">{b.category}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400">{symbol}</span>
                        <input
                          type="number"
                          step="100000"
                          value={b.monthlyLimit}
                          onChange={(e) => handleLimitChange(b.category, e.target.value)}
                          className="w-24 bg-zinc-900 border border-white/20 rounded-lg px-2 py-1 text-white font-mono text-xs text-center focus:outline-none focus:border-teal-400"
                        />
                      </div>
                    ) : (
                      <div className="text-left">
                        <p className="text-xs font-mono font-bold text-white">
                          {formatMoney(spent, symbol)}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          از {formatMoney(limit, symbol)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] mb-1 font-mono">
                      <span className={isOver ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                        {pct}% مصرف شده
                      </span>
                      <span className="text-zinc-400">
                        {isOver ? (
                          <span className="text-rose-400">اضافه خرج: {formatMoney(spent - limit, symbol)}</span>
                        ) : (
                          <span>مانده: {formatMoney(left, symbol)}</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-400' : 'bg-teal-400'
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

      {/* ======================================================== */}
      {/* TAB 2: LOANS, INSTALLMENTS & DEBTS (WITH EXPIRY / DURATION) */}
      {/* ======================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="rounded-[1.5rem] border border-indigo-400/20 bg-gradient-to-br from-[#1a1730] to-[#100e20] p-4 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-indigo-300">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold">مجموع تعهدات و اقساط ماهانه</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLoan(!showAddLoan)}
                className="flex items-center gap-1 bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-indigo-400 transition shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>وام / قسط جدید</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-black/25 p-3 border border-white/5">
                <p className="text-[10px] text-zinc-400">مجموع اقساط این ماه</p>
                <p className="text-base font-extrabold text-indigo-200 mt-1">
                  {formatMoney(totalMonthlyInstallments, symbol)}
                </p>
              </div>

              <div className="rounded-xl bg-black/25 p-3 border border-white/5">
                <p className="text-[10px] text-zinc-400">تعداد وام‌های فعال</p>
                <p className="text-base font-extrabold text-white mt-1">
                  {loans.filter((l) => l.paidInstallments < l.totalInstallments).length} فقره
                </p>
              </div>
            </div>
          </div>

          {/* Add Loan Form */}
          {showAddLoan && (
            <form onSubmit={handleAddLoan} className="rounded-2xl border border-indigo-400/30 bg-[#161328] p-4 space-y-3 shadow-xl">
              <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>ثبت وام، قسط یا بدهی مدت‌دار جدید</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">عنوان وام یا قسط</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: وام خودرو ۲ ساله، قسط لپ‌تاپ ۶ ماهه"
                    value={loanTitle}
                    onChange={(e) => setLoanTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">مبلغ هر قسط ماهانه ({symbol})</label>
                  <input
                    type="number"
                    required
                    placeholder="مثلا: ۲,۵۰۰,۰۰۰"
                    value={loanMonthlyAmount}
                    onChange={(e) => setLoanMonthlyAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">مدت کل بازپرداخت (تعداد اقساط)</label>
                  <div className="flex gap-1.5 mb-1.5">
                    {(['6', '12', '24', '36'] as const).map((months) => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => {
                          setLoanDurationPreset(months);
                          setLoanTotalInstallments(Number(months));
                        }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                          loanDurationPreset === months
                            ? 'bg-indigo-500 text-white border-indigo-400'
                            : 'bg-black/30 text-zinc-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {months === '6' ? '۶ ماهه' : months === '12' ? '۱ ساله' : months === '24' ? '۲ ساله' : '۳ ساله'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={loanTotalInstallments}
                    onChange={(e) => {
                      setLoanDurationPreset('custom');
                      setLoanTotalInstallments(Number(e.target.value));
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">اقساط پرداخت شده تاکنون</label>
                  <input
                    type="number"
                    min="0"
                    max={loanTotalInstallments}
                    value={loanPaidInstallments}
                    onChange={(e) => setLoanPaidInstallments(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">روز سررسید هر ماه (۱ الی ۳۱)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={loanDueDay}
                    onChange={(e) => setLoanDueDay(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">مسئول پرداخت</label>
                  <select
                    value={loanPaidBy}
                    onChange={(e) => setLoanPaidBy(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value={settings.partnerA?.id || 'partner_a'}>{settings.partnerA?.name || 'کاربر اول'}</option>
                    <option value={settings.partnerB?.id || 'partner_b'}>{settings.partnerB?.name || 'کاربر دوم'}</option>
                    <option value="both">مشترک (هر دو)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">یادداشت، شماره شبا یا توضیحات (اختیاری)</label>
                <input
                  type="text"
                  placeholder="مثال: شماره تسهیلات یا روز کسر خودکار"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddLoan(false)}
                  className="px-3 py-1.5 rounded-xl text-zinc-400 text-xs hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 shadow-md"
                >
                  ذخیره وام و اقساط
                </button>
              </div>
            </form>
          )}

          {/* List of Loans */}
          <div className="space-y-3">
            {loans.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="هیچ وام یا قسطی ثبت نشده است"
                description="می‌توانید وام‌های بانکی، اقساط ۶ ماهه، ۱ ساله یا ۲ ساله را اضافه کنید تا روند بازپرداخت و تاریخ انقضا پیگیری شود."
              />
            ) : (
              loans.map((loan) => {
                const isCompleted = loan.paidInstallments >= loan.totalInstallments;
                const remainingInstallments = Math.max(0, loan.totalInstallments - loan.paidInstallments);
                const progressPct = Math.min(100, Math.round((loan.paidInstallments / loan.totalInstallments) * 100));
                const remainingDebt = remainingInstallments * loan.monthlyAmount;

                // Due day indicator
                const daysDiff = loan.dueDay - todayDay;
                const isDueSoon = !isCompleted && daysDiff >= 0 && daysDiff <= 5;
                const isDueToday = !isCompleted && daysDiff === 0;

                const payerLabel =
                  loan.paidBy === settings.partnerA?.id
                    ? settings.partnerA?.name
                    : loan.paidBy === settings.partnerB?.id
                    ? settings.partnerB?.name
                    : 'مشترک';

                return (
                  <div
                    key={loan.id}
                    className={`rounded-[1.5rem] border p-4 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : isDueToday
                        ? 'bg-amber-500/10 border-amber-400/40 shadow-lg'
                        : 'bg-black/25 border-white/10 hover:border-white/15'
                    }`}
                  >
                    {/* Top Row: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{loan.title}</h4>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>تسویه شد 🎉</span>
                            </span>
                          ) : isDueToday ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>سررسید امروز!</span>
                            </span>
                          ) : isDueSoon ? (
                            <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {daysDiff} روز تا موعد
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                          <span>پرداخت‌کننده: <strong className="text-zinc-200">{payerLabel}</strong></span>
                          <span>•</span>
                          <span>سررسید: {loan.dueDay}ام هر ماه</span>
                        </div>
                      </div>

                      <div className="text-left">
                        <p className="text-sm font-extrabold text-indigo-300 font-mono">
                          {formatMoney(loan.monthlyAmount, symbol)}
                        </p>
                        <p className="text-[10px] text-zinc-500">هر قسط</p>
                      </div>
                    </div>

                    {/* Expiry & Duration Row */}
                    <div className="mt-3 flex items-center justify-between text-[11px] bg-white/5 rounded-xl p-2.5 border border-white/5">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تاریخ انقضا و اتمام:</span>
                        <span className="font-bold text-white">{loan.endDate}</span>
                      </div>
                      <div className="text-zinc-400">
                        <span>باقیمانده: </span>
                        <strong className="text-indigo-200">{formatMoney(remainingDebt, symbol)}</strong>
                      </div>
                    </div>

                    {/* Progress Bar & Installments Count */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-zinc-300">
                          {loan.paidInstallments} از {loan.totalInstallments} قسط پرداخت شده ({progressPct}%)
                        </span>
                        <span className="text-zinc-400">
                          {remainingInstallments > 0 ? `${remainingInstallments} قسط دیگر` : 'تکمیل'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-400' : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Notes if any */}
                    {loan.notes && (
                      <p className="mt-2 text-[10px] text-zinc-400 bg-black/20 p-2 rounded-lg border border-white/5">
                        {loan.notes}
                      </p>
                    )}

                    {/* Quick Installment Actions */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleIncrementInstallment(loan.id)}
                          disabled={isCompleted}
                          className="flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold px-2.5 py-1 rounded-lg transition disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                          <span>ثبت پرداخت ۱ قسط</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecrementInstallment(loan.id)}
                          disabled={loan.paidInstallments === 0}
                          title="کاهش یک قسط در صورت اشتباه"
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg transition disabled:opacity-20"
                        >
                          بازگشت
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLoan(loan.id)}
                        title="حذف وام"
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RECURRING SUBSCRIPTIONS & FIXED EXPENSES */}
      {/* ======================================================== */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-xs font-bold text-zinc-300">پرداخت‌های مکرر و اشتراک‌ها</h3>
              <p className="text-[10px] text-zinc-500">اجاره خانه، اینترنت، شارژ ساختمان و آبونمان</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProcessDueExpenses}
                disabled={isProcessingDue}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{isProcessingDue ? 'بررسی...' : 'ثبت خودکار این ماه'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddRecurring(!showAddRecurring)}
                className="flex items-center gap-1 bg-amber-500 text-black font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-amber-400 transition shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>هزینه دوره‌ای</span>
              </button>
            </div>
          </div>

          {processStatus && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-xl text-xs font-bold">
              {processStatus}
            </div>
          )}

          {/* Add Recurring Form */}
          {showAddRecurring && (
            <form onSubmit={handleCreateRecurring} className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">عنوان هزینه</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اجاره خانه، اینترنت ماهانه"
                    value={recTitle}
                    onChange={(e) => setRecTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">مبلغ ({symbol})</label>
                  <input
                    type="number"
                    required
                    placeholder="مبلغ به عدد"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">دسته‌بندی</label>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value as Category)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_MAP[c]?.fa || c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">دوره تکرار</label>
                  <select
                    value={recInterval}
                    onChange={(e) => setRecInterval(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="MONTHLY">ماهانه</option>
                    <option value="BI_MONTHLY">هر دو ماه</option>
                    <option value="QUARTERLY">سه ماهه</option>
                    <option value="YEARLY">سالانه</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecurring(false)}
                  className="px-3 py-1.5 rounded-xl text-zinc-400 text-xs hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 shadow-md"
                >
                  ذخیره هزینه دوره‌ای
                </button>
              </div>
            </form>
          )}

          {/* List of Recurring Expenses */}
          <div className="space-y-2.5">
            {recurringExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="هیچ هزینه دوره‌ای ثبت نشده است"
                description="می‌توانید پرداخت‌های مکرر ماهانه مانند اجاره و اینترنت را اینجا اضافه کنید."
              />
            ) : (
              recurringExpenses.map((rec) => {
                const info = CATEGORY_MAP[rec.category] || { fa: rec.category, icon: '🏷️' };
                const payer = rec.paidBy === settings.partnerA?.id ? settings.partnerA : settings.partnerB;
                const intervalFa =
                  rec.interval === 'MONTHLY'
                    ? 'ماهانه'
                    : rec.interval === 'BI_MONTHLY'
                    ? 'دوماهه'
                    : rec.interval === 'QUARTERLY'
                    ? 'فصلی'
                    : 'سالانه';

                return (
                  <div
                    key={rec.id}
                    className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition ${
                      rec.isActive ? 'bg-black/20 border-white/10' : 'bg-white/5 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{rec.title}</p>
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                            {intervalFa}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          پرداخت‌کننده: {payer?.name || 'کاربر'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-white font-mono">
                        {formatMoney(rec.amount, symbol)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActiveRecurring(rec.id, rec.isActive)}
                          title={rec.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                          className={`p-1.5 rounded-lg transition ${
                            rec.isActive
                              ? 'bg-teal-500/20 text-teal-300'
                              : 'bg-white/5 text-zinc-500 hover:text-white'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecurring(rec.id)}
                          title="حذف"
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
