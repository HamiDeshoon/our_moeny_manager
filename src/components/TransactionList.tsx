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

  const getPayerBadge = (paidBy: string) => {
    if (paidBy === settings.partnerA.id) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>{settings.partnerA.avatar}</span>
          <span>{settings.partnerA.name}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span>{settings.partnerB.avatar}</span>
        <span>{settings.partnerB.name}</span>
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Controls Bar: Search & Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5 bg-slate-50/50">
        {/* Top Controls Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses, vendors, notes, or amounts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
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
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs ${
                showAdvanced || hasActiveFilters
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && '*'}</span>
            </button>

            <button
              onClick={() => {
                const month = new Date().toISOString().substring(0, 7);
                exportToCSV(filtered, settings, month);
              }}
              title="Export CSV (Excel UTF-8 / Farsi Supported)"
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={triggerPDFPrint}
              title="Print / Save as PDF"
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1 text-xs">
            {/* Category Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Preset Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date Range</label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                <option value="ALL_TIME">All Dates</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="LAST_90_DAYS">Last 90 Days</option>
                <option value="THIS_YEAR">This Year</option>
                <option value="CUSTOM">Custom Range...</option>
              </select>
            </div>

            {/* Payer Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Paid By</label>
              <select
                value={selectedPayer}
                onChange={(e) => {
                  setSelectedPayer(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                <option value="ALL">All Payers</option>
                <option value={settings.partnerA.id}>{settings.partnerA.name}</option>
                <option value={settings.partnerB.id}>{settings.partnerB.name}</option>
              </select>
            </div>

            {/* Type Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                <option value="ALL">All Types</option>
                <option value="EXPENSE">Expenses Only</option>
                <option value="INCOME">Income Only</option>
                
                <option value="TRANSFER">Transfers</option>
              </select>
            </div>

            {/* Sort By Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                <option value="date_desc">Newest Date</option>
                <option value="date_asc">Oldest Date</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        )}

        {/* Custom Date Range Pickers (Visible when CUSTOM selected) */}
        {showAdvanced && datePreset === 'CUSTOM' && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Custom Range:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Drawer (Min / Max Amount) */}
        {showAdvanced && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-slate-700">Amount Limits ({symbol}):</span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Min:</span>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Max:</span>
              <input
                type="number"
                placeholder="No limit"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-mono"
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
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Active Filter Tags & Reset Action */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>"{searchTerm}"</span>
                  <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>Category: {selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('ALL')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedPayer !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>Payer: {selectedPayer === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}</span>
                  <button onClick={() => setSelectedPayer('ALL')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedType !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>Type: {selectedType}</span>
                  <button onClick={() => setSelectedType('ALL')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {datePreset !== 'ALL_TIME' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>Range: {datePreset}</span>
                  <button onClick={() => setDatePreset('ALL_TIME')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {(minAmount || maxAmount) && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span>Amount: {minAmount || '0'} - {maxAmount || '∞'}</span>
                  <button onClick={() => { setMinAmount(''); setMaxAmount(''); }}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction List Items */}
      {paginated.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No transactions match your query</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing category or date filters, or log a new household expense.
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="mt-2 inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Active Filters</span>
            </button>
          ) : (
            <button
              onClick={onOpenAddExpense}
              className="mt-2 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-100"
            >
              <span>Add New Expense</span>
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {paginated.map((tx) => (
            <div
              key={tx.id}
              className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4 group"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                    tx.type === 'EXPENSE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : tx.type === 'TRANSFER'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : tx.type === 'INCOME'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-indigo-600 border border-slate-200'
                  }`}
                >
                  {tx.type === 'EXPENSE' ? (
                    <ArrowRightLeft className="w-4 h-4" />
                  ) : tx.type === 'TRANSFER' ? (
                    <ArrowRightLeft className="w-4 h-4" />
                  ) : tx.type === 'INCOME' ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{tx.title}</h4>
                    {getPayerBadge(tx.paidBy)}
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                      {tx.type === 'TRANSFER' ? 'Budget Transfer' : tx.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 flex-wrap gap-y-0.5">
                    <span className="font-mono text-slate-600">
                      {settings.useJalaliDate || isPersianContext ? formatJalaliDate(tx.date) : tx.date}
                    </span>
                    {tx.vendor && <span className="truncate">Store: {tx.vendor}</span>}
                  </div>

                  {tx.notes && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">"{tx.notes}"</p>
                  )}
                </div>
              </div>

              {/* Right Side: Amount & Action Buttons */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="text-right">
                  <span
                    className={`text-base sm:text-lg font-bold font-mono block ${
                      tx.type === 'EXPENSE'
                        ? 'text-emerald-600'
                        : tx.type === 'TRANSFER'
                        ? 'text-amber-600'
                        : tx.type === 'INCOME'
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatMoney(tx.amount, symbol)}
                  </span>
                  
                </div>

                <div className="flex items-center space-x-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => onEditTransaction(tx)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Expense"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({filtered.length} items found)
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-600 rounded-lg transition shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-600 rounded-lg transition shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
