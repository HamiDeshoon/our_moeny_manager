import React, { useState } from 'react';
import { HeartPulse, Settings2 } from 'lucide-react';
import type { CycleLog, CycleSettings } from '../../types';
import { getLastPeriodStart } from './cycleMath';
import { formatJalaliDate } from '../../utils/formatters';

interface CycleHeaderCardProps {
  cycleSettings: CycleSettings;
  logs: CycleLog[];
  onUpdateSettings: (update: Partial<CycleSettings>) => Promise<void>;
}

export function CycleHeaderCard({
  cycleSettings,
  logs,
  onUpdateSettings,
}: CycleHeaderCardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleLength, setCycleLength] = useState(String(cycleSettings.cycleLength || 28));
  const [periodLength, setPeriodLength] = useState(String(cycleSettings.periodLength || 5));
  const [lastPeriodStart, setLastPeriodStart] = useState(cycleSettings.lastPeriodStart || '');

  const lastPeriod = getLastPeriodStart(logs, cycleSettings);

  const saveSettings = async () => {
    await onUpdateSettings({
      cycleLength: Number(cycleLength) || 28,
      periodLength: Number(periodLength) || 5,
      lastPeriodStart: lastPeriodStart || undefined,
    });
    setSettingsOpen(false);
  };

  return (
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
  );
}
