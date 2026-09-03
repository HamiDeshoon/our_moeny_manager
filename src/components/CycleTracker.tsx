import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Heart,
  Droplets,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Check,
  Smile,
  Activity,
  Coffee,
  Info,
  Sliders,
  Bell
} from 'lucide-react';
import { AppSettings, AuthUser, CycleLog, CycleSettings, FlowIntensity } from '../types';
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
} from '../utils/formatters';

interface CycleTrackerProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
  cycleLogs: CycleLog[];
  cycleSettings: CycleSettings;
  onSaveLog: (log: CycleLog) => Promise<void>;
  onDeleteLog: (date: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<CycleSettings>) => Promise<void>;
}

const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'گرفتگی و درد شکم (Cramps)', emoji: '⚡' },
  { id: 'headache', label: 'سردرد (Headache)', emoji: '🤕' },
  { id: 'fatigue', label: 'خستگی و بی‌حالی (Fatigue)', emoji: '😴' },
  { id: 'bloating', label: 'نفخ و ورم (Bloating)', emoji: '🎈' },
  { id: 'backache', label: 'کمردرد (Backache)', emoji: '🩹' },
  { id: 'tender_breasts', label: 'حساسیت سینه (Tender Breasts)', emoji: '🌸' },
  { id: 'acne', label: 'جوش و پوست (Skin / Acne)', emoji: '✨' },
  { id: 'nausea', label: 'حالت تهوع (Nausea)', emoji: '🤢' },
];

const MOOD_OPTIONS = [
  { id: 'happy', label: 'شاد و پرانرژی', emoji: '🥰' },
  { id: 'calm', label: 'آرام و ریلکس', emoji: '😌' },
  { id: 'sensitive', label: 'احساساتی و حساس', emoji: '🥺' },
  { id: 'irritable', label: 'کلافه یا تحریک‌پذیر', emoji: '😤' },
  { id: 'anxious', label: 'مضطرب یا نگران', emoji: '😰' },
  { id: 'low_energy', label: 'کم‌حوصله', emoji: '🥱' },
];

const FLOW_OPTIONS: { id: FlowIntensity; label: string; color: string; desc: string }[] = [
  { id: 'none', label: 'بدون خونریزی', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', desc: 'پاک' },
  { id: 'spotting', label: 'لکه‌بینی (Spotting)', color: 'bg-rose-950/40 text-rose-300 border-rose-800/40', desc: 'بسیار کم' },
  { id: 'light', label: 'کم (Light)', color: 'bg-rose-900/40 text-rose-300 border-rose-700/50', desc: 'خونریزی ملایم' },
  { id: 'medium', label: 'متوسط (Medium)', color: 'bg-rose-600/30 text-rose-200 border-rose-500/60', desc: 'نرمال' },
  { id: 'heavy', label: 'زیاد (Heavy)', color: 'bg-rose-600 text-white border-rose-400', desc: 'خونریزی شدید' },
];

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const GREGORIAN_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CycleTracker: React.FC<CycleTrackerProps> = ({
  settings,
  currentUser,
  cycleLogs,
  cycleSettings,
  onSaveLog,
  onDeleteLog,
  onUpdateSettings,
}) => {
  const useJalali = settings.useJalaliDate;

  // Calendar View Month/Year State
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const [todayJy, todayJm, todayJd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [viewJalaliYear, setViewJalaliYear] = useState(todayJy);
  const [viewJalaliMonth, setViewJalaliMonth] = useState(todayJm);

  const [viewGregYear, setViewGregYear] = useState(today.getFullYear());
  const [viewGregMonth, setViewGregMonth] = useState(today.getMonth() + 1);

  // Selected Day Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings Edit State
  const [editCycleLength, setEditCycleLength] = useState(cycleSettings.cycleLength || 28);
  const [editPeriodLength, setEditPeriodLength] = useState(cycleSettings.periodLength || 5);
  const [editLastPeriodStart, setEditLastPeriodStart] = useState(cycleSettings.lastPeriodStart || '');

  // Log Edit State (for selected day)
  const [modalFlow, setModalFlow] = useState<FlowIntensity>('none');
  const [modalSymptoms, setModalSymptoms] = useState<string[]>([]);
  const [modalMood, setModalMood] = useState<string[]>([]);
  const [modalPain, setModalPain] = useState<number>(0);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [isPeriodStart, setIsPeriodStart] = useState<boolean>(false);
  const [isPeriodEnd, setIsPeriodEnd] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Map logs by date
  const logsMap = useMemo(() => {
    const map = new Map<string, CycleLog>();
    for (const log of cycleLogs) {
      map.set(log.date, log);
    }
    return map;
  }, [cycleLogs]);

  // Compute most recent confirmed period start date
  const effectiveLastPeriodStart = useMemo(() => {
    if (cycleSettings.lastPeriodStart) return cycleSettings.lastPeriodStart;
    // Look in cycleLogs for isPeriodStart or flow > none
    const sortedStarts = cycleLogs
      .filter(l => l.isPeriodStart || (l.flow && l.flow !== 'none' && l.flow !== 'spotting'))
      .map(l => l.date)
      .sort()
      .reverse();
    return sortedStarts[0] || '';
  }, [cycleSettings.lastPeriodStart, cycleLogs]);

  // Cycle & Phase Calculations
  const cycleMetrics = useMemo(() => {
    const cLen = cycleSettings.cycleLength || 28;
    const pLen = cycleSettings.periodLength || 5;

    if (!effectiveLastPeriodStart) {
      return {
        hasData: false,
        cycleDay: null,
        phase: 'unknown',
        daysUntilPeriod: null,
        nextPeriodDate: null,
        ovulationDate: null,
        fertileStartDate: null,
        fertileEndDate: null,
      };
    }

    const startD = new Date(effectiveLastPeriodStart + 'T00:00:00');
    const todayD = new Date(todayIso + 'T00:00:00');
    const diffDays = Math.floor((todayD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));

    const cycleDay = (diffDays % cLen) + 1;
    const cyclesPassed = Math.floor(diffDays / cLen);

    // Predict next cycle start
    const nextStartMs = startD.getTime() + (cyclesPassed + 1) * cLen * 24 * 60 * 60 * 1000;
    const nextStartD = new Date(nextStartMs);
    const nextPeriodDate = nextStartD.toISOString().split('T')[0];
    const daysUntilPeriod = Math.ceil((nextStartD.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));

    // Ovulation is roughly 14 days before next cycle start
    const ovulMs = nextStartMs - 14 * 24 * 60 * 60 * 1000;
    const ovulD = new Date(ovulMs);
    const ovulationDate = ovulD.toISOString().split('T')[0];

    // Fertile window: 4 days before ovulation to 1 day after
    const fertileStartD = new Date(ovulMs - 4 * 24 * 60 * 60 * 1000);
    const fertileEndD = new Date(ovulMs + 1 * 24 * 60 * 60 * 1000);

    let phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' = 'follicular';
    if (cycleDay <= pLen) {
      phase = 'menstrual';
    } else if (todayD >= fertileStartD && todayD <= fertileEndD) {
      phase = 'ovulation';
    } else if (cycleDay > cLen - 14) {
      phase = 'luteal';
    } else {
      phase = 'follicular';
    }

    return {
      hasData: true,
      cycleDay,
      phase,
      daysUntilPeriod,
      nextPeriodDate,
      ovulationDate,
      fertileStartDate: fertileStartD.toISOString().split('T')[0],
      fertileEndDate: fertileEndD.toISOString().split('T')[0],
    };
  }, [effectiveLastPeriodStart, cycleSettings, todayIso]);

  // Helper to get day classification for calendar rendering
  const getDayInfo = (isoDate: string) => {
    const log = logsMap.get(isoDate);
    const isToday = isoDate === todayIso;
    const cLen = cycleSettings.cycleLength || 28;
    const pLen = cycleSettings.periodLength || 5;

    let isPeriod = false;
    if (log?.flow && log.flow !== 'none') {
      isPeriod = true;
    }

    let isPredictedPeriod = false;
    let isFertile = false;
    let isOvulation = false;

    if (effectiveLastPeriodStart) {
      const startD = new Date(effectiveLastPeriodStart + 'T00:00:00');
      const targetD = new Date(isoDate + 'T00:00:00');
      const diffDays = Math.floor((targetD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        const dayInCycle = (diffDays % cLen) + 1;
        if (dayInCycle <= pLen && !isPeriod) {
          isPredictedPeriod = true;
        }
        // Ovulation & Fertile
        const cycleNum = Math.floor(diffDays / cLen);
        const cycleOvulMs = startD.getTime() + (cycleNum * cLen + (cLen - 14)) * 24 * 60 * 60 * 1000;
        const cycleOvulDate = new Date(cycleOvulMs).toISOString().split('T')[0];
        if (isoDate === cycleOvulDate) {
          isOvulation = true;
        }
        const fertileStart = new Date(cycleOvulMs - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fertileEnd = new Date(cycleOvulMs + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (isoDate >= fertileStart && isoDate <= fertileEnd) {
          isFertile = true;
        }
      }
    }

    return {
      log,
      isToday,
      isPeriod,
      isPredictedPeriod,
      isFertile,
      isOvulation,
    };
  };

  // Build Calendar Days for Current Month View
  const calendarDays = useMemo(() => {
    const days: Array<{
      isoDate: string;
      displayDay: number;
      isCurrentMonth: boolean;
    }> = [];

    if (useJalali) {
      const monthDays = getJalaliMonthDays(viewJalaliYear, viewJalaliMonth);
      // Determine day of week for 1st day of jalali month
      const [gY, gM, gD] = jalaliToGregorian(viewJalaliYear, viewJalaliMonth, 1);
      const firstDate = new Date(gY, gM - 1, gD);
      // In Iran/Persian calendar: Saturday is day 0, Friday is day 6.
      // JS getDay(): Sunday=0, Monday=1 ... Saturday=6.
      const firstDayWeekday = (firstDate.getDay() + 1) % 7; // Saturday -> 0, Sunday -> 1, etc.

      // Padding days from previous month
      for (let p = 0; p < firstDayWeekday; p++) {
        days.push({
          isoDate: '',
          displayDay: 0,
          isCurrentMonth: false,
        });
      }

      // Days of month
      for (let d = 1; d <= monthDays; d++) {
        const [gy, gm, gd] = jalaliToGregorian(viewJalaliYear, viewJalaliMonth, d);
        const iso = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
        days.push({
          isoDate: iso,
          displayDay: d,
          isCurrentMonth: true,
        });
      }
    } else {
      const firstDate = new Date(viewGregYear, viewGregMonth - 1, 1);
      const lastDate = new Date(viewGregYear, viewGregMonth, 0);
      const totalDays = lastDate.getDate();
      const firstWeekday = firstDate.getDay(); // Sunday=0

      // Padding days
      for (let p = 0; p < firstWeekday; p++) {
        days.push({
          isoDate: '',
          displayDay: 0,
          isCurrentMonth: false,
        });
      }

      for (let d = 1; d <= totalDays; d++) {
        const iso = `${viewGregYear}-${String(viewGregMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          isoDate: iso,
          displayDay: d,
          isCurrentMonth: true,
        });
      }
    }

    return days;
  }, [useJalali, viewJalaliYear, viewJalaliMonth, viewGregYear, viewGregMonth]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (useJalali) {
      if (viewJalaliMonth === 1) {
        setViewJalaliYear(viewJalaliYear - 1);
        setViewJalaliMonth(12);
      } else {
        setViewJalaliMonth(viewJalaliMonth - 1);
      }
    } else {
      if (viewGregMonth === 1) {
        setViewGregYear(viewGregYear - 1);
        setViewGregMonth(12);
      } else {
        setViewGregMonth(viewGregMonth - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (useJalali) {
      if (viewJalaliMonth === 12) {
        setViewJalaliYear(viewJalaliYear + 1);
        setViewJalaliMonth(1);
      } else {
        setViewJalaliMonth(viewJalaliMonth + 1);
      }
    } else {
      if (viewGregMonth === 12) {
        setViewGregYear(viewGregYear + 1);
        setViewGregMonth(1);
      } else {
        setViewGregMonth(viewGregMonth + 1);
      }
    }
  };

  // Open day modal
  const openDayModal = (isoDate: string) => {
    setSelectedDate(isoDate);
    const existing = logsMap.get(isoDate);
    if (existing) {
      setModalFlow(existing.flow || 'none');
      setModalSymptoms(existing.symptoms || []);
      setModalMood(existing.mood || []);
      setModalPain(existing.painLevel || 0);
      setModalNotes(existing.notes || '');
      setIsPeriodStart(Boolean(existing.isPeriodStart));
      setIsPeriodEnd(Boolean(existing.isPeriodEnd));
    } else {
      // Default guess
      const info = getDayInfo(isoDate);
      setModalFlow(info.isPredictedPeriod ? 'medium' : 'none');
      setModalSymptoms([]);
      setModalMood([]);
      setModalPain(0);
      setModalNotes('');
      setIsPeriodStart(false);
      setIsPeriodEnd(false);
    }
  };

  const handleSaveDayLog = async () => {
    if (!selectedDate) return;
    setIsSaving(true);
    try {
      const updatedLog: CycleLog = {
        date: selectedDate,
        flow: modalFlow,
        symptoms: modalSymptoms,
        mood: modalMood,
        painLevel: modalPain,
        notes: modalNotes.trim() || undefined,
        isPeriodStart,
        isPeriodEnd,
      };
      await onSaveLog(updatedLog);

      // If user marked as period start, automatically update cycleSettings.lastPeriodStart
      if (isPeriodStart) {
        await onUpdateSettings({ lastPeriodStart: selectedDate });
      }

      setSelectedDate(null);
    } catch (err) {
      console.error('Error saving cycle log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDayLog = async () => {
    if (!selectedDate) return;
    setIsSaving(true);
    try {
      await onDeleteLog(selectedDate);
      setSelectedDate(null);
    } catch (err) {
      console.error('Error deleting cycle log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        cycleLength: Number(editCycleLength) || 28,
        periodLength: Number(editPeriodLength) || 5,
        lastPeriodStart: editLastPeriodStart || undefined,
      });
      setShowSettingsModal(false);
    } catch (err) {
      console.error('Error saving cycle settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSymptom = (id: string) => {
    setModalSymptoms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleMood = (id: string) => {
    setModalMood(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const weekdayHeaders = useJalali
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ── Top Hero Card: Cycle Status & Couple Care Tip ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/40 via-zinc-900 to-black border border-rose-900/30 p-6 shadow-2xl backdrop-blur-md"
      >
        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-500/15 border border-rose-500/25 text-rose-400 rounded-xl shadow-inner">
                <Heart className="w-5 h-5 fill-rose-500/30 text-rose-400" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                تقویم چرخه و سلامت قاعدگی
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {settings.partnerB.name} {settings.partnerB.avatar}
                </span>
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
              پیش‌بینی روزهای قاعدگی، فاز باروری و تخمک‌گذاری، ثبت علائم روزانه و یادآورهای مهربانانه برای همراهی در خانه.
            </p>
          </div>

          {/* Quick Action: Settings & Log Today */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => openDayModal(todayIso)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              ثبت وضعیت امروز
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-white/10 transition cursor-pointer"
              title="تنظیمات طول دوره و چرخه"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Indicators Grid */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Phase Badge */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">فاز فعلی چرخه</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {cycleMetrics.phase === 'menstrual' && '🔴 فاز پریود (قاعدگی)'}
                {cycleMetrics.phase === 'follicular' && '🌱 فاز فولیکولار (انرژی و نشاط)'}
                {cycleMetrics.phase === 'ovulation' && '🌸 پنجره باروری و تخمک‌گذاری'}
                {cycleMetrics.phase === 'luteal' && '🌙 فاز لوتئال (نیاز به آرامش / PMS)'}
                {cycleMetrics.phase === 'unknown' && 'در انتظار ثبت اولین دوره'}
              </div>
            </div>
          </div>

          {/* Cycle Day */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">روز در چرخه</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {cycleMetrics.cycleDay ? `روز ${cycleMetrics.cycleDay} از ${cycleSettings.cycleLength || 28}` : 'تنظیم نشده'}
              </div>
            </div>
          </div>

          {/* Next Period Countdown */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium">پیش‌بینی دوره بعدی</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {cycleMetrics.daysUntilPeriod !== null
                  ? (cycleMetrics.daysUntilPeriod > 0
                      ? `حدود ${cycleMetrics.daysUntilPeriod} روز دیگر`
                      : 'امروز یا فردا')
                  : 'نیازمند تاریخ آخرین دوره'}
              </div>
            </div>
          </div>
        </div>

        {/* Couple Care Tip */}
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-200/90 leading-relaxed">
          <Coffee className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-rose-300">نکته همدلی برای حمید و فاطی: </span>
            {cycleMetrics.phase === 'menstrual' &&
              'در روزهای پریود، دمنوش گرم (بابونه یا دارچین)، استراحت بیشتر، غذای راحت و ماساژ کمر بهترین محبت و حمایت است.'}
            {cycleMetrics.phase === 'follicular' &&
              'سطح استروژن در حال بالا رفتن است؛ روزهای عالی برای تفریح، پیاده‌روی، کافه رفتن و برنامه‌ریزی‌های شاد مشترک.'}
            {cycleMetrics.phase === 'ovulation' &&
              'پنجره طلایی باروری؛ اوج نشاط و طراوت ماهانه.'}
            {cycleMetrics.phase === 'luteal' &&
              'فاز لوتئال و PMS؛ ممکن است خستگی یا حساسیت روحی بیشتر باشد. شکلات تلخ، صبوری بیشتر و فضای آرامش‌بخش خانوادگی معجزه می‌کند.'}
            {cycleMetrics.phase === 'unknown' &&
              'برای شروع، تاریخ شروع آخرین پریود را از بخش تنظیمات وارد کنید تا پیش‌بینی هوشمند ماه فعال شود.'}
          </div>
        </div>
      </motion.div>

      {/* ── Interactive Monthly Calendar View ── */}
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
        {/* Calendar Header: Month Navigator & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-white/10 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            <span className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-rose-400" />
              {useJalali
                ? `${JALALI_MONTH_NAMES[viewJalaliMonth - 1]} ${viewJalaliYear}`
                : `${GREGORIAN_MONTH_NAMES[viewGregMonth - 1]} ${viewGregYear}`}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-white/10 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              پریود ثبت‌شده
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-400 inline-block" />
              پیش‌بینی پریود
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              باروری و تخمک‌گذاری
            </span>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-4 text-center font-bold text-xs text-zinc-500">
          {weekdayHeaders.map((day, idx) => (
            <div key={idx} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
          {calendarDays.map((cell, idx) => {
            if (!cell.isCurrentMonth || !cell.isoDate) {
              return (
                <div
                  key={idx}
                  className="aspect-square rounded-2xl bg-zinc-900/20 border border-transparent opacity-20 pointer-events-none"
                />
              );
            }

            const info = getDayInfo(cell.isoDate);

            // Styling based on cycle status
            let cellBg = 'bg-zinc-900/50 hover:bg-zinc-800/60 border-white/5';
            if (info.isPeriod) {
              cellBg = 'bg-rose-950/70 border-rose-600/80 text-white shadow-md shadow-rose-950/50';
            } else if (info.isPredictedPeriod) {
              cellBg = 'bg-rose-950/20 border-dashed border-rose-500/50 text-rose-200';
            } else if (info.isOvulation) {
              cellBg = 'bg-purple-950/60 border-purple-500 text-purple-200';
            } else if (info.isFertile) {
              cellBg = 'bg-purple-950/30 border-purple-500/30 text-purple-200';
            }

            if (info.isToday) {
              cellBg += ' ring-2 ring-indigo-400 ring-offset-2 ring-offset-black';
            }

            return (
              <motion.button
                key={cell.isoDate}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => openDayModal(cell.isoDate)}
                className={`aspect-square rounded-2xl border p-1 sm:p-2 flex flex-col justify-between transition cursor-pointer relative overflow-hidden ${cellBg}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-extrabold ${info.isToday ? 'text-indigo-300' : ''}`}>
                    {cell.displayDay}
                  </span>

                  {info.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>

                {/* Badges / Micro Indicators */}
                <div className="flex items-center justify-center gap-1 w-full mt-auto">
                  {info.isPeriod && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  )}

                  {info.isPredictedPeriod && !info.isPeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80" />
                  )}

                  {info.isOvulation && (
                    <span className="text-[10px]" title="روز تخمک‌گذاری">🌸</span>
                  )}

                  {info.log?.symptoms && info.log.symptoms.length > 0 && (
                    <span className="text-[9px] text-amber-400 font-mono">
                      •{info.log.symptoms.length}
                    </span>
                  )}

                  {info.log?.mood && info.log.mood.length > 0 && (
                    <span className="text-[10px]">
                      {info.log.mood.includes('happy') ? '🥰' : (info.log.mood.includes('irritable') ? '😤' : '💫')}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Day Log / Check-in Modal ── */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20" />
                  <h3 className="text-base font-bold text-white">
                    ثبت وضعیت روز: {selectedDate}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Flow Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  میزان خونریزی / جریان (Flow):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FLOW_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setModalFlow(opt.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        modalFlow === opt.id
                          ? opt.color + ' ring-2 ring-rose-400'
                          : 'bg-zinc-800/40 text-zinc-400 border-white/5 hover:bg-zinc-800'
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[10px] font-normal opacity-70 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start / End Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPeriodStart}
                    onChange={(e) => setIsPeriodStart(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-zinc-800 border-zinc-700"
                  />
                  <span>شروع پریود این ماه است</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPeriodEnd}
                    onChange={(e) => setIsPeriodEnd(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-zinc-800 border-zinc-700"
                  />
                  <span>پایان پریود (پاکی)</span>
                </label>
              </div>

              {/* Symptoms Chips */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  علائم و نشانه‌های جسمی:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_OPTIONS.map(s => {
                    const active = modalSymptoms.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSymptom(s.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-zinc-800/40 text-zinc-400 border-white/5 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mood Chips */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  احساس و حال روحی:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map(m => {
                    const active = modalMood.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMood(m.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-zinc-800/40 text-zinc-400 border-white/5 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Textarea */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  یادداشت شخصی یا پزشکی:
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="مثلاً: مصرف دمنوش آویشن، نیاز به پیاده‌روی سبک، وضعیت خواب..."
                  rows={2}
                  className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                {logsMap.has(selectedDate) ? (
                  <button
                    type="button"
                    onClick={handleDeleteDayLog}
                    disabled={isSaving}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف این روز
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDayLog}
                    disabled={isSaving}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Settings Modal: Cycle Length & Preferences ── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-rose-400" />
                  <h3 className="text-base font-bold text-white">
                    تنظیمات چرخه قاعدگی (Cycle Settings)
                  </h3>
                </div>

                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    میانگین طول کل چرخه (معمولاً ۲۸ روز):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={21}
                      max={45}
                      value={editCycleLength}
                      onChange={(e) => setEditCycleLength(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                    />
                    <span className="text-xs text-zinc-400">روز</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    میانگین مدت خونریزی (معمولاً ۵ روز):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={editPeriodLength}
                      onChange={(e) => setEditPeriodLength(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                    />
                    <span className="text-xs text-zinc-400">روز</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    تاریخ شروع آخرین پریود (YYYY-MM-DD):
                  </label>
                  <input
                    type="date"
                    value={editLastPeriodStart}
                    onChange={(e) => setEditLastPeriodStart(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
