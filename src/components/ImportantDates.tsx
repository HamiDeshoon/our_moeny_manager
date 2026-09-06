import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calendar, Clock, Heart, Trash2, Edit3, Bell, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AppSettings, AuthUser, DateType, ImportantDate, NoteColor } from '../types';
import { api } from '../services/api';
import { haptic } from '../utils/haptics';
import { formatJalaliDate } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface ImportantDatesProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

const DATE_TYPES: { id: DateType; label: string; icon: string; color: string }[] = [
  { id: 'ANNIVERSARY', label: 'سالگرد و مناسبت عاشقانه', icon: '💍', color: 'text-rose-400' },
  { id: 'BIRTHDAY', label: 'تولد', icon: '🎂', color: 'text-amber-400' },
  { id: 'APPOINTMENT', label: 'پزشکی و قرار مهم', icon: '🏥', color: 'text-emerald-400' },
  { id: 'EVENT', label: 'رویداد و جشن', icon: '🎉', color: 'text-indigo-400' },
  { id: 'HOLIDAY', label: 'سفر و تعطیلات', icon: '🏖️', color: 'text-cyan-400' },
  { id: 'REMINDER', label: 'موعد مالی و چک', icon: '🔔', color: 'text-yellow-400' },
];

export const ImportantDates: React.FC<ImportantDatesProps> = ({ settings, currentUser }) => {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [type, setType] = useState<DateType>('ANNIVERSARY');
  const [isRecurringYearly, setIsRecurringYearly] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [notes, setNotes] = useState('');

  const myPartnerId = currentUser?.partnerId || 'partner_a';

  const loadDates = async () => {
    try {
      setLoading(true);
      const data = await api.getImportantDates();
      setDates(data);
    } catch (err) {
      console.error('Failed to load dates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDates();
  }, []);

  const handleCreateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr) return;

    haptic('medium');
    try {
      const newDate = await api.addImportantDate({
        title: title.trim(),
        date: dateStr,
        type,
        isRecurringYearly,
        reminderDaysBefore,
        notes: notes.trim() || undefined,
        createdBy: myPartnerId,
      });

      setDates((prev) => [...prev, newDate]);
      setTitle('');
      setDateStr('');
      setType('ANNIVERSARY');
      setIsRecurringYearly(true);
      setNotes('');
      setIsAddOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Failed to add important date', err);
    }
  };

  const handleDeleteDate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('warning');
    setDates((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.deleteImportantDate(id);
    } catch (err) {
      console.error('Failed to delete date', err);
      loadDates();
    }
  };

  // Helper to calculate days remaining
  const calculateDaysRemaining = (item: ImportantDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = item.date.split('-').map(Number);
    let target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    if (item.isRecurringYearly) {
      const thisYearTarget = new Date(today.getFullYear(), m - 1, d);
      thisYearTarget.setHours(0, 0, 0, 0);
      if (thisYearTarget < today) {
        target = new Date(today.getFullYear() + 1, m - 1, d);
      } else {
        target = thisYearTarget;
      }
    }

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return { days: diffDays, targetDate: target };
  };

  // Categorize into Upcoming vs Past
  const processed = dates.map((d) => {
    const { days, targetDate } = calculateDaysRemaining(d);
    return { ...d, daysRemaining: days, nextDate: targetDate };
  });

  const upcoming = processed
    .filter((d) => d.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const past = processed
    .filter((d) => d.daysRemaining < 0 && !d.isRecurringYearly)
    .sort((a, b) => b.daysRemaining - a.daysRemaining);

  // Groups
  const thisWeek = upcoming.filter((d) => d.daysRemaining <= 7);
  const thisMonth = upcoming.filter((d) => d.daysRemaining > 7 && d.daysRemaining <= 30);
  const later = upcoming.filter((d) => d.daysRemaining > 30);

  const renderEventCard = (item: typeof processed[0]) => {
    const typeObj = DATE_TYPES.find((t) => t.id === item.type) || DATE_TYPES[0];

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-sm hover:border-white/20 transition flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
            {typeObj.icon}
          </div>

          <div className="space-y-0.5 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="text-zinc-300 font-medium">
                {formatJalaliDate(item.date)}
              </span>
              {item.isRecurringYearly && (
                <span className="text-[10px] px-1.5 py-0.2 bg-white/5 text-zinc-400 rounded">
                  سالانه
                </span>
              )}
              {item.notes && (
                <span className="text-[11px] text-zinc-500 truncate max-w-xs">
                  • {item.notes}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Countdown Badge */}
          <div className="text-left">
            {item.daysRemaining === 0 ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/30 animate-pulse">
                امروز! 🎉
              </span>
            ) : item.daysRemaining > 0 ? (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  item.daysRemaining <= 7
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {item.daysRemaining} روز مانده
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                {Math.abs(item.daysRemaining)} روز پیش
              </span>
            )}
          </div>

          <button
            onClick={(e) => handleDeleteDate(item.id, e)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2 className="text-xl font-black tracking-tight text-white">تاریخ‌ها و رویدادهای مهم</h2>
            </div>
            <p className="text-xs text-zinc-400">
              سالگردها، تولدها، چک‌ها و رویدادهای پیش‌رو با شمارش معکوس روزها
            </p>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0"
          >
            افزودن تاریخ مهم
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-16 rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : dates.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            💍
          </div>
          <h3 className="text-sm font-bold text-zinc-300">هنوز تاریخی ثبت نشده است!</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            سالگرد ازدواج، تولد همسرتان، یا موعد چک‌ها را اضافه کنید تا فراموش نشوند.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* This Week Section */}
          {thisWeek.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 px-1">
                <Clock className="w-3.5 h-3.5" />
                <span>همین روزها و این هفته ({thisWeek.length})</span>
              </div>
              <div className="space-y-2.5">
                {thisWeek.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* This Month Section */}
          {thisMonth.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 px-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>این ماه ({thisMonth.length})</span>
              </div>
              <div className="space-y-2.5">
                {thisMonth.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Later Section */}
          {later.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 px-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>آینده ({later.length})</span>
              </div>
              <div className="space-y-2.5">
                {later.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Past Events */}
          {past.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => setShowPast(!showPast)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs text-zinc-500 font-bold transition"
              >
                <span>رویدادهای سپری شده ({past.length})</span>
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPast && (
                <div className="space-y-2 mt-3 opacity-60">
                  {past.map(renderEventCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Date BottomSheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="ثبت تاریخ یا سالگرد مهم"
      >
        <form onSubmit={handleCreateDate} className="space-y-4">
          <Input
            label="عنوان مناسبت یا رویداد"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: سالگرد ازدواج، تولد، موعد تمدید قرارداد..."
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              تاریخ رویداد
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              نوع مناسبت
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DateType)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {DATE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <span className="text-xs font-bold text-white block">تکرار سالانه</span>
              <span className="text-[10px] text-zinc-400">مناسب سالگردها و تولدها برای محاسبه شمارش معکوس هر سال</span>
            </div>
            <input
              type="checkbox"
              checked={isRecurringYearly}
              onChange={(e) => setIsRecurringYearly(e.target.checked)}
              className="w-5 h-5 rounded bg-zinc-800 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              یادداشت و هدیه پیشنهادی (اختیاری)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="برنامه، ایده کادو، یا یادآوری مخصوص..."
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            ثبت رویداد
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
};
