import React, { useMemo, useState } from 'react';
import { ArrowRight, ReceiptText, Search } from 'lucide-react';
import { AppSettings, Transaction } from '../types';
import { TransactionItem } from './TransactionItem';
import { TransactionActionSheet } from '../features/transactions/TransactionActionSheet';
import { FriendlyEmptyState } from './ui/EmptyState';

interface TransactionListProps { transactions: Transaction[]; settings: AppSettings; pendingIds?: ReadonlySet<string>; onEditTransaction: (tx: Transaction) => void; onDeleteTransaction: (id: string) => void; onOpenAddExpense: () => void; onBack?: () => void; }
type Filter = 'all' | 'today' | 'week' | 'groceries' | 'dining';
const chips: Array<{ id: Filter; label: string }> = [{ id: 'all', label: 'همه' }, { id: 'today', label: 'امروز' }, { id: 'week', label: 'این هفته' }, { id: 'groceries', label: 'خواربار' }, { id: 'dining', label: 'غذا' }];

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, settings, pendingIds, onEditTransaction, onDeleteTransaction, onOpenAddExpense, onBack }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [actionTransaction, setActionTransaction] = useState<Transaction | null>(null);
  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (normalized && ![transaction.title, transaction.vendor, transaction.notes, transaction.category].filter(Boolean).join(' ').toLowerCase().includes(normalized)) return false;
      if (filter === 'today') return transaction.date === today.toISOString().slice(0, 10);
      if (filter === 'week') return new Date(`${transaction.date}T00:00:00`) >= weekStart;
      if (filter === 'groceries') return transaction.category === 'Groceries';
      if (filter === 'dining') return transaction.category === 'Dining & Takeout';
      return true;
    });
  }, [filter, query, transactions]);

  return <section className="space-y-3"><div className="flex items-center gap-3">{onBack ? <button type="button" onClick={onBack} aria-label="بازگشت به خانه" className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-zinc-200"><ArrowRight className="h-5 w-5" /></button> : null}<div><p className="text-xs text-zinc-500">دفتر هزینه‌ها</p><h1 className="text-lg font-bold text-white">تراکنش‌ها</h1></div></div><div className="sticky top-0 z-20 -mx-4 space-y-3 border-y border-white/5 bg-[#0b1210]/95 px-4 py-3 backdrop-blur"><label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-zinc-400"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی تراکنش‌ها" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" /></label><div className="no-scrollbar flex gap-2 overflow-x-auto">{chips.map((chip) => <button key={chip.id} type="button" aria-pressed={filter === chip.id} onClick={() => setFilter(chip.id)} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold ${filter === chip.id ? 'border-teal-300/50 bg-teal-300/15 text-teal-100' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>{chip.label}</button>)}</div></div>{filtered.length ? <div className="overflow-hidden rounded-[1.5rem] border border-white/10">{filtered.map((transaction) => <TransactionItem key={transaction.id} tx={transaction} settings={settings} pending={pendingIds?.has(transaction.id)} onEdit={(item) => { setActionTransaction(null); onEditTransaction(item); }} onDelete={(id) => { setActionTransaction(null); onDeleteTransaction(id); }} onOpenActions={setActionTransaction} />)}</div> : <FriendlyEmptyState icon={ReceiptText} title="هنوز تراکنشی اینجا نیست" description={query || filter !== 'all' ? 'جست‌وجو یا فیلترها را تغییر دهید.' : 'اولین هزینه یا درآمدتان را با یک ثبت ساده اضافه کنید.'} actionLabel={query || filter !== 'all' ? 'پاک کردن فیلترها' : 'ثبت تراکنش'} onAction={() => query || filter !== 'all' ? (setQuery(''), setFilter('all')) : onOpenAddExpense()} />}<TransactionActionSheet transaction={actionTransaction} onClose={() => setActionTransaction(null)} onEdit={(transaction) => { setActionTransaction(null); onEditTransaction(transaction); }} onDelete={(id) => { setActionTransaction(null); onDeleteTransaction(id); }} /></section>;
};
