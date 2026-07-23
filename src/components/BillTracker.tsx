import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, Trash2, AlertCircle, ShieldCheck } from 'lucide-react';
import { AppSettings, Bill, Category } from '../types';
import { formatMoney } from '../utils/formatters';

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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Recurring Bills & Reminders</h2>
            <p className="text-xs text-slate-500">Track due dates, autopay schedules, and payment completion</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-100"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* New Bill Creator */}
      {isAdding && (
        <form onSubmit={handleCreateBill} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">Add Recurring Household Bill</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Bill Title (e.g. Electric Bill)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
            />
            <input
              type="number"
              step="0.01"
              required
              placeholder="Amount ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-mono shadow-2xs"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Due Day of Month (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDateDay}
                onChange={(e) => setDueDateDay(parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Default Payer</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs"
              >
                <option value={settings.partnerA.id}>{settings.partnerA.name}</option>
                <option value={settings.partnerB.id}>{settings.partnerB.name}</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="autopay"
                checked={autopay}
                onChange={(e) => setAutopay(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="autopay" className="text-xs text-slate-700">
                Autopay Enabled
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-xs"
            >
              Save Bill
            </button>
          </div>
        </form>
      )}

      {/* Bill Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bills.map((bill) => {
          const isOverdue = !bill.isPaidThisMonth && todayDay > bill.dueDateDay;
          const isDueSoon = !bill.isPaidThisMonth && bill.dueDateDay - todayDay <= 5 && bill.dueDateDay - todayDay >= 0;

          return (
            <div
              key={bill.id}
              className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                bill.isPaidThisMonth
                  ? 'bg-slate-50/60 border-slate-200 opacity-90'
                  : isOverdue
                  ? 'bg-rose-50/70 border-rose-200'
                  : isDueSoon
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-white border border-slate-200 shadow-2xs'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-slate-900">{bill.title}</h4>
                  {bill.autopay && (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Autopay</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due on {bill.dueDateDay}th</span>
                  </span>
                  <span>Category: {bill.category}</span>
                </div>

                {isOverdue && (
                  <span className="inline-flex items-center space-x-1 text-[10px] text-rose-700 font-bold">
                    <AlertCircle className="w-3 h-3" />
                    <span>Payment Overdue</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900 font-mono block">
                    {formatMoney(bill.amount, symbol)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Payer: {bill.paidBy === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}
                  </span>
                </div>

                <button
                  onClick={() => onToggleBillPaid(bill.id, !bill.isPaidThisMonth)}
                  className={`p-2 rounded-xl transition ${
                    bill.isPaidThisMonth
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                  }`}
                  title={bill.isPaidThisMonth ? 'Mark as Unpaid' : 'Mark as Paid'}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onDeleteBill(bill.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Delete Bill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
