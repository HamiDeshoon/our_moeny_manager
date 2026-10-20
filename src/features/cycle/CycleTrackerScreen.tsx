import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, HeartPulse, Settings2 } from 'lucide-react';
import type { AppSettings, AuthUser, CycleLog, CycleSettings } from '../../types';
import { getCalendarPhase, getLastPeriodStart, getJalaliMonthDaysGrid } from './cycleMath';
import { DailyWellnessCard } from './DailyWellnessCard';
import { gregorianToJalali, formatJalaliDate } from '../../utils/formatters';

interface CycleTrackerScreenProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
  logs: CycleLog[];
  cycleSettings: CycleSettings;
  insights: import('../../types').CycleInsight[];
  insightsLoading: boolean;
  insightsError: string | null;
  onOpenLog: (date: string) => void;
  onUpdateSettings: (update: Partial<CycleSettings>) => Promise<void>;
  onEnableInsights: () => void;
  onRefreshInsights: () => void;
}

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
const weekdayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const phaseLabels = { period: 'قاعدگی', fertile: 'پنجره باروری', ovulation: 'تخمک‌گذاری', safe: 'روز پیش‌بینی‌شده' } as const;

export function CycleTrackerScreen({
  settings: _settings,
  currentUser,
  logs,
  cycleSettings,
  insights,
  insightsLoading,
  insightsError,
  onOpenLog,
  onUpdateSettings,
  onEnableInsights,
  onRefreshInsights
}: CycleTrackerScreenProps) {
  const now = new Date();
  const [currentJy, currentJm] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [jalaliYear, setJalaliYear] = useState(currentJy);
  const [jalaliMonth, setJalaliMonth] = useState(currentJm);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleLength, setCycleLength] = useState(String(cycleSettings.cycleLength || 28));
  const [periodLength, setPeriodLength] = useState(String(cycleSettings.periodLength || 5));
  const [lastPeriodStart, setLastPeriodStart] = useState(cycleSettings.lastPeriodStart || '');

  const daysGrid = useMemo(() => getJalaliMonthDaysGrid(jalaliYear, jalaliMonth), [jalaliYear, jalaliMonth]);
  const logDates = useMemo(() => new Set(logs.map((log) => log.date)), [logs]);
  const today = now.toISOString().slice(0, 10);
  const lastPeriod = getLastPeriodStart(logs, cycleSettings);

  const moveMonth = (offset: number) => {
    let nextMonth = jalaliMonth + offset;
    let nextYear = jalaliYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setJalaliMonth(nextMonth);
    setJalaliYear(nextYear);
  };

  const saveSettings = async () => {
    await onUpdateSettings({
      cycleLength: Number(cycleLength) || 28,
      periodLength: Number(periodLength) || 5,
      lastPeriodStart: lastPeriodStart || undefined
    });
    setSettingsOpen(false);
  };

  return (
    <div className="space-y-5 pb-4">
      <section className="rounded-[1.5rem] border border-rose-300/15 bg-[#1e181c] p-5 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-200">
              <HeartPulse className="h-5 w-5" />
              <h1 className="font-bold">چرخه و سلامت</h1>
            </div>
            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
              ثبت روزانه، تقویم و پیش‌بینی‌های ملایم سلامت همراه با تاریخ شمسی.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
            aria-expanded={settingsOpen}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white/5 text-zinc-200"
          >
            <Settings2 className="h-5 w-5" />
          </button>
        </div>

        {lastPeriod ? (
          <p className="mt-4 text-xs text-rose-200/80">
            آخرین شروع ثبت‌شده: {formatJalaliDate(lastPeriod)}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-4 text-xs font-bold text-teal-200 underline underline-offset-4"
          >
            برای فعال کردن پیش‌بینی، تاریخ شروع آخرین دوره را وارد کنید.
          </button>
        )}

        {settingsOpen ? (
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
            <label className="text-xs text-zinc-400">
              طول چرخه (روز)
              <input
                aria-label="طول چرخه"
                type="number"
                min="20"
                max="45"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-zinc-400">
              طول دوره (روز)
              <input
                aria-label="طول پریود"
                type="number"
                min="2"
                max="10"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
              />
            </label>
            <label className="text-xs text-zinc-400">
              شروع آخرین دوره
              <input
                aria-label="شروع آخرین پریود"
                type="date"
                value={lastPeriodStart}
                onChange={(e) => setLastPeriodStart(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveSettings()}
              className="min-h-11 rounded-xl bg-rose-400 px-4 text-sm font-bold text-[#341019] sm:col-span-3 hover:bg-rose-300 transition-colors"
            >
              ذخیره تنظیمات چرخه
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-4 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="ماه بعد"
            className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
          <h2 className="font-bold text-white text-base tracking-wide">
            {JALALI_MONTH_NAMES[jalaliMonth - 1]} {jalaliYear}
          </h2>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="ماه قبل"
            className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-zinc-400">
          {weekdayNames.map((name) => (
            <span key={name} className="py-1">{name}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {daysGrid.map((cell, index) => {
            if (!cell) return <div key={`blank-${index}`} aria-hidden="true" className="aspect-square" />;
            const { date, dayNumber } = cell;
            const phase = getCalendarPhase(date, logs, cycleSettings);
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onOpenLog(date)}
                aria-label={`${date}, ${phaseLabels[phase]}, ثبت وضعیت روز`}
                className={`relative aspect-square min-h-10 rounded-xl border p-1 text-xs font-bold transition hover:brightness-125 cycle-${phase} ${
                  isToday ? 'ring-2 ring-teal-300 ring-offset-2 ring-offset-[#14231e]' : ''
                }`}
              >
                <span>{dayNumber}</span>
                {logDates.has(date) ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white"
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-[10px] text-zinc-400 border-t border-white/5 pt-3">
          {(Object.keys(phaseLabels) as Array<keyof typeof phaseLabels>).map((phase) => (
            <span key={phase} className="flex items-center gap-1.5">
              <i className={`h-2.5 w-2.5 rounded-full cycle-${phase}`} />
              {phaseLabels[phase]}
            </span>
          ))}
        </div>
      </section>

      <DailyWellnessCard
        currentUser={currentUser}
        cycleSettings={cycleSettings}
        logs={logs}
        onOpenLog={onOpenLog}
      />
      {!currentUser ? (
        <div className="flex gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
          <CircleHelp className="h-4 w-4 shrink-0" />
          برای ذخیره یا دریافت بینش، ابتدا وارد حساب خود شوید.
        </div>
      ) : null}
    </div>
  );
}
