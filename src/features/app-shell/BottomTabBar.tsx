import React from 'react';
import { BarChart3, HeartPulse, House, UserRound } from 'lucide-react';
import type { AppTab } from './appShell.types';

interface BottomTabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

const tabs: Array<{ id: AppTab; label: string; icon: typeof House }> = [
  { id: 'home', label: 'خانه', icon: House },
  { id: 'analytics', label: 'تحلیل', icon: BarChart3 },
  { id: 'cycle', label: 'چرخه', icon: HeartPulse },
  { id: 'profile', label: 'پروفایل', icon: UserRound },
];

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <nav aria-label="ناوبری اصلی" className="bottom-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1210]/95 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(id)}
              className={`tap-scale flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-bold transition ${active ? 'bg-teal-400/15 text-teal-300' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <Icon aria-hidden="true" className={`h-5 w-5 ${active && id === 'cycle' ? 'fill-rose-400/20 text-rose-300' : ''}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
