import React, { useMemo } from 'react';
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
} from 'recharts';
import { AppSettings, Budget, Transaction } from '../types';
import { TrendingUp, Wallet, ArrowDownRight, Layers, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

interface AnalyticsChartsProps {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
  selectedMonth?: string;
}

const COLORS = [
  '#2dd4bf', // Teal
  '#818cf8', // Indigo
  '#fb7185', // Rose
  '#fbbf24', // Amber
  '#38bdf8', // Sky
  '#a78bfa', // Purple
  '#34d399', // Emerald
  '#f97316', // Orange
];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  transactions,
  settings,
}) => {
  const symbol = settings.currencySymbol || 'تومان';

  // 1. Filter expense transactions
  const expenseTxs = useMemo(() => (transactions || []).filter((t) => t.type === 'EXPENSE'), [transactions]);
  const totalExpense = useMemo(() => expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0), [expenseTxs]);

  // 2. Partner comparison
  const partnerAExpense = useMemo(
    () => expenseTxs.filter((t) => t.paidBy === settings.partnerA.id).reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [expenseTxs, settings.partnerA.id]
  );
  const partnerBExpense = useMemo(
    () => expenseTxs.filter((t) => t.paidBy === settings.partnerB.id).reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [expenseTxs, settings.partnerB.id]
  );

  // 3. Category distribution
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of expenseTxs) {
      map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenseTxs, totalExpense]);

  // 4. Partner share chart data
  const partnerData = useMemo(() => [
    { name: settings.partnerA.name, amount: partnerAExpense, fill: settings.partnerA.color || '#38bdf8' },
    { name: settings.partnerB.name, amount: partnerBExpense, fill: settings.partnerB.color || '#34d399' },
  ], [settings, partnerAExpense, partnerBExpense]);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Spending */}
        <div className="rounded-2xl border border-white/10 bg-[#14231e] p-4 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>کل مخارج این دوره</span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <p className="mt-2 text-xl font-black text-white font-mono">
            {formatMoney(totalExpense, symbol)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">{expenseTxs.length} تراکنش ثبت‌شده</p>
        </div>

        {/* Partner A */}
        <div className="rounded-2xl border border-white/10 bg-[#14231e] p-4 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="flex items-center gap-1.5">
              <span>{settings.partnerA.avatar}</span>
              <span>{settings.partnerA.name}</span>
            </span>
            <span className="text-[10px] font-bold text-sky-400">
              {totalExpense > 0 ? Math.round((partnerAExpense / totalExpense) * 100) : 0}%
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-sky-300 font-mono">
            {formatMoney(partnerAExpense, symbol)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">سهم پرداختی</p>
        </div>

        {/* Partner B */}
        <div className="rounded-2xl border border-white/10 bg-[#14231e] p-4 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="flex items-center gap-1.5">
              <span>{settings.partnerB.avatar}</span>
              <span>{settings.partnerB.name}</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400">
              {totalExpense > 0 ? Math.round((partnerBExpense / totalExpense) * 100) : 0}%
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-emerald-300 font-mono">
            {formatMoney(partnerBExpense, symbol)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">سهم پرداختی</p>
        </div>
      </div>

      {/* ── Category Breakdown Chart ── */}
      <section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <PieIcon className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-sm">تفکیک دسته‌بندی مخارج</h2>
          </div>
          <span className="text-xs text-zinc-400">{categoryData.length} دسته</span>
        </div>

        {categoryData.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            هنوز تراکنشی برای نمایش در این ماه ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatMoney(val, symbol), 'مبلغ']}
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#f4f4f5',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Simple Clean Category List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoryData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-bold text-zinc-200">{item.name}</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-zinc-300 font-bold">{formatMoney(item.value, symbol)}</span>
                    <span className="text-[10px] text-zinc-500 mr-2">({item.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Direct Partner Comparison Bar Chart ── */}
      {totalExpense > 0 && (
        <section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-5 shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center gap-2 text-white">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-sm">مقایسه سهم دونفره</h2>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partnerData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis dataKey="name" type="category" stroke="#e4e4e7" fontSize={11} width={60} />
                <Tooltip
                  formatter={(val: number) => [formatMoney(val, symbol), 'پرداخت‌شده']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#f4f4f5',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};
