import React from 'react';
import { Sparkles, Mic, Camera, PlusCircle, Settings, Calendar, FileSpreadsheet, Download, UserCheck, LogIn } from 'lucide-react';
import { AppSettings, AuthUser } from '../types';
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
  activeTab: 'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights';
  onTabChange: (tab: 'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights') => void;
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
    <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-800">
                  DuoSpend
                </span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Couple Finance
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {settings.partnerA.name} {settings.partnerA.avatar} & {settings.partnerB.name} {settings.partnerB.avatar}
              </p>
            </div>
          </div>

          {/* Month Selector & Couple Badge */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
              {settings.useJalaliDate ? (
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-hidden cursor-pointer"
                >
                  {jalaliOptions.map((opt) => (
                    <option key={opt.key} value={`${opt.startDate}..${opt.endDate}`}>
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
                    className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
                  />
                  {jalaliMonth && (
                    <span className="ml-1.5 pl-1.5 border-l border-slate-200 font-bold text-amber-700 text-[11px]">
                      {jalaliMonth}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="hidden md:flex items-center space-x-2 ml-2">
              <button
                onClick={onOpenCSVImport}
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                title="Import Excel/CSV/Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={onExportCSV}
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                title="Export Monthly Report as CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={onOpenVoiceModal}
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs"
                title="Voice / Text Expense AI Parser"
              >
                <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>Voice</span>
              </button>

              <button
                onClick={onOpenReceiptModal}
                className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs"
                title="Scan Receipt with Gemini Vision"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Scan</span>
              </button>

              <button
                onClick={onOpenAddExpense}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-100"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* User Login Pill */}
            {currentUser ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Click to Switch User or Logout"
              >
                <span className="text-base">{currentUser.avatar}</span>
                <span className="hidden sm:inline font-extrabold">{currentUser.name}</span>
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                title="Log In as Hamid or Fati"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ورود (Login)</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
              title="Settings & Gemini API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs and Mobile Actions */}
        <div className="flex items-center justify-between border-t border-slate-100">
          <div className="flex space-x-1 pt-2 pb-2 overflow-x-auto no-scrollbar text-xs flex-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('transactions')}
              className={`px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'transactions'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => onTabChange('budgets')}
              className={`px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'budgets'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Monthly Budgets
            </button>
            <button
              onClick={() => onTabChange('bills')}
              className={`px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition ${
                activeTab === 'bills'
                  ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Recurring Bills
            </button>
            <button
              onClick={() => onTabChange('insights')}
              className={`px-3.5 py-1.5 rounded-md font-medium whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeTab === 'insights'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Advisor</span>
            </button>
          </div>

          {/* Mobile Quick Add Buttons */}
          <div className="flex md:hidden items-center space-x-1.5 pl-3 border-l border-slate-200 py-2">
            <button
              onClick={onOpenVoiceModal}
              className="p-2 bg-slate-100 text-indigo-700 rounded-md border border-indigo-200 shadow-2xs"
              title="Voice Memo"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenReceiptModal}
              className="p-2 bg-slate-100 text-emerald-700 rounded-md border border-emerald-200 shadow-2xs"
              title="Scan Receipt"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAddExpense}
              className="p-2 bg-indigo-600 text-white rounded-md shadow-sm"
              title="Add Expense"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
