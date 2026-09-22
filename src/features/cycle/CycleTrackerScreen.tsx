import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import type { AppSettings, AuthUser, CycleLog, CycleSettings } from '../../types';
import { DailyWellnessCard } from './DailyWellnessCard';
import { CycleHeaderCard } from './CycleHeaderCard';
import { CycleCalendarCard } from './CycleCalendarCard';
import { gregorianToJalali } from '../../utils/formatters';

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

export function CycleTrackerScreen({
  settings: _settings,
  currentUser,
  logs,
  cycleSettings,
  insights: _insights,
  insightsLoading: _insightsLoading,
  insightsError: _insightsError,
  onOpenLog,
  onUpdateSettings,
  onEnableInsights: _onEnableInsights,
  onRefreshInsights: _onRefreshInsights
}: CycleTrackerScreenProps) {
  const now = new Date();
  const [currentJy, currentJm] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const [jalaliYear, setJalaliYear] = useState(currentJy);
  const [jalaliMonth, setJalaliMonth] = useState(currentJm);

  const today = now.toISOString().slice(0, 10);

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

  return (
    <div className="space-y-5 pb-4">
      <CycleHeaderCard
        cycleSettings={cycleSettings}
        logs={logs}
        onUpdateSettings={onUpdateSettings}
      />

      <CycleCalendarCard
        jalaliYear={jalaliYear}
        jalaliMonth={jalaliMonth}
        logs={logs}
        cycleSettings={cycleSettings}
        today={today}
        onMoveMonth={moveMonth}
        onOpenLog={onOpenLog}
      />

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
