import React from 'react';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { APP_VERSION, AppSettings, HouseholdSummary } from '../types';
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
      className="mb-6 space-y-4"
    >
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Total Household Spent */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="premium-card relative overflow-hidden p-5"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 opacity-80" />
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                کل هزینه‌های خانه
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  v{APP_VERSION}
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2 relative z-10">
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
          className="premium-card group relative overflow-hidden p-5"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-2xl transition-transform group-hover:scale-110 duration-700" style={{ backgroundColor: settings.partnerA.color }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 sm:space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/5 border border-white/10 shadow-inner">
                {settings.partnerA.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">
                  پرداختی {settings.partnerA.name}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatMoney(summary.partnerATotalPaid, symbol)}
            </span>
          </div>
        </motion.div>

        {/* Partner B Total Paid */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="premium-card group relative overflow-hidden p-5"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-2xl transition-transform group-hover:scale-110 duration-700" style={{ backgroundColor: settings.partnerB.color }} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 sm:space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/5 border border-white/10 shadow-inner">
                {settings.partnerB.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">
                  پرداختی {settings.partnerB.name}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatMoney(summary.partnerBTotalPaid, symbol)}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
