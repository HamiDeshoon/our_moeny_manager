import { describe, it, expect } from 'vitest';
import {
  getJalaliMonthYear,
  normalizePersianNumbers,
  toJalaliShort,
  formatJalaliDate,
  formatMoney,
  gregorianToJalali,
  jalaliToGregorian,
  isJalaliLeapYear,
  getJalaliMonthDays,
} from './formatters';

describe('formatMoney', () => {
  describe('Toman currency formats', () => {
    it('uses تومان as default symbol if omitted', () => {
      expect(formatMoney(1000)).toBe('1,000 تومان');
    });

    it('formats Toman amounts correctly with various symbol aliases', () => {
      expect(formatMoney(50000, 'تومان')).toBe('50,000 تومان');
      expect(formatMoney(1200000, 'Toman')).toBe('1,200,000 Toman');
      expect(formatMoney(3500, 'toman')).toBe('3,500 toman');
      expect(formatMoney(250000, 'IRT')).toBe('250,000 IRT');
      expect(formatMoney(75000, 'T')).toBe('75,000 T');
    });

    it('rounds floating point Toman amounts to whole numbers without cents', () => {
      expect(formatMoney(1234.56, 'تومان')).toBe('1,235 تومان');
      expect(formatMoney(1234.4, 'IRT')).toBe('1,234 IRT');
    });

    it('handles zero and negative amounts for Toman', () => {
      expect(formatMoney(0, 'تومان')).toBe('0 تومان');
      expect(formatMoney(-15000, 'IRT')).toBe('-15,000 IRT');
    });
  });

  describe('Non-Toman standard currency formats', () => {
    it('formats whole integer amounts without forcing decimals', () => {
      expect(formatMoney(100, '$')).toBe('$100');
      expect(formatMoney(2500, '€')).toBe('€2,500');
    });

    it('formats fractional amounts with 2 decimal places', () => {
      expect(formatMoney(10.5, '$')).toBe('$10.50');
      expect(formatMoney(1234.567, 'USD')).toBe('USD1,234.57');
      expect(formatMoney(99.9, 'EUR')).toBe('EUR99.90');
    });

    it('handles zero and negative amounts for non-Toman currencies', () => {
      expect(formatMoney(0, '$')).toBe('$0');
      expect(formatMoney(-50.25, '$')).toBe('$-50.25');
      expect(formatMoney(-100, '$')).toBe('$-100');
    });

    it('handles custom currency symbols and empty currency symbols', () => {
      expect(formatMoney(500, '')).toBe('500');
      expect(formatMoney(1234.5, '')).toBe('1,234.50');
      expect(formatMoney(1000, '£')).toBe('£1,000');
    });
  });

  describe('Edge cases and invalid inputs', () => {
    it('handles NaN or non-numeric values safely', () => {
      expect(formatMoney(NaN, '$')).toBe('$0');
      expect(formatMoney(NaN, 'تومان')).toBe('0 تومان');
      expect(formatMoney(undefined as unknown as number, '$')).toBe('$0');
      expect(formatMoney(null as unknown as number, '$')).toBe('$0');
    });

    it('handles numeric string inputs', () => {
      expect(formatMoney('500' as unknown as number, '$')).toBe('$500');
      expect(formatMoney('1234.56' as unknown as number, '$')).toBe('$1,234.56');
    });

    it('formats very large numbers cleanly with thousand separators', () => {
      expect(formatMoney(1000000000, '$')).toBe('$1,000,000,000');
      expect(formatMoney(5000000000, 'تومان')).toBe('5,000,000,000 تومان');
    });
  });
});

describe('Other formatter utilities', () => {
  it('normalizes Persian digits and verbal shortcuts', () => {
    expect(normalizePersianNumbers('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
    expect(normalizePersianNumbers('250 هزار')).toBe('250000');
    expect(normalizePersianNumbers('2 میلیون')).toBe('2000000');
  });

  it('converts Gregorian to Jalali and back', () => {
    const [jy, jm, jd] = gregorianToJalali(2026, 3, 21);
    expect(jy).toBe(1405);
    expect(jm).toBe(1);
    expect(jd).toBe(1);

    const [gy, gm, gd] = jalaliToGregorian(1405, 1, 1);
    expect(gy).toBe(2026);
    expect(gm).toBe(3);
    expect(gd).toBe(21);
  });

  it('checks Jalali leap year and month days', () => {
    expect(isJalaliLeapYear(1399)).toBe(true);
    expect(getJalaliMonthDays(1399, 12)).toBe(30);
    expect(getJalaliMonthDays(1400, 12)).toBe(29);
    expect(getJalaliMonthDays(1405, 1)).toBe(31);
    expect(getJalaliMonthDays(1405, 7)).toBe(30);
  });

  it('formats Jalali dates correctly', () => {
    expect(toJalaliShort('2026-03-21')).toBe('1405/01/01');
    expect(getJalaliMonthYear('2026-03-21')).toBe('فروردین 1405');
    expect(formatJalaliDate('2026-03-21')).toBe('1405/01/01 (1 فروردین)');
  });
});
