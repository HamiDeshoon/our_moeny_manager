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
        <span className="inline-flex items-center gap-0.5 sm:space-x-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
          <span>{settings.partnerA.avatar}</span>
          <span className="truncate max-w-[60px] sm:max-w-none">{settings.partnerA.name}</span>
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
    <div className="px-3 py-2.5 sm:px-4 sm:py-3.5 hover:bg-white/5 transition-colors flex items-center gap-2.5 sm:gap-4 group border-b border-white/5 last:border-0">
      {/* Type icon - smaller on mobile */}
      <div
        className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 border ${
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
          <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : tx.type === 'TRANSFER' ? (
          <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : tx.type === 'INCOME' ? (
          <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : (
          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        )}
      </div>

      {/* Title + meta - takes available space, truncates properly */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate min-w-0 flex-1">{tx.title}</h4>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-xs text-zinc-500">
          {getPayerBadge(tx.paidBy)}
          <span className="hidden sm:inline text-[10px] bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded-md border border-white/10 font-medium truncate max-w-[100px]">
            {tx.type === 'TRANSFER' ? 'انتقال بودجه' : tx.category}
          </span>
          <span className="font-mono text-zinc-400 whitespace-nowrap">
            {settings.useJalaliDate || isPersianContext ? formatJalaliDate(tx.date) : tx.date}
          </span>
        </div>
        {tx.notes && (
          <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5 italic">"{tx.notes}"</p>
        )}
      </div>

      {/* Amount + actions - right aligned, compact */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        <span
          className={`text-sm sm:text-base font-bold font-mono whitespace-nowrap ${
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

        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(tx)}
            className="p-1 sm:p-2 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors"
            title="ویرایش"
          >
            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => onDelete(tx.id)}
            className="p-1 sm:p-2 text-zinc-500 hover:text-rose-400 hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
