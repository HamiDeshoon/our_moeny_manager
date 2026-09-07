import React, { useState, useEffect } from 'react';
import { Calendar, Tag, User, Store, ArrowRightLeft, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { AppSettings, Category, Transaction, TransactionType } from '../types';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { formatJalaliDate } from '../utils/formatters';

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

  const numericAmount = parseFloat(amount) || 0;

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? 'ویرایش تراکنش' : 'ثبت تراکنش جدید'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/20 rounded-xl">
          <button
            type="button"
            onClick={() => setTxType('EXPENSE')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
              txType === 'EXPENSE'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4 mb-1" />
            <span>هزینه</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('TRANSFER')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
              txType === 'TRANSFER'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 mb-1" />
            <span>انتقال</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('INCOME')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
              txType === 'INCOME'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-1" />
            <span>درآمد</span>
          </button>
        </div>

        {/* Amount & Title */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-zinc-300 ml-1">مبلغ ({settings.currencySymbol})</label>
              {numericAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(numericAmount / 10)))}
                  className="text-[10px] text-zinc-400 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition"
                >
                  ÷۱۰ (تبدیل به تومان)
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-lg font-bold"
            />
          </div>
          
          <Input
            label="عنوان تراکنش"
            required
            placeholder="مثلا خرید هایپراستار"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Paid By */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-400" />
            پرداخت کننده
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaidBy(settings.partnerA.id)}
              className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                paidBy === settings.partnerA.id
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <span>{settings.partnerA.avatar}</span>
              <span>{settings.partnerA.name}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaidBy(settings.partnerB.id)}
              className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                paidBy === settings.partnerB.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <span>{settings.partnerB.avatar}</span>
              <span>{settings.partnerB.name}</span>
            </button>
          </div>
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-2 gap-3">
          {txType === 'EXPENSE' ? (
            <div>
              <label className="text-sm font-medium text-zinc-300 ml-1 mb-1 block flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-400" />
                دسته‌بندی
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {CATEGORIES.filter(c => c !== 'Internal Transfer' && c !== 'Income & Salary').map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                ))}
              </select>
            </div>
          ) : (
            <div></div> // empty spacer
          )}
          
          <Input
            label="تاریخ"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            helperText={settings.useJalaliDate && date ? `تاریخ شمسی: ${formatJalaliDate(date)}` : undefined}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Vendor & Notes */}
        {txType === 'EXPENSE' && (
          <Input
            label="فروشگاه / ذینفع"
            placeholder="اختیاری"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            leftIcon={<Store className="w-4 h-4" />}
          />
        )}
        
        <Input
          label="توضیحات تکمیلی"
          placeholder="اختیاری"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          leftIcon={<FileText className="w-4 h-4" />}
        />

        {/* Recurring Toggle */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-black/40 border-white/20 text-indigo-500 focus:ring-indigo-500/50 w-4 h-4"
            />
            <span className="text-sm font-medium text-zinc-200">تبدیل به هزینه ثابت ماهانه</span>
          </label>
          
          {isRecurring && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-sm text-zinc-400">ثبت خودکار در روز</span>
              <Input
                type="number"
                min="1"
                max="31"
                value={recurringDay}
                onChange={(e) => setRecurringDay(e.target.value)}
                className="w-20 !py-1 text-center font-mono"
              />
              <span className="text-sm text-zinc-400">هر ماه</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            انصراف
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || numericAmount <= 0} 
            isLoading={isSubmitting}
            className="flex-[2] bg-indigo-600"
          >
            {initialData ? 'بروزرسانی' : 'ثبت تراکنش'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
