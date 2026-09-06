import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, Heart, Check, Trash2, Coins, Calendar, Trophy, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AppSettings, AuthUser, GoalCategory, TodoPriority, WishGoal } from '../types';
import { api } from '../services/api';
import { haptic } from '../utils/haptics';
import { formatMoney, formatJalaliDate } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface WishGoalsProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

const GOAL_CATEGORIES: { id: GoalCategory; label: string; icon: string }[] = [
  { id: 'Travel', label: 'سفر و تعطیلات', icon: '✈️' },
  { id: 'Home', label: 'مسکن و خانه', icon: '🏡' },
  { id: 'Electronics', label: 'لوازم دیجیتال', icon: '💻' },
  { id: 'Furniture', label: 'لوازم منزل', icon: '🛋️' },
  { id: 'Vehicle', label: 'خودرو و نقلیه', icon: '🚗' },
  { id: 'Gift', label: 'هدیه و سورپرایز', icon: '🎁' },
  { id: 'Emergency Fund', label: 'پس‌انداز اضطراری', icon: '🛡️' },
  { id: 'Entertainment', label: 'تفریح و سرگرمی', icon: '🎮' },
  { id: 'Education', label: 'آموزش و رشد', icon: '📚' },
  { id: 'Health', label: 'سلامت و ورزش', icon: '🏃' },
  { id: 'Other', label: 'سایر اهداف', icon: '🎯' },
];

const EMOJI_PRESETS = ['✈️', '🏡', '💻', '🚗', '🎁', '🛋️', '💍', '🛡️', '🎯', '🏖️'];

export const WishGoals: React.FC<WishGoalsProps> = ({ settings, currentUser }) => {
  const [goals, setGoals] = useState<WishGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shared' | 'personal'>('shared');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Add Funds Popover State
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Travel');
  const [icon, setIcon] = useState('✈️');
  const [targetDate, setTargetDate] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [notes, setNotes] = useState('');

  const partnerAName = settings.partnerA?.name || 'حامد';
  const partnerBName = settings.partnerB?.name || 'فاطی';
  const myPartnerId = currentUser?.partnerId || 'partner_a';
  const symbol = settings.currencySymbol || 'تومان';

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getWishGoals();
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(targetAmount.replace(/,/g, ''));
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    haptic('medium');
    try {
      const newGoal = await api.addWishGoal({
        title: title.trim(),
        targetAmount: amountNum,
        category,
        icon,
        targetDate: targetDate || undefined,
        isShared,
        owner: isShared ? 'shared' : myPartnerId,
        priority,
        notes: notes.trim() || undefined,
      });

      setGoals((prev) => [newGoal, ...prev]);
      setTitle('');
      setTargetAmount('');
      setTargetDate('');
      setNotes('');
      setIsAddOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Failed to add goal', err);
    }
  };

  const handleToggleComplete = async (goal: WishGoal) => {
    haptic('success');
    const newCompleted = !goal.isCompleted;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              isCompleted: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : undefined,
              currentAmount: newCompleted ? g.targetAmount : g.currentAmount,
            }
          : g
      )
    );

    try {
      await api.updateWishGoal(goal.id, {
        isCompleted: newCompleted,
        currentAmount: newCompleted ? goal.targetAmount : goal.currentAmount,
      });
    } catch (err) {
      console.error('Failed to update goal completion', err);
      loadGoals();
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoalId) return;
    const addNum = parseFloat(depositAmount.replace(/,/g, ''));
    if (isNaN(addNum) || addNum <= 0) return;

    haptic('success');
    const goal = goals.find((g) => g.id === depositGoalId);
    if (!goal) return;

    const newCurrent = Math.min(goal.currentAmount + addNum, goal.targetAmount);
    const isNowCompleted = newCurrent >= goal.targetAmount;

    setGoals((prev) =>
      prev.map((g) =>
        g.id === depositGoalId
          ? {
              ...g,
              currentAmount: newCurrent,
              isCompleted: isNowCompleted || g.isCompleted,
              completedAt: isNowCompleted ? new Date().toISOString() : g.completedAt,
            }
          : g
      )
    );

    try {
      await api.updateWishGoal(depositGoalId, {
        currentAmount: newCurrent,
        isCompleted: isNowCompleted || goal.isCompleted,
      });
      setDepositGoalId(null);
      setDepositAmount('');
    } catch (err) {
      console.error('Failed to update goal deposit', err);
      loadGoals();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('warning');
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await api.deleteWishGoal(id);
    } catch (err) {
      console.error('Failed to delete goal', err);
      loadGoals();
    }
  };

  const activeShared = goals.filter((g) => g.isShared && !g.isCompleted);
  const activePersonal = goals.filter((g) => !g.isShared && !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const displayedGoals = activeTab === 'shared' ? activeShared : activePersonal;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <h2 className="text-xl font-black tracking-tight text-white">اهداف پس‌انداز و آرزوها</h2>
            </div>
            <p className="text-xs text-zinc-400">
              برای سفرهای مشترک، خریدهای بزرگ یا آرزوهای شخصی خود برنامه‌ریزی و پس‌انداز کنید
            </p>
          </div>

          <Button
            onClick={() => {
              setIsShared(activeTab === 'shared');
              setIsAddOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0"
          >
            هدف یا آرزوی جدید
          </Button>
        </div>
      </div>

      {/* Main Tabs (Shared vs Personal) */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900/80 border border-white/10 rounded-2xl">
        <button
          onClick={() => setActiveTab('shared')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'shared'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>🤝 اهداف مشترک</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10">
            {activeShared.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'personal'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>✨ لیست آرزوهای شخصی</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10">
            {activePersonal.length}
          </span>
        </button>
      </div>

      {/* Goals Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="shimmer h-36 rounded-3xl bg-zinc-900/60" />
          ))}
        </div>
      ) : displayedGoals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            {activeTab === 'shared' ? '🌴' : '✨'}
          </div>
          <h3 className="text-sm font-bold text-zinc-300">
            {activeTab === 'shared' ? 'هنوز هدف مشترکی ثبت نشده است!' : 'لیست آرزوهای شما خالی است!'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            با کلیک روی «هدف یا آرزوی جدید» نخستین هدف پس‌انداز خود را ثبت کنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {displayedGoals.map((goal) => {
              const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
              const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-sm hover:border-white/20 transition flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0">
                          {goal.icon || '🎯'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-white truncate">{goal.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                            {goal.targetDate && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                                <Calendar className="w-3 h-3" />
                                <span>{formatJalaliDate(goal.targetDate)}</span>
                              </span>
                            )}
                            {!goal.isShared && (
                              <span className="text-[10px] text-zinc-500">
                                برای {goal.owner === 'partner_a' ? partnerAName : partnerBName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(goal.id, e)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Financial Progress */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-400">
                          {formatMoney(goal.currentAmount)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          هدف: <strong className="text-zinc-200">{formatMoney(goal.targetAmount)}</strong> {symbol}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{pct}٪ پس‌انداز شده</span>
                        {remaining > 0 ? (
                          <span>{formatMoney(remaining)} {symbol} مانده</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">تکمیل شد! 🎉</span>
                        )}
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-zinc-400 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDepositGoalId(goal.id);
                        setDepositAmount('');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>افزودن مبلغ</span>
                    </button>

                    <button
                      onClick={() => handleToggleComplete(goal)}
                      className="py-2 px-3 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-300 border border-white/10 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تکمیل شد</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs text-zinc-400 font-bold transition"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>اهداف و آرزوهای تحقق‌یافته ({completedGoals.length})</span>
            </div>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/40 border border-emerald-500/20 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{goal.icon || '🏆'}</span>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{goal.title}</h5>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {formatMoney(goal.targetAmount)} {symbol} — محقق شد ✓
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(goal.id, e)}
                    className="p-1 text-zinc-600 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deposit Amount BottomSheet */}
      <BottomSheet
        isOpen={depositGoalId !== null}
        onClose={() => setDepositGoalId(null)}
        title="افزودن به پس‌انداز این هدف"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <Input
            label={`مبلغ واریزی (${symbol})`}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="مثلاً: ۵۰۰,۰۰۰"
            type="number"
            required
            autoFocus
          />

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-emerald-600/20"
          >
            ثبت پس‌انداز
          </Button>
        </form>
      </BottomSheet>

      {/* Add Goal BottomSheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={isShared ? 'تعریف هدف پس‌انداز مشترک' : 'افزودن به لیست آرزوها'}
        fullHeight
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Input
            label="عنوان هدف یا کالا"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: بلیت سفر استانبول، پلی‌استیشن ۵، مبل راحتی..."
            required
            autoFocus
          />

          <Input
            label={`مبلغ هدف (${symbol})`}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="مثلاً: ۲۰,۰۰۰,۰۰۰"
            type="number"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                آیکون هدف
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition ${
                      icon === em ? 'bg-indigo-600/30 border border-indigo-500 scale-110' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              تاریخ موعد یا تحقق هدف (اختیاری)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              نوع هدف
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  isShared
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                🤝 هدف مشترک خانه
              </button>
              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  !isShared
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                ✨ آرزوی شخصی من
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              یادداشت یا لینک خرید (اختیاری)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="مشخصات کالا، لینک دیجی‌کالا، یا توضیحات اضافی..."
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            ثبت هدف
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
};
