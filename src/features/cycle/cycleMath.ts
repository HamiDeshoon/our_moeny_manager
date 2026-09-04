import type { CycleLog, CycleSettings } from '../../types';

export type CalendarCyclePhase = 'period' | 'fertile' | 'ovulation' | 'safe';

const dayMs = 86_400_000;
const fromIso = (date: string) => new Date(`${date}T00:00:00`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function dateOffset(date: string, days: number): string {
  return iso(new Date(fromIso(date).getTime() + days * dayMs));
}

export function getLastPeriodStart(logs: readonly CycleLog[], settings: CycleSettings): string | undefined {
  if (settings.lastPeriodStart) return settings.lastPeriodStart;
  return logs
    .filter((log) => log.isPeriodStart || (log.flow && !['none', 'spotting'].includes(log.flow)))
    .map((log) => log.date)
    .sort()
    .at(-1);
}

export function getCalendarPhase(date: string, logs: readonly CycleLog[], settings: CycleSettings): CalendarCyclePhase {
  const log = logs.find((entry) => entry.date === date);
  if (log?.flow && log.flow !== 'none') return 'period';
  const start = getLastPeriodStart(logs, settings);
  if (!start || date < start) return 'safe';

  const cycleLength = Math.max(20, Math.min(45, Number(settings.cycleLength) || 28));
  const periodLength = Math.max(2, Math.min(10, Number(settings.periodLength) || 5));
  const distance = Math.floor((fromIso(date).getTime() - fromIso(start).getTime()) / dayMs);
  const dayInCycle = ((distance % cycleLength) + cycleLength) % cycleLength;
  const ovulationDay = Math.max(periodLength, cycleLength - (Number(settings.lutealLength) || 14));

  if (dayInCycle < periodLength) return 'period';
  if (dayInCycle === ovulationDay) return 'ovulation';
  if (dayInCycle >= ovulationDay - 4 && dayInCycle <= ovulationDay + 1) return 'fertile';
  return 'safe';
}

export function getMonthDays(year: number, monthIndex: number): Array<string | null> {
  const first = new Date(year, monthIndex, 1);
  const count = new Date(year, monthIndex + 1, 0).getDate();
  return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, index) => iso(new Date(year, monthIndex, index + 1)))];
}
