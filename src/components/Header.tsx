import React from 'react';
import { Sparkles, Mic, Camera, PlusCircle, Settings, Calendar, FileSpreadsheet, Download, UserCheck, LogIn, Heart } from 'lucide-react';
import { APP_VERSION, AppSettings, AuthUser } from '../types';
import { getJalaliMonthYear, getJalaliMonthOptions } from '../utils/formatters';

interface HeaderProps {
  settings: AppSettings;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenAddExpense: () => void;
  onOpenVoiceModal: () => void;
  onOpenReceiptModal: () => void;
  onOpenCSVImport: () => void;
  onExportCSV: () => void;
  onOpenSettings: () => void;
  currentUser: AuthUser | null;
  onOpenLogin: () => void;
  activeTab: 'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights' | 'tools' | 'cycle';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights' | 'tools' | 'cycle') => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  selectedMonth,
  onMonthChange,
  onOpenAddExpense,
  onOpenVoiceModal,
  onOpenReceiptModal,
  onOpenCSVImport,
  onExportCSV,
  onOpenSettings,
  currentUser,
  onOpenLogin,
  activeTab,
  onTabChange,
}) => {
  const jalaliMonth = getJalaliMonthYear(selectedMonth);
  const jalaliOptions = getJalaliMonthOptions();

  return (
    <header className="bg-zinc-950/80 backdrop-blur-xl text-zinc-100 border-b border-white/5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 gap-2 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 shrink-0">
              ⚡
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-extrabold text-lg tracking-tight text-zinc-100 flex items-center gap-1.5">
                  DuoSpend
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                    v{APP_VERSION}
                  </span>
                </span>
                <span className="hidden md:inline-flex bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Couple Finance
                </span>
                <span title="دیتابیس ابری متصل است (PostgreSQL Cloud Sync Active)" className="hidden xl:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  همگام‌سازی ابری (Neon PostgreSQL)
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden lg:block">
                {settings.partnerA.name} {settings.partnerA.avatar} & {settings.partnerB.name} {settings.partnerB.avatar}
              </p>
            </div>
          </div>

          {/* Month Selector & Couple Badge */}
          <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse ml-auto">
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 sm:px-2.5 py-1 text-xs text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
              {settings.useJalaliDate ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-zinc-100 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  {jalaliOptions.map((opt) => (
                    <option className="bg-zinc-900 text-zinc-100" key={opt.key} value={`${opt.startDate}..${opt.endDate}`}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="month"
                    value={selectedMonth.includes('..') ? selectedMonth.substring(0, 7) : selectedMonth}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="bg-transparent text-zinc-100 font-medium focus:outline-none cursor-pointer w-24 sm:w-auto"
                  />
                  {jalaliMonth && (
                     <span className="ml-1.5 pl-1.5 border-l border-white/10 font-bold text-amber-500 text-[10px] sm:text-[11px] whitespace-nowrap">
                      {jalaliMonth}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse ml-2 rtl:ml-0 rtl:mr-2">
              <button
                onClick={onOpenCSVImport}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Import Excel/CSV/Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={onExportCSV}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Export Monthly Report as CSV"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={onOpenVoiceModal}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                title="Voice / Text Expense AI Parser"
              >
                <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Voice</span>
              </button>

              <button
                onClick={onOpenReceiptModal}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                title="Scan Receipt with Gemini Vision"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scan</span>
              </button>

              <button
                onClick={onOpenAddExpense}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* User Login Pill */}
            {currentUser ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1 rtl:space-x-reverse bg-black/40 hover:bg-black/60 text-indigo-400 border border-white/10 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Click to Switch User or Logout"
              >
                <span className="text-base leading-none">{currentUser.avatar}</span>
                <span className="hidden sm:inline font-extrabold">{currentUser.name}</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 rtl:space-x-reverse bg-indigo-600 hover:bg-indigo-500 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Log In as Hamid or Fati"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">ورود</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-200 bg-black/40 hover:bg-black/60 rounded-lg transition border border-white/10 cursor-pointer shrink-0"
              title="Settings & Gemini API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs and Mobile Actions */}
        <div className="flex items-center justify-between border-t border-white/5">
          <div className="flex space-x-1 rtl:space-x-reverse pt-2 pb-2 overflow-x-auto no-scrollbar text-xs flex-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('transactions')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => onTabChange('budgets')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'budgets'
                  ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Monthly Budgets
            </button>
            <button
              onClick={() => onTabChange('bills')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                activeTab === 'bills'
                  ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              Recurring Bills
            </button>
            <button
              onClick={() => onTabChange('insights')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Advisor</span>
            </button>
            <button
              onClick={() => onTabChange('tools')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-white/5'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ابزارها و ورود اطلاعات</span>
            </button>
            <button
              onClick={() => onTabChange('cycle')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
                activeTab === 'cycle'
                  ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-zinc-400 hover:text-rose-400 hover:bg-white/5'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/20" />
              <span>تقویم و چرخه قاعدگی</span>
            </button>
          </div>

          {/* Mobile Quick Add Buttons */}
          <div className="flex lg:hidden items-center space-x-1 sm:space-x-1.5 rtl:space-x-reverse pl-2 sm:pl-3 rtl:pl-0 rtl:pr-2 sm:rtl:pr-3 border-l rtl:border-l-0 rtl:border-r border-white/10 py-2 shrink-0">
            <button
              onClick={onOpenVoiceModal}
              className="p-1.5 sm:p-2 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 cursor-pointer"
              title="Voice Memo"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenReceiptModal}
              className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 cursor-pointer"
              title="Scan Receipt with Gemini Vision"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
