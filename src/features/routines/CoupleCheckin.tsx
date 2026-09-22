import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, Send, Smile } from 'lucide-react';
import type { AppSettings, AuthUser, CoupleCheckin as CoupleCheckinType } from '../../types';

interface CoupleCheckinProps {
  checkins: CoupleCheckinType[];
  settings: AppSettings;
  currentUser: AuthUser | null;
  onSaveCheckin: (checkin: { date: string; mood: string; appreciationNote?: string }) => Promise<void>;
}

const MOODS = [
  { emoji: '🥰', label: 'In Love', labelFa: 'عاشقانه' },
  { emoji: '😊', label: 'Happy', labelFa: 'خوشحال' },
  { emoji: '😌', label: 'Calm', labelFa: 'آرام' },
  { emoji: '😴', label: 'Tired', labelFa: 'خسته' },
  { emoji: '💪', label: 'Energetic', labelFa: 'پرانرژی' },
  { emoji: '🥺', label: 'Need Hug', labelFa: 'نیازمند آغوش' },
];

export const CoupleCheckinView: React.FC<CoupleCheckinProps> = ({
  checkins,
  settings,
  currentUser,
  onSaveCheckin,
}) => {
  const isFa = settings.isRtl;
  const todayStr = new Date().toISOString().split('T')[0];

  const currentPartnerId = currentUser?.partnerId || 'partner_a';
  const otherPartnerId = currentPartnerId === 'partner_a' ? 'partner_b' : 'partner_a';
  const otherPartnerName = otherPartnerId === 'partner_a' ? settings.partnerA.name : settings.partnerB.name;
  const otherPartnerAvatar = otherPartnerId === 'partner_a' ? settings.partnerA.avatar : settings.partnerB.avatar;

  const myCheckinToday = checkins.find((c) => c.date === todayStr && c.partnerId === currentPartnerId);
  const partnerCheckinToday = checkins.find((c) => c.date === todayStr && c.partnerId === otherPartnerId);

  const [selectedMood, setSelectedMood] = useState<string>(myCheckinToday?.mood || '🥰');
  const [note, setNote] = useState<string>(myCheckinToday?.appreciationNote || '');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setSavedSuccess(false);
    try {
      await onSaveCheckin({
        date: todayStr,
        mood: selectedMood,
        appreciationNote: note.trim() || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400 fill-rose-400/30 animate-bounce" />
          <h3 className="text-sm font-bold text-white">
            {isFa ? 'قدردانی و حالت روحی امروز' : 'Daily Couple Mood & Appreciation'}
          </h3>
        </div>
        <p className="mt-1 text-xs text-rose-200/80">
          {isFa ? 'حس و حال امروزت رو با همسرت به اشتراک بزار و یک پیام محبت‌آمیز بفرست!' : 'Share your daily mood and leave a loving gratitude note for your partner!'}
        </p>
      </div>

      {/* Partner's Checkin Card */}
      <div className="rounded-2xl border border-white/10 bg-[#151d1a] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400">
            {isFa ? `حس امروز ${otherPartnerName}` : `${otherPartnerName}'s Mood Today`}
          </span>
          <span className="text-lg">{otherPartnerAvatar}</span>
        </div>

        {partnerCheckinToday ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{partnerCheckinToday.mood}</span>
              <span className="text-xs font-semibold text-rose-200">
                {MOODS.find((m) => m.emoji === partnerCheckinToday.mood)?.[isFa ? 'labelFa' : 'label']}
              </span>
            </div>
            {partnerCheckinToday.appreciationNote && (
              <p className="mt-2 text-xs italic text-zinc-200 bg-white/5 p-2 rounded-lg">
                "{partnerCheckinToday.appreciationNote}"
              </p>
            )}
          </motion.div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
            {isFa ? `${otherPartnerName} هنوز حس و حال امروز خود را ثبت نکرده است.` : `${otherPartnerName} has not checked in yet today.`}
          </div>
        )}
      </div>

      {/* My Checkin Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#151d1a] p-4 space-y-3">
        <h4 className="text-xs font-bold text-teal-300">
          {isFa ? 'حالت روحی شما امروز چطوره؟' : 'How are you feeling today?'}
        </h4>

        <div className="grid grid-cols-6 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              type="button"
              onClick={() => setSelectedMood(m.emoji)}
              className={`flex flex-col items-center justify-center rounded-xl border p-2 transition ${
                selectedMood === m.emoji
                  ? 'border-rose-400 bg-rose-500/20 scale-105 shadow-md'
                  : 'border-white/5 bg-white/5 opacity-60 hover:opacity-100'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-zinc-300 mt-1">{isFa ? m.labelFa : m.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            {isFa ? 'یک پیام تشکر یا جمله محبت‌آمیز روزانه:' : 'Daily Appreciation / Loving Note:'}
          </label>
          <textarea
            rows={2}
            placeholder={isFa ? 'ممنون که امروز کنارم بودی... ❤️' : 'Thank you for being there for me today... ❤️'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          {savedSuccess ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
              <Sparkles className="h-4 w-4" />
              {isFa ? 'با موفقیت ثبت شد!' : 'Check-in saved!'}
            </span>
          ) : <span />}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{loading ? '...' : (isFa ? 'ثبت چک-این' : 'Save Check-in')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
