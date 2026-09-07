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

export function getJalaliMonthDaysGrid(jy: number, jm: number): Array<{ date: string; dayNumber: number } | null> {
  const count = jm <= 6 ? 31 : jm <= 11 ? 30 : (((((jy - 474) % 2820) + 474) + 38) * 682) % 2816 < 682 ? 30 : 29;
  // Convert first day of jalali month to gregorian to find weekday
  let jy1 = jy - 979;
  let j_day_no = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;
  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) gy++;
    else leap = false;
  }
  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }
  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  const gd = g_day_no + 1;
  const firstGregDate = new Date(gy, gm, gd);
  // Saturday = 0, Sunday = 1, ..., Friday = 6
  const startWeekday = (firstGregDate.getDay() + 1) % 7;

  const grid: Array<{ date: string; dayNumber: number } | null> = Array(startWeekday).fill(null);

  for (let d = 1; d <= count; d++) {
    // Determine each day's ISO date
    const dOffsetMs = (d - 1) * 86_400_000;
    const currentGreg = new Date(firstGregDate.getTime() + dOffsetMs);
    const dateStr = currentGreg.toISOString().slice(0, 10);
    grid.push({ date: dateStr, dayNumber: d });
  }

  return grid;
}

