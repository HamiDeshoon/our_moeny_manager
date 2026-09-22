import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, CheckCircle2, Circle, Plus, Trash2, ShoppingBag } from 'lucide-react';
import type { AppSettings, AuthUser, GroceryCategory, GroceryItem } from '../../types';

interface GroceryListProps {
  groceryItems: GroceryItem[];
  settings: AppSettings;
  currentUser: AuthUser | null;
  onAddGrocery: (item: Omit<GroceryItem, 'id' | 'createdAt' | 'isChecked'>) => Promise<void>;
  onToggleGrocery: (id: string, isChecked: boolean) => Promise<void>;
  onDeleteGrocery: (id: string) => Promise<void>;
  onClearChecked: () => Promise<void>;
}

const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Produce', 'Dairy', 'Bakery', 'Meat & Fish', 'Pantry', 'Frozen', 'Beverages', 'Cleaning', 'Personal Care', 'Other'
];

export const GroceryList: React.FC<GroceryListProps> = ({
  groceryItems,
  settings,
  currentUser,
  onAddGrocery,
  onToggleGrocery,
  onDeleteGrocery,
  onClearChecked,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<GroceryCategory>('Produce');
  const [loading, setLoading] = useState(false);

  const isFa = settings.isRtl;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await onAddGrocery({
        title: title.trim(),
        quantity: quantity.trim() || undefined,
        category,
        addedBy: currentUser?.partnerId || 'partner_a',
      });
      setTitle('');
      setQuantity('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeItems = groceryItems.filter((i) => !i.isChecked);
  const checkedItems = groceryItems.filter((i) => i.isChecked);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isFa ? 'لیست خرید خانه' : 'Grocery & Shopping'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {activeItems.length} {isFa ? 'مورد باقی‌مانده' : 'items remaining'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {checkedItems.length > 0 && (
            <button
              type="button"
              onClick={() => onClearChecked()}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
            >
              {isFa ? 'پاکسازی خریده‌شده‌ها' : 'Clear Checked'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-[#081a14] shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            <span>{isFa ? 'افزودن کالا' : 'Add Item'}</span>
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#12231c] p-4 space-y-3"
          >
            <h4 className="text-xs font-bold text-emerald-300">
              {isFa ? 'افزودن کالای جدید به لیست خرید' : 'Add New Item to Shopping List'}
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  required
                  placeholder={isFa ? 'نام کالا (مثلاً: شیر نایلونی، تخم‌مرغ)' : 'Item name (e.g. Milk, Eggs)'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder={isFa ? 'مقدار / تعداد' : 'Qty (e.g. 2 kg)'}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GroceryCategory)}
                className="rounded-xl border border-white/10 bg-[#193228] px-2.5 py-1.5 text-xs text-white"
              >
                {GROCERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-xs text-zinc-400"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-[#081a14] hover:bg-emerald-400"
                >
                  {loading ? '...' : (isFa ? 'افزودن' : 'Add')}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Active Grocery Items */}
      <div className="space-y-2">
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-zinc-500">
            <ShoppingBag className="mx-auto h-7 w-7 opacity-40 mb-2" />
            <p className="text-xs">
              {isFa ? 'سبد خرید شما خالی است! موارد جدید اضافه کنید.' : 'Your shopping list is empty! Add items above.'}
            </p>
          </div>
        ) : (
          activeItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#12201b] px-3.5 py-2.5 transition hover:border-emerald-500/30"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggleGrocery(item.id, true)}
                  className="text-zinc-500 hover:text-emerald-400 transition"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <div>
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                  {item.quantity && (
                    <span className="ml-2 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300 font-medium">
                      {item.quantity}
                    </span>
                  )}
                  <span className="ml-2 text-[10px] text-zinc-500">#{item.category}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteGrocery(item.id)}
                className="text-zinc-600 hover:text-rose-400 transition p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Checked Off Items */}
      {checkedItems.length > 0 && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <h4 className="text-xs font-bold text-zinc-500">
            {isFa ? 'خریداری‌شده' : 'Purchased Items'} ({checkedItems.length})
          </h4>
          {checkedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2 text-zinc-500"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onToggleGrocery(item.id, false)}
                  className="text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4 fill-emerald-500/20" />
                </button>
                <span className="text-xs line-through text-zinc-500">{item.title}</span>
              </div>

              <button
                type="button"
                onClick={() => onDeleteGrocery(item.id)}
                className="text-zinc-600 hover:text-rose-400 transition p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
