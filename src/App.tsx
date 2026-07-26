import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { AppSettings, AuthUser, Bill, Budget, HouseholdSummary, Transaction } from './types';
import { gregorianToJalali, getJalaliMonthGregorianRange, getJalaliMonthOptions } from './utils/formatters';

import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { SkeletonList, SkeletonCard } from './components/SkeletonLoader';
import { exportToCSV } from './utils/exporter';

// Lazy load Tab Views
const TransactionList = lazy(() => import('./components/TransactionList').then(m => ({ default: m.TransactionList })));
const AnalyticsCharts = lazy(() => import('./components/AnalyticsCharts').then(m => ({ default: m.AnalyticsCharts })));
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner').then(m => ({ default: m.BudgetPlanner })));
const BillTracker = lazy(() => import('./components/BillTracker').then(m => ({ default: m.BillTracker })));
const AIAdvisor = lazy(() => import('./components/AIAdvisor').then(m => ({ default: m.AIAdvisor })));
const DataToolsPanel = lazy(() => import('./components/DataToolsPanel').then(m => ({ default: m.DataToolsPanel })));

// Lazy load Modals
const TransactionForm = lazy(() => import('./components/TransactionForm').then(m => ({ default: m.TransactionForm })));
const VoiceModal = lazy(() => import('./components/VoiceModal').then(m => ({ default: m.VoiceModal })));
const ReceiptScannerModal = lazy(() => import('./components/ReceiptScannerModal').then(m => ({ default: m.ReceiptScannerModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const CSVImportModal = lazy(() => import('./components/CSVImportModal').then(m => ({ default: m.CSVImportModal })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  currencySymbol: 'تومان',
  partnerA: {
    id: 'partner_a',
    name: 'کاربر اول',
    avatar: '👨‍💼',
    color: '#0284c7',
  },
  partnerB: {
    id: 'partner_b',
    name: 'کاربر دوم',
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights' | 'tools'>('dashboard');

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
  const handleSaveTransaction = useCallback(async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      await api.updateTransaction(editingTransaction.id, txData);
      setEditingTransaction(null);
    } else {
      await api.addTransaction(txData);
    }
    await loadData();
  }, [editingTransaction]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id);
    await loadData();
  }, []);

  // Budget Handlers
  const handleUpdateBudgets = useCallback(async (newBudgets: Budget[]) => {
    await api.updateBudgets(newBudgets);
    await loadData();
  }, []);

  // Bill Handlers
  const handleToggleBillPaid = useCallback(async (id: string, isPaid: boolean) => {
    await api.toggleBillPaid(id, isPaid);
    await loadData();
  }, []);

  const handleAddBill = useCallback(async (billData: Omit<Bill, 'id'>) => {
    await api.addBill(billData);
    await loadData();
  }, []);

  const handleDeleteBill = useCallback(async (id: string) => {
    await api.deleteBill(id);
    await loadData();
  }, []);

  // Settings Handler
  const handleUpdateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    await api.updateSettings(newSettings);
    await loadData();
  }, []);

  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeSummary = summary || DEFAULT_SUMMARY;

  if (isLoading && !settings) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 mt-16">
        <div className="flex gap-4">
          <div className="flex-1">
             <SkeletonCard />
          </div>
          <div className="flex-1 hidden sm:block">
             <SkeletonCard />
          </div>
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  if (loadError && !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 bg-zinc-900 border border-white/10 rounded-3xl max-w-md space-y-4 shadow-xl">
          <h2 className="text-lg font-extrabold text-rose-500">خطا در اتصال به سرور</h2>
          <p className="text-xs text-zinc-400">{loadError}</p>
          <button
            onClick={() => loadData()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
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
      className="min-h-screen w-full overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200"
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

        <Suspense fallback={<div className="mt-8"><SkeletonList count={3} /></div>}>
          {/* Tab Views */}
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
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
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          )}

          {activeTab === 'budgets' && (
            <motion.div
              key="budgets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <BudgetPlanner
                budgets={budgets}
                transactions={transactions}
                settings={activeSettings}
                onUpdateBudgets={handleUpdateBudgets}
                onRefreshTransactions={loadData}
              />
            </motion.div>
          )}

          {activeTab === 'bills' && (
            <motion.div
              key="bills"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <BillTracker
                bills={bills}
                settings={activeSettings}
                onToggleBillPaid={handleToggleBillPaid}
                onAddBill={handleAddBill}
                onDeleteBill={handleDeleteBill}
              />
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AIAdvisor
                selectedMonth={selectedMonth}
                settings={activeSettings}
              />
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DataToolsPanel
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onOpenCSVImport={() => setIsCSVImportOpen(true)}
                onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
                onExportCSV={() => exportToCSV(transactions, activeSettings, selectedMonth)}
                settings={activeSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
}
