import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, ShoppingCart, Flame, Heart } from 'lucide-react';
import { api } from '../../services/api';
import type { AppSettings, GroceryItem, Habit, HabitLog, TodoItem } from '../../types';

interface HomeRoutinesWidgetProps {
  settings: AppSettings;
  onOpenRoutines: () => void;
}

export const HomeRoutinesWidget: React.FC<HomeRoutinesWidgetProps> = ({ settings, onOpenRoutines }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);

  const isFa = settings.isRtl;
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    void Promise.all([
      api.getTodos().catch(() => []),
      api.getGroceryItems().catch(() => []),
      api.getHabits().catch(() => []),
      api.getHabitLogs(todayStr).catch(() => []),
    ]).then(([t, g, h, hl]) => {
      setTodos(t.filter((item) => !item.isCompleted).slice(0, 3));
      setGroceries(g.filter((item) => !item.isChecked).slice(0, 3));
      setHabits(h.slice(0, 3));
      setHabitLogs(hl);
    });
  }, [todayStr]);

  const toggleTask = async (id: string) => {
    await api.updateTodo(id, { isCompleted: true });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleGrocery = async (id: string) => {
    await api.toggleGroceryItem(id, true);
    setGroceries((prev) => prev.filter((g) => g.id !== id));
  };

  const toggleHabit = async (habitId: string) => {
    const res = await api.toggleHabitLog(habitId, todayStr);
    if (res.completed && res.log) {
      setHabitLogs((prev) => [...prev, res.log!]);
    } else {
      setHabitLogs((prev) => prev.filter((l) => l.habitId !== habitId));
    }
  };

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-[#12221c] p-4 space-y-3.5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-teal-400" />
          <h3 className="text-sm font-bold text-white">
            {isFa ? 'تمرکز و روتین امروز' : "Today's Focus & Routines"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenRoutines}
          className="flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200 transition"
        >
          <span>{isFa ? 'مشاهده همه' : 'View All'}</span>
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
        </button>
      </div>

      {/* Pending Tasks */}
      {todos.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-zinc-400">
            {isFa ? 'کارهای خانگی فوری' : 'Pending Tasks'}
          </span>
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs"
            >
              <span className="text-white truncate font-medium">{todo.title}</span>
              <button
                type="button"
                onClick={() => toggleTask(todo.id)}
                className="rounded-lg bg-teal-500/20 px-2.5 py-1 text-[10px] font-bold text-teal-300 hover:bg-teal-500/30"
              >
                {isFa ? 'انجام شد' : 'Done'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Groceries Quick Items */}
      {groceries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
            <ShoppingCart className="h-3 w-3 text-emerald-400" />
            {isFa ? 'اقلام سبد خرید' : 'Shopping Needed'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {groceries.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGrocery(g.id)}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                ✓ {g.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Habits Today */}
      {habits.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-400" />
            {isFa ? 'عادت‌های امروز' : "Today's Habits"}
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {habits.map((h) => {
              const isDone = habitLogs.some((l) => l.habitId === h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggleHabit(h.id)}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs text-left transition flex items-center justify-between ${
                    isDone
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 font-bold'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-amber-500/30'
                  }`}
                >
                  <span className="truncate">{h.title}</span>
                  <span>{isDone ? '🔥' : '○'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
