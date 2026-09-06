import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, Calendar, AlertCircle, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { AppSettings, AuthUser, TodoCategory, TodoItem, TodoPriority } from '../types';
import { api } from '../services/api';
import { haptic } from '../utils/haptics';
import { formatJalaliDate } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface TodoListProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

const CATEGORIES: { id: TodoCategory; label: string; icon: string }[] = [
  { id: 'Cleaning', label: 'نظافت و تمیزکاری', icon: '🧹' },
  { id: 'Shopping', label: 'خرید و مایحتاج', icon: '🛍️' },
  { id: 'Cooking', label: 'آشپزی و غذا', icon: '🍳' },
  { id: 'Finance', label: 'مالی و اداری', icon: '💳' },
  { id: 'Home Repair', label: 'تعمیرات و نگهداری', icon: '🔧' },
  { id: 'Health', label: 'سلامت و پزشکی', icon: '💊' },
  { id: 'Social', label: 'مهمانی و برنامه‌ها', icon: '🎉' },
  { id: 'Other', label: 'سایر وظایف', icon: '📋' },
];

const PRIORITIES: { id: TodoPriority; label: string; color: string; bg: string }[] = [
  { id: 'LOW', label: 'کم', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  { id: 'MEDIUM', label: 'متوسط', color: 'text-amber-400', bg: 'bg-amber-500' },
  { id: 'HIGH', label: 'مهم', color: 'text-orange-400', bg: 'bg-orange-500' },
  { id: 'URGENT', label: 'فوری', color: 'text-rose-500', bg: 'bg-rose-500' },
];

export const TodoList: React.FC<TodoListProps> = ({ settings, currentUser }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'PARTNER' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TodoCategory>('Cleaning');
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const partnerAName = settings.partnerA?.name || 'حامد';
  const partnerBName = settings.partnerB?.name || 'فاطی';
  const myPartnerId = currentUser?.partnerId || 'partner_a';
  const otherPartnerId = myPartnerId === 'partner_a' ? 'partner_b' : 'partner_a';

  const loadTodos = async () => {
    try {
      setLoading(true);
      const data = await api.getTodos();
      setTodos(data);
    } catch (err) {
      console.error('Failed to load todos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleToggle = async (todo: TodoItem) => {
    haptic('light');
    const newCompleted = !todo.isCompleted;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? {
              ...t,
              isCompleted: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : undefined,
              completedBy: newCompleted ? myPartnerId : undefined,
            }
          : t
      )
    );

    try {
      await api.updateTodo(todo.id, { isCompleted: newCompleted });
      if (newCompleted) haptic('success');
    } catch (err) {
      console.error('Failed to update todo', err);
      loadTodos();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('warning');
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (err) {
      console.error('Failed to delete todo', err);
      loadTodos();
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    haptic('medium');
    try {
      const newTodo = await api.addTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo || undefined,
        createdBy: myPartnerId,
      });

      setTodos((prev) => [newTodo, ...prev]);
      setTitle('');
      setDescription('');
      setCategory('Cleaning');
      setPriority('MEDIUM');
      setDueDate('');
      setAssignedTo('');
      setIsAddOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Failed to create todo', err);
    }
  };

  // Filtering
  const activeTodos = todos.filter((t) => !t.isCompleted);
  const completedTodos = todos.filter((t) => t.isCompleted);

  const filteredTodos = activeTodos.filter((t) => {
    if (filter === 'MINE') return t.assignedTo === myPartnerId || !t.assignedTo;
    if (filter === 'PARTNER') return t.assignedTo === otherPartnerId;
    if (filter === 'OVERDUE') return t.dueDate && t.dueDate < todayStr;
    return true;
  });

  const overdueCount = activeTodos.filter((t) => t.dueDate && t.dueDate < todayStr).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="text-xl font-black tracking-tight text-white">کارها و مسئولیت‌های خانه</h2>
            </div>
            <p className="text-xs text-zinc-400">
              تقسیم کار عادلانه، وظایف روزمره و مسئولیت‌های مشترک خانه
            </p>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0"
          >
            افزودن کار جدید
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/5">
          <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-zinc-500 block">کارهای فعال</span>
            <span className="text-base font-black text-white">{activeTodos.length}</span>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-zinc-500 block">انجام شده</span>
            <span className="text-base font-black text-emerald-400">{completedTodos.length}</span>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-zinc-500 block">موعد گذشته</span>
            <span className={`text-base font-black ${overdueCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
              {overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: 'همه کارها', count: activeTodos.length },
          { id: 'MINE', label: 'کارهای من', count: activeTodos.filter(t => t.assignedTo === myPartnerId || !t.assignedTo).length },
          { id: 'PARTNER', label: `کارهای ${myPartnerId === 'partner_a' ? partnerBName : partnerAName}`, count: activeTodos.filter(t => t.assignedTo === otherPartnerId).length },
          { id: 'OVERDUE', label: 'موعد گذشته', count: overdueCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 inline-flex items-center gap-1.5 ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Active Todos List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-20 rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            🎉
          </div>
          <h3 className="text-sm font-bold text-zinc-300">کاری در این دسته‌بندی وجود ندارد!</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            همه کارهای این بخش انجام شده‌اند یا کار جدیدی ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredTodos.map((todo) => {
              const isOverdue = Boolean(todo.dueDate && todo.dueDate < todayStr);
              const priorityObj = PRIORITIES.find((p) => p.id === todo.priority) || PRIORITIES[1];
              const categoryObj = CATEGORIES.find((c) => c.id === todo.category) || CATEGORIES[7];

              return (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleToggle(todo)}
                  className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer p-4 ${
                    isOverdue
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Left priority color bar */}
                  <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${priorityObj.bg}`} />

                  <div className="flex items-start justify-between gap-3 pr-2">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className="mt-0.5 w-5 h-5 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center shrink-0 transition"
                      >
                        {todo.isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-200 leading-snug truncate">
                          {todo.title}
                        </h4>

                        {todo.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {todo.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                            <span>{categoryObj.icon}</span>
                            <span>{categoryObj.label}</span>
                          </span>

                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityObj.color} bg-white/5`}>
                            {priorityObj.label}
                          </span>

                          {todo.dueDate && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] ${
                                isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{formatJalaliDate(todo.dueDate)}</span>
                              {isOverdue && <span className="text-[10px] bg-rose-500/20 px-1 rounded">گذشته</span>}
                            </span>
                          )}

                          {todo.assignedTo && (
                            <span className="text-[11px] text-indigo-400">
                              مسئول: {todo.assignedTo === 'partner_a' ? partnerAName : partnerBName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(todo.id, e)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Tasks Accordion */}
      {completedTodos.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-xs text-zinc-400 font-bold transition"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>کارهای انجام شده ({completedTodos.length})</span>
            </div>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="space-y-2 mt-3">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => handleToggle(todo)}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-white/5 opacity-60 cursor-pointer hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-black shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs text-zinc-400 line-through truncate">
                      {todo.title}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(todo.id, e)}
                    className="p-1 text-zinc-600 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Task BottomSheet */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="تعریف کار و مسئولیت جدید"
      >
        <form onSubmit={handleCreateTodo} className="space-y-4">
          <Input
            label="عنوان کار یا وظیفه"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: نظافت بالکن، پرداخت قبض شارژ، خرید داروها..."
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              توضیحات و جزئیات (اختیاری)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="نکات، آدرس، یا جزئیات مربوط به این کار..."
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TodoCategory)}
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
                اولویت
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TodoPriority)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              موعد انجام (اختیاری)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              مسئول انجام
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
                مشترک
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
            ثبت کار
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
};
