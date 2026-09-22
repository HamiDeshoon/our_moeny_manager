import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, ShoppingCart, Flame, Heart, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { AppSettings, AuthUser, CoupleCheckin as CoupleCheckinType, GroceryItem, Habit, HabitLog, TodoItem } from '../../types';
import { TaskBoard } from './TaskBoard';
import { GroceryList } from './GroceryList';
import { HabitTracker } from './HabitTracker';
import { CoupleCheckinView } from './CoupleCheckin';
import { Skeleton } from '../../components/ui/Skeleton';

interface RoutinesScreenProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

type RoutineSubTab = 'tasks' | 'grocery' | 'habits' | 'checkin';

export const RoutinesScreen: React.FC<RoutinesScreenProps> = ({ settings, currentUser }) => {
  const [subTab, setSubTab] = useState<RoutineSubTab>('tasks');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [checkins, setCheckins] = useState<CoupleCheckinType[]>([]);
  const [loading, setLoading] = useState(true);

  const isFa = settings.isRtl;

  const loadAllRoutineData = useCallback(async () => {
    setLoading(true);
    try {
      const [tList, gList, hList, hlList, cList] = await Promise.all([
        api.getTodos().catch(() => []),
        api.getGroceryItems().catch(() => []),
        api.getHabits().catch(() => []),
        api.getHabitLogs().catch(() => []),
        api.getCoupleCheckins().catch(() => []),
      ]);
      setTodos(tList);
      setGroceryItems(gList);
      setHabits(hList);
      setHabitLogs(hlList);
      setCheckins(cList);
    } catch (err) {
      console.error('Failed loading routines data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllRoutineData();
  }, [loadAllRoutineData]);

  // Task Handlers
  const handleAddTodo = async (todo: Omit<TodoItem, 'id' | 'createdAt' | 'isCompleted'>) => {
    const saved = await api.addTodo(todo);
    setTodos((prev) => [saved, ...prev]);
  };

  const handleToggleTodo = async (id: string, isCompleted: boolean) => {
    const updated = await api.updateTodo(id, { isCompleted });
    if (updated) {
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await api.deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // Grocery Handlers
  const handleAddGrocery = async (item: Omit<GroceryItem, 'id' | 'createdAt' | 'isChecked'>) => {
    const saved = await api.addGroceryItem(item);
    setGroceryItems((prev) => [saved, ...prev]);
  };

  const handleToggleGrocery = async (id: string, isChecked: boolean) => {
    const updated = await api.toggleGroceryItem(id, isChecked);
    if (updated) {
      setGroceryItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
    }
  };

  const handleDeleteGrocery = async (id: string) => {
    await api.deleteGroceryItem(id);
    setGroceryItems((prev) => prev.filter((g) => g.id !== id));
  };

  const handleClearCheckedGrocery = async () => {
    await api.clearCheckedGroceryItems();
    setGroceryItems((prev) => prev.filter((g) => !g.isChecked));
  };

  // Habit Handlers
  const handleAddHabit = async (habit: Omit<Habit, 'id' | 'createdAt'>) => {
    const saved = await api.addHabit(habit);
    setHabits((prev) => [saved, ...prev]);
  };

  const handleToggleHabitLog = async (habitId: string, date: string) => {
    const result = await api.toggleHabitLog(habitId, date);
    if (result.completed && result.log) {
      setHabitLogs((prev) => [result.log!, ...prev]);
    } else {
      setHabitLogs((prev) => prev.filter((l) => !(l.habitId === habitId && l.date === date)));
    }
  };

  const handleDeleteHabit = async (id: string) => {
    await api.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setHabitLogs((prev) => prev.filter((l) => l.habitId !== id));
  };

  // Checkin Handlers
  const handleSaveCheckin = async (checkin: { date: string; mood: string; appreciationNote?: string }) => {
    const saved = await api.saveCoupleCheckin(checkin);
    setCheckins((prev) => {
      const filtered = prev.filter((c) => !(c.date === saved.date && c.partnerId === saved.partnerId));
      return [saved, ...filtered];
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-gradient-to-br from-[#12231c] via-[#0f1b16] to-[#0a120e] p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-300">
              <Sparkles className="h-3.5 w-3.5" />
              {isFa ? 'مدیریت روتین و کارهای روزانه' : 'Routines & Daily Tasks'}
            </span>
            <h2 className="mt-1 text-lg font-black text-white">
              {isFa ? 'زندگی منظم‌تر، کنار همدیگر' : 'Organized Home, Together'}
            </h2>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSubTab('tasks')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition whitespace-nowrap ${
              subTab === 'tasks' ? 'bg-teal-500 text-[#081a14] shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>{isFa ? 'کارهای خانه' : 'Tasks'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('grocery')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition whitespace-nowrap ${
              subTab === 'grocery' ? 'bg-emerald-500 text-[#081a14] shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{isFa ? 'لیست خرید' : 'Grocery'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('habits')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition whitespace-nowrap ${
              subTab === 'habits' ? 'bg-amber-500 text-[#181102] shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>{isFa ? 'عادت‌ها' : 'Habits'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('checkin')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition whitespace-nowrap ${
              subTab === 'checkin' ? 'bg-rose-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="h-4 w-4" />
            <span>{isFa ? 'قدردانی' : 'Mood'}</span>
          </button>
        </div>
      </section>

      {/* Dynamic Sub-Tab View */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {subTab === 'tasks' && (
              <TaskBoard
                todos={todos}
                settings={settings}
                currentUser={currentUser}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
              />
            )}

            {subTab === 'grocery' && (
              <GroceryList
                groceryItems={groceryItems}
                settings={settings}
                currentUser={currentUser}
                onAddGrocery={handleAddGrocery}
                onToggleGrocery={handleToggleGrocery}
                onDeleteGrocery={handleDeleteGrocery}
                onClearChecked={handleClearCheckedGrocery}
              />
            )}

            {subTab === 'habits' && (
              <HabitTracker
                habits={habits}
                habitLogs={habitLogs}
                settings={settings}
                currentUser={currentUser}
                onAddHabit={handleAddHabit}
                onToggleHabitLog={handleToggleHabitLog}
                onDeleteHabit={handleDeleteHabit}
              />
            )}

            {subTab === 'checkin' && (
              <CoupleCheckinView
                checkins={checkins}
                settings={settings}
                currentUser={currentUser}
                onSaveCheckin={handleSaveCheckin}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
