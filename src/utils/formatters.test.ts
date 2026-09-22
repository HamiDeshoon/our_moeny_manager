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
  getJalaliMonthOptions,
} from './formatters';

describe('getJalaliMonthYear', () => {
  it('returns empty string for empty input', () => {
    expect(getJalaliMonthYear('')).toBe('');
  });

  it('returns original string when date/month string is invalid', () => {
    expect(getJalaliMonthYear('invalid-date')).toBe('invalid-date');
    expect(getJalaliMonthYear('abc-def')).toBe('abc-def');
    expect(getJalaliMonthYear('notadate')).toBe('notadate');
  });

  it('formats YYYY-MM string correctly using default day (15th)', () => {
    // 2024-03 -> March 15, 2024 is Esfand 1402
    expect(getJalaliMonthYear('2024-03')).toBe('اسفند 1402');
  });

  it('formats YYYY-MM-DD string correctly', () => {
    // 2024-03-20 -> Farvardin 1403
    expect(getJalaliMonthYear('2024-03-20')).toBe('فروردین 1403');
    // 2024-01-15 -> Dey 1402
    expect(getJalaliMonthYear('2024-01-15')).toBe('دی 1402');
  });
});

describe('normalizePersianNumbers', () => {
  it('returns empty string for empty input', () => {
    expect(normalizePersianNumbers('')).toBe('');
  });

  it('converts Persian digits to ASCII digits', () => {
    expect(normalizePersianNumbers('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('converts Arabic digits to ASCII digits', () => {
    expect(normalizePersianNumbers('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('converts verbal shortcuts for thousand and million', () => {
    expect(normalizePersianNumbers('250 هزار')).toBe('250000');
    expect(normalizePersianNumbers('2 میلیون')).toBe('2000000');
  });
});

describe('toJalaliShort', () => {
  it('returns original input if empty or missing hyphen', () => {
    expect(toJalaliShort('')).toBe('');
    expect(toJalaliShort('20240320')).toBe('20240320');
  });

  it('returns original string if parts are NaN', () => {
    expect(toJalaliShort('abc-def-ghi')).toBe('abc-def-ghi');
  });

  it('converts YYYY-MM-DD to short Jalali format', () => {
    expect(toJalaliShort('2024-03-20')).toBe('1403/01/01');
  });
});

describe('formatJalaliDate', () => {
  it('returns original input if empty or missing hyphen', () => {
    expect(formatJalaliDate('')).toBe('');
    expect(formatJalaliDate('20240320')).toBe('20240320');
  });

  it('returns original string if parts are NaN', () => {
    expect(formatJalaliDate('abc-def-ghi')).toBe('abc-def-ghi');
  });

  it('formats YYYY-MM-DD with full Jalali day and month name', () => {
    expect(formatJalaliDate('2024-03-20')).toBe('1403/01/01 (1 فروردین)');
  });
});

describe('formatMoney', () => {
  it('formats Toman amounts properly as integers with grouping', () => {
    expect(formatMoney(1500000, 'تومان')).toBe('1,500,000 تومان');
    expect(formatMoney(0, 'IRT')).toBe('0 IRT');
  });

  it('formats whole number non-Toman amounts without decimal places', () => {
    expect(formatMoney(100, '$')).toBe('$100');
  });

  it('formats non-whole non-Toman amounts with 2 decimal places', () => {
    expect(formatMoney(12.345, '$')).toBe('$12.35');
  });
});

describe('gregorianToJalali and jalaliToGregorian', () => {
  it('converts Gregorian to Jalali and back', () => {
    const [jy, jm, jd] = gregorianToJalali(2024, 3, 20);
    expect([jy, jm, jd]).toEqual([1403, 1, 1]);

    const [gy, gm, gd] = jalaliToGregorian(1403, 1, 1);
    expect([gy, gm, gd]).toEqual([2024, 3, 20]);
  });
});

describe('isJalaliLeapYear & getJalaliMonthDays', () => {
  it('correctly identifies leap years and month days', () => {
    expect(isJalaliLeapYear(1399)).toBe(true);
    expect(getJalaliMonthDays(1403, 1)).toBe(31);
    expect(getJalaliMonthDays(1403, 7)).toBe(30);
    expect(getJalaliMonthDays(1399, 12)).toBe(30);
    expect(getJalaliMonthDays(1400, 12)).toBe(29);
  });
});

describe('getJalaliMonthOptions', () => {
  it('returns 12 month options centered around given date', () => {
    const centerDate = new Date(2024, 2, 20); // March 20, 2024
    const options = getJalaliMonthOptions(centerDate);
    expect(options).toHaveLength(12);
    expect(options[6].key).toBe('J1403-01');
  });
});
