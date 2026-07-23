import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AppSettings, AuthUser, Bill, Budget, HouseholdSummary, Transaction } from './types';
import { gregorianToJalali, getJalaliMonthGregorianRange, getJalaliMonthOptions } from './utils/formatters';

import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { TransactionList } from './components/TransactionList';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { BudgetPlanner } from './components/BudgetPlanner';
import { BillTracker } from './components/BillTracker';
import { AIAdvisor } from './components/AIAdvisor';

import { TransactionForm } from './components/TransactionForm';
import { VoiceModal } from './components/VoiceModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { SettingsModal } from './components/SettingsModal';
import { CSVImportModal } from './components/CSVImportModal';
import { LoginModal } from './components/LoginModal';
import { exportToCSV } from './utils/exporter';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: {
    id: 'partner_a',
    name: 'سیدحمید عقل مندصرمی',
    avatar: '👨‍💼',
    color: '#0284c7',
  },
  partnerB: {
    id: 'partner_b',
    name: 'فاطمه نیک سرشت',
    avatar: '👩‍⚕️',
    color: '#16a34a',
  },
  isRtl: true,
  useJalaliDate: true,
};

const DEFAULT_SUMMARY: HouseholdSummary = {
  partnerATotalPaid: 0,
  partnerBTotalPaid: 0,
};

export default function App() {
  // Initialize to the current Jalali month's Gregorian range so the Jalali
  // <select> in the Header matches an <option> on first render (avoids the
  // initial state mismatch where YYYY-MM had no matching option).
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const [jy, jm] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const { startDate, endDate } = getJalaliMonthGregorianRange(jy, jm);
    return `${startDate}..${endDate}`;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights'>('dashboard');

  // Auth User State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('duospend_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Core Data State
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);

  // Load all app state
  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const fetchedSettings = await api.getSettings().catch((err) => {
        console.warn('Fallback settings used:', err);
        return DEFAULT_SETTINGS;
      });
      setSettings(fetchedSettings);

      let targetMonth = selectedMonth;
      if (fetchedSettings.useJalaliDate && !selectedMonth.includes('..')) {
        const d = new Date();
        const [jy, jm] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const { startDate, endDate } = getJalaliMonthGregorianRange(jy, jm);
        targetMonth = `${startDate}..${endDate}`;
        setSelectedMonth(targetMonth);
      }

      const [fetchedTxs, fetchedSummary, fetchedBudgets, fetchedBills] = await Promise.all([
        api.getTransactions(targetMonth).catch(() => []),
        api.getHouseholdSummary(targetMonth).catch(() => DEFAULT_SUMMARY),
        api.getBudgets().catch(() => []),
        api.getBills().catch(() => []),
      ]);

      setTransactions(fetchedTxs);
      setSummary(fetchedSummary);
      setBudgets(fetchedBudgets);
      setBills(fetchedBills);
    } catch (err: any) {
      console.error('Error loading app data:', err);
      setLoadError(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // Transaction Handlers
  const handleSaveTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      await api.updateTransaction(editingTransaction.id, txData);
      setEditingTransaction(null);
    } else {
      await api.addTransaction(txData);
    }
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadData();
  };

  // Budget Handlers
  const handleUpdateBudgets = async (newBudgets: Budget[]) => {
    await api.updateBudgets(newBudgets);
    await loadData();
  };

  // Bill Handlers
  const handleToggleBillPaid = async (id: string, isPaid: boolean) => {
    await api.toggleBillPaid(id, isPaid);
    await loadData();
  };

  const handleAddBill = async (billData: Omit<Bill, 'id'>) => {
    await api.addBill(billData);
    await loadData();
  };

  const handleDeleteBill = async (id: string) => {
    await api.deleteBill(id);
    await loadData();
  };

  // Settings Handler
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    await api.updateSettings(newSettings);
    await loadData();
  };

  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeSummary = summary || DEFAULT_SUMMARY;

  if (isLoading && !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col items-center justify-center p-4 text-slate-800 font-vazirmatn">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight text-slate-800">در حال بارگذاری DuoSpend...</h2>
        <p className="text-xs text-slate-500 mt-1">محاسبه بودجه و تراکنش‌های خانه</p>
      </div>
    );
  }

  if (loadError && !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col items-center justify-center p-6 text-slate-800 font-vazirmatn text-center">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl max-w-md space-y-4 shadow-xl">
          <h2 className="text-lg font-extrabold text-rose-600">خطا در اتصال به سرور</h2>
          <p className="text-xs text-slate-600">{loadError}</p>
          <button
            onClick={() => loadData()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            تلاش مجدد (Retry Connection)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={activeSettings.isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 text-slate-800 font-vazirmatn antialiased selection:bg-indigo-600 selection:text-white"
    >
      {/* Header */}
      <Header
        settings={activeSettings}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenAddExpense={() => {
          setEditingTransaction(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
        onOpenCSVImport={() => setIsCSVImportOpen(true)}
        onExportCSV={() => exportToCSV(transactions, activeSettings, selectedMonth)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Household Settlement & Metric Cards */}
        <SummaryCards
          summary={activeSummary}
          settings={activeSettings}
        />

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <AnalyticsCharts
              transactions={transactions}
              budgets={budgets}
              settings={activeSettings}
              selectedMonth={selectedMonth}
            />
            <TransactionList
              transactions={transactions}
              settings={activeSettings}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsAddExpenseOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenAddExpense={() => {
                setEditingTransaction(null);
                setIsAddExpenseOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            settings={activeSettings}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddExpenseOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddExpense={() => {
              setEditingTransaction(null);
              setIsAddExpenseOpen(true);
            }}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetPlanner
            budgets={budgets}
            transactions={transactions}
            settings={activeSettings}
            onUpdateBudgets={handleUpdateBudgets}
            onRefreshTransactions={loadData}
          />
        )}

        {activeTab === 'bills' && (
          <BillTracker
            bills={bills}
            settings={activeSettings}
            onToggleBillPaid={handleToggleBillPaid}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {activeTab === 'insights' && (
          <AIAdvisor
            selectedMonth={selectedMonth}
            settings={activeSettings}
          />
        )}
      </main>

      {/* Modals */}
      <TransactionForm
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={
          editingTransaction ||
          (currentUser ? ({ paidBy: currentUser.partnerId } as Partial<Transaction>) : null)
        }
        settings={activeSettings}
      />

      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        onRefreshData={loadData}
        settings={activeSettings}
      />

      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        settings={activeSettings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={activeSettings}
        onUpdateSettings={handleUpdateSettings}
      />

      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
        settings={activeSettings}
        onImportComplete={loadData}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadData();
        }}
      />
    </div>
  );
}
