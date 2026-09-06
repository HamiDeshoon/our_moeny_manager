import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, ShoppingCart, CheckCheck, Sparkles, Filter } from 'lucide-react';
import { AppSettings, AuthUser, GroceryCategory, GroceryItem } from '../types';
import { api } from '../services/api';
import { haptic } from '../utils/haptics';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface GroceryListProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

const CATEGORIES: { id: GroceryCategory; label: string; icon: string }[] = [
  { id: 'Produce', label: 'میوه و سبزیجات', icon: '🥦' },
  { id: 'Dairy', label: 'لبنیات', icon: '🧀' },
  { id: 'Bakery', label: 'نان و غلات', icon: '🍞' },
  { id: 'Meat & Fish', label: 'گوشت و پروتئین', icon: '🥩' },
  { id: 'Pantry', label: 'خواربار و سوپرمارکت', icon: '🥫' },
  { id: 'Frozen', label: 'منجمد و فریزری', icon: '🧊' },
  { id: 'Beverages', label: 'نوشیدنی‌ها', icon: '☕' },
  { id: 'Cleaning', label: 'شوینده و نظافت', icon: '🧹' },
  { id: 'Personal Care', label: 'بهداشتی و سلامت', icon: '🧴' },
  { id: 'Other', label: 'سایر موارد', icon: '📦' },
];

export const GroceryList: React.FC<GroceryListProps> = ({ settings, currentUser }) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GroceryCategory>('Produce');
  const [quantity, setQuantity] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const partnerAName = settings.partnerA?.name || 'حامد';
  const partnerBName = settings.partnerB?.name || 'فاطی';

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await api.getGroceryItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load grocery items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleToggle = async (item: GroceryItem) => {
    haptic('light');
    const newChecked = !item.isChecked;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              isChecked: newChecked,
              checkedAt: newChecked ? new Date().toISOString() : undefined,
              checkedBy: newChecked ? (currentUser?.partnerId || 'partner_a') : undefined,
            }
          : i
      )
    );

    try {
      await api.toggleGroceryItem(item.id, newChecked);
      if (newChecked) haptic('success');
    } catch (err) {
      console.error('Failed to toggle item', err);
      loadItems(); // Rollback
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('warning');
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteGroceryItem(id);
    } catch (err) {
      console.error('Failed to delete grocery item', err);
      loadItems();
    }
  };

  const handleClearChecked = async () => {
    haptic('medium');
    setItems((prev) => prev.filter((i) => !i.isChecked));
    try {
      await api.clearCheckedGroceryItems();
      haptic('success');
    } catch (err) {
      console.error('Failed to clear checked items', err);
      loadItems();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    haptic('medium');
    const addedBy = currentUser?.partnerId || 'partner_a';
    try {
      const newItem = await api.addGroceryItem({
        title: title.trim(),
        category,
        quantity: quantity.trim() || undefined,
        assignedTo: assignedTo || undefined,
        addedBy,
      });
      setItems((prev) => [newItem, ...prev]);
      setTitle('');
      setQuantity('');
      setAssignedTo('');
      setIsAddOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Failed to add grocery item', err);
    }
  };

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.isChecked).length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const filteredItems = filterCategory === 'ALL'
    ? items
    : items.filter((i) => i.category === filterCategory);

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredItems.filter((i) => i.category === cat.id),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              <h2 className="text-xl font-black tracking-tight text-white">لیست خرید مشترک</h2>
            </div>
            <p className="text-xs text-zinc-400">
              خریدهای خانه را به صورت لحظه‌ای با هم‌خانه خود هماهنگ کنید.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {checkedCount > 0 && (
              <button
                onClick={handleClearChecked}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-white/10 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاک کردن خریده‌ها ({checkedCount})</span>
              </button>
            )}

            <Button
              onClick={() => setIsAddOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20"
            >
              افزودن کالا
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-zinc-400">
              <span>پیشرفت خرید: {checkedCount} از {totalCount} قلم</span>
              <span className="text-indigo-400 font-bold">{progressPct}٪</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
            filterCategory === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          همه موارد ({totalCount})
        </button>
        {CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat.id).length;
          if (count === 0 && filterCategory !== cat.id) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grocery Items List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-14 rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            🥦
          </div>
          <h3 className="text-sm font-bold text-zinc-300">لیست خرید خالی است!</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            مواردی که نیاز به خرید دارید را با کلیک روی «افزودن کالا» به لیست اضافه کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 px-1">
                <span>{group.icon}</span>
                <span>{group.label}</span>
                <span className="text-[10px] text-zinc-600">({group.items.length})</span>
              </div>

              <div className="rounded-2xl bg-zinc-900/70 border border-white/10 divide-y divide-white/5 overflow-hidden shadow-sm">
                <AnimatePresence>
                  {group.items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => handleToggle(item)}
                      className={`flex items-center justify-between p-3.5 sm:px-4 cursor-pointer transition-colors ${
                        item.isChecked
                          ? 'bg-zinc-950/40 opacity-60'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox button */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            item.isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-white/20 bg-white/5'
                          }`}
                        >
                          {item.isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold truncate transition-all ${
                              item.isChecked
                                ? 'line-through text-zinc-500'
                                : 'text-zinc-200'
                            }`}
                          >
                            {item.title}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                            {item.quantity && (
                              <span className="inline-block px-1.5 py-0.2 bg-white/5 rounded text-zinc-400 font-medium">
                                {item.quantity}
                              </span>
                            )}
                            {item.assignedTo && (
                              <span className="text-[10px] text-indigo-400">
                                مسئول: {item.assignedTo === 'partner_a' ? partnerAName : item.assignedTo === 'partner_b' ? partnerBName : 'مشترک'}
                              </span>
                            )}
                            {item.isChecked && item.checkedBy && (
                              <span className="text-[10px] text-emerald-400">
                                خریده شده توسط {item.checkedBy === 'partner_a' ? partnerAName : partnerBName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-80 hover:opacity-100"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item BottomSheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="افزودن قلم به لیست خرید"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="نام کالا یا خرید"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: شیر کم‌چرب، گوجه فرنگی، روغن زیتون..."
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GroceryCategory)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                مقدار / تعداد (اختیاری)
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="مثلاً: ۲ کیلو یا ۱ بسته"
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              مسئول خرید (اختیاری)
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAssignedTo('')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  assignedTo === ''
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                هر دو / فرقی ندارد
              </button>
              <button
                type="button"
                onClick={() => setAssignedTo('partner_a')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  assignedTo === 'partner_a'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                👨‍💼 {partnerAName}
              </button>
              <button
                type="button"
                onClick={() => setAssignedTo('partner_b')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition ${
                  assignedTo === 'partner_b'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                👩‍⚕️ {partnerBName}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            افزودن به لیست
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
};
