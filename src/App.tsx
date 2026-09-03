import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Mic, Camera, RefreshCw } from 'lucide-react';
import { api } from './services/api';
import { AppSettings, AuthUser, Bill, Budget, HouseholdSummary, MIN_TRANSACTION_AMOUNT_TOMAN, Transaction } from './types';
import { gregorianToJalali, getJalaliMonthGregorianRange, getJalaliMonthOptions } from './utils/formatters';
import { haptic } from './utils/haptics';
import { usePullToRefresh } from './utils/usePullToRefresh';

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
  partnerA: { id: 'partner_a', name: 'کاربر اول', avatar: '👨‍💼', color: '#0284c7' },
  partnerB: { id: 'partner_b', name: 'کاربر دوم', avatar: '👩‍⚕️', color: '#16a34a' },
  isRtl: true,
  useJalaliDate: true,
};

const DEFAULT_SUMMARY: HouseholdSummary = { partnerATotalPaid: 0, partnerBTotalPaid: 0 };

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const [jy, jm] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const { startDate, endDate } = getJalaliMonthGregorianRange(jy, jm);
    return `${startDate}..${endDate}`;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'insights' | 'tools'>('dashboard');

  // Auth
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('duospend_auth_user') || 'null'); } catch { return null; }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Data
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      let targetMonth = selectedMonth;
      const [fetchedSettings, fetchedTxs, fetchedSummary, fetchedBudgets, fetchedBills] = await Promise.all([
        api.getSettings().catch(() => DEFAULT_SETTINGS),
        api.getTransactions(targetMonth).catch(() => []),
        api.getHouseholdSummary(targetMonth).catch(() => DEFAULT_SUMMARY),
        api.getBudgets().catch(() => []),
        api.getBills().catch(() => []),
      ]);

      setSettings(fetchedSettings);
      setTransactions(fetchedTxs);
      setSummary(fetchedSummary);
      setBudgets(fetchedBudgets);
      setBills(fetchedBills);

      if (fetchedSettings.useJalaliDate && !selectedMonth.includes('..')) {
        const d = new Date();
        const [jy, jm] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const { startDate, endDate } = getJalaliMonthGregorianRange(jy, jm);
        targetMonth = `${startDate}..${endDate}`;
        setSelectedMonth(targetMonth);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull to refresh
  const { pullDistance, isRefreshing, canRefresh } = usePullToRefresh(async () => {
    haptic('medium');
    await loadData();
    haptic('success');
  });

  useEffect(() => { loadData(); }, [selectedMonth]);

  // Handlers with haptic feedback
  const handleSaveTransaction = useCallback(async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    if (Number(txData.amount || 0) > 0 && Number(txData.amount) < MIN_TRANSACTION_AMOUNT_TOMAN) {
      haptic('warning');
      return;
    }
    haptic('success');
    if (editingTransaction) {
      const updated = await api.updateTransaction(editingTransaction.id, txData);
      setEditingTransaction(null);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      const created = await api.addTransaction(txData);
      if (created) setTransactions(prev => [created, ...prev]);
    }
    api.getHouseholdSummary(selectedMonth).then(s => setSummary(s)).catch(() => {});
  }, [currentUser, editingTransaction, selectedMonth]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('warning');
    await api.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    api.getHouseholdSummary(selectedMonth).then(s => setSummary(s)).catch(() => {});
  }, [currentUser, selectedMonth]);

  const handleUpdateBudgets = useCallback(async (newBudgets: Budget[]) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('light');
    const updated = await api.updateBudgets(newBudgets);
    setBudgets(updated);
  }, [currentUser]);

  const handleToggleBillPaid = useCallback(async (id: string, isPaid: boolean) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('light');
    const updated = await api.toggleBillPaid(id, isPaid);
    setBills(prev => prev.map(b => b.id === id ? updated : b));
  }, [currentUser]);

  const handleAddBill = useCallback(async (billData: Omit<Bill, 'id'>) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('success');
    const created = await api.addBill(billData);
    setBills(prev => [...prev, created]);
  }, [currentUser]);

  const handleDeleteBill = useCallback(async (id: string) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('warning');
    await api.deleteBill(id);
    setBills(prev => prev.filter(b => b.id !== id));
  }, [currentUser]);

  const handleUpdateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    if (!currentUser) { setIsLoginModalOpen(true); return; }
    haptic('light');
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  }, [currentUser]);

  const handleTabChange = (tab: typeof activeTab) => {
    haptic('light');
    setActiveTab(tab);
  };

  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeSummary = summary || DEFAULT_SUMMARY;

  if (isLoading && !settings) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 mt-16 safe-area-top">
        <div className="flex gap-4">
          <div className="flex-1"><div className="shimmer h-32 rounded-2xl" /></div>
          <div className="flex-1 hidden sm:block"><div className="shimmer h-32 rounded-2xl" /></div>
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (loadError && !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center safe-area-top">
        <div className="p-6 bg-zinc-900 border border-white/10 rounded-3xl max-w-md space-y-4 shadow-xl">
          <h2 className="text-lg font-extrabold text-rose-500">خطا در اتصال به سرور</h2>
          <p className="text-xs text-zinc-400">{loadError}</p>
          <button onClick={() => loadData()} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer tap-scale">
            تلاش مجدد (Retry Connection)
          </button>
        </div>
      </div>
    );
  }

  const isAuthed = Boolean(currentUser);

  return (
    <div
      dir={activeSettings.isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen w-full overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200"
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div className="ptr-indicator" style={{ opacity: Math.min(pullDistance / 70, 1) }}>
          <RefreshCw className={`w-6 h-6 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
        </div>
      )}

      <Header
        settings={activeSettings}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenAddExpense={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(null); setIsAddExpenseOpen(true); }}
        onOpenVoiceModal={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setIsVoiceModalOpen(true); }}
        onOpenReceiptModal={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setIsReceiptModalOpen(true); }}
        onOpenCSVImport={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setIsCSVImportOpen(true); }}
        onExportCSV={() => exportToCSV(transactions, activeSettings, selectedMonth)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {!isAuthed && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center shadow-lg shadow-amber-950/10">
            <p className="text-sm text-amber-100 font-medium">
              ⚠️ شما وارد نشده‌اید. برای افزودن، حذف یا تغییر اطلاعات، ابتدا وارد شوید.
              <button onClick={() => setIsLoginModalOpen(true)} className="mr-2 rounded-lg bg-amber-300/15 px-3 py-1 font-bold text-amber-200 hover:bg-amber-300/25 transition">ورود</button>
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SummaryCards summary={activeSummary} settings={activeSettings} />

        <Suspense fallback={<div className="mt-8 space-y-3">{[1,2,3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}</div>}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="space-y-6">
                <AnalyticsCharts transactions={transactions} budgets={budgets} settings={activeSettings} selectedMonth={selectedMonth} />
                <TransactionList
                  transactions={transactions}
                  settings={activeSettings}
                  onEditTransaction={(tx) => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(tx); setIsAddExpenseOpen(true); }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onOpenAddExpense={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(null); setIsAddExpenseOpen(true); }}
                />
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <TransactionList
                  transactions={transactions}
                  settings={activeSettings}
                  onEditTransaction={(tx) => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(tx); setIsAddExpenseOpen(true); }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onOpenAddExpense={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(null); setIsAddExpenseOpen(true); }}
                />
              </motion.div>
            )}

            {activeTab === 'budgets' && (
              <motion.div key="budgets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <BudgetPlanner budgets={budgets} transactions={transactions} settings={activeSettings} onUpdateBudgets={handleUpdateBudgets} onRefreshTransactions={loadData} />
              </motion.div>
            )}

            {activeTab === 'bills' && (
              <motion.div key="bills" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <BillTracker bills={bills} settings={activeSettings} onToggleBillPaid={handleToggleBillPaid} onAddBill={handleAddBill} onDeleteBill={handleDeleteBill} />
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div key="insights" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <AIAdvisor selectedMonth={selectedMonth} settings={activeSettings} />
              </motion.div>
            )}

            {activeTab === 'tools' && (
              <motion.div key="tools" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <DataToolsPanel onOpenAddExpense={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setEditingTransaction(null); setIsAddExpenseOpen(true); }} onOpenCSVImport={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setIsCSVImportOpen(true); }} onOpenReceiptModal={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } setIsReceiptModalOpen(true); }} onExportCSV={() => exportToCSV(transactions, activeSettings, selectedMonth)} settings={activeSettings} />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </main>

      {/* Mobile Floating Action Buttons */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden safe-area-bottom pointer-events-none">
        <div className="flex items-center justify-center gap-3 pb-3">
          <button
            onClick={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } haptic('light'); setIsVoiceModalOpen(true); }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center tap-scale active:scale-90 transition"
            aria-label="Voice"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } haptic('medium'); setEditingTransaction(null); setIsAddExpenseOpen(true); }}
            className="pointer-events-auto w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center tap-scale active:scale-90 transition border-2 border-emerald-400/30"
            aria-label="Add expense"
          >
            <Plus className="w-7 h-7" />
          </button>
          <button
            onClick={() => { if (!currentUser) { setIsLoginModalOpen(true); return; } haptic('light'); setIsReceiptModalOpen(true); }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center tap-scale active:scale-90 transition"
            aria-label="Scan receipt"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        <TransactionForm
          isOpen={isAddExpenseOpen}
          onClose={() => { setIsAddExpenseOpen(false); setEditingTransaction(null); }}
          onSave={handleSaveTransaction}
          initialData={editingTransaction || (currentUser ? ({ paidBy: currentUser.partnerId } as Partial<Transaction>) : null)}
          settings={activeSettings}
        />
        <VoiceModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} onSaveTransaction={handleSaveTransaction} onRefreshData={loadData} settings={activeSettings} />
        <ReceiptScannerModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} onSaveTransaction={handleSaveTransaction} settings={activeSettings} />
        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={activeSettings} onUpdateSettings={handleUpdateSettings} />
        <CSVImportModal isOpen={isCSVImportOpen} onClose={() => setIsCSVImportOpen(false)} settings={activeSettings} onImportComplete={loadData} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} currentUser={currentUser} onLoginSuccess={(user) => { setCurrentUser(user); loadData(); }} />
      </Suspense>
    </div>
  );
}
