import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function FriendlyEmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] px-6 py-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-teal-400/10 text-teal-300">
        <Icon aria-hidden="true" className="h-7 w-7" />
      </div>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-400">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="tap-scale mt-5 min-h-11 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-zinc-950 shadow-lg shadow-teal-950/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
