import { describe, expect, it } from 'vitest';
import { getCalendarPhase, getMonthDays, getLastPeriodStart } from './cycleMath';
import type { CycleLog, CycleSettings } from '../../types';

const settings: CycleSettings = { cycleLength: 28, periodLength: 5, lutealLength: 14, lastPeriodStart: '2026-09-01' };

describe('cycleMath', () => {
  it('prioritizes logged flow over the predicted phase', () => {
    const logs: CycleLog[] = [{ date: '2026-09-15', flow: 'heavy' }];
    expect(getCalendarPhase('2026-09-15', logs, settings)).toBe('period');
  });

  it('maps period, fertile window, ovulation, and safe dates deterministically', () => {
    expect(getCalendarPhase('2026-09-03', [], settings)).toBe('period');
    expect(getCalendarPhase('2026-09-11', [], settings)).toBe('fertile');
    expect(getCalendarPhase('2026-09-15', [], settings)).toBe('ovulation');
    expect(getCalendarPhase('2026-09-24', [], settings)).toBe('safe');
  });

  it('handles leap-day calendar grids and finds the latest recorded period', () => {
    expect(getMonthDays(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(getLastPeriodStart([{ date: '2026-02-01', flow: 'medium' }, { date: '2026-03-01', isPeriodStart: true }], { ...settings, lastPeriodStart: '' })).toBe('2026-03-01');
  });
});
