import React, { useState } from 'react';
import { X, Mic, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Languages } from 'lucide-react';
import { api } from '../services/api';
import { AIParsedVoice, AppSettings, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  settings: AppSettings;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
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
      setEditableAmount(result.amount || 0);
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
      const partnerA = settings.partnerA;
      const partnerB = settings.partnerB;
      const paidBy = parsedResult.paidBy || partnerA.id;
      const amount = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;

      // Equal split by default
      const half = Math.round((amount / 2) * 100) / 100;

      await onSaveTransaction({
        title: parsedResult.title || 'Voice Expense',
        amount,
        type: 'EXPENSE',
        category: (parsedResult.category as any) || 'Groceries',
        paidBy,
        date: parsedResult.date || new Date().toISOString().split('T')[0],
        vendor: parsedResult.vendor || undefined,
        splitType: (parsedResult.splitType as any) || 'EQUAL',
        partnerAShare: half,
        partnerBShare: Math.round((amount - half) * 100) / 100,
        notes: `AI Voice Entry: "${transcript}"`,
      });

      onClose();
      setTranscript('');
      setParsedResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    }
  };

  const samplePrompts = [
    `حمید ۳۵۰ هزار تومان خرید هایپراستار کرد ۵۰ ۵۰`,
    `فاطمه ۱۲ میلیون تومان بابت اجاره خانه داد`,
    `حمید ۸۰ هزار تومان کرایه اسنپ پرداخت کرد`,
    `فاطمه ۶۵۰ هزار تومان شام در کافه طهرون داد`,
    `I spent 250000 Toman on groceries at Ofogh Kourosh paid by Hamid`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gemini Voice & Note Parser</h2>
              <p className="text-xs text-slate-500">Speak or type in Farsi (فارسی) or English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition"
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
              <span>Voice Speech Language:</span>
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
                🇮🇷 فارسی (Farsi)
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
              placeholder='مثلاً: "حمید ۲۵۰ هزار تومان خرید هایپراستار کرد ۵۰ ۵۰"'
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3.5 pr-12 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-600 shadow-2xs font-medium"
            />
            <button
              onClick={handleToggleListening}
              className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-bounce shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200'
              }`}
              title={`Record Microphone (${speechLang === 'fa-IR' ? 'Persian' : 'English'})`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Example Prompts */}
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1.5">
              Try a sample sentence (نمونه عبارت):
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
                  className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition truncate"
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
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-indigo-100"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini is parsing Persian/English details...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Parse with Gemini AI</span>
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
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI Extracted Transaction</span>
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                  Ready to save
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Title:</span>
                  <span className="font-semibold text-slate-900">{parsedResult.title}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-500 block">Amount:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
                        if (cur > 0) {
                          setEditableAmount(Math.round(cur / 10));
                        }
                      }}
                      title="Convert Rials to Tomans (divide by 10)"
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
                  <span className="text-slate-500 block">Category:</span>
                  <span className="font-semibold text-slate-800">{parsedResult.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payer:</span>
                  <span className="font-semibold text-slate-800">
                    {parsedResult.paidBy === settings.partnerA.id
                      ? `${settings.partnerA.avatar} ${settings.partnerA.name}`
                      : `${settings.partnerB.avatar} ${settings.partnerB.name}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date:</span>
                  <span className="font-mono text-slate-700">{parsedResult.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Split:</span>
                  <span className="font-semibold text-emerald-700">{parsedResult.splitType}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmAndSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-md shadow-emerald-100"
              >
                Confirm & Add to Household Ledger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
