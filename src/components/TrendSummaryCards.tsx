import React from 'react';
import { PiggyBank, Calendar, ArrowUpRight, ArrowDownRight, Sparkles, ShieldAlert } from 'lucide-react';
import { AppSettings, MonthTrendData } from '../types';

interface TrendSummary {
  totalSavingsSum: number;
  avgSavingsRate: number;
  avgMonthlyExpense: number;
  expenseDeltaPct: number;
  latestMonth: MonthTrendData;
}

interface TrendSummaryCardsProps {
  trendSummary: TrendSummary;
  settings: AppSettings;
}

export const TrendSummaryCards: React.FC<TrendSummaryCardsProps> = ({ trendSummary, settings }) => {
  const symbol = settings.currencySymbol || 'تومان';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-indigo-100 text-xs font-medium">
          <span>مجموع پس‌انداز ۳ ماه اخیر</span>
          <PiggyBank className="w-4 h-4 text-indigo-200" />
        </div>
        <div className="text-2xl font-black font-mono">
          {trendSummary.totalSavingsSum.toLocaleString()} <span className="text-xs font-normal text-indigo-100">{symbol}</span>
        </div>
        <p className="text-[11px] text-indigo-100">درصد پس‌انداز میانگین: {trendSummary.avgSavingsRate}%</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-xs space-y-1">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>میانگین هزینه ماهانه</span>
          <Calendar className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="text-xl font-extrabold text-white font-mono">
          {trendSummary.avgMonthlyExpense.toLocaleString()} <span className="text-xs text-zinc-500">{symbol}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {trendSummary.expenseDeltaPct <= 0 ? (
            <span className="text-emerald-400 font-bold flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {Math.abs(trendSummary.expenseDeltaPct)}% کاهش نسبت به ماه قبل
            </span>
          ) : (
            <span className="text-rose-400 font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {trendSummary.expenseDeltaPct}% افزایش نسبت به ماه قبل
            </span>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-xs space-y-1">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>وضعیت روند پس‌انداز</span>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-base font-extrabold text-indigo-400 flex items-center space-x-1">
          <span>{trendSummary.avgSavingsRate >= 20 ? '🟢 عالی (قوی)' : '🟡 متوسط'}</span>
        </div>
        <p className="text-[11px] text-zinc-500">
          {trendSummary.avgSavingsRate >= 20
            ? 'روند پس‌انداز شخص و خانواده مثبت و صعودی است.'
            : 'با کاهش هزینه‌های متفرقه امکان پس‌انداز بیشتر وجود دارد.'}
        </p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-xs space-y-1">
        <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
          <span>تولید هوشمند گزارش</span>
          <ShieldAlert className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-xs font-bold text-zinc-200">
          مقایسه ۳ دوره ماهانه کاملاً به‌روز
        </div>
        <p className="text-[11px] text-zinc-500">شامل سهم پرداختی {settings.partnerA.name} و {settings.partnerB.name}</p>
      </div>
    </div>
  );
};
