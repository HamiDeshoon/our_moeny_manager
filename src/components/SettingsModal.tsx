import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Save, RefreshCw, CheckCircle2, AlertCircle, Users, Github, Database } from 'lucide-react';
import { api, getSavedCustomApiKey, saveCustomApiKey } from '../services/api';
import { AppSettings } from '../types';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [partnerAName, setPartnerAName] = useState('');
  const [partnerAAvatar, setPartnerAAvatar] = useState('');
  const [partnerBName, setPartnerBName] = useState('');
  const [partnerBAvatar, setPartnerBAvatar] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('تومان');
  const [useJalaliDate, setUseJalaliDate] = useState(true);
  const [noSettlementsMode, setNoSettlementsMode] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setGeminiApiKey(getSavedCustomApiKey() || settings.geminiApiKey || '');
      setPartnerAName(settings.partnerA?.name || 'کاربر اول');
      setPartnerAAvatar(settings.partnerA?.avatar || '👨‍💼');
      setPartnerBName(settings.partnerB?.name || 'کاربر دوم');
      setPartnerBAvatar(settings.partnerB?.avatar || '👩‍⚕️');
      setCurrencySymbol(settings.currencySymbol || 'تومان');
      setUseJalaliDate(settings.useJalaliDate ?? true);
      setNoSettlementsMode(settings.noSettlementsMode ?? false);
    }
  }, [settings, isOpen]);

  const handleTestKey = async () => {
    setIsVerifyingKey(true);
    setTestResult(null);
    try {
      const res = await api.testApiKey(geminiApiKey);
      setTestResult({ success: true, message: 'ارتباط با API جمینای تایید شد!' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'خطا در تایید کلید' });
    } finally {
      setIsVerifyingKey(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveCustomApiKey(geminiApiKey.trim());
      await onUpdateSettings({
        geminiApiKey: geminiApiKey.trim(),
        currencySymbol,
        useJalaliDate,
        noSettlementsMode,
        partnerA: { ...settings.partnerA, name: partnerAName, avatar: partnerAAvatar },
        partnerB: { ...settings.partnerB, name: partnerBName, avatar: partnerBAvatar },
      });
      onClose();
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="تنظیمات سیستم" fullHeight>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center space-x-3 text-zinc-400 text-sm">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p>مدیریت کلید API، پروفایل اعضا و ترجیحات نمایشی.</p>
        </div>

        {/* Storage Status */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              وضعیت دیتابیس و همگام‌سازی
            </h3>
            {settings?.storageMode === 'postgresql' ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                PostgreSQL Cloud
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                ذخیره محلی (data/store.json)
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {settings?.storageMode === 'postgresql'
              ? 'برنامه به دیتابیس ابری متصل است و اطلاعات بین تمام دستگاه‌ها همگام‌سازی می‌شود.'
              : 'داده‌ها در فایل محلی روی این سرور ذخیره می‌شوند. برای همگام‌سازی ابری بین چند گوشی، متغیر DATABASE_URL را در .env قرار دهید.'}
          </p>
        </div>

        {/* Gemini API Key */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
              <Key className="w-4 h-4" />
              کلید دسترسی Gemini API
            </h3>
          </div>
          
          <Input
            type="password"
            placeholder="AIzaSy..."
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestKey}
              isLoading={isVerifyingKey}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isVerifyingKey ? 'animate-spin' : ''}`} />}
            >
              تست اتصال
            </Button>

            {geminiApiKey && (
              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey('');
                  saveCustomApiKey('');
                }}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
              >
                پاک کردن کلید
              </button>
            )}
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Partner Profiles Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            پروفایل اعضای خانواده
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
              <span className="text-xs font-medium text-indigo-400">عضو اول (Partner 1)</span>
              <div className="flex gap-2">
                <Input
                  value={partnerAAvatar}
                  onChange={(e) => setPartnerAAvatar(e.target.value)}
                  className="!w-14 text-center text-lg !px-1"
                />
                <Input
                  value={partnerAName}
                  onChange={(e) => setPartnerAName(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
              <span className="text-xs font-medium text-emerald-400">عضو دوم (Partner 2)</span>
              <div className="flex gap-2">
                <Input
                  value={partnerBAvatar}
                  onChange={(e) => setPartnerBAvatar(e.target.value)}
                  className="!w-14 text-center text-lg !px-1"
                />
                <Input
                  value={partnerBName}
                  onChange={(e) => setPartnerBName(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1 ml-1">واحد پول (Currency)</label>
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option className="bg-zinc-900" value="تومان">تومان (Iranian Toman)</option>
              <option className="bg-zinc-900" value="Toman">Toman (تومان)</option>
              <option className="bg-zinc-900" value="IRT">IRT (Iranian Toman Code)</option>
              <option className="bg-zinc-900" value="$">$ (USD / CAD)</option>
              <option className="bg-zinc-900" value="€">€ (EUR)</option>
              <option className="bg-zinc-900" value="£">£ (GBP)</option>
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={noSettlementsMode}
                onChange={(e) => setNoSettlementsMode(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-200 block">حالت بودجه مشترک (بدون تسویه حساب)</span>
              <span className="text-xs text-zinc-400">محاسبات «چه کسی به چه کسی بدهکار است» را غیرفعال می‌کند.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={useJalaliDate}
                onChange={(e) => setUseJalaliDate(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-200 block">تقویم جلالی (هجری شمسی)</span>
              <span className="text-xs text-zinc-400">نمایش تاریخ‌ها به صورت شمسی (مثلا ۱۴۰۵/۰۵/۰۱).</span>
            </div>
          </label>
        </div>

        <div className="pt-4 flex gap-3 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            انصراف
          </Button>
          <Button 
            type="submit"
            isLoading={isSaving}
            className="flex-[2] bg-indigo-600"
            leftIcon={<Save className="w-4 h-4" />}
          >
            ذخیره تنظیمات
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
