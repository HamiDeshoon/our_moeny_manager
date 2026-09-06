import React from 'react';
import { PencilLine, Trash2, X } from 'lucide-react';
import type { Transaction } from '../../types';

interface TransactionActionSheetProps { transaction: Transaction | null; onClose: () => void; onEdit: (transaction: Transaction) => void; onDelete: (id: string) => void; }

export function TransactionActionSheet({ transaction, onClose, onEdit, onDelete }: TransactionActionSheetProps) {
  if (!transaction) return null;
  return <div className="fixed inset-0 z-[65] flex items-end bg-black/65" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label="گزینه‌های تراکنش" className="w-full rounded-t-[2rem] border-t border-white/15 bg-[#14231e] p-5 pb-[calc(1.25rem+var(--safe-bottom))]"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-zinc-500">گزینه‌های تراکنش</p><h2 className="font-bold text-white">{transaction.title}</h2></div><button type="button" onClick={onClose} aria-label="بستن" className="grid h-11 w-11 place-items-center rounded-xl bg-white/5"><X className="h-5 w-5" /></button></div><div className="grid gap-2"><button type="button" onClick={() => onEdit(transaction)} className="flex min-h-12 items-center gap-3 rounded-xl bg-sky-400/15 px-4 text-right text-sm font-bold text-sky-100"><PencilLine className="h-5 w-5" />ویرایش تراکنش</button><button type="button" onClick={() => onDelete(transaction.id)} className="flex min-h-12 items-center gap-3 rounded-xl bg-rose-400/15 px-4 text-right text-sm font-bold text-rose-100"><Trash2 className="h-5 w-5" />حذف تراکنش</button></div></section></div>;
}
