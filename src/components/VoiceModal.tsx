import React, { useState, useRef } from 'react';
import { Mic, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Languages } from 'lucide-react';
import { api } from '../services/api';
import { AIParsedVoice, AppSettings, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleToggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند. لطفا متن را تایپ کنید.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('در حال ضبط صدا... (برای پایان، دوباره روی میکروفون بزنید)');
      };

      recorder.onstop = () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          handleParseAudio(base64data, recorder.mimeType || 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      setError('دسترسی به میکروفون داده نشده یا خطایی رخ داد.');
      setIsListening(false);
    }
  };

  const handleParseAudio = async (base64data: string, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    setParsedResult(null);

    try {
      const result = await api.parseVoice({ audioBase64: base64data, mimeType });
      setParsedResult(result);
      setEditableAmount(result.amount || result.monthlyLimit || 0);
      setTranscript(`(صدا با موفقیت پردازش شد)`);
    } catch (err: any) {
      console.error('Error parsing audio voice:', err);
      setError(err.message || 'Gemini failed to parse voice audio. Check your API key in Settings.');
      setTranscript('');
    } finally {
      setIsProcessing(false);
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
    `۳۵۰ هزار تومان خرید هایپراستار کرد`,
    `سقف بودجه سوپرمارکت رو کن ۱۰ میلیون تومان`,
    `قبض اینترنت ماهانه پانزدهم ۲۰۰ هزار تومان اضافه کن`,
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="دستیار هوشمند جمینای">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-zinc-400 text-sm">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <p>ثبت خرج، بودجه و قبض با گفتار طبیعی.</p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 text-sm">
          <div className="flex items-center space-x-2 text-zinc-300">
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>زبان گفتار:</span>
          </div>
          <div className="flex space-x-2 bg-black/20 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSpeechLang('fa-IR')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                speechLang === 'fa-IR' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              فارسی
            </button>
            <button
              type="button"
              onClick={() => setSpeechLang('en-US')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                speechLang === 'en-US' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Audio Input Area */}
        <div className="relative">
          <textarea
            rows={3}
            placeholder='مثلاً: "۲۵۰ هزار تومان خرید هایپراستار کرد"'
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 pr-12 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
          />
          <button
            onClick={handleToggleListening}
            className={`absolute left-3 bottom-3 p-2 rounded-xl transition-all ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Example Prompts */}
        <div>
          <span className="text-xs font-medium text-zinc-500 mb-2 block">نمونه‌های آماده:</span>
          <div className="space-y-2">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTranscript(p);
                  handleParseTranscript(p);
                }}
                className="w-full text-right text-xs bg-white/5 hover:bg-white/10 text-zinc-300 font-medium px-4 py-2.5 rounded-xl border border-white/5 transition"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => handleParseTranscript()}
          disabled={isProcessing || !transcript.trim()}
          isLoading={isProcessing}
          leftIcon={<Send className="w-4 h-4" />}
          className="w-full"
        >
          تحلیل هوشمند
        </Button>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3 text-sm text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Result Preview */}
        {parsedResult && (
          <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-sm font-semibold text-indigo-400 flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1.5" />
                {parsedResult.actionType === 'SET_BUDGET' ? 'تغییر بودجه' : 
                 parsedResult.actionType === 'ADD_RECURRING' ? 'هزینه دوره‌ای' :
                 parsedResult.actionType === 'ADD_BILL' ? 'قبض ماهانه' : 'تراکنش جدید'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500 block mb-1">عنوان:</span>
                <span className="font-medium text-zinc-200">{parsedResult.title || parsedResult.category}</span>
              </div>
              <div>
                <span className="text-zinc-500 block mb-1 flex items-center justify-between">
                  مبلغ:
                  <button
                    onClick={() => {
                      const cur = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
                      if (cur > 0) setEditableAmount(Math.round(cur / 10));
                    }}
                    className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-400 hover:text-white"
                  >
                    ÷۱۰ (تومان)
                  </button>
                </span>
                <Input
                  type="number"
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="!px-3 !py-1.5 font-mono"
                />
                <span className="text-[10px] text-zinc-500 block mt-1">
                  {formatMoney(typeof editableAmount === 'number' ? editableAmount : 0, settings.currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block mb-1">دسته‌بندی:</span>
                <span className="font-medium text-zinc-200">{parsedResult.category}</span>
              </div>
              <div>
                <span className="text-zinc-500 block mb-1">پرداخت‌کننده:</span>
                <span className="font-medium text-zinc-200">
                  {parsedResult.paidBy === settings.partnerA.id ? settings.partnerA.name : settings.partnerB.name}
                </span>
              </div>
            </div>

            <Button onClick={handleConfirmAndSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
              تایید و ثبت نهایی
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
