import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CycleLog, CycleSettings } from '../../types';
import { getCalendarPhase, getJalaliMonthDaysGrid } from './cycleMath';

interface CycleCalendarCardProps {
  jalaliYear: number;
  jalaliMonth: number;
  logs: CycleLog[];
  cycleSettings: CycleSettings;
  today: string;
  onMoveMonth: (offset: number) => void;
  onOpenLog: (date: string) => void;
}

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];
const weekdayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const phaseLabels = { period: 'قاعدگی', fertile: 'پنجره باروری', ovulation: 'تخمک‌گذاری', safe: 'روز پیش‌بینی‌شده' } as const;

export function CycleCalendarCard({
  jalaliYear,
  jalaliMonth,
  logs,
  cycleSettings,
  today,
  onMoveMonth,
  onOpenLog,
}: CycleCalendarCardProps) {
  const daysGrid = useMemo(() => getJalaliMonthDaysGrid(jalaliYear, jalaliMonth), [jalaliYear, jalaliMonth]);
  const logDates = useMemo(() => new Set(logs.map((log) => log.date)), [logs]);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMoveMonth(1)}
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
          onClick={() => onMoveMonth(-1)}
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
  );
}
