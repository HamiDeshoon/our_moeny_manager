import React from 'react';
import { Wallet } from 'lucide-react';
import { AppSettings, HouseholdSummary } from '../types';
import { formatMoney } from '../utils/formatters';

interface SummaryCardsProps {
  summary: HouseholdSummary;
  settings: AppSettings;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, settings }) => {
  const symbol = settings.currencySymbol || 'تومان';
  const totalSpent = summary.partnerATotalPaid + summary.partnerBTotalPaid;

  const partnerAPercent = totalSpent > 0 ? Math.round((summary.partnerATotalPaid / totalSpent) * 100) : 50;
  const partnerBPercent = totalSpent > 0 ? Math.round((summary.partnerBTotalPaid / totalSpent) * 100) : 50;

  return (
    <div className="space-y-4 mb-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Household Spent */}
        <div className="card-soft rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Household Expenses
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatMoney(totalSpent, symbol)}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
              <span>{settings.partnerA.name} ({partnerAPercent}%)</span>
              <span>{settings.partnerB.name} ({partnerBPercent}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${partnerAPercent}%`, backgroundColor: settings.partnerA.color }}
                className="h-full transition-all duration-500"
              />
              <div
                style={{ width: `${partnerBPercent}%`, backgroundColor: settings.partnerB.color }}
                className="h-full transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Partner A Total Paid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{settings.partnerA.avatar}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                پرداختی {settings.partnerA.name}
              </span>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: settings.partnerA.color }}
            />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatMoney(summary.partnerATotalPaid, symbol)}
            </span>
          </div>
        </div>

        {/* Partner B Total Paid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{settings.partnerB.avatar}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                پرداختی {settings.partnerB.name}
              </span>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: settings.partnerB.color }}
            />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {formatMoney(summary.partnerBTotalPaid, symbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
