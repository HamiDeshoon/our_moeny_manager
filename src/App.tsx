import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, LogIn, RefreshCw, Settings2, UserRound } from 'lucide-react';
import { api } from './services/api';
import type { AppSettings, AuthUser, Bill, Budget, CycleInsight, CycleLog, CycleSettings, HouseholdSummary, Transaction } from './types';
import { MIN_TRANSACTION_AMOUNT_TOMAN } from './types';
import { getJalaliMonthGregorianRange, getJalaliMonthOptions, gregorianToJalali } from './utils/formatters';
import { exportToCSV } from './utils/exporter';
import { useHaptics } from './hooks/useHaptics';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { BottomTabBar } from './features/app-shell/BottomTabBar';
import { ContextualFab } from './features/app-shell/ContextualFab';
import type { ActiveModal, AppTab, HomeView } from './features/app-shell/appShell.types';
import { HomeDashboard } from './features/home/HomeDashboard';
import { CycleTrackerScreen } from './features/cycle/CycleTrackerScreen';
import { CycleLogSheet } from './features/cycle/CycleLogSheet';
import { getCycleInsights } from './features/insights/cycleInsightApi';
import { Skeleton } from './components/ui/Skeleton';

const TransactionList = lazy(() => import('./components/TransactionList').then((module) => ({ default: module.TransactionList })));
const AnalyticsCharts = lazy(() => import('./components/AnalyticsCharts').then((module) => ({ default: module.AnalyticsCharts })));
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner').then((module) => ({ default: module.BudgetPlanner })));
const BillTracker = lazy(() => import('./components/BillTracker').then((module) => ({ default: module.BillTracker })));
const AIAdvisor = lazy(() => import('./components/AIAdvisor').then((module) => ({ default: module.AIAdvisor })));
const DataToolsPanel = lazy(() => import('./components/DataToolsPanel').then((module) => ({ default: module.DataToolsPanel })));
const TransactionForm = lazy(() => import('./components/TransactionForm').then((module) => ({ default: module.TransactionForm })));
const VoiceModal = lazy(() => import('./components/VoiceModal').then((module) => ({ default: module.VoiceModal })));
const ReceiptScannerModal = lazy(() => import('./components/ReceiptScannerModal').then((module) => ({ default: module.ReceiptScannerModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })));
const CSVImportModal = lazy(() => import('./components/CSVImportModal').then((module) => ({ default: module.CSVImportModal })));
const LoginModal = lazy(() => import('./components/LoginModal').then((module) => ({ default: module.LoginModal })));
const SummaryCards = lazy(() => import('./components/SummaryCards').then((module) => ({ default: module.SummaryCards })));

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '', currencySymbol: 'تومان', isRtl: true, useJalaliDate: true,
  partnerA: { id: 'partner_a', name: 'کاربر اول', avatar: '👨‍💼', color: '#0284c7' },
  partnerB: { id: 'partner_b', name: 'کاربر دوم', avatar: '👩‍⚕️', color: '#16a34a' },
};
const DEFAULT_SUMMARY: HouseholdSummary = { partnerATotalPaid: 0, partnerBTotalPaid: 0 };
const DEFAULT_CYCLE_SETTINGS: CycleSettings = { cycleLength: 28, periodLength: 5, lutealLength: 14, lastPeriodStart: '', healthInsightsConsent: false };
const screenMotion = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.18 } };

function getDefaultMonth(): string {
  const now = new Date();
  const [year, month] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const range = getJalaliMonthGregorianRange(year, month);
  return `${range.startDate}..${range.endDate}`;
}

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth);
  const [activeTab, setActiveTab] = useState<AppTab>(() => location.pathname.startsWith('/cycle') ? 'cycle' : 'home');
  const [homeView, setHomeView] = useState<HomeView>('dashboard');
  const [activeModal, setActiveModal] = useState<ActiveModal>({ kind: 'none' });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => { try { return JSON.parse(localStorage.getItem('duospend_auth_user') || 'null'); } catch { return null; } });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<HouseholdSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [cycleSettings, setCycleSettings] = useState<CycleSettings>(DEFAULT_CYCLE_SETTINGS);
  const [cycleInsights, setCycleInsights] = useState<CycleInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const focusBeforeModal = useRef<HTMLElement | null>(null);
  const haptics = useHaptics();

  const loadData = useCallback(async () => {
    setIsLoading(true); setLoadError(null);
    try {
      const [fetchedSettings, fetchedTransactions, fetchedSummary, fetchedBudgets, fetchedBills, fetchedLogs, fetchedCycleSettings] = await Promise.all([
        api.getSettings().catch(() => DEFAULT_SETTINGS), api.getTransactions(selectedMonth).catch(() => []), api.getHouseholdSummary(selectedMonth).catch(() => DEFAULT_SUMMARY),
        api.getBudgets().catch(() => []), api.getBills().catch(() => []), api.getCycleLogs().catch(() => []), api.getCycleSettings().catch(() => DEFAULT_CYCLE_SETTINGS),
      ]);
      setSettings(fetchedSettings); setTransactions(fetchedTransactions); setSummary(fetchedSummary); setBudgets(fetchedBudgets); setBills(fetchedBills); setCycleLogs(fetchedLogs); setCycleSettings(fetchedCycleSettings);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.'); }
    finally { setIsLoading(false); }
  }, [selectedMonth]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (activeModal.kind === 'none') { document.body.classList.remove('modal-scroll-lock'); focusBeforeModal.current?.focus(); return; }
    focusBeforeModal.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-scroll-lock');
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveModal({ kind: 'none' }); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.classList.remove('modal-scroll-lock'); window.removeEventListener('keydown', closeOnEscape); };
  }, [activeModal.kind]);

  const refreshCycleInsights = useCallback(async (logs = cycleLogs) => {
    if (!currentUser || !cycleSettings.healthInsightsConsent) return;
    setInsightsLoading(true); setInsightsError(null);
    try { setCycleInsights(await getCycleInsights(logs)); }
    catch (error) { setInsightsError(error instanceof Error ? error.message : 'بینش هوشمند در دسترس نیست.'); }
    finally { setInsightsLoading(false); }
  }, [currentUser, cycleLogs, cycleSettings.healthInsightsConsent]);

  useEffect(() => { if (cycleSettings.healthInsightsConsent) void refreshCycleInsights(); else setCycleInsights([]); }, [cycleSettings.healthInsightsConsent, refreshCycleInsights]);

  const pull = usePullToRefresh({ enabled: activeTab === 'home', onRefresh: async () => { haptics.tab(); await loadData(); haptics.success(); } });
  const activeSettings = settings || DEFAULT_SETTINGS;
  const activeSummary = summary || DEFAULT_SUMMARY;
  const closeModal = useCallback(() => setActiveModal({ kind: 'none' }), []);
  const openModal = useCallback((modal: Exclude<ActiveModal, { kind: 'none' }>) => setActiveModal(modal), []);
  const requireAuth = (modal: Exclude<ActiveModal, { kind: 'none' }>) => currentUser ? openModal(modal) : openModal({ kind: 'login' });

  const updateSummary = useCallback(() => { void api.getHouseholdSummary(selectedMonth).then(setSummary).catch(() => undefined); }, [selectedMonth]);
  const markPending = (id: string, pending: boolean) => setPendingIds((current) => { const next = new Set(current); pending ? next.add(id) : next.delete(id); return next; });

  const handleSaveTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!currentUser) { openModal({ kind: 'login' }); return; }
    if (data.amount > 0 && data.amount < MIN_TRANSACTION_AMOUNT_TOMAN) throw new Error(`حداقل مبلغ قابل ثبت ${MIN_TRANSACTION_AMOUNT_TOMAN.toLocaleString('fa-IR')} تومان است.`);
    setMutationError(null);
    const editingId = activeModal.kind === 'transaction-edit' ? activeModal.transactionId : null;
    if (editingId) {
      const original = transactions.find((transaction) => transaction.id === editingId);
      if (!original) throw new Error('تراکنش موردنظر پیدا نشد.');
      const optimistic = { ...original, ...data };
      setTransactions((current) => current.map((transaction) => transaction.id === editingId ? optimistic : transaction)); markPending(editingId, true);
      try { const saved = await api.updateTransaction(editingId, data); setTransactions((current) => current.map((transaction) => transaction.id === editingId ? saved : transaction)); haptics.success(); updateSummary(); }
      catch (error) { setTransactions((current) => current.map((transaction) => transaction.id === editingId ? original : transaction)); haptics.error(); const message = error instanceof Error ? error.message : 'ویرایش تراکنش ناموفق بود.'; setMutationError(message); throw error; }
      finally { markPending(editingId, false); }
      return;
    }
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: Transaction = { ...data, id: tempId, createdAt: new Date().toISOString() } as Transaction;
    setTransactions((current) => [optimistic, ...current]); markPending(tempId, true);
    try { const saved = await api.addTransaction(data); if (!saved) throw new Error('این مبلغ طبق تنظیمات برنامه ثبت نشد.'); setTransactions((current) => current.map((transaction) => transaction.id === tempId ? saved : transaction)); haptics.success(); updateSummary(); }
    catch (error) { setTransactions((current) => current.filter((transaction) => transaction.id !== tempId)); haptics.error(); const message = error instanceof Error ? error.message : 'ثبت تراکنش ناموفق بود.'; setMutationError(message); throw error; }
    finally { markPending(tempId, false); }
  }, [activeModal, currentUser, haptics, openModal, transactions, updateSummary]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!currentUser) { openModal({ kind: 'login' }); return; }
    const original = transactions.find((transaction) => transaction.id === id); if (!original) return;
    setMutationError(null); setTransactions((current) => current.filter((transaction) => transaction.id !== id)); markPending(id, true);
    try { await api.deleteTransaction(id); haptics.success(); updateSummary(); closeModal(); }
    catch (error) { setTransactions((current) => [original, ...current].sort((a, b) => b.date.localeCompare(a.date))); haptics.error(); setMutationError(error instanceof Error ? error.message : 'حذف تراکنش ناموفق بود.'); }
    finally { markPending(id, false); }
  }, [closeModal, currentUser, haptics, openModal, transactions, updateSummary]);

  const saveCycleLog = useCallback(async (log: CycleLog) => {
    if (!currentUser) { openModal({ kind: 'login' }); return; }
    const before = cycleLogs; const next = [...cycleLogs.filter((entry) => entry.date !== log.date), log].sort((a, b) => b.date.localeCompare(a.date));
    setCycleLogs(next);
    try { await api.saveCycleLog(log); if (log.flow && log.flow !== 'none' && !cycleSettings.lastPeriodStart) { const update = await api.updateCycleSettings({ lastPeriodStart: log.date }); setCycleSettings(update); } haptics.success(); if (cycleSettings.healthInsightsConsent) void refreshCycleInsights(next); }
    catch (error) { setCycleLogs(before); haptics.error(); throw error; }
  }, [currentUser, cycleLogs, cycleSettings.healthInsightsConsent, cycleSettings.lastPeriodStart, haptics, openModal, refreshCycleInsights]);

  const updateCycleSettings = useCallback(async (update: Partial<CycleSettings>) => { const saved = await api.updateCycleSettings(update); setCycleSettings(saved); }, []);
  const enableCycleInsights = async () => { if (!currentUser) { openModal({ kind: 'login' }); return; } const saved = await api.updateCycleSettings({ healthInsightsConsent: true }); setCycleSettings(saved); };
  const updateBudgets = async (next: Budget[]) => { if (!currentUser) { openModal({ kind: 'login' }); return; } setBudgets(await api.updateBudgets(next)); };
  const addBill = async (bill: Omit<Bill, 'id'>) => { if (!currentUser) { openModal({ kind: 'login' }); return; } const saved = await api.addBill(bill); setBills((current) => [...current, saved]); };
  const toggleBill = async (id: string, isPaid: boolean) => { if (!currentUser) { openModal({ kind: 'login' }); return; } const saved = await api.toggleBillPaid(id, isPaid); if (saved) setBills((current) => current.map((bill) => bill.id === id ? saved : bill)); };
  const deleteBill = async (id: string) => { if (!currentUser) { openModal({ kind: 'login' }); return; } await api.deleteBill(id); setBills((current) => current.filter((bill) => bill.id !== id)); };
  const updateSettings = async (update: Partial<AppSettings>) => { if (!currentUser) { openModal({ kind: 'login' }); return; } setSettings(await api.updateSettings(update)); };

  const switchTab = (tab: AppTab) => { haptics.tab(); setActiveTab(tab); if (tab !== 'home') setHomeView('dashboard'); history.replaceState(null, '', tab === 'cycle' ? '/cycle' : '/'); };
  const editingTransaction = activeModal.kind === 'transaction-edit' ? transactions.find((transaction) => transaction.id === activeModal.transactionId) || null : null;
  const selectedCycleLog = activeModal.kind === 'cycle-log' ? cycleLogs.find((log) => log.date === activeModal.date) : undefined;
  const deletingTransaction = activeModal.kind === 'transaction-delete' ? transactions.find((transaction) => transaction.id === activeModal.transactionId) : null;

  if (isLoading && !settings) return <div className="app-mobile-shell mx-auto max-w-md space-y-4 px-4 pt-8"><Skeleton className="h-24" /><Skeleton className="h-44" /><Skeleton className="h-32" /></div>;
  if (loadError && !settings) return <div className="app-mobile-shell grid place-items-center px-6 text-center"><section className="max-w-sm rounded-3xl border border-rose-300/20 bg-rose-400/10 p-6"><CircleAlert className="mx-auto h-7 w-7 text-rose-200" /><h1 className="mt-3 font-bold text-white">اتصال برقرار نشد</h1><p className="mt-2 text-sm text-zinc-300">{loadError}</p><button type="button" onClick={() => void loadData()} className="mt-5 min-h-11 rounded-xl bg-rose-300 px-4 text-sm font-bold text-[#310913]">تلاش دوباره</button></section></div>;

  const homeScreen = homeView === 'transactions'
    ? <TransactionList transactions={transactions} settings={activeSettings} pendingIds={pendingIds} onEditTransaction={(transaction) => requireAuth({ kind: 'transaction-edit', transactionId: transaction.id })} onDeleteTransaction={(id) => requireAuth({ kind: 'transaction-delete', transactionId: id })} onOpenAddExpense={() => requireAuth({ kind: 'transaction-create', source: 'manual' })} onBack={() => setHomeView('dashboard')} />
    : <HomeDashboard onViewTransactions={() => setHomeView('transactions')} balances={<SummaryCards summary={activeSummary} settings={activeSettings} />} budget={<BudgetPlanner budgets={budgets} transactions={transactions} settings={activeSettings} onUpdateBudgets={updateBudgets} onRefreshTransactions={loadData} />} insights={<AIAdvisor selectedMonth={selectedMonth} settings={activeSettings} />} />;

  return <div dir={activeSettings.isRtl ? 'rtl' : 'ltr'} className="app-mobile-shell mx-auto max-w-md overflow-x-hidden bg-[#0b1210] text-zinc-100">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#0b1210]/92 px-4 py-3 backdrop-blur-xl"><div><p className="text-[11px] font-bold tracking-wide text-teal-300">DUOSPEND</p><h1 className="text-sm font-bold text-white">مدیریت مشترک خانه</h1></div><div className="flex items-center gap-2">{activeSettings.useJalaliDate ? <select aria-label="انتخاب ماه" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="max-w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-200">{getJalaliMonthOptions().map((option) => <option key={option.key} value={`${option.startDate}..${option.endDate}`}>{option.label}</option>)}</select> : null}<button type="button" onClick={() => openModal(currentUser ? { kind: 'settings' } : { kind: 'login' })} aria-label="تنظیمات و حساب" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-zinc-200">{currentUser ? <span className="text-base">{currentUser.avatar}</span> : <UserRound className="h-4 w-4" />}</button></div></header>
    {mutationError ? <div role="alert" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"><span>{mutationError}</span><button type="button" onClick={() => setMutationError(null)} className="font-bold">بستن</button></div> : null}
    {pull.pullDistance > 0 ? <div className="ptr-indicator"><RefreshCw className={`h-5 w-5 text-teal-300 ${pull.isRefreshing ? 'animate-spin' : ''}`} /></div> : null}
    <main {...pull.bind} className="px-4 py-5"><Suspense fallback={<div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-56" /></div>}><AnimatePresence mode="wait"><motion.div key={`${activeTab}-${homeView}`} {...screenMotion}>{activeTab === 'home' ? homeScreen : null}{activeTab === 'analytics' ? <AnalyticsCharts transactions={transactions} budgets={budgets} settings={activeSettings} selectedMonth={selectedMonth} /> : null}{activeTab === 'cycle' ? <CycleTrackerScreen settings={activeSettings} currentUser={currentUser} logs={cycleLogs} cycleSettings={cycleSettings} insights={cycleInsights} insightsLoading={insightsLoading} insightsError={insightsError} onOpenLog={(date) => requireAuth({ kind: 'cycle-log', date })} onUpdateSettings={updateCycleSettings} onEnableInsights={() => void enableCycleInsights()} onRefreshInsights={() => void refreshCycleInsights()} /> : null}{activeTab === 'profile' ? <div className="space-y-5"><section className="rounded-[1.5rem] border border-white/10 bg-[#14231e] p-5"><p className="text-xs text-zinc-500">حساب کاربری</p><div className="mt-2 flex items-center justify-between"><h2 className="font-bold text-white">{currentUser ? currentUser.name : 'مهمان'}</h2><button type="button" onClick={() => openModal(currentUser ? { kind: 'settings' } : { kind: 'login' })} className="min-h-10 rounded-lg bg-white/5 px-3 text-xs font-bold text-zinc-200">{currentUser ? 'تنظیمات' : 'ورود'}</button></div></section><BillTracker bills={bills} settings={activeSettings} onToggleBillPaid={toggleBill} onAddBill={addBill} onDeleteBill={deleteBill} /><DataToolsPanel onOpenAddExpense={() => requireAuth({ kind: 'transaction-create', source: 'manual' })} onOpenCSVImport={() => requireAuth({ kind: 'csv-import' })} onOpenReceiptModal={() => requireAuth({ kind: 'transaction-create', source: 'receipt' })} onExportCSV={() => exportToCSV(transactions, activeSettings, selectedMonth)} settings={activeSettings} /></div> : null}</motion.div></AnimatePresence></Suspense></main>
    <ContextualFab onManual={() => requireAuth({ kind: 'transaction-create', source: 'manual' })} onReceipt={() => requireAuth({ kind: 'transaction-create', source: 'receipt' })} onVoice={() => requireAuth({ kind: 'transaction-create', source: 'voice' })} />
    <BottomTabBar activeTab={activeTab} onChange={switchTab} />
    <Suspense fallback={null}><TransactionForm isOpen={activeModal.kind === 'transaction-create' && activeModal.source === 'manual' || activeModal.kind === 'transaction-edit'} onClose={closeModal} onSave={handleSaveTransaction} initialData={editingTransaction || (currentUser ? { paidBy: currentUser.partnerId } : null)} settings={activeSettings} /><VoiceModal isOpen={activeModal.kind === 'transaction-create' && activeModal.source === 'voice'} onClose={closeModal} onSaveTransaction={handleSaveTransaction} onRefreshData={loadData} settings={activeSettings} /><ReceiptScannerModal isOpen={activeModal.kind === 'transaction-create' && activeModal.source === 'receipt'} onClose={closeModal} onSaveTransaction={handleSaveTransaction} settings={activeSettings} /><SettingsModal isOpen={activeModal.kind === 'settings'} onClose={closeModal} settings={activeSettings} onUpdateSettings={updateSettings} /><CSVImportModal isOpen={activeModal.kind === 'csv-import'} onClose={closeModal} settings={activeSettings} onImportComplete={loadData} /><LoginModal isOpen={activeModal.kind === 'login'} onClose={closeModal} currentUser={currentUser} onLoginSuccess={(user) => { setCurrentUser(user); closeModal(); void loadData(); }} /></Suspense>
    <CycleLogSheet date={activeModal.kind === 'cycle-log' ? activeModal.date : null} existing={selectedCycleLog} onClose={closeModal} onSave={saveCycleLog} />
    {deletingTransaction ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-5"><section role="dialog" aria-modal="true" aria-label="تأیید حذف تراکنش" className="w-full rounded-3xl border border-white/15 bg-[#14231e] p-5"><h2 className="font-bold text-white">حذف تراکنش؟</h2><p className="mt-2 text-sm text-zinc-400">{deletingTransaction.title} از فهرست حذف می‌شود.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={closeModal} className="min-h-11 rounded-xl bg-white/5 text-sm font-bold text-zinc-200">انصراف</button><button type="button" onClick={() => void deleteTransaction(deletingTransaction.id)} className="min-h-11 rounded-xl bg-rose-400 text-sm font-bold text-[#310913]">حذف</button></div></section></div> : null}
  </div>;
}
