import React from 'react';
import { BellRing, Clock, ShoppingCart, CalendarHeart } from 'lucide-react';
import { useCycleNotifications } from './useCycleNotifications';

export function NotificationPreferences({ enabled }: { enabled: boolean }) {
  const { preferences, status, loading, save, enablePush } = useCycleNotifications(enabled);
  if (!enabled) return null;

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-5 shadow-xl shadow-black/20">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 text-teal-300" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-base">مرکز اعلان‌ها و یادآورهای هوشمند</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            یادآورهای روزانه مخارج، اقلام باقیمانده لیست خرید و مناسبت‌های مهم خانوادگی.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3.5 border-t border-white/10 pt-4">
        {/* 1. Nightly 9 PM Reminder */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-zinc-200">یادآور ثبت مخارج هر شب ساعت ۲۱:۰۰</p>
              <p className="text-[11px] text-zinc-400">یادآوری برای ثبت هزینه‌ها و فاکتورهای امروز</p>
            </div>
          </div>
          <input
            type="checkbox"
            className="w-5 h-5 accent-teal-400 cursor-pointer"
            checked={preferences.nightlyExpenseEnabled ?? true}
            onChange={(event) => void save({ nightlyExpenseEnabled: event.target.checked })}
          />
        </div>

        {/* 2. Grocery Alerts */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-zinc-200">یادآور اقلام لیست خرید خانه</p>
              <p className="text-[11px] text-zinc-400">هشدار اقلام خریده نشده در هنگام عصر</p>
            </div>
          </div>
          <input
            type="checkbox"
            className="w-5 h-5 accent-teal-400 cursor-pointer"
            checked={preferences.groceryAlertsEnabled ?? true}
            onChange={(event) => void save({ groceryAlertsEnabled: event.target.checked })}
          />
        </div>

        {/* 3. Occasions & Anniversaries */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5">
            <CalendarHeart className="h-4 w-4 text-rose-400" />
            <div>
              <p className="text-sm font-bold text-zinc-200">یادآور مناسبت‌ها و تاریخ‌های مهم</p>
              <p className="text-[11px] text-zinc-400">سالگرد، تولدها و یادآورهای تقویم زوج‌ها</p>
            </div>
          </div>
          <input
            type="checkbox"
            className="w-5 h-5 accent-teal-400 cursor-pointer"
            checked={preferences.occasionAlertsEnabled ?? true}
            onChange={(event) => void save({ occasionAlertsEnabled: event.target.checked })}
          />
        </div>

        {/* 4. Cycle tracking */}
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-zinc-300 px-1">
          <span>یادآور سلامت و چرخه قاعدگی</span>
          <input
            type="checkbox"
            className="w-4 h-4 accent-rose-400"
            checked={preferences.dailyLogEnabled}
            onChange={(event) => void save({ dailyLogEnabled: event.target.checked })}
          />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => void enablePush()}
          className="mt-2 min-h-11 w-full rounded-xl bg-teal-400 px-4 text-sm font-bold text-[#09221b] hover:bg-teal-300 transition-colors disabled:opacity-50 shadow-lg shadow-teal-900/20"
        >
          فعال‌سازی اعلان‌های وب / موبایل روی این دستگاه
        </button>
        {status ? <p role="status" className="text-xs leading-5 text-zinc-400 text-center">{status}</p> : null}
      </div>
    </section>
  );
}
