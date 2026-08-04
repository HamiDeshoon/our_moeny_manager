import React from 'react';
import { motion } from 'motion/react';
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 mb-6"
    >
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Household Spent */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden shadow-sm"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              کل هزینه‌های خانه
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl sm:text-3xl font-bold text-white">
              {formatMoney(totalSpent, symbol)}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] sm:text-[11px] text-zinc-500 mb-1 font-medium">
              <span>{settings.partnerA.name} ({partnerAPercent}%)</span>
              <span>{settings.partnerB.name} ({partnerBPercent}%)</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${partnerAPercent}%` }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                style={{ backgroundColor: settings.partnerA.color }}
                className="h-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${partnerBPercent}%` }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                style={{ backgroundColor: settings.partnerB.color }}
                className="h-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Partner A Total Paid */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500" style={{ backgroundColor: settings.partnerA.color }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 sm:space-x-2 min-w-0">
              <span className="text-lg">{settings.partnerA.avatar}</span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                پرداختی {settings.partnerA.name}
              </span>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: settings.partnerA.color, boxShadow: `0 0 10px ${settings.partnerA.color}` }}
            />
          </div>
          <div className="mt-2 relative z-10">
            <span className="text-xl sm:text-3xl font-bold text-white">
              {formatMoney(summary.partnerATotalPaid, symbol)}
            </span>
          </div>
        </motion.div>

        {/* Partner B Total Paid */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500" style={{ backgroundColor: settings.partnerB.color }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 sm:space-x-2 min-w-0">
              <span className="text-lg">{settings.partnerB.avatar}</span>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                پرداختی {settings.partnerB.name}
              </span>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: settings.partnerB.color, boxShadow: `0 0 10px ${settings.partnerB.color}` }}
            />
          </div>
          <div className="mt-2 relative z-10">
            <span className="text-xl sm:text-3xl font-bold text-white">
              {formatMoney(summary.partnerBTotalPaid, symbol)}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
