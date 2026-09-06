import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, CheckSquare, FileText, Target, CalendarDays } from 'lucide-react';
import { AppSettings, AuthUser } from '../types';
import { GroceryList } from './GroceryList';
import { TodoList } from './TodoList';
import { CoupleNotes } from './CoupleNotes';
import { WishGoals } from './WishGoals';
import { ImportantDates } from './ImportantDates';

interface CoupleHubProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

type SubTab = 'grocery' | 'todos' | 'notes' | 'goals' | 'dates';

const SUB_TABS: { id: SubTab; label: string; icon: string; iconComp: React.FC<{ className?: string }> }[] = [
  { id: 'grocery', label: 'خرید', icon: '🛒', iconComp: ShoppingCart },
  { id: 'todos', label: 'کارها', icon: '✅', iconComp: CheckSquare },
  { id: 'notes', label: 'یادداشت', icon: '📝', iconComp: FileText },
  { id: 'goals', label: 'اهداف', icon: '🎯', iconComp: Target },
  { id: 'dates', label: 'تاریخ‌ها', icon: '📅', iconComp: CalendarDays },
];

export const CoupleHub: React.FC<CoupleHubProps> = ({ settings, currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('grocery');

  return (
    <div className="space-y-6">
      {/* Sub-navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar shadow-md">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 min-w-[72px] sm:min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* View Container with AnimatePresence */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'grocery' && (
          <motion.div
            key="grocery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GroceryList settings={settings} currentUser={currentUser} />
          </motion.div>
        )}

        {activeSubTab === 'todos' && (
          <motion.div
            key="todos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TodoList settings={settings} currentUser={currentUser} />
          </motion.div>
        )}

        {activeSubTab === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CoupleNotes settings={settings} currentUser={currentUser} />
          </motion.div>
        )}

        {activeSubTab === 'goals' && (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <WishGoals settings={settings} currentUser={currentUser} />
          </motion.div>
        )}

        {activeSubTab === 'dates' && (
          <motion.div
            key="dates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ImportantDates settings={settings} currentUser={currentUser} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
