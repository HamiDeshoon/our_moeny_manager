import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, CheckCircle2, Circle, Plus, Trash2, Sparkles, Trophy } from 'lucide-react';
import type { AppSettings, AuthUser, Habit, HabitCategory, HabitLog } from '../../types';

interface HabitTrackerProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  settings: AppSettings;
  currentUser: AuthUser | null;
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<void>;
  onToggleHabitLog: (habitId: string, date: string) => Promise<void>;
  onDeleteHabit: (id: string) => Promise<void>;
}

const CATEGORIES: HabitCategory[] = [
  'Health', 'Home', 'Mindfulness', 'Relationship', 'Fitness', 'Personal', 'Other'
];

export const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  habitLogs,
  settings,
  currentUser,
  onAddHabit,
  onToggleHabitLog,
  onDeleteHabit,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Health');
  const [assignedTo, setAssignedTo] = useState<string>('both');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'WEEKDAYS'>('DAILY');
  const [loading, setLoading] = useState(false);

  const isFa = settings.isRtl;
  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await onAddHabit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        assignedTo,
        frequency,
        createdBy: currentUser?.partnerId || 'partner_a',
      });
      setTitle('');
      setDescription('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isHabitCompletedToday = (habitId: string) => {
    return habitLogs.some((l) => l.habitId === habitId && l.date === todayStr);
  };

  const calculateStreak = (habitId: string) => {
    const logs = habitLogs
      .filter((l) => l.habitId === habitId)
      .map((l) => l.date)
      .sort((a, b) => b.localeCompare(a));

    if (logs.length === 0) return 0;

    let streak = 0;
    let curr = new Date();

    for (let i = 0; i < 30; i++) {
      const dStr = curr.toISOString().split('T')[0];
      if (logs.includes(dStr)) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else if (i === 0) {
        // Today not logged yet, check yesterday
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isFa ? 'عادت‌ها و روال‌های مشترک' : 'Habits & Streaks'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {isFa ? 'انگیزه روزانه و پیگیری استریک زوج‌ها' : 'Build strong daily routines together'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#181102] shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          <span>{isFa ? 'عادت جدید' : 'New Habit'}</span>
        </button>
      </div>

      {/* Add Habit Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden rounded-2xl border border-amber-500/30 bg-[#211809] p-4 space-y-3"
          >
            <h4 className="text-xs font-bold text-amber-300">
              {isFa ? 'ساخت عادت یا هدف روزانه جدید' : 'Create New Habit & Routine'}
            </h4>

            <div>
              <input
                type="text"
                required
                placeholder={isFa ? 'عنوان عادت (مثلاً: ۳۰ دقیقه پیاده‌روی، خواندن کتاب)' : 'Habit title (e.g. 30m Walk, Drink Water)'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{isFa ? 'دسته' : 'Category'}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HabitCategory)}
                  className="w-full rounded-xl border border-white/10 bg-[#2f220d] px-2 py-1.5 text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{isFa ? 'تکرار' : 'Frequency'}</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-[#2f220d] px-2 py-1.5 text-xs text-white"
                >
                  <option value="DAILY">{isFa ? 'روزانه' : 'Daily'}</option>
                  <option value="WEEKDAYS">{isFa ? 'روزهای کاری' : 'Weekdays'}</option>
                  <option value="WEEKLY">{isFa ? 'هفتگی' : 'Weekly'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{isFa ? 'برای' : 'For'}</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#2f220d] px-2 py-1.5 text-xs text-white"
                >
                  <option value="both">👥 {isFa ? 'هر دو' : 'Both'}</option>
                  <option value="partner_a">{settings.partnerA.avatar} {settings.partnerA.name}</option>
                  <option value="partner_b">{settings.partnerB.avatar} {settings.partnerB.name}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl bg-white/5 px-3 py-1.5 text-xs text-zinc-400"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-[#181102] hover:bg-amber-400"
              >
                {loading ? '...' : (isFa ? 'ثبت عادت' : 'Save Habit')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Habits List */}
      <div className="grid grid-cols-1 gap-2.5">
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
            <Trophy className="mx-auto h-7 w-7 opacity-40 mb-2" />
            <p className="text-xs">
              {isFa ? 'هنوز عادتی اضافه نکرده‌اید! اولین عادت مشترک خود را بسازید.' : 'No habits tracked yet! Add your first custom routine.'}
            </p>
          </div>
        ) : (
          habits.map((habit) => {
            const isDoneToday = isHabitCompletedToday(habit.id);
            const streak = calculateStreak(habit.id);

            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                  isDoneToday
                    ? 'border-amber-500/40 bg-amber-500/[0.08]'
                    : 'border-white/10 bg-[#121c17] hover:border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleHabitLog(habit.id, todayStr)}
                    className="transition hover:scale-110"
                  >
                    {isDoneToday ? (
                      <CheckCircle2 className="h-6 w-6 text-amber-400 fill-amber-400/20" />
                    ) : (
                      <Circle className="h-6 w-6 text-zinc-500 hover:text-amber-300" />
                    )}
                  </button>

                  <div>
                    <h4 className={`text-sm font-bold text-white ${isDoneToday ? 'line-through text-zinc-400' : ''}`}>
                      {habit.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                      <span>#{habit.category}</span>
                      <span>•</span>
                      <span>{habit.frequency}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                    <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
                    <span>{streak} {isFa ? 'روز' : 'd'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteHabit(habit.id)}
                    className="text-zinc-600 hover:text-rose-400 transition p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
