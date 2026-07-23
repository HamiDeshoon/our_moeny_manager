import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, User, Split, FileText, Store, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { AppSettings, Category, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: Partial<Transaction> | null;
  settings: AppSettings;
}

const CATEGORIES: Category[] = [
  'Groceries',
  'Dining & Takeout',
  'Rent & Mortgage',
  'Utilities & Internet',
  'Household & Supplies',
  'Entertainment & Subscriptions',
  'Travel & Transport',
  'Healthcare & Wellness',
  'Shopping & Personal',
  'Income & Salary',
  'Internal Transfer',
  'Other',
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  settings,
}) => {
  const [txType, setTxType] = useState<TransactionType>('EXPENSE');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Groceries');
  const [paidBy, setPaidBy] = useState(settings.partnerA.id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTxType(initialData.type || 'EXPENSE');
      setTitle(initialData.title || '');
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setCategory(initialData.category || 'Groceries');
      setPaidBy(initialData.paidBy || settings.partnerA.id);
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setVendor(initialData.vendor || '');
      setNotes(initialData.notes || '');
      setIsRecurring(Boolean(initialData.isRecurring));
      setRecurringDay(initialData.recurringDay ? String(initialData.recurringDay) : '1');
    } else {
      // Reset defaults
      setTxType('EXPENSE');
      setTitle('');
      setAmount('');
      setCategory('Groceries');
      setPaidBy(settings.partnerA.id);
      setDate(new Date().toISOString().split('T')[0]);
      setVendor('');
      setNotes('');
      setIsRecurring(false);
      setRecurringDay('1');
    }
  }, [initialData, isOpen, settings]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amount) || 0;

  const partnerAShare = paidBy === settings.partnerA.id ? numericAmount : 0;
  const partnerBShare = paidBy === settings.partnerB.id ? numericAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numericAmount <= 0) return;

    setIsSubmitting(true);

    try {
      await onSave({
        title: title.trim(),
        amount: numericAmount,
        type: txType,
        category: txType === 'TRANSFER' ? 'Internal Transfer' : txType === 'INCOME' ? 'Income & Salary' : category,
        paidBy,
        date,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
        partnerAShare,
        partnerBShare,
        isRecurring,
        recurringDay: isRecurring ? parseInt(recurringDay) || 1 : undefined,
        recurringFrequency: isRecurring ? 'MONTHLY' : undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>{initialData ? 'Edit Expense' : 'Log Household Expense'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setTxType('EXPENSE')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition ${
                txType === 'EXPENSE'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <TrendingDown className="w-4 h-4 mb-1" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setTxType('TRANSFER')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition ${
                txType === 'TRANSFER'
                  ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 mb-1" />
              <span>Budget Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => setTxType('INCOME')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition ${
                txType === 'INCOME'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 mb-1" />
              <span>Income</span>
            </button>
          </div>

          {/* Amount & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Amount ({settings.currencySymbol})
                </label>
                {numericAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.round(numericAmount / 10)))}
                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                    title="Divide by 10 to convert Rial to Toman"
                  >
                    ✂️ ÷ ۱۰ (ریال ➔ تومان)
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-xs">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-900 font-bold text-lg focus:outline-none focus:border-indigo-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Title / Expense Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Trader Joe's Weekly Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-indigo-600 text-sm shadow-2xs"
              />
            </div>
          </div>

          {/* Paid By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Who Paid?</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidBy(settings.partnerA.id)}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border font-semibold text-xs transition ${
                    paidBy === settings.partnerA.id
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{settings.partnerA.avatar}</span>
                  <span>{settings.partnerA.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy(settings.partnerB.id)}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border font-semibold text-xs transition ${
                    paidBy === settings.partnerB.id
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{settings.partnerB.avatar}</span>
                  <span>{settings.partnerB.name}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Category & Vendor */}
          {txType === 'EXPENSE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-600 shadow-2xs"
                >
                  {CATEGORIES.filter(c => c !== 'Internal Transfer' && c !== 'Income & Salary').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center space-x-1">
                  <Store className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Vendor / Merchant (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Costco, Target"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-600 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Notes (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Split for dinner and drinks with friends"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-600 shadow-2xs"
            />
          </div>

          {/* Monthly Recurring Expense Toggle */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-bold text-indigo-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Set as Monthly Recurring Expense (تکرار ماهانه)</span>
              </label>
              {isRecurring && (
                <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
                  Auto-generates Monthly
                </span>
              )}
            </div>

            {isRecurring && (
              <div className="flex items-center space-x-3 text-xs text-indigo-900 pt-1 border-t border-indigo-100">
                <span className="font-medium">Auto-generate on day of month:</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(e.target.value)}
                  className="w-16 bg-white border border-indigo-200 rounded-lg px-2 py-1 font-mono font-bold text-center text-indigo-900 focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[11px] text-indigo-700">
                  (Day {recurringDay} of each month)
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numericAmount <= 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-indigo-100"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
