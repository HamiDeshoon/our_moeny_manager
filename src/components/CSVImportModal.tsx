import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, Sparkles, Table } from 'lucide-react';
import { AppSettings, Category, Transaction, AIParsedSheetResult, TransactionType } from '../types';
import { api } from '../services/api';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';

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
  type: TransactionType;
  paidBy: string;
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

      if (result.notes) setAiNote(result.notes);

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
          type: txType,
          paidBy: tx.paidBy === partnerB.id ? partnerB.id : partnerA.id,
          category: (tx.category as Category) || (txType === 'TRANSFER' ? 'Internal Transfer' : 'Groceries'),
          notes: tx.notes || `AI Sheet Import (${result.currencyDetected || 'Tomans'})`,
          vendor: tx.vendor,
          isValid,
          errorReason: isValid ? undefined : 'Invalid amount or title',
        };
      });

      setParsedRows(rows);
      setImportStatus(`تعداد ${result.totalRowsProcessed || rows.length} ردیف با موفقیت پردازش شد!`);
    } catch (err: any) {
      console.error('Gemini sheet parse failed:', err);
      setImportStatus(`خطا در پردازش هوشمند: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const divideAmountsByTen = () => {
    setParsedRows((prev) =>
      prev.map((row) => ({ ...row, amount: Math.round(row.amount / 10) }))
    );
    setImportStatus('تمام مبالغ بر ۱۰ تقسیم شدند (تبدیل ریال به تومان انجام شد).');
  };

  const handleBatchImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const formattedForApi: Omit<Transaction, 'id' | 'createdAt'>[] = validItems.map((item) => ({
        title: item.title,
        amount: item.amount,
        type: item.type,
        category: item.category,
        paidBy: item.paidBy,
        date: item.date,
        vendor: item.vendor,
        notes: item.notes || 'Imported via Gemini AI Sheet Importer',
      }));

      const res = await api.batchAddTransactions(formattedForApi);
      setImportStatus(`تعداد ${res.count} تراکنش با موفقیت ذخیره شد!`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      setImportStatus(`خطا در ذخیره سازی: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="ورود هوشمند فایل اکسل" fullHeight>
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-zinc-400 text-sm">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <p>فایل اکسل یا لیست متنی را بدهید تا Gemini بصورت خودکار دسته‌بندی و ثبت کند.</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-1 text-sm font-semibold transition-all ${
              activeTab === 'upload' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            آپلود فایل (Excel/CSV)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-1 text-sm font-semibold transition-all ${
              activeTab === 'paste' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            کپی پیست متن
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 group"
          >
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 group-hover:scale-110 transition-transform duration-300 mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              {fileName ? `فایل انتخاب شده: ${fileName}` : 'کلیک برای انتخاب فایل'}
            </p>
            <p className="text-xs text-zinc-500 mt-2">پشتیبانی از فرمت‌های xlsx, csv</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">متن کپی شده از اکسل:</label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="ردیف‌های اکسل را اینجا Paste کنید..."
              className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-indigo-500 font-mono resize-y"
            />
          </div>
        )}

        <Button
          onClick={handleGeminiAutoParse}
          disabled={isAiProcessing || (!fileBase64 && !rawText.trim())}
          isLoading={isAiProcessing}
          leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
          className="w-full bg-indigo-600 border-indigo-500/50"
        >
          تحلیل هوشمند با Gemini
        </Button>

        {aiNote && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300 flex items-start gap-2">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <span>{aiNote}</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <Table className="w-4 h-4" />
                تراکنش‌های استخراج شده ({parsedRows.filter(r => r.isValid).length})
              </span>
              <button
                type="button"
                onClick={divideAmountsByTen}
                className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-lg transition-colors shadow-sm"
              >
                ✂️ ÷ ۱۰ (ریال به تومان)
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 max-h-64 no-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 text-zinc-400 font-semibold sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-3 font-medium">تاریخ</th>
                    <th className="p-3 font-medium">عنوان</th>
                    <th className="p-3 font-medium">مبلغ</th>
                    <th className="p-3 font-medium">دسته</th>
                    <th className="p-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'text-zinc-300' : 'bg-rose-500/10 text-rose-300'}>
                      <td className="p-3 font-mono text-zinc-400">{row.date}</td>
                      <td className="p-3 max-w-[120px] truncate">{row.title}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400/90">{row.amount.toLocaleString()}</td>
                      <td className="p-3 text-zinc-400">{row.category}</td>
                      <td className="p-3">
                        {row.isValid ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                            معتبر
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">
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

        {importStatus && (
          <div className={`p-3 rounded-xl text-sm font-medium ${
            importStatus.includes('خطا') ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {importStatus}
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            انصراف
          </Button>
          <Button 
            onClick={handleBatchImport} 
            disabled={parsedRows.filter(r => r.isValid).length === 0 || isImporting} 
            isLoading={isImporting}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50"
          >
            <Check className="w-4 h-4 mr-2" />
            ذخیره {parsedRows.filter(r => r.isValid).length} تراکنش
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
