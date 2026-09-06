import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Download,
  Printer,
  X,
  RotateCcw,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { AppSettings, Category, Transaction } from '../types';
import { formatMoney, formatJalaliDate } from '../utils/formatters';
import { exportToCSV, triggerPDFPrint } from '../utils/exporter';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';

interface TransactionListProps {
  transactions: Transaction[];
  settings: AppSettings;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenAddExpense: () => void;
}

const CATEGORIES: string[] = [
  'ALL',
  'Groceries',
  'Dining & Takeout',
  'Rent & Mortgage',
  'Utilities & Internet',
  'Household & Supplies',
  'Entertainment & Subscriptions',
  'Travel & Transport',
  'Healthcare & Wellness',
  'Shopping & Personal',
  'Other',
];

const ITEMS_PER_PAGE = 8;

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  settings,
  onEditTransaction,
  onDeleteTransaction,
  onOpenAddExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayer, setSelectedPayer] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('ALL_TIME');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);

  const goToPage = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, selectedPayer, selectedType, datePreset, customStartDate, customEndDate, minAmount, maxAmount, sortBy]);

  const symbol = settings.currencySymbol || 'تومان';
  const isPersianContext = symbol.includes('تومان') || symbol.toLowerCase().includes('toman');

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    const today = new Date();
    
    return transactions.filter((t) => {
      // 1. Search text match
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        t.title.toLowerCase().includes(searchLower) ||
        (t.vendor && t.vendor.toLowerCase().includes(searchLower)) ||
        (t.notes && t.notes.toLowerCase().includes(searchLower)) ||
        t.category.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchLower);

      // 2. Category match
      const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;

      // 3. Payer match
      const matchesPayer = selectedPayer === 'ALL' || t.paidBy === selectedPayer;

      // 4. Type match
      const matchesType = selectedType === 'ALL' || t.type === selectedType;

      // 5. Amount match
      const minVal = parseFloat(minAmount);
      const maxVal = parseFloat(maxAmount);
      const matchesMin = isNaN(minVal) || t.amount >= minVal;
      const matchesMax = isNaN(maxVal) || t.amount <= maxVal;

      // 6. Date Range match
      let matchesDate = true;
      if (datePreset === 'LAST_7_DAYS') {
        const d7 = new Date();
        d7.setDate(today.getDate() - 7);
        matchesDate = new Date(t.date) >= d7;
      } else if (datePreset === 'LAST_30_DAYS') {
        const d30 = new Date();
        d30.setDate(today.getDate() - 30);
        matchesDate = new Date(t.date) >= d30;
      } else if (datePreset === 'LAST_90_DAYS') {
        const d90 = new Date();
        d90.setDate(today.getDate() - 90);
        matchesDate = new Date(t.date) >= d90;
      } else if (datePreset === 'THIS_YEAR') {
        const yearStart = `${today.getFullYear()}-01-01`;
        matchesDate = t.date >= yearStart;
      } else if (datePreset === 'CUSTOM') {
        if (customStartDate && t.date < customStartDate) matchesDate = false;
        if (customEndDate && t.date > customEndDate) matchesDate = false;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPayer &&
        matchesType &&
        matchesMin &&
        matchesMax &&
        matchesDate
      );
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });
  }, [
    transactions,
    searchTerm,
    selectedCategory,
    selectedPayer,
    selectedType,
    datePreset,
    customStartDate,
    customEndDate,
    minAmount,
    maxAmount,
    sortBy,
  ]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedPayer('ALL');
    setSelectedType('ALL');
    setDatePreset('ALL_TIME');
    setCustomStartDate('');
    setCustomEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCategory !== 'ALL' ||
    selectedPayer !== 'ALL' ||
    selectedType !== 'ALL' ||
    datePreset !== 'ALL_TIME' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate) ||
    Boolean(minAmount) ||
    Boolean(maxAmount);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);



  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
      {/* Controls Bar: Search & Filters */}
      <div className="p-4 sm:p-5 border-b border-white/10 space-y-3.5 bg-black/20">
        {/* Top Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در تراکنش‌ها، مبالغ و توضیحات..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                showAdvanced || hasActiveFilters
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فیلترها {hasActiveFilters && '*'}</span>
            </button>

            <button
              onClick={() => {
                const month = new Date().toISOString().substring(0, 7);
                exportToCSV(filtered, settings, month);
              }}
              title="خروجی اکسل (CSV)"
              className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">اکسل</span>
            </button>

            <button
              onClick={triggerPDFPrint}
              title="چاپ / PDF"
              className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">چاپ / PDF</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1 text-xs">
            {/* Category Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">دسته‌بندی</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900">
                    {cat === 'ALL' ? 'همه' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Preset Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">بازه زمانی</label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL_TIME" className="bg-zinc-900">همه زمان‌ها</option>
                <option value="LAST_7_DAYS" className="bg-zinc-900">۷ روز گذشته</option>
                <option value="LAST_30_DAYS" className="bg-zinc-900">۳۰ روز گذشته</option>
                <option value="LAST_90_DAYS" className="bg-zinc-900">۹۰ روز گذشته</option>
                <option value="THIS_YEAR" className="bg-zinc-900">امسال</option>
                <option value="CUSTOM" className="bg-zinc-900">محدوده سفارشی...</option>
              </select>
            </div>

            {/* Payer Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">پرداخت کننده</label>
              <select
                value={selectedPayer}
                onChange={(e) => {
                  setSelectedPayer(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL" className="bg-zinc-900">همه</option>
                <option value={settings.partnerA.id} className="bg-zinc-900">{settings.partnerA.name}</option>
                <option value={settings.partnerB.id} className="bg-zinc-900">{settings.partnerB.name}</option>
              </select>
            </div>

            {/* Type Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">نوع تراکنش</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL" className="bg-zinc-900">همه انواع</option>
                <option value="EXPENSE" className="bg-zinc-900">فقط هزینه‌ها</option>
                <option value="INCOME" className="bg-zinc-900">فقط درآمدها</option>
                <option value="TRANSFER" className="bg-zinc-900">انتقالات</option>
              </select>
            </div>

            {/* Sort By Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">مرتب‌سازی بر اساس</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="date_desc" className="bg-zinc-900">جدیدترین تاریخ</option>
                <option value="date_asc" className="bg-zinc-900">قدیمی‌ترین تاریخ</option>
                <option value="amount_desc" className="bg-zinc-900">بیشترین مبلغ</option>
                <option value="amount_asc" className="bg-zinc-900">کمترین مبلغ</option>
              </select>
            </div>
          </div>
        )}

        {/* Custom Date Range Pickers (Visible when CUSTOM selected) */}
        {showAdvanced && datePreset === 'CUSTOM' && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-zinc-300 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>محدوده سفارشی:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-500">از:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-500">تا:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Drawer (Min / Max Amount) */}
        {showAdvanced && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-zinc-300">محدودیت مبلغ ({symbol}):</span>
            <div className="flex items-center space-x-2">
              <span className="text-zinc-500">حداقل:</span>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-28 bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-zinc-500">حداکثر:</span>
              <input
                type="number"
                placeholder="بدون محدودیت"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-28 bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Category Pills Quick Slider */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20 border border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10'
              }`}
            >
              {cat === 'ALL' ? 'همه' : cat}
            </button>
          ))}
        </div>

        {/* Active Filter Tags & Reset Action */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[11px] font-bold text-zinc-500">فیلترهای فعال:</span>
              {searchTerm && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>"{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>دسته‌بندی: {selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('ALL')} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedPayer !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>پرداخت کننده: {selectedPayer === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}</span>
                  <button onClick={() => setSelectedPayer('ALL')} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedType !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>نوع: {selectedType}</span>
                  <button onClick={() => setSelectedType('ALL')} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {datePreset !== 'ALL_TIME' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>زمان: {datePreset}</span>
                  <button onClick={() => setDatePreset('ALL_TIME')} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {(minAmount || maxAmount) && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  <span>مبلغ: {minAmount || '0'} - {maxAmount || '∞'}</span>
                  <button onClick={() => { setMinAmount(''); setMaxAmount(''); }} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-zinc-500 hover:text-rose-400 font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>پاک‌کردن فیلترها</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction List Items */}
      {paginated.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Tag}
            title="هیچ تراکنشی یافت نشد"
            description="کلمات کلیدی جستجو را تغییر دهید یا فیلترها را حذف کنید."
            actionButton={
              hasActiveFilters ? (
                <button
                  onClick={resetFilters}
                  className="mt-2 inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold px-4 py-2 rounded-xl border border-white/10 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>حذف همه فیلترها</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAddExpense}
                  className="mt-2 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-500/20"
                >
                  <span>ثبت تراکنش جدید</span>
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
          {paginated.map((tx) => (
            <TransactionItem
              key={tx.id}
              tx={tx}
              settings={settings}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 flex items-center justify-between text-xs text-zinc-500 mt-2">
          <span>
            صفحه <strong className="text-zinc-300">{currentPage}</strong> از <strong className="text-zinc-300">{totalPages}</strong> ({filtered.length} مورد)
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-zinc-400 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-zinc-400 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
