import React from 'react';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, PencilLine, Trash2 } from 'lucide-react';
import { AppSettings, Transaction } from '../types';
import { formatJalaliDate, formatMoney } from '../utils/formatters';

interface TransactionItemProps {
  tx: Transaction;
  settings: AppSettings;
  pending?: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenActions: (tx: Transaction) => void;
}

export function TransactionItem({ tx, settings, pending = false, onEdit, onDelete, onOpenActions }: TransactionItemProps) {
  const symbol = settings.currencySymbol || 'تومان';
  const typeIcon = tx.type === 'INCOME' ? ArrowDownRight : tx.type === 'TRANSFER' ? ArrowRightLeft : ArrowUpRight;
  const TypeIcon = typeIcon;
  const amountColor = tx.type === 'EXPENSE' ? 'text-rose-300' : tx.type === 'INCOME' ? 'text-teal-300' : 'text-violet-300';
  const action = (offset: number) => { if (offset > 92) onEdit(tx); if (offset < -92) onDelete(tx.id); };

  return (
    <div className="relative overflow-hidden border-b border-white/5 last:border-0">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 flex w-28 items-center justify-center bg-sky-500/80 text-white"><PencilLine className="h-5 w-5" /></div>
      <div aria-hidden="true" className="absolute inset-y-0 left-0 flex w-28 items-center justify-center bg-rose-500/85 text-white"><Trash2 className="h-5 w-5" /></div>
      <motion.article
        drag="x"
        dragConstraints={{ left: -112, right: 112 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => action(info.offset.x)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenActions(tx); } }}
        tabIndex={0}
        aria-describedby={`gesture-${tx.id}`}
        className={`relative flex min-h-[76px] items-center gap-3 bg-[#14231e] px-3 py-3 outline-none ${pending ? 'opacity-60' : ''}`}
      >
        <span id={`gesture-${tx.id}`} className="sr-only">برای ویرایش به راست و برای حذف به چپ بکشید. برای گزینه‌ها Enter را فشار دهید.</span>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${tx.type === 'EXPENSE' ? 'border-rose-300/20 bg-rose-300/10 text-rose-200' : 'border-teal-300/20 bg-teal-300/10 text-teal-200'}`}><TypeIcon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-zinc-100">{tx.title}</h3><p className="mt-1 truncate text-[11px] text-zinc-500">{tx.type === 'TRANSFER' ? 'انتقال' : tx.category} · {settings.useJalaliDate ? formatJalaliDate(tx.date) : tx.date}</p></div>
        <div className="shrink-0 text-left"><p className={`font-mono text-sm font-bold ${amountColor}`}>{formatMoney(tx.amount, symbol)}</p><p className="mt-1 text-[10px] text-zinc-500">{tx.paidBy === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}</p></div>
      </motion.article>
    </div>
  );
}
