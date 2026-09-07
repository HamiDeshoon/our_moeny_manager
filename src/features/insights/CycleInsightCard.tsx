import React from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import type { CycleInsight } from '../../types';

interface CycleInsightCardProps {
  insights: CycleInsight[];
  consent?: boolean;
  loading: boolean;
  error?: string | null;
  onEnable?: () => void;
  onRefresh: () => void;
}

export function CycleInsightCard({ insights, loading, error, onRefresh }: CycleInsightCardProps) {
  return (
    <section className="rounded-[1.5rem] border border-violet-300/15 bg-[#171420] p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-violet-200">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h3 className="text-sm font-bold text-white">تحلیل هوشمند و الگوهای چرخه</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-white/10 transition-colors"
        >
          به‌روزرسانی
        </button>
      </div>

      {loading ? (
        <div className="shimmer mt-4 h-16 rounded-xl bg-white/5" />
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          {error}
        </p>
      ) : null}

      {!loading && !error && insights.length === 0 ? (
        <p className="mt-3 text-xs leading-6 text-zinc-400">
          با ثبت روزهای پریود یا علائم روزانه در تقویم، هوش مصنوعی الگوهای منظم چرخه و روند هزینه‌ها را به طور خودکار در این بخش تحلیل می‌کند.
        </p>
      ) : null}

      {insights.map((insight) => (
        <article key={insight.id} className="mt-3 rounded-xl bg-black/20 border border-white/5 p-3.5">
          <p className="text-sm leading-6 text-zinc-200">{insight.observation}</p>
          <p className="mt-2 text-[11px] text-zinc-500">
            {insight.evidenceWindow.sampleDays} روز داده · اطمینان {insight.confidence === 'medium' ? 'متوسط' : 'کم'}
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">{insight.disclaimer}</p>
        </article>
      ))}
    </section>
  );
}
