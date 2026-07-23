import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AppSettings, AuthUser, Bill, Budget, HouseholdSummary, Transaction } from './types';
import { gregorianToJalali, getJalaliMonthGregorianRange } from './utils/formatters';

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

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
      const fetchedSettings = await api.getSettings();
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
        api.getTransactions(targetMonth),
        api.getHouseholdSummary(targetMonth),
        api.getBudgets(),
        api.getBills(),
      ]);

      setTransactions(fetchedTxs);
      setSummary(fetchedSummary);
      setBudgets(fetchedBudgets);
      setBills(fetchedBills);
    } catch (err) {
      console.error('Error loading app data:', err);
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
  // Budget Handler
  const handleUpdateBudgets = async (updatedBudgets: Budget[]) => {
    await api.updateBudgets(updatedBudgets);
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

  if (isLoading && !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight text-slate-800">Loading DuoSpend Household Ledger...</h2>
        <p className="text-xs text-slate-500 mt-1">Calculating balances and split shares</p>
      </div>
    );
  }

  if (!settings || !summary) return null;

  return (
    <div
      dir={settings?.isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white"
    >
      {/* Header */}
      <Header
        settings={settings}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenAddExpense={() => {
          setEditingTransaction(null);
          setIsAddExpenseOpen(true);
        }}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
        onOpenCSVImport={() => setIsCSVImportOpen(true)}
        onExportCSV={() => exportToCSV(transactions, settings, selectedMonth)}
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
          summary={summary}
          settings={settings}
        />

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <AnalyticsCharts
              transactions={transactions}
              budgets={budgets}
              settings={settings}
              selectedMonth={selectedMonth}
            />
            <TransactionList
              transactions={transactions}
              settings={settings}
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
            settings={settings}
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
            settings={settings}
            onUpdateBudgets={handleUpdateBudgets}
            onRefreshTransactions={loadData}
          />
        )}

        {activeTab === 'bills' && (
          <BillTracker
            bills={bills}
            settings={settings}
            onToggleBillPaid={handleToggleBillPaid}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {activeTab === 'insights' && (
          <AIAdvisor
            selectedMonth={selectedMonth}
            settings={settings}
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
        settings={settings}
      />

      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        onRefreshData={loadData}
        settings={settings}
      />

      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSaveTransaction={handleSaveTransaction}
        settings={settings}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
        settings={settings}
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
