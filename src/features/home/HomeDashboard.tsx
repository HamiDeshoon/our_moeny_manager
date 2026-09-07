import React from 'react';
import { ArrowLeft, Sparkles, WalletCards } from 'lucide-react';
import { DashboardCarousel } from './DashboardCarousel';

interface HomeDashboardProps {
  balances: React.ReactNode;
  budget: React.ReactNode;
  insights: React.ReactNode;
  onViewTransactions: () => void;
}

export function HomeDashboard({ balances, budget, insights, onViewTransactions }: HomeDashboardProps) {
  return (
    <div className="space-y-5">
      <DashboardCarousel
        slides={[
          <section className="space-y-4" key="balances">
            <div className="premium-card border-teal-300/20 bg-[#11241f] p-4 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-200"><WalletCards className="h-5 w-5" /><h1 className="font-bold">موجودی و تسویه</h1></div>
                <span className="text-xs text-zinc-500">۱ از ۳</span>
              </div>
              {balances}
            </div>
            <button type="button" onClick={onViewTransactions} className="tap-scale flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-bold text-zinc-100 hover:bg-white/10">
              دیدن همه تراکنش‌ها <ArrowLeft className="h-4 w-4" />
            </button>
          </section>,
          <section className="premium-card bg-[#11241f] p-4 shadow-xl shadow-black/20" key="budget">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-white">بودجه ماهانه</h2><span className="text-xs text-zinc-500">۲ از ۳</span></div>
            {budget}
          </section>,
          <section className="premium-card border-amber-300/20 bg-[#11241f] p-4 shadow-xl shadow-black/20" key="insights">
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-amber-200"><Sparkles className="h-5 w-5" /><h2 className="font-bold">بینش هوشمند</h2></div><span className="text-xs text-zinc-500">۳ از ۳</span></div>
            {insights}
          </section>,
        ]}
      />
    </div>
  );
}
