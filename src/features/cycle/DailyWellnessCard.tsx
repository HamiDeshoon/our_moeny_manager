import React, { useState, useMemo } from 'react';
import { Sparkles, Heart, Coffee, Moon, Sun, Shuffle, Smile, BatteryCharging, Check } from 'lucide-react';
import type { AuthUser, CycleLog, CycleSettings } from '../../types';
import { getLastPeriodStart } from './cycleMath';
import { gregorianToJalali } from '../../utils/formatters';

interface DailyWellnessCardProps {
  currentUser: AuthUser | null;
  cycleSettings: CycleSettings;
  logs: CycleLog[];
  onOpenLog?: (date: string) => void;
}

interface CareTip {
  id: string;
  category: 'nutrition' | 'mood' | 'couple' | 'rest';
  title: string;
  text: string;
  partnerAction?: string;
  tag: string;
}

const CARE_TIPS: CareTip[] = [
  {
    id: '1',
    category: 'nutrition',
    tag: 'نوشیدنی آرامش‌بخش',
    title: 'دمنوش بابونه یا زنجبیل گرم',
    text: 'یک فنجان دمنوش گرم همراه با نبات یا عسل به شل شدن عضلات، رفع نفخ و ایجاد آرامش عمیق بدن کمک می‌کنه.',
    partnerAction: 'حمید جان، یک فنجان دمنوش گرم تازه برای فاطی درست کن! ☕',
  },
  {
    id: '2',
    category: 'rest',
    tag: 'هیدراتاسیون و انرژی',
    title: 'آب کافی، اکسیر نشاط',
    text: 'نوشیدن حداقل ۸ لیوان آب در طول روز، سردردهای خفیف ناشی از تغییرات هورمونی رو رفع و شادابی پوست رو حفظ می‌کنه.',
    partnerAction: 'یک بطری آب خنک یا آبمیوه طبیعی در دسترسش بگذار. 💧',
  },
  {
    id: '3',
    category: 'nutrition',
    tag: 'تغذیه نشاط‌آور',
    title: 'شکلات تلخ و منیزیم',
    text: 'شکلات تلخ بالای ۷۰٪ سرشار از منیزیم و آنتی‌اکسیدانه که به ترشح اندورفین و کاهش گرفتگی عضلانی کمک می‌کنه.',
    partnerAction: 'یک تکه شکلات تلخ خوشمزه با یک پیام عاشقانه هدیه بده! 🍫',
  },
  {
    id: '4',
    category: 'couple',
    tag: 'همراهی عاشقانه',
    title: 'آرامش شانه و ۵ دقیقه ماساژ',
    text: 'ماساژ ملایم گردن و کتف حتی به مدت ۳ الی ۵ دقیقه، تنش‌های عصبی یک روز پرمشغله رو از بین می‌بره.',
    partnerAction: 'بدون اینکه درخواست کنه، با ماساژ ملایم شانه‌ها خستگی رو ازش دور کن. 💆‍♂️',
  },
  {
    id: '5',
    category: 'rest',
    tag: 'خواب باکیفیت',
    title: 'خواب عمیق و تنظیم نور اتاق',
    text: 'خاموش کردن نورهای آبی گوشی نیم ساعت قبل از خواب، سطح ملاتونین طبیعی بدن رو افزایش میده.',
    partnerAction: 'محیط اتاق رو خلوت، تاریک و با دمای دلپذیر آماده کن. 🌙',
  },
  {
    id: '6',
    category: 'mood',
    tag: 'ورزش و نشاط',
    title: 'پیاده‌روی سبک عصرگاهی',
    text: '۱۵ دقیقه قدم زدن آرام در هوای آزاد، گردش خون رو روان و هورمون‌های ضدافسردگی و نشاط رو فعال می‌کنه.',
    partnerAction: 'یک پیاده‌روی کوتاه و بدون عجله دونفره ترتیب بده. 👟',
  },
  {
    id: '7',
    category: 'couple',
    tag: 'گوش شنوا',
    title: 'شنیدن بدون قضاوت یا راه‌حل',
    text: 'گاهی تنها چیزی که لازم داریم، یک آغوش امن و شنیدن احساسات روزمره بدون تحلیل یا نصیحته.',
    partnerAction: 'فقط با لبخند و آغوش گوش بده و بگو همیشه کنارشی. ❤️',
  },
];

const QUICK_MOODS = [
  { emoji: '🌸', label: 'پرانرژی' },
  { emoji: '😌', label: 'آرام و خوب' },
  { emoji: '🥱', label: 'خسته' },
  { emoji: '🍫', label: 'هوس شیرینی' },
  { emoji: '🤕', label: 'گرفتگی دل' },
  { emoji: '💖', label: 'عاشقانه' },
];

export const DailyWellnessCard: React.FC<DailyWellnessCardProps> = ({
  currentUser: _currentUser,
  cycleSettings,
  logs,
  onOpenLog,
}) => {
  const [tipIndex, setTipIndex] = useState(() => {
    const day = new Date().getDate();
    return day % CARE_TIPS.length;
  });
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Cycle day and countdown calculation
  const cycleInfo = useMemo(() => {
    const lastStartStr = getLastPeriodStart(logs, cycleSettings);
    if (!lastStartStr) {
      return {
        cycleDay: null,
        daysToNext: null,
        phaseName: 'ثبت اولین دوره',
        phaseDesc: 'با انتخاب روز پریود در تقویم، وضعیت روزانه پیش‌بینی خواهد شد.',
      };
    }

    const lastStart = new Date(lastStartStr);
    const diffTime = now.getTime() - lastStart.getTime();
    const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
    const cycleLength = cycleSettings.cycleLength || 28;
    const periodLength = cycleSettings.periodLength || 5;

    const currentCycleDay = ((diffDays - 1) % cycleLength) + 1;
    const daysUntilNext = cycleLength - currentCycleDay;

    let phaseName = 'فاز فولیکولار';
    let phaseDesc = 'افزایش انرژی، زمان مناسب یادگیری و برنامه‌ریزی‌های جدید.';

    if (currentCycleDay <= periodLength) {
      phaseName = 'فاز قاعدگی (پریود)';
      phaseDesc = 'بدن نیاز به استراحت، غذای مقوی گرم و محبت بیشتر دارد.';
    } else if (currentCycleDay >= 12 && currentCycleDay <= 16) {
      phaseName = 'پنجره تخمک‌گذاری و باروری';
      phaseDesc = 'اوج شادابی، تعادل هورمونی و انرژی اجتماعی بالا.';
    } else if (currentCycleDay > 16) {
      phaseName = 'فاز لوتئال (آرامش و مراقبت)';
      phaseDesc = 'نیاز به خواب بیشتر، کاهش استرس و رژیم غذایی سرشار از منیزیم.';
    }

    return {
      cycleDay: currentCycleDay,
      daysToNext: daysUntilNext,
      phaseName,
      phaseDesc,
    };
  }, [logs, cycleSettings]);

  const activeTip = CARE_TIPS[tipIndex];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % CARE_TIPS.length);
  };

  const handleQuickMoodClick = (moodLabel: string) => {
    setSelectedMood(moodLabel);
    if (onOpenLog) {
      onOpenLog(todayStr);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Cycle Status / Countdown Banner */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-teal-400/20 bg-gradient-to-br from-[#132822] to-[#0c1a16] p-5 shadow-xl shadow-black/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-teal-300">
            <Heart className="h-5 w-5 fill-rose-500/20 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
              تقویم سلامت و مراقبت مشترک
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-teal-300">
            {jd} / {jm} / {jy}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/25 p-3.5 border border-white/5">
            <p className="text-[11px] text-zinc-400">وضعیت امروز</p>
            <p className="mt-1 text-base font-extrabold text-white">
              {cycleInfo.cycleDay ? `روز ${cycleInfo.cycleDay} چرخه` : 'در انتظار ثبت'}
            </p>
            <span className="mt-1 inline-block text-[10px] font-semibold text-rose-300">
              {cycleInfo.phaseName}
            </span>
          </div>

          <div className="rounded-2xl bg-black/25 p-3.5 border border-white/5">
            <p className="text-[11px] text-zinc-400">چرخه بعدی</p>
            <p className="mt-1 text-base font-extrabold text-teal-300">
              {cycleInfo.daysToNext !== null ? `${cycleInfo.daysToNext} روز دیگر` : '—'}
            </p>
            <span className="mt-1 inline-block text-[10px] text-zinc-400">
              {cycleInfo.daysToNext !== null && cycleInfo.daysToNext <= 3
                ? 'آماده‌باش برای شروع'
                : 'روند منظم طبیعی'}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-300 bg-white/5 rounded-xl p-2.5 border border-white/5">
          {cycleInfo.phaseDesc}
        </p>
      </section>

      {/* 2. Daily Care & Wellness Tip Card */}
      <section className="rounded-[1.5rem] border border-amber-300/15 bg-gradient-to-br from-[#211a14] to-[#17120e] p-5 shadow-xl shadow-black/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">نکته و پیام روزانه مراقبت</h3>
          </div>
          <button
            type="button"
            onClick={handleNextTip}
            title="نکته بعدی"
            className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition-colors"
          >
            <Shuffle className="h-3 w-3" />
            <span>نکته دیگر</span>
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-black/20 p-4 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-200">{activeTip.title}</span>
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              {activeTip.tag}
            </span>
          </div>
          <p className="text-xs leading-6 text-zinc-300">{activeTip.text}</p>

          {activeTip.partnerAction && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 p-2.5 border border-rose-500/20 text-xs text-rose-200">
              <Heart className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="font-semibold">{activeTip.partnerAction}</span>
            </div>
          )}
        </div>

        {/* 3. Quick Mood & Symptom Logger */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-[11px] font-bold text-zinc-400 mb-2">
            احوال و انرژی امروزت چطوره؟ (ثبت سریع)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_MOODS.map((item) => {
              const isSelected = selectedMood === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickMoodClick(item.label)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-md'
                      : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
