import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Sparkles, ArrowRight, Table, Loader2 } from 'lucide-react';
import { AppSettings, Category, Transaction, AIParsedSheetResult, TransactionType } from '../types';
import { api } from '../services/api';
import { normalizePersianNumbers } from '../utils/formatters';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onImportComplete: () => void;
}

interface ParsedRow {
  date: string;
  title: string;
  amount: number;
  type: TransactionType;  paidBy: string;
  category: Category;
  notes?: string;
  vendor?: string;
  isValid: boolean;
  errorReason?: string;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  settings,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const partnerA = settings.partnerA;
  const partnerB = settings.partnerB;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileBase64(result);
      // Also try text parsing if plaintext
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv')) {
        const textReader = new FileReader();
        textReader.onload = (txEvent) => {
          const txt = txEvent.target?.result as string;
          setRawText(txt);
        };
        textReader.readAsText(file, 'UTF-8');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGeminiAutoParse = async () => {
    if (!fileBase64 && !rawText.trim()) {
      setImportStatus('Error: Please select an Excel/CSV file or paste sheet text first.');
      return;
    }

    setIsAiProcessing(true);
    setImportStatus(null);
    setAiNote(null);

    try {
      const result: AIParsedSheetResult = await api.importSheet({
        fileBase64: fileBase64 || undefined,
        pastedText: rawText || undefined,
      });

      if (result.notes) {
        setAiNote(result.notes);
      }

      const rows: ParsedRow[] = result.transactions.map((tx) => {
        const amount = Number(tx.amount) || 0;
        const isValid = amount > 0 && Boolean(tx.title);
        const txType: TransactionType =
          tx.type === 'TRANSFER' || tx.category === 'Internal Transfer'
            ? 'TRANSFER'
            : tx.type === 'INCOME'
            ? 'INCOME'
            : 'EXPENSE';
        return {
          date: tx.date || new Date().toISOString().split('T')[0],
          title: tx.title || 'Imported Transaction',
          amount,
          type: txType,          paidBy: tx.paidBy === partnerB.id ? partnerB.id : partnerA.id,
          category: (tx.category as Category) || (txType === 'TRANSFER' ? 'Internal Transfer' : 'Groceries'),
          notes: tx.notes || `AI Sheet Import (${result.currencyDetected || 'Tomans'})`,
          vendor: tx.vendor,
          isValid,
          errorReason: isValid ? undefined : 'Invalid amount or title',
        };
      });

      setParsedRows(rows);
      setImportStatus(`Gemini processed ${result.totalRowsProcessed || rows.length} rows! Review transactions below.`);
    } catch (err: any) {
      console.error('Gemini sheet parse failed:', err);
      setImportStatus(`AI Error: ${err.message || 'Failed to parse sheet with Gemini. Try standard CSV fallback.'}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Helper utility to divide amounts by 10 (convert Rials to Tomans)
  const divideAmountsByTen = () => {
    setParsedRows((prev) =>
      prev.map((row) => ({
        ...row,
        amount: Math.round(row.amount / 10),
      }))
    );
    setImportStatus('تمام مبالغ بر ۱۰ تقسیم شدند (تبدیل ریال به تومان انجام شد).');
  };

  const handleBatchImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const formattedForApi: Omit<Transaction, 'id' | 'createdAt'>[] = validItems.map((item) => {
        return {
          title: item.title,
          amount: item.amount,
          type: item.type,
          category: item.category,
          paidBy: item.paidBy,
          date: item.date,
          vendor: item.vendor,
          notes: item.notes || 'Imported via Gemini AI Sheet Importer',
        };
      });

      const res = await api.batchAddTransactions(formattedForApi);
      setImportStatus(`Successfully imported ${res.count} transactions to ledger!`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed batch import:', err);
      setImportStatus(`Error: ${err.message || 'Import failed'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 rounded-2xl border border-emerald-200/60 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-slate-900">ورود هوشمند اکسل و شیت (Gemini AI Sheet Import)</h2>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>AI Powered</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">Upload Excel (.xlsx, .xls, .csv) or paste rows and Gemini will organize it automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex space-x-3 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            فایل اکسل / Excel or CSV File (.xlsx, .csv)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            کپی و پیست متنی / Paste Sheet Rows
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,.txt,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              {fileName ? `انتخاب شده: ${fileName}` : 'برای انتخاب فایل اکسل کلیک کنید (Click or Drag Excel File)'}
            </p>
            <p className="text-[11px] text-slate-400">
              پشتیبانی از فایل‌های .xlsx, .xls, .csv با ستون‌های فارسی یا انگلیسی
            </p>
          </div>
        )}

        {/* Tab 2: Copy Paste */}
        {activeTab === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              متن جدول اکسل یا گوگل شیت را کپی و پیست کنید:
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`تاریخ\tشرح\tمبلغ\tپرداخت کننده\tدسته\n1405/05/01\tخریدهای سوپرمارکت\t1200000\tحمید\tGroceries\n1405/05/02\tکافه و رستوران\t450000\tفاطمه\tDining & Takeout`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        )}

        {/* AI Process Trigger Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGeminiAutoParse}
            disabled={isAiProcessing || (!fileBase64 && !rawText.trim())}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {isAiProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Gemini در حال خواندن و طبقه‌بندی هوشمند...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>خوانش و استخراج هوشمند با جمینای (Gemini AI Read Sheet)</span>
              </>
            )}
          </button>
        </div>

        {/* AI Insight Notes */}
        {aiNote && (
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span><strong>Gemini Analysis Note:</strong> {aiNote}</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <span>پیش‌نمایش تراکنش‌های استخراج‌شده ({parsedRows.filter((r) => r.isValid).length} آماده ثبت)</span>
              </span>

              {/* Quick Batch Transformations */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={divideAmountsByTen}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg transition cursor-pointer shadow-2xs"
                  title="Divide all amounts by 10 to strip trailing zero from Rials"
                >
                  ✂️ ÷ ۱۰ (تبدیل ریال به تومان)
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">تاریخ</th>
                    <th className="p-2.5">عنوان / شرح</th>
                    <th className="p-2.5">مبلغ ({settings.currencySymbol})</th>
                    <th className="p-2.5">پرداخت‌کننده</th>
                    <th className="p-2.5">دسته‌بندی</th>
                    <th className="p-2.5">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/60'}>
                      <td className="p-2.5 font-mono text-slate-600">{row.date}</td>
                      <td className="p-2.5 font-medium text-slate-900 truncate max-w-[160px]">{row.title}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{row.amount.toLocaleString()}</td>
                      <td className="p-2.5 font-medium">
                        {row.paidBy === partnerA.id ? partnerA.name : partnerB.name}
                      </td>
                      <td className="p-2.5 text-slate-600">{row.category}</td>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            آماده ثبت
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                            نامعتبر
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Message */}
        {importStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold ${
              importStatus.startsWith('Error') || importStatus.startsWith('AI Error')
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {importStatus}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            انصراف
          </button>
          <button
            onClick={handleBatchImport}
            disabled={parsedRows.filter((r) => r.isValid).length === 0 || isImporting}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {isImporting
                ? 'در حال ذخیره...'
                : `تایید و ورود ${parsedRows.filter((r) => r.isValid).length} تراکنش به دفترچه`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
