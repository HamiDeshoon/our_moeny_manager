import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, Trash2, AlertCircle, ShieldCheck, ReceiptText } from 'lucide-react';
import { AppSettings, Bill, Category } from '../types';
import { formatMoney } from '../utils/formatters';
import { EmptyState } from './EmptyState';

interface BillTrackerProps {
  bills: Bill[];
  settings: AppSettings;
  onToggleBillPaid: (id: string, isPaid: boolean) => Promise<void>;
  onAddBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  onDeleteBill: (id: string) => Promise<void>;
}

const CATEGORIES: Category[] = [
  'Rent & Mortgage',
  'Utilities & Internet',
  'Entertainment & Subscriptions',
  'Healthcare & Wellness',
  'Household & Supplies',
  'Other',
];

export const BillTracker: React.FC<BillTrackerProps> = ({
  bills,
  settings,
  onToggleBillPaid,
  onAddBill,
  onDeleteBill,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Utilities & Internet');
  const [dueDateDay, setDueDateDay] = useState(15);
  const [paidBy, setPaidBy] = useState(settings.partnerA.id);
  const [autopay, setAutopay] = useState(false);
  const [provider, setProvider] = useState('');

  const symbol = settings.currencySymbol || 'تومان';

  const todayDay = new Date().getDate();

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount) || 0;
    if (!title.trim() || numAmt <= 0) return;

    try {
      await onAddBill({
        title: title.trim(),
        amount: numAmt,
        category,
        dueDateDay,
        paidBy,
        isPaidThisMonth: false,
        autopay,
        provider: provider.trim() || undefined,
      });

      setTitle('');
      setAmount('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to add bill:', err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">قبوض و یادآورهای ماهانه</h2>
            <p className="text-xs text-zinc-500 mt-1">مدیریت تاریخ سررسید و وضعیت پرداخت قبوض</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>افزودن قبض</span>
        </button>
      </div>

      {/* New Bill Creator */}
      {isAdding && (
        <form onSubmit={handleCreateBill} className="mb-6 p-4 bg-black/20 border border-white/10 rounded-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">افزودن قبض جدید</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">عنوان قبض</label>
              <input
                type="text"
                required
                placeholder="مثلا: قبض برق"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">مبلغ ({symbol})</label>
              <input
                type="number"
                step="1"
                required
                placeholder="مبلغ به عدد"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">دسته‌بندی</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">روز سررسید (۱ تا ۳۱)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDateDay}
                onChange={(e) => setDueDateDay(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 block mb-1">پرداخت کننده پیش‌فرض</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={settings.partnerA.id}>{settings.partnerA.name}</option>
                <option value={settings.partnerB.id}>{settings.partnerB.name}</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-5">
              <input
                type="checkbox"
                id="autopay"
                checked={autopay}
                onChange={(e) => setAutopay(e.target.checked)}
                className="rounded bg-zinc-900 border-white/20 text-indigo-500 focus:ring-0 ml-2"
              />
              <label htmlFor="autopay" className="text-xs text-zinc-400 cursor-pointer">
                پرداخت خودکار (Autopay) فعال است
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm"
            >
              ذخیره قبض
            </button>
          </div>
        </form>
      )}

      {/* Bill Items List */}
      {bills.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="هیچ قبضی ثبت نشده است"
          description="برای مدیریت تاریخ سررسید و پرداخت‌ها، قبوض ماهانه خود را اضافه کنید."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((bill) => {
            const isOverdue = !bill.isPaidThisMonth && todayDay > bill.dueDateDay;
            const isDueSoon = !bill.isPaidThisMonth && bill.dueDateDay - todayDay <= 5 && bill.dueDateDay - todayDay >= 0;

            return (
              <div
                key={bill.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  bill.isPaidThisMonth
                    ? 'bg-black/20 border-white/10 opacity-70'
                    : isOverdue
                    ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                    : isDueSoon
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <h4 className={`text-sm font-bold ${isOverdue ? 'text-rose-400' : 'text-white'}`}>{bill.title}</h4>
                    {bill.autopay && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 mr-2">
                        <ShieldCheck className="w-3 h-3" />
                        <span>پرداخت خودکار</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-zinc-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="mr-1">سررسید: {bill.dueDateDay}ام</span>
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span>{bill.category}</span>
                  </div>

                  {isOverdue && (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-rose-400 font-bold mt-1">
                      <AlertCircle className="w-3 h-3 ml-0.5" />
                      <span>مهلت پرداخت گذشته</span>
                    </span>
                  )}
                  {isDueSoon && (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-bold mt-1">
                      <AlertCircle className="w-3 h-3 ml-0.5" />
                      <span>نزدیک به سررسید</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end space-x-3">
                  <div className="text-right sm:ml-4">
                    <span className="text-base font-bold text-white font-mono block">
                      {formatMoney(bill.amount, symbol)}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {bill.paidBy === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}
                    </span>
                  </div>

                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => onToggleBillPaid(bill.id, !bill.isPaidThisMonth)}
                      className={`p-2.5 rounded-xl transition cursor-pointer ${
                        bill.isPaidThisMonth
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/10 hover:bg-white/20 text-zinc-300 border border-white/5'
                      }`}
                      title={bill.isPaidThisMonth ? 'لغو پرداخت' : 'تایید پرداخت'}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="حذف قبض"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
