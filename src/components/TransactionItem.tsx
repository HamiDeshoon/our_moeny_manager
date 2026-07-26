import React from 'react';
import { Edit3, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { AppSettings, Transaction } from '../types';
import { formatMoney, formatJalaliDate } from '../utils/formatters';

interface TransactionItemProps {
  tx: Transaction;
  settings: AppSettings;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionItem({ tx, settings, onEdit, onDelete }: TransactionItemProps) {
  const symbol = settings.currencySymbol || 'تومان';
  const isPersianContext = symbol.includes('تومان') || symbol.toLowerCase().includes('toman');

  const getPayerBadge = (paidBy: string) => {
    if (paidBy === settings.partnerA.id) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <span>{settings.partnerA.avatar}</span>
          <span>{settings.partnerA.name}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span>{settings.partnerB.avatar}</span>
        <span>{settings.partnerB.name}</span>
      </span>
    );
  };

  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between gap-4 group border-b border-white/5 last:border-0">
      <div className="flex items-start gap-3.5 min-w-0">
        <div
          className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 border ${
            tx.type === 'EXPENSE'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : tx.type === 'TRANSFER'
              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              : tx.type === 'INCOME'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
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
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-bold text-zinc-100 truncate">{tx.title}</h4>
            {getPayerBadge(tx.paidBy)}
            <span className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-md border border-white/10 font-medium">
              {tx.type === 'TRANSFER' ? 'انتقال بودجه' : tx.category}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <span className="font-mono text-zinc-400">
              {settings.useJalaliDate || isPersianContext ? formatJalaliDate(tx.date) : tx.date}
            </span>
            {tx.vendor && <span className="truncate">فروشگاه: {tx.vendor}</span>}
          </div>

          {tx.notes && (
            <p className="text-[11px] text-zinc-500 truncate mt-1 italic">"{tx.notes}"</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <span
            className={`text-base sm:text-lg font-bold font-mono block ${
              tx.type === 'EXPENSE'
                ? 'text-rose-400'
                : tx.type === 'TRANSFER'
                ? 'text-indigo-400'
                : tx.type === 'INCOME'
                ? 'text-emerald-400'
                : 'text-zinc-100'
            }`}
          >
            {formatMoney(tx.amount, symbol)}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(tx)}
            className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-colors"
            title="ویرایش"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(tx.id)}
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-colors"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
