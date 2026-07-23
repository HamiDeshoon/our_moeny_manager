/**
 * Helper utilities for Persian/Farsi digit normalization, Jalali date formatting,
 * and currency display (including Iranian Toman).
 */

export function normalizePersianNumbers(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    result = result.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }

  // Parse Persian verbal shortcuts in text, e.g. "250 هزار" -> "250000", "2 میلیون" -> "2000000"
  // "هزار" = thousand, "میلیون" or "میلیون تومان" = million
  result = result.replace(/(\d+)\s*هزار/g, (_, num) => `${parseInt(num, 10) * 1000}`);
  result = result.replace(/(\d+)\s*میلیون/g, (_, num) => `${parseInt(num, 10) * 1000000}`);

  return result;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let jy1 = jy - 979;
  let j_day_no = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
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
  return [gy, gm + 1, gd];
}

export function isJalaliLeapYear(jy: number): boolean {
  const r = (jy - 474) % 2820;
  return (((r + 474) + 38) * 682) % 2816 < 682;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function getJalaliMonthGregorianRange(jy: number, jm: number) {
  const days = getJalaliMonthDays(jy, jm);
  const [sy, sm, sd] = jalaliToGregorian(jy, jm, 1);
  const [ey, em, ed] = jalaliToGregorian(jy, jm, days);

  const startDate = `${sy}-${String(sm).padStart(2, '0')}-${String(sd).padStart(2, '0')}`;
  const endDate = `${ey}-${String(em).padStart(2, '0')}-${String(ed).padStart(2, '0')}`;

  return { startDate, endDate, days };
}

export interface JalaliMonthOption {
  key: string; // e.g. "J1405-05"
  jalaliYear: number;
  jalaliMonth: number;
  monthName: string;
  startDate: string; // e.g. "2026-07-23"
  endDate: string; // e.g. "2026-08-22"
  label: string; // e.g. "مرداد ۱۴۰۵ (۰۱ مرداد - ۳۱ مرداد)"
}

export function getJalaliMonthOptions(centerDate: Date = new Date()): JalaliMonthOption[] {
  const gy = centerDate.getFullYear();
  const gm = centerDate.getMonth() + 1;
  const gd = centerDate.getDate();
  const [currentJY, currentJM] = gregorianToJalali(gy, gm, gd);

  const options: JalaliMonthOption[] = [];

  // Generate 12 months starting from 6 months ago to 5 months ahead
  for (let offset = -6; offset <= 5; offset++) {
    let jm = currentJM + offset;
    let jy = currentJY;

    while (jm > 12) {
      jm -= 12;
      jy += 1;
    }
    while (jm < 1) {
      jm += 12;
      jy -= 1;
    }

    const { startDate, endDate, days } = getJalaliMonthGregorianRange(jy, jm);
    const monthName = JALALI_MONTH_NAMES[jm - 1];
    const key = `J${jy}-${String(jm).padStart(2, '0')}`;
    const label = `${monthName} ${jy} (۱ ${monthName} تا ${days} ${monthName})`;

    options.push({
      key,
      jalaliYear: jy,
      jalaliMonth: jm,
      monthName,
      startDate,
      endDate,
      label,
    });
  }

  return options;
}

export const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export function toJalaliShort(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2] || '1', 10);

  if (isNaN(gy) || isNaN(gm)) return dateStr;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function getJalaliMonthYear(dateStrOrMonthStr: string): string {
  if (!dateStrOrMonthStr) return '';
  const parts = dateStrOrMonthStr.split('-');
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parts[2] ? parseInt(parts[2], 10) : 15;

  if (isNaN(gy) || isNaN(gm)) return dateStrOrMonthStr;
  const [jy, jm] = gregorianToJalali(gy, gm, gd);
  const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
  return `${monthName} ${jy}`;
}

/**
 * Converts YYYY-MM-DD Gregorian string to formatted Jalali string e.g. "1405/05/01 (1 مرداد)"
 */
export function formatJalaliDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);

  if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return dateStr;

  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')} (${jd} ${monthName})`;
}

/**
 * Cleanly formats a monetary amount according to the active currency symbol.
 * For Toman / تومان, handles large whole numbers without forcing .00 cents.
 */
export function formatMoney(amount: number, symbol: string = 'تومان'): string {
  const num = Number(amount) || 0;
  const isToman = symbol.includes('تومان') || symbol.toLowerCase().includes('toman') || symbol === 'IRT' || symbol === 'T';

  if (isToman) {
    const formatted = Math.round(num).toLocaleString('en-US');
    return `${formatted} ${symbol}`.trim();
  }

  if (num % 1 === 0) {
    const formatted = Math.round(num).toLocaleString('en-US');
    return `${symbol}${formatted}`.trim();
  }

  // Decimals for USD / EUR / etc.
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`.trim();
}
