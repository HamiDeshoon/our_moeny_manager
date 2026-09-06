import React, { useEffect, useState } from 'react';
import { Droplets, HeartPulse, Pill, X } from 'lucide-react';
import type { CycleLog, FlowIntensity, Medication } from '../../types';

interface CycleLogSheetProps {
  date: string | null;
  existing?: CycleLog;
  onClose: () => void;
  onSave: (log: CycleLog) => Promise<void>;
}

const flowOptions: Array<{ id: FlowIntensity; label: string }> = [
  { id: 'spotting', label: 'لکه‌بینی' }, { id: 'light', label: 'کم' }, { id: 'medium', label: 'متوسط' }, { id: 'heavy', label: 'زیاد' },
];
const symptoms = [['cramps', 'گرفتگی'], ['headache', 'سردرد'], ['bloating', 'نفخ'], ['fatigue', 'خستگی']] as const;
const moods = [['happy', 'شاد'], ['anxious', 'مضطرب'], ['sad', 'غمگین'], ['energetic', 'پرانرژی']] as const;
const medications: Array<[Medication, string]> = [['painkillers', 'مسکن'], ['birth-control', 'کنترل بارداری']];

export function CycleLogSheet({ date, existing, onClose, onSave }: CycleLogSheetProps) {
  const [flow, setFlow] = useState<FlowIntensity>('none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<string[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<Medication[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFlow(existing?.flow || 'none');
    setSelectedSymptoms(existing?.symptoms || []);
    setMood(existing?.mood || []);
    setSelectedMedications(existing?.medications || []);
    setError(null);
  }, [date, existing]);

  if (!date) return null;
  const toggle = <T extends string>(value: T, setValue: React.Dispatch<React.SetStateAction<T[]>>) => setValue((current) => current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await onSave({ date, flow, symptoms: selectedSymptoms, mood, medications: selectedMedications, isPeriodStart: flow !== 'none' && existing?.isPeriodStart });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ذخیره‌سازی ناموفق بود؛ دوباره تلاش کنید.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/65 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={`ثبت وضعیت ${date}`} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-white/15 bg-[#102019] px-5 pb-[calc(1.25rem+var(--safe-bottom))] pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
        <div className="flex items-center justify-between"><div><p className="text-xs text-zinc-400">ثبت روزانه</p><h2 className="text-lg font-bold text-white">{date}</h2></div><button onClick={onClose} aria-label="بستن" className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-zinc-300"><X className="h-5 w-5" /></button></div>
        <div className="mt-6 space-y-5">
          <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-200"><Droplets className="h-4 w-4 text-rose-300" /> شدت جریان</legend><div className="grid grid-cols-4 gap-2">{flowOptions.map((option) => <button key={option.id} type="button" aria-pressed={flow === option.id} onClick={() => setFlow(option.id)} className={`min-h-11 rounded-xl border px-2 text-xs font-bold ${flow === option.id ? 'border-rose-300 bg-rose-400/20 text-rose-100' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{option.label}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-bold text-zinc-200">علائم</legend><div className="flex flex-wrap gap-2">{symptoms.map(([id, label]) => <button key={id} type="button" aria-pressed={selectedSymptoms.includes(id)} onClick={() => toggle(id, setSelectedSymptoms)} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${selectedSymptoms.includes(id) ? 'border-teal-300 bg-teal-300/15 text-teal-100' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{label}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-200"><HeartPulse className="h-4 w-4 text-violet-300" /> حال‌و‌هوا</legend><div className="grid grid-cols-2 gap-2">{moods.map(([id, label]) => <button key={id} type="button" aria-pressed={mood.includes(id)} onClick={() => toggle(id, setMood)} className={`min-h-11 rounded-xl border text-xs font-bold ${mood.includes(id) ? 'border-violet-300 bg-violet-300/15 text-violet-100' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{label}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-200"><Pill className="h-4 w-4 text-amber-300" /> داروها</legend><div className="flex flex-wrap gap-2">{medications.map(([id, label]) => <button key={id} type="button" aria-pressed={selectedMedications.includes(id)} onClick={() => toggle(id, setSelectedMedications)} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${selectedMedications.includes(id) ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{label}</button>)}</div></fieldset>
          {error ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null}
          <button type="button" onClick={save} disabled={saving} className="tap-scale min-h-12 w-full rounded-xl bg-rose-400 px-4 py-3 text-sm font-extrabold text-[#310913] disabled:opacity-50">{saving ? 'در حال ذخیره…' : 'ذخیره وضعیت روز'}</button>
        </div>
      </section>
    </div>
  );
}
