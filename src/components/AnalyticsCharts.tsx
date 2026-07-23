import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import { AppSettings, Budget, MonthTrendData, Transaction } from '../types';
import { api } from '../services/api';
import { TrendingUp, TrendingDown, PiggyBank, Calendar, Sparkles, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalyticsChartsProps {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
  selectedMonth?: string;
}

const COLORS = [
  '#4f46e5', // Indigo
  '#0284c7', // Sky blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ef4444', // Red
  '#64748b', // Slate
];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  transactions,
  budgets,
  settings,
  selectedMonth,
}) => {
  const symbol = settings.currencySymbol || 'تومان';
  const [threeMonthTrends, setThreeMonthTrends] = useState<MonthTrendData[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'current' | '3month'>('3month');

  // Load 3-month trends from API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTrends(true);
    api.getThreeMonthTrends(selectedMonth)
      .then((data) => {
        if (isMounted) setThreeMonthTrends(data);
      })
      .catch((err) => console.error('Failed loading 3-month trends:', err))
      .finally(() => {
        if (isMounted) setIsLoadingTrends(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, transactions]);

  // Category breakdown for Donut chart (Current Month)
  const categoryData = useMemo(() => {
    const expenseTxs = (transactions || []).filter((t) => t.type === 'EXPENSE');
    const map: Record<string, number> = {};

    for (const t of expenseTxs) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    }

    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Partner spending comparison per category for Bar chart
  const partnerComparisonData = useMemo(() => {
    const expenseTxs = (transactions || []).filter((t) => t.type === 'EXPENSE');
    const map: Record<string, { partnerA: number; partnerB: number }> = {};

    for (const t of expenseTxs) {
      if (!map[t.category]) {
        map[t.category] = { partnerA: 0, partnerB: 0 };
      }
      if (t.paidBy === settings.partnerA.id) {
        map[t.category].partnerA += Number(t.amount || 0);
      } else {
        map[t.category].partnerB += Number(t.amount || 0);
      }
    }

    return Object.entries(map)
      .map(([category, vals]) => ({
        category,
        [settings.partnerA.name]: Math.round(vals.partnerA * 100) / 100,
        [settings.partnerB.name]: Math.round(vals.partnerB * 100) / 100,
      }))
      .slice(0, 6);
  }, [transactions, settings]);

  // Compute 3-Month Trend Summaries
  const trendSummary = useMemo(() => {
    if (!threeMonthTrends || threeMonthTrends.length === 0) return null;

    const totalSavingsSum = threeMonthTrends.reduce((acc, m) => acc + m.totalSavings, 0);
    const avgSavingsRate = Math.round(
      threeMonthTrends.reduce((acc, m) => acc + m.savingsRatePct, 0) / threeMonthTrends.length
    );
    const avgMonthlyExpense = Math.round(
      threeMonthTrends.reduce((acc, m) => acc + m.totalExpense, 0) / threeMonthTrends.length
    );

    // Latest month vs previous month delta
    const latest = threeMonthTrends[threeMonthTrends.length - 1];
    const prev = threeMonthTrends[threeMonthTrends.length - 2];
    const expenseDeltaPct = prev && prev.totalExpense > 0
      ? Math.round(((latest.totalExpense - prev.totalExpense) / prev.totalExpense) * 100)
      : 0;

    return {
      totalSavingsSum,
      avgSavingsRate,
      avgMonthlyExpense,
      expenseDeltaPct,
      latestMonth: latest,
    };
  }, [threeMonthTrends]);

  // Consolidate categories across 3 months
  const categoryMatrixData = useMemo(() => {
    if (!threeMonthTrends || threeMonthTrends.length < 2) return [];

    const categories = Array.from(
      new Set(threeMonthTrends.flatMap((m) => Object.keys(m.categoryBreakdown)))
    ) as string[];

    return categories.map((cat: string) => {
      const vals = threeMonthTrends.map((m) => m.categoryBreakdown[cat] || 0);
      const latestVal = vals[vals.length - 1] || 0;
      const prevVal = vals[vals.length - 2] || 0;
      const deltaPct = prevVal > 0 ? Math.round(((latestVal - prevVal) / prevVal) * 100) : 0;

      return {
        category: cat,
        month1: vals[0] || 0,
        month2: vals[1] || 0,
        month3: vals[2] || 0,
        deltaPct,
      };
    }).sort((a, b) => b.month3 - a.month3).slice(0, 7);
  }, [threeMonthTrends]);

  return (
    <div className="space-y-6 mb-8">
      {/* View Selector Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">تحلیل‌های مالی و روند پس‌انداز (Analytics & Saving Trends)</h2>
            <p className="text-xs text-slate-500">بررسی مخارج و مقایسه روند ۳ ماه اخیر</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('3month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === '3month'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مقایسه ۳ ماه اخیر (3-Month Comparative)
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'current'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ماه جاری (Current Month)
          </button>
        </div>
      </div>

      {/* --- TAB 1: 3-MONTH COMPARATIVE VIEW & SAVINGS TRENDS --- */}
      {activeTab === '3month' && (
        <div className="space-y-6">
          {/* Summary Metric Cards for 3-Month Trends */}
          {trendSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-emerald-100 text-xs font-medium">
                  <span>مجموع پس‌انداز ۳ ماه اخیر</span>
                  <PiggyBank className="w-4 h-4 text-emerald-200" />
                </div>
                <div className="text-2xl font-black font-mono">
                  {trendSummary.totalSavingsSum.toLocaleString()} <span className="text-xs font-normal text-emerald-100">{symbol}</span>
                </div>
                <p className="text-[11px] text-emerald-100">درصد پس‌انداز میانگین: {trendSummary.avgSavingsRate}%</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>میانگین هزینه ماهانه</span>
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono">
                  {trendSummary.avgMonthlyExpense.toLocaleString()} <span className="text-xs text-slate-500">{symbol}</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px]">
                  {trendSummary.expenseDeltaPct <= 0 ? (
                    <span className="text-emerald-600 font-bold flex items-center">
                      <ArrowDownRight className="w-3.5 h-3.5 ml-0.5" />
                      {Math.abs(trendSummary.expenseDeltaPct)}% کاهش نسبت به ماه قبل
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center">
                      <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                      {trendSummary.expenseDeltaPct}% افزایش نسبت به ماه قبل
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>وضعیت روند پس‌انداز (Saving Trend)</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-base font-extrabold text-indigo-700 flex items-center space-x-1">
                  <span>{trendSummary.avgSavingsRate >= 20 ? '🟢 عالی (قوی)' : '🟡 متوسط'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {trendSummary.avgSavingsRate >= 20
                    ? 'روند پس‌انداز شخص و خانواده مثبت و صعودی است.'
                    : 'با کاهش هزینه‌های متفرقه امکان پس‌انداز بیشتر وجود دارد.'}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>تولید هوشمند گزارش</span>
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  مقایسه ۳ دوره ماهانه کاملاً به‌روز
                </div>
                <p className="text-[11px] text-slate-500">شامل سهم پرداختی {settings.partnerA.name} و {settings.partnerB.name}</p>
              </div>
            </div>
          )}

          {/* 3-Month Comparative Chart: Expenses vs Savings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  نمودار مقایسه‌ای هزینه‌ها و پس‌انداز ۳ ماه اخیر (3-Month Spend vs. Savings)
                </h3>
                <p className="text-[11px] text-slate-500">مقایسه هزینه‌ها (میله‌ای) و نرخ پس‌انداز (خط بنفش)</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                3 Months Trend
              </span>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={threeMonthTrends} margin={{ top: 15, right: 15, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={10} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(val: number, name: string) => {
                      if (name === 'نرخ پس‌انداز (%)') return [`${val}%`, name];
                      return [`${val.toLocaleString()} ${symbol}`, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="totalExpense" name="کل هزینه‌ها" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="left" dataKey="totalSavings" name="میزان پس‌انداز" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="left" dataKey="partnerAExpense" name={`پرداخت ${settings.partnerA.name}`} fill={settings.partnerA.color} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="partnerBExpense" name={`پرداخت ${settings.partnerB.name}`} fill={settings.partnerB.color} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="savingsRatePct" name="نرخ پس‌انداز (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MoM Category Comparison Table */}
          {categoryMatrixData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    تغییرات هزینه‌های دسته‌بندی‌ها در ۳ ماه اخیر (Category MoM Trends)
                  </h3>
                  <p className="text-[11px] text-slate-500">بررسی ردیف به ردیف دسته‌ها برای شناسایی فرصت‌های صرفه‌جویی</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">دسته‌بندی</th>
                      {threeMonthTrends.map((m) => (
                        <th key={m.monthKey} className="p-3 font-mono">{m.monthLabel}</th>
                      ))}
                      <th className="p-3">تغییر نسبت به ماه قبل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryMatrixData.map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-800">{row.category}</td>
                        <td className="p-3 font-mono text-slate-600">{row.month1.toLocaleString()} {symbol}</td>
                        <td className="p-3 font-mono text-slate-600">{row.month2.toLocaleString()} {symbol}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{row.month3.toLocaleString()} {symbol}</td>
                        <td className="p-3">
                          {row.deltaPct < 0 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ArrowDownRight className="w-3 h-3 ml-0.5" />
                              {Math.abs(row.deltaPct)}% صرفه‌جویی
                            </span>
                          ) : row.deltaPct > 0 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <ArrowUpRight className="w-3 h-3 ml-0.5" />
                              {row.deltaPct}% افزایش
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">ثابت</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: CURRENT MONTH CHARTS --- */}
      {activeTab === 'current' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart: Category Spending Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Spending by Category
              </h3>
              <span className="text-xs text-slate-500">Total Breakdown</span>
            </div>

            {categoryData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No expense data available for this month
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val.toLocaleString()} ${symbol}`, 'Amount']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
              {categoryData.slice(0, 6).map((item, idx) => (
                <div key={item.name} className="flex items-center space-x-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: Partner Contribution Comparison */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Partner Payment Comparison
              </h3>
              <span className="text-xs text-slate-500">Paid Amounts</span>
            </div>

            {partnerComparisonData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No comparative data available
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={partnerComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.8} />
                    <XAxis
                      dataKey="category"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      formatter={(val: number) => [`${val.toLocaleString()} ${symbol}`, 'Paid']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey={settings.partnerA.name} fill={settings.partnerA.color} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={settings.partnerB.name} fill={settings.partnerB.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
