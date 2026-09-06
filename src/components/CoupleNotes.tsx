import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pin, Trash2, Edit3, Heart, Tag, BookOpen, Clock } from 'lucide-react';
import { AppSettings, AuthUser, CoupleNote, NoteCategory, NoteColor } from '../types';
import { api } from '../services/api';
import { haptic } from '../utils/haptics';
import { formatJalaliDate } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface CoupleNotesProps {
  settings: AppSettings;
  currentUser: AuthUser | null;
}

const CATEGORIES: NoteCategory[] = [
  'General',
  'Memories',
  'Plans',
  'Reminders',
  'Shopping List',
  'Ideas',
];

const CATEGORY_LABELS: Record<NoteCategory, { label: string; icon: string }> = {
  General: { label: 'عمومی', icon: '📝' },
  Memories: { label: 'خاطرات دونفره', icon: '💖' },
  Plans: { label: 'برنامه‌ها و سفر', icon: '✈️' },
  Reminders: { label: 'یادآوری‌های مهم', icon: '🔔' },
  'Shopping List': { label: 'ایده‌های خرید', icon: '🎁' },
  Ideas: { label: 'ایده‌ها و اهداف', icon: '💡' },
};

const NOTE_COLORS: { id: NoteColor; label: string; border: string; bg: string; dot: string }[] = [
  { id: 'zinc', label: 'طوسی', border: 'border-zinc-700', bg: 'bg-zinc-900', dot: 'bg-zinc-500' },
  { id: 'indigo', label: 'نیلی', border: 'border-indigo-500/50', bg: 'bg-indigo-950/20', dot: 'bg-indigo-500' },
  { id: 'emerald', label: 'زمردی', border: 'border-emerald-500/50', bg: 'bg-emerald-950/20', dot: 'bg-emerald-500' },
  { id: 'amber', label: 'کهربایی', border: 'border-amber-500/50', bg: 'bg-amber-950/20', dot: 'bg-amber-500' },
  { id: 'rose', label: 'رز', border: 'border-rose-500/50', bg: 'bg-rose-950/20', dot: 'bg-rose-500' },
  { id: 'violet', label: 'بنفش', border: 'border-violet-500/50', bg: 'bg-violet-950/20', dot: 'bg-violet-500' },
];

export const CoupleNotes: React.FC<CoupleNotesProps> = ({ settings, currentUser }) => {
  const [notes, setNotes] = useState<CoupleNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CoupleNote | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('General');
  const [color, setColor] = useState<NoteColor>('zinc');

  const partnerAName = settings.partnerA?.name || 'حامد';
  const partnerBName = settings.partnerB?.name || 'فاطی';
  const currentAuthor = currentUser?.partnerId || 'partner_a';

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getCoupleNotes();
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const openNewNote = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setColor('zinc');
    setIsEditOpen(true);
  };

  const openEditNote = (note: CoupleNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setColor(note.color);
    setIsEditOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    haptic('medium');
    try {
      if (editingNote) {
        const updated = await api.updateCoupleNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          category,
          color,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? updated : n)));
      } else {
        const newNote = await api.addCoupleNote({
          title: title.trim(),
          content: content.trim(),
          category,
          color,
          author: currentAuthor,
        });
        setNotes((prev) => [newNote, ...prev]);
      }
      setIsEditOpen(false);
      haptic('success');
    } catch (err) {
      console.error('Failed to save note', err);
    }
  };

  const handleTogglePin = async (note: CoupleNote, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    const newPinned = !note.isPinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isPinned: newPinned } : n))
    );
    try {
      await api.toggleNotePin(note.id, newPinned);
    } catch (err) {
      console.error('Failed to toggle pin', err);
      loadNotes();
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('warning');
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.deleteCoupleNote(id);
    } catch (err) {
      console.error('Failed to delete note', err);
      loadNotes();
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  const filteredUnpinned = selectedCategory === 'ALL'
    ? unpinnedNotes
    : unpinnedNotes.filter((n) => n.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 border border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <h2 className="text-xl font-black tracking-tight text-white">یادداشت‌ها و خاطرات مشترک</h2>
            </div>
            <p className="text-xs text-zinc-400">
              فضایی خصوصی برای ثبت یادداشت‌ها، خاطرات زیبا، برنامه‌های آینده و ایده‌ها
            </p>
          </div>

          <Button
            onClick={openNewNote}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0"
          >
            یادداشت جدید
          </Button>
        </div>
      </div>

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 px-1">
            <Pin className="w-3.5 h-3.5 fill-amber-400" />
            <span>سنجاق شده‌ها ({pinnedNotes.length})</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {pinnedNotes.map((note) => {
              const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
              const authorName = note.author === 'partner_a' ? partnerAName : partnerBName;

              return (
                <div
                  key={note.id}
                  onClick={() => openEditNote(note)}
                  className={`w-64 shrink-0 rounded-2xl border ${colorObj.border} ${colorObj.bg} p-4 shadow-md cursor-pointer hover:border-white/30 transition-all flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium inline-flex items-center gap-1">
                        <span>{CATEGORY_LABELS[note.category]?.icon}</span>
                        <span>{CATEGORY_LABELS[note.category]?.label}</span>
                      </span>
                      <button
                        onClick={(e) => handleTogglePin(note, e)}
                        className="text-amber-400 hover:text-zinc-400 p-1 rounded-md transition"
                        title="برداشتن سنجاق"
                      >
                        <Pin className="w-3.5 h-3.5 fill-amber-400" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1 truncate">{note.title}</h4>
                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{authorName}</span>
                    <span>{formatJalaliDate(note.updatedAt.split('T')[0])}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
          }`}
        >
          همه یادداشت‌ها ({notes.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = notes.filter((n) => n.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              <span>{CATEGORY_LABELS[cat]?.icon}</span>
              <span>{CATEGORY_LABELS[cat]?.label}</span>
              {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-40 rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : filteredUnpinned.length === 0 && pinnedNotes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            💌
          </div>
          <h3 className="text-sm font-bold text-zinc-300">هنوز یادداشتی نوشته نشده است!</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            اولین یادداشت یا خاطره مشترک خود را ثبت کنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredUnpinned.map((note) => {
              const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
              const authorName = note.author === 'partner_a' ? partnerAName : partnerBName;
              const authorColor = note.author === 'partner_a' ? 'border-t-indigo-500' : 'border-t-emerald-500';

              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => openEditNote(note)}
                  className={`rounded-2xl border border-white/10 ${colorObj.bg} border-t-4 ${authorColor} p-4 shadow-sm cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium inline-flex items-center gap-1">
                        <span>{CATEGORY_LABELS[note.category]?.icon}</span>
                        <span>{CATEGORY_LABELS[note.category]?.label}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleTogglePin(note, e)}
                          className="text-zinc-500 hover:text-amber-400 p-1 rounded-md transition"
                          title="سنجاق کردن"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded-md transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1">{note.title}</h4>
                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="text-zinc-400 font-medium">نویسنده: {authorName}</span>
                    <span>{formatJalaliDate(note.updatedAt.split('T')[0])}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit / Add Note BottomSheet */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={editingNote ? 'ویرایش یادداشت' : 'یادداشت جدید'}
        fullHeight
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <Input
            label="عنوان یادداشت"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: برنامه سفر آخر هفته، چک‌لیست مهمانی..."
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              متن یادداشت
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="یادداشت، احساسات، برنامه‌ها و ایده‌ها را اینجا بنویسید..."
              required
              className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                دسته‌بندی
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]?.icon} {CATEGORY_LABELS[c]?.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                رنگ کارت
              </label>
              <div className="flex items-center gap-2 pt-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-6 h-6 rounded-full ${c.dot} transition ${
                      color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            {editingNote ? 'ذخیره تغییرات' : 'ثبت یادداشت'}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
};
