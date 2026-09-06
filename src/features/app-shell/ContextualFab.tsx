import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Mic, PencilLine, Plus, X } from 'lucide-react';

interface ContextualFabProps {
  onManual: () => void;
  onReceipt: () => void;
  onVoice: () => void;
}

const actions = [
  { id: 'voice', label: 'یادداشت صوتی', icon: Mic },
  { id: 'receipt', label: 'اسکن فاکتور', icon: Camera },
  { id: 'manual', label: 'ثبت دستی', icon: PencilLine },
] as const;

export function ContextualFab({ onManual, onReceipt, onVoice }: ContextualFabProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const choose = (id: (typeof actions)[number]['id']) => {
    setExpanded(false);
    if (id === 'manual') onManual();
    if (id === 'receipt') onReceipt();
    if (id === 'voice') onVoice();
  };

  return (
    <div className="fixed bottom-[5.4rem] left-5 z-50 flex flex-col-reverse items-start gap-2" dir="rtl">
      <motion.button
        type="button"
        aria-label={expanded ? 'بستن منوی افزودن' : 'افزودن تراکنش'}
        aria-expanded={expanded}
        whileTap={{ scale: 0.94 }}
        onClick={() => setExpanded((value) => !value)}
        className="grid h-14 w-14 place-items-center rounded-full bg-teal-400 text-[#062018] shadow-xl shadow-teal-950/50"
      >
        {expanded ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
      </motion.button>
      <AnimatePresence>
        {expanded ? actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, y: 14, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.88 }}
              transition={{ delay: index * 0.04, type: 'spring', stiffness: 420, damping: 26 }}
              onClick={() => choose(action.id)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-[#1a2923] py-2 pl-3 pr-4 text-sm font-bold text-white shadow-lg"
            >
              <Icon aria-hidden="true" className="h-4 w-4 text-teal-300" />
              {action.label}
            </motion.button>
          );
        }) : null}
      </AnimatePresence>
    </div>
  );
}
