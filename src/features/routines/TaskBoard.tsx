import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Plus, Trash2, Calendar, User, AlertCircle, Filter } from 'lucide-react';
import type { AppSettings, AuthUser, TodoCategory, TodoItem, TodoPriority } from '../../types';

interface TaskBoardProps {
  todos: TodoItem[];
  settings: AppSettings;
  currentUser: AuthUser | null;
  onAddTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  onToggleTodo: (id: string, isCompleted: boolean) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

const CATEGORIES: TodoCategory[] = [
  'Cleaning', 'Shopping', 'Cooking', 'Finance', 'Health', 'Home Repair', 'Social', 'Other'
];

const PRIORITIES: TodoPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const PRIORITY_BADGES: Record<TodoPriority, { label: string; labelFa: string; color: string }> = {
  LOW: { label: 'Low', labelFa: 'کم', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  MEDIUM: { label: 'Medium', labelFa: 'متوسط', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  HIGH: { label: 'High', labelFa: 'مهم', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  URGENT: { label: 'Urgent', labelFa: 'فوری 🔥', color: 'bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse' },
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  todos,
  settings,
  currentUser,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}) => {
  const [filterPartner, setFilterPartner] = useState<'ALL' | 'PARTNER_A' | 'PARTNER_B'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DONE'>('PENDING');
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TodoCategory>('Cleaning');
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [assignedTo, setAssignedTo] = useState<string>('both');
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isFa = settings.isRtl;

  const partnerAName = settings.partnerA.name || 'Partner A';
  const partnerBName = settings.partnerB.name || 'Partner B';

  const filteredTodos = todos.filter((todo) => {
    if (filterStatus === 'PENDING' && todo.isCompleted) return false;
    if (filterStatus === 'DONE' && !todo.isCompleted) return false;
    if (filterPartner === 'PARTNER_A' && todo.assignedTo !== 'partner_a' && todo.assignedTo !== 'both') return false;
    if (filterPartner === 'PARTNER_B' && todo.assignedTo !== 'partner_b' && todo.assignedTo !== 'both') return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await onAddTodo({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        assignedTo,
        dueDate: dueDate || undefined,
        createdBy: currentUser?.partnerId || 'partner_a',
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAssigneeLabel = (assigned?: string) => {
    if (!assigned || assigned === 'both') return isFa ? 'هر دو' : 'Both';
    if (assigned === 'partner_a') return partnerAName;
    if (assigned === 'partner_b') return partnerBName;
    return assigned;
  };

  const getAssigneeAvatar = (assigned?: string) => {
    if (!assigned || assigned === 'both') return '👥';
    if (assigned === 'partner_a') return settings.partnerA.avatar || '👨‍💼';
    if (assigned === 'partner_b') return settings.partnerB.avatar || '👩‍⚕️';
    return '👤';
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              filterStatus === 'PENDING' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isFa ? 'انجام‌نشده' : 'Pending'} ({todos.filter(t => !t.isCompleted).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DONE')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              filterStatus === 'DONE' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isFa ? 'تکمیل‌شده' : 'Completed'} ({todos.filter(t => t.isCompleted).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              filterStatus === 'ALL' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {isFa ? 'همه' : 'All'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3 py-2 text-xs font-bold text-[#081a14] shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
        >
          <Plus className="h-4 w-4" />
          <span>{isFa ? 'کار جدید' : 'New Task'}</span>
        </button>
      </div>

      {/* Partner Assignment Filter Pills */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-zinc-400">
          <Filter className="h-3.5 w-3.5" />
          {isFa ? 'مسئول:' : 'Assignee:'}
        </span>
        <button
          type="button"
          onClick={() => setFilterPartner('ALL')}
          className={`rounded-lg border px-2.5 py-1 transition ${
            filterPartner === 'ALL'
              ? 'border-teal-500/50 bg-teal-500/10 text-teal-300 font-bold'
              : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {isFa ? 'همه' : 'Everyone'}
        </button>
        <button
          type="button"
          onClick={() => setFilterPartner('PARTNER_A')}
          className={`rounded-lg border px-2.5 py-1 transition ${
            filterPartner === 'PARTNER_A'
              ? 'border-sky-500/50 bg-sky-500/10 text-sky-300 font-bold'
              : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {settings.partnerA.avatar} {partnerAName}
        </button>
        <button
          type="button"
          onClick={() => setFilterPartner('PARTNER_B')}
          className={`rounded-lg border px-2.5 py-1 transition ${
            filterPartner === 'PARTNER_B'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-bold'
              : 'border-white/10 bg-white/5 text-zinc-400'
          }`}
        >
          {settings.partnerB.avatar} {partnerBName}
        </button>
      </div>

      {/* Add Task Form Modal / Expansion */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden rounded-2xl border border-teal-500/30 bg-[#121f1a] p-4 space-y-3"
          >
            <h3 className="text-sm font-bold text-teal-300">
              {isFa ? 'افزودن کار خانگی جدید' : 'Add New Household Task'}
            </h3>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'عنوان کار' : 'Task Title'} *</label>
              <input
                type="text"
                required
                placeholder={isFa ? 'مثلاً: نظافت آشپزخانه یا بیرون بردن زباله‌ها' : 'e.g. Clean kitchen or take out trash'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'دسته‌بندی' : 'Category'}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TodoCategory)}
                  className="w-full rounded-xl border border-white/10 bg-[#172b24] px-2.5 py-2 text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'اولویت' : 'Priority'}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TodoPriority)}
                  className="w-full rounded-xl border border-white/10 bg-[#172b24] px-2.5 py-2 text-xs text-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{isFa ? PRIORITY_BADGES[p].labelFa : PRIORITY_BADGES[p].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'مسئول انجام' : 'Assignee'}</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#172b24] px-2.5 py-2 text-xs text-white"
                >
                  <option value="both">👥 {isFa ? 'هر دو نفر' : 'Both Partners'}</option>
                  <option value="partner_a">{settings.partnerA.avatar} {partnerAName}</option>
                  <option value="partner_b">{settings.partnerB.avatar} {partnerBName}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'مهلت انجام' : 'Due Date'}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">{isFa ? 'توضیحات تکمیلی' : 'Notes / Details'}</label>
              <textarea
                rows={2}
                placeholder={isFa ? 'توضیحات یا یادداشت درباره این کار...' : 'Additional detail or guidelines...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-teal-500 px-5 py-2 text-xs font-bold text-[#081a14] hover:bg-teal-400 disabled:opacity-50"
              >
                {loading ? '...' : (isFa ? 'ثبت کار' : 'Save Task')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTodos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-500">
            <CheckCircle2 className="mx-auto h-8 w-8 opacity-40 mb-2" />
            <p className="text-xs font-medium">
              {isFa ? 'کاری با این فیلتر یافت نشد.' : 'No tasks matching your current view.'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const pBadge = PRIORITY_BADGES[todo.priority] || PRIORITY_BADGES.MEDIUM;
            return (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                  todo.isCompleted
                    ? 'border-white/5 bg-white/[0.02] text-zinc-500'
                    : 'border-white/10 bg-[#121f1a]/80 hover:border-teal-500/30'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTodo(todo.id, !todo.isCompleted)}
                    className="mt-0.5 text-teal-400 hover:scale-110 transition"
                  >
                    {todo.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-teal-400 fill-teal-400/20" />
                    ) : (
                      <Circle className="h-5 w-5 text-zinc-500 hover:text-teal-300" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-sm font-semibold text-white truncate ${
                          todo.isCompleted ? 'line-through text-zinc-500' : ''
                        }`}
                      >
                        {todo.title}
                      </h4>

                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${pBadge.color}`}
                      >
                        {isFa ? pBadge.labelFa : pBadge.label}
                      </span>
                    </div>

                    {todo.description ? (
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{todo.description}</p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                        <span>{getAssigneeAvatar(todo.assignedTo)}</span>
                        <span>{getAssigneeLabel(todo.assignedTo)}</span>
                      </span>

                      {todo.dueDate ? (
                        <span className="flex items-center gap-1 text-teal-300/80">
                          <Calendar className="h-3 w-3" />
                          <span>{todo.dueDate}</span>
                        </span>
                      ) : null}

                      <span className="text-zinc-500">#{todo.category}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTodo(todo.id)}
                  className="p-1 text-zinc-600 hover:text-rose-400 transition"
                  aria-label="Delete todo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
