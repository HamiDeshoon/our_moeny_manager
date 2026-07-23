import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Save, RefreshCw, CheckCircle2, AlertCircle, Users, Github, Download, Upload } from 'lucide-react';
import { api, getSavedCustomApiKey, saveCustomApiKey } from '../services/api';
import { AppSettings } from '../types';

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
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [partnerAName, setPartnerAName] = useState('Alex');
  const [partnerAAvatar, setPartnerAAvatar] = useState('👩‍💻');
  const [partnerBName, setPartnerBName] = useState('Sam');
  const [partnerBAvatar, setPartnerBAvatar] = useState('👨‍🎨');
  const [isRtl, setIsRtl] = useState(true);
  const [noSettlementsMode, setNoSettlementsMode] = useState(false);
  const [useJalaliDate, setUseJalaliDate] = useState(true);

  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCurrencySymbol(settings.currencySymbol || '$');
      setPartnerAName(settings.partnerA?.name || 'Alex');
      setPartnerAAvatar(settings.partnerA?.avatar || '👩‍💻');
      setPartnerBName(settings.partnerB?.name || 'Sam');
      setPartnerBAvatar(settings.partnerB?.avatar || '👨‍🎨');
      setIsRtl(settings.isRtl !== undefined ? settings.isRtl : true);
      setNoSettlementsMode(Boolean(settings.noSettlementsMode));
      setUseJalaliDate(settings.useJalaliDate !== undefined ? settings.useJalaliDate : true);
      setGeminiApiKey(getSavedCustomApiKey() || settings.geminiApiKey || '');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setIsVerifyingKey(true);
    setTestResult(null);
    try {
      const res = await api.testApiKey(geminiApiKey);
      setTestResult({ success: true, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Key verification failed' });
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
        isRtl,
        noSettlementsMode,
        useJalaliDate,
        partnerA: {
          ...settings.partnerA,
          name: partnerAName.trim() || 'Alex',
          avatar: partnerAAvatar.trim() || '👩‍💻',
        },
        partnerB: {
          ...settings.partnerB,
          name: partnerBName.trim() || 'Sam',
          avatar: partnerBAvatar.trim() || '👨‍🎨',
        },
      });

      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">App Settings & Gemini Key Configuration</h2>
              <p className="text-xs text-slate-500">Manage API keys, partner profiles & currency preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Gemini API Key Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center space-x-1.5">
                <Key className="w-4 h-4" />
                <span>Gemini API Key</span>
              </label>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                Powers Voice & Vision OCR
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Enter your Google Gemini API key below. AI Studio injects `process.env.GEMINI_API_KEY` by default, or you can provide your own key here.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 shadow-2xs"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isVerifyingKey}
                  className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-slate-200 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingKey ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingKey ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>

                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiApiKey('');
                      saveCustomApiKey('');
                    }}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Clear Custom Key
                  </button>
                )}
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Partner Profiles Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Partner Profiles & Currency</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Partner A */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-indigo-700 block">Partner 1</span>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={partnerAAvatar}
                    onChange={(e) => setPartnerAAvatar(e.target.value)}
                    className="w-12 bg-white border border-slate-200 rounded-lg text-center text-lg focus:outline-none shadow-2xs"
                    title="Avatar Emoji"
                  />
                  <input
                    type="text"
                    value={partnerAName}
                    onChange={(e) => setPartnerAName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none shadow-2xs font-semibold"
                    placeholder="Name"
                  />
                </div>
              </div>

              {/* Partner B */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-semibold text-emerald-700 block">Partner 2</span>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={partnerBAvatar}
                    onChange={(e) => setPartnerBAvatar(e.target.value)}
                    className="w-12 bg-white border border-slate-200 rounded-lg text-center text-lg focus:outline-none shadow-2xs"
                    title="Avatar Emoji"
                  />
                  <input
                    type="text"
                    value={partnerBName}
                    onChange={(e) => setPartnerBName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none shadow-2xs font-semibold"
                    placeholder="Name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Currency Symbol</label>
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 shadow-2xs font-semibold"
              >
                <option value="تومان">تومان (Iranian Toman)</option>
                <option value="Toman">Toman (تومان)</option>
                <option value="IRT">IRT (Iranian Toman Code)</option>
                <option value="$">$ (USD / CAD / AUD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="₹">₹ (INR)</option>
                <option value="¥">¥ (JPY / CNY)</option>
              </select>
            </div>

            {/* Joint Household Mode (No Settlement / Debt tracking) Toggle */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-950 block">
                  Unified Married Household Mode (بودجه مشترک - بدون تسویه‌حساب بدهی)
                </span>
                <span className="text-[11px] text-purple-700 block">
                  Disables "who owes whom" calculations & debt settlements. Focuses purely on combined joint spending and overall household budget.
                </span>
              </div>
              <input
                type="checkbox"
                checked={noSettlementsMode}
                onChange={(e) => setNoSettlementsMode(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Shamsi Calendar Toggle */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  Shamsi Jalali Calendar (تقویم هجری شمسی)
                </span>
                <span className="text-[11px] text-amber-800 block">
                  Displays dates in Persian Shamsi Jalali format (e.g. ۱۴۰۵/۰۵/۰۱ - مرداد) across transactions and monthly reports
                </span>
              </div>
              <input
                type="checkbox"
                checked={useJalaliDate}
                onChange={(e) => setUseJalaliDate(e.target.checked)}
                className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {/* RTL Text Flow Toggle */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950 block">Right-to-Left (RTL) Layout (چیدمان راست‌چین)</span>
                <span className="text-[11px] text-emerald-700 block">Enables full RTL text flow and Persian/Farsi alignment across header, forms, and charts</span>
              </div>
              <input
                type="checkbox"
                checked={isRtl}
                onChange={(e) => setIsRtl(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* GitHub Structure Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <Github className="w-4 h-4 text-indigo-600" />
              <span>GitHub Deploy Structure</span>
            </div>
            <p className="text-[11px] text-slate-500">
              This full-stack application features a modular `/backend` (Express API + Gemini AI services) and `/src` (React Vite UI). All code and dependencies are ready to push to GitHub.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-indigo-100 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
