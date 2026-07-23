import React, { useState } from 'react';
import { X, Mic, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Languages, Target, Repeat, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { AIParsedVoice, AppSettings, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onRefreshData?: () => void;
  settings: AppSettings;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  onRefreshData,
  settings,
}) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'fa-IR' | 'en-US'>('fa-IR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<AIParsedVoice | null>(null);
  const [editableAmount, setEditableAmount] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Web Speech API Microphone recorder handler
  const handleToggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported by this browser. You can type your voice memo directly!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleParseTranscript = async (textToParse?: string) => {
    const input = textToParse || transcript;
    if (!input.trim()) return;

    setIsProcessing(true);
    setError(null);
    setParsedResult(null);

    try {
      const result = await api.parseVoice(input.trim());
      setParsedResult(result);
      setEditableAmount(result.amount || result.monthlyLimit || 0);
    } catch (err: any) {
      console.error('Error parsing voice transcript:', err);
      setError(err.message || 'Gemini failed to parse voice transcript. Check your API key in Settings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!parsedResult) return;

    try {
      const amount = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
      const action = parsedResult.actionType || 'LOG_EXPENSE';

      if (action === 'SET_BUDGET') {
        const currentBudgets = await api.getBudgets();
        const updatedBudgets = currentBudgets.map((b) =>
          b.category === parsedResult.category ? { ...b, monthlyLimit: amount || parsedResult.monthlyLimit || 0 } : b
        );
        if (!currentBudgets.some((b) => b.category === parsedResult.category)) {
          updatedBudgets.push({ category: parsedResult.category, monthlyLimit: amount || parsedResult.monthlyLimit || 0 });
        }
        await api.updateBudgets(updatedBudgets);
      } else if (action === 'ADD_RECURRING') {
        await api.addRecurringExpense({
          title: parsedResult.title || 'Recurring Expense',
          amount,
          category: parsedResult.category || 'Other',
          paidBy: parsedResult.paidBy || settings.partnerA.id,
          startDate: parsedResult.date || new Date().toISOString().split('T')[0],
          interval: parsedResult.interval || 'MONTHLY',
          isActive: true,
          notes: `AI Voice Rule: "${transcript}"`,
        });
      } else if (action === 'ADD_BILL') {
        await api.addBill({
          title: parsedResult.title || 'Household Bill',
          amount,
          category: parsedResult.category || 'Utilities & Internet',
          paidBy: parsedResult.paidBy || settings.partnerA.id,
          dueDateDay: parsedResult.dueDateDay || 15,
          isPaidThisMonth: false,
          autopay: Boolean(parsedResult.autopay),
        });
      } else {
        // Standard expense
        await onSaveTransaction({
          title: parsedResult.title || 'Voice Expense',
          amount,
          type: 'EXPENSE',
          category: (parsedResult.category as any) || 'Groceries',
          paidBy: parsedResult.paidBy || settings.partnerA.id,
          date: parsedResult.date || new Date().toISOString().split('T')[0],
          vendor: parsedResult.vendor || undefined,
          notes: `AI Voice Entry: "${transcript}"`,
        });
      }

      if (onRefreshData) onRefreshData();
      onClose();
      setTranscript('');
      setParsedResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to execute action');
    }
  };

  const samplePrompts = [
    `حمید ۳۵۰ هزار تومان خرید هایپراستار کرد`,
    `سقف بودجه سوپرمارکت رو کن ۱۰ میلیون تومان`,
    `هر ماه ۱۵ میلیون بابت اجاره خانه سهم حمید اضافه کن`,
    `قبض اینترنت ماهانه پانزدهم ۲۰۰ هزار تومان اضافه کن`,
    `فاطمه ۶۵۰ هزار تومان شام در کافه طهرون داد`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-vazirmatn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">دستیار صوتی و متنی هوشمند Gemini</h2>
              <p className="text-xs text-slate-500">ثبت خرج، تغییر بودجه ماهانه، تعریف هزینه دوره‌ای و قبض</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Language Selector Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-600 font-semibold">
              <Languages className="w-4 h-4 text-indigo-600" />
              <span>زبان گفتار (Voice Language):</span>
            </div>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setSpeechLang('fa-IR')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  speechLang === 'fa-IR'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                🇮🇷 فارسی
              </button>
              <button
                type="button"
                onClick={() => setSpeechLang('en-US')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  speechLang === 'en-US'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Audio Record & Input Area */}
          <div className="relative">
            <textarea
              rows={3}
              placeholder='مثلاً: "حمید ۲۵۰ هزار تومان خرید هایپراستار کرد" یا "بودجه سوپرمارکت رو کن ۸ میلیون"'
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 pr-12 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-600 shadow-2xs font-medium"
            />
            <button
              onClick={handleToggleListening}
              className={`absolute left-3 bottom-3 p-2.5 rounded-xl transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-bounce shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200'
              }`}
              title={`ضبط صدا (${speechLang === 'fa-IR' ? 'فارسی' : 'English'})`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Example Prompts */}
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1.5">
              نمونه عبارت‌های هوشمند برای تست (Try AI Prompt):
            </span>
            <div className="space-y-1.5">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTranscript(p);
                    handleParseTranscript(p);
                  }}
                  className="w-full text-right text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 text-slate-700 font-medium px-3 py-2 rounded-xl border border-slate-200 transition truncate cursor-pointer"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={() => handleParseTranscript()}
            disabled={isProcessing || !transcript.trim()}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs transition shadow-md shadow-indigo-100 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini در حال تحلیل هوشمند و تشخیص قصد کاربر...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>تحلیل هوشمند با جمینای (Gemini AI Execute)</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview Card */}
          {parsedResult && (
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-1" />
                  <span>
                    {parsedResult.actionType === 'SET_BUDGET'
                      ? 'تغییر بودجه ماهانه (Budget Update)'
                      : parsedResult.actionType === 'ADD_RECURRING'
                      ? 'تعریف هزینه دوره‌ای (Recurring Rule)'
                      : parsedResult.actionType === 'ADD_BILL'
                      ? 'تعریف قبض ماهانه (Bill Reminder)'
                      : 'تراکنش جدید (New Expense)'}
                  </span>
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-bold">
                  آماده اجرا
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">عنوان (Title):</span>
                  <span className="font-semibold text-slate-900">{parsedResult.title || parsedResult.category}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-500 block">مبلغ:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
                        if (cur > 0) {
                          setEditableAmount(Math.round(cur / 10));
                        }
                      }}
                      title="تبدیل ریال به تومان (قسمت بر ۱۰)"
                      className="text-[9px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer"
                    >
                      <span>ریال ➔ تومان (÷۱۰)</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    value={editableAmount}
                    onChange={(e) => setEditableAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs font-extrabold text-indigo-700 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    {formatMoney(typeof editableAmount === 'number' ? editableAmount : 0, settings.currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">دسته‌بندی (Category):</span>
                  <span className="font-semibold text-slate-800">{parsedResult.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">پرداخت‌کننده / فرد:</span>
                  <span className="font-semibold text-slate-800">
                    {parsedResult.paidBy === settings.partnerA.id
                      ? `${settings.partnerA.avatar} ${settings.partnerA.name}`
                      : `${settings.partnerB.avatar} ${settings.partnerB.name}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">تاریخ / زمان:</span>
                  <span className="font-mono text-slate-700">{parsedResult.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">نوع اقدام AI:</span>
                  <span className="font-bold text-indigo-700">{parsedResult.actionType || 'LOG_EXPENSE'}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmAndSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-100 cursor-pointer"
              >
                تایید و اعمال تغییرات در DuoSpend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
