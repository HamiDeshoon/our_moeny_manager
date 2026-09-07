import React, { useState } from 'react';
import { Camera, FileSpreadsheet, Download, ChevronLeft, PlusCircle, Cloud, UploadCloud } from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';

interface DataToolsPanelProps {
  onOpenAddExpense: () => void;
  onOpenCSVImport: () => void;
  onOpenReceiptModal: () => void;
  onExportCSV: () => void;
  settings: AppSettings;
}

export const DataToolsPanel: React.FC<DataToolsPanelProps> = ({
  onOpenAddExpense,
  onOpenCSVImport,
  onOpenReceiptModal,
  onExportCSV,
  settings,
}) => {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      setBackupStatus('در حال آماده‌سازی پشتیبان...');
      const backup = await api.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duospend_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('فایل پشتیبان با موفقیت دانلود شد.');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      setBackupStatus(`خطا: ${err.message || 'عملیات ناموفق بود'}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        setBackupStatus('در حال بازگردانی داده‌ها...');
        const res = await api.importBackup(parsed);
        if (res.success) {
          setBackupStatus('اطلاعات با موفقیت بازگردانی شد! صفحه در حال بارگذاری مجدد...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setBackupStatus('فایل پشتیبان نامعتبر است.');
        }
      } catch {
        setBackupStatus('خواندن فایل پشتیبان با خطا مواجه شد.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-100 mb-2">مدیریت اطلاعات و پشتیبان‌گیری</h2>
        <p className="text-sm text-zinc-400 mb-4">
          فاکتورها را اسکن کنید، فایل اکسل وارد نمایید، یا از داده‌های خود برای گوگل درایو پشتیبان تهیه و بازگردانی کنید.
        </p>

        {backupStatus ? (
          <div className="mb-5 p-3 rounded-xl border border-teal-400/30 bg-teal-400/10 text-xs font-bold text-teal-200">
            {backupStatus}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Backup to Google Drive / JSON */}
          <button
            onClick={handleExportBackup}
            className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-sky-500/10 border border-white/10 hover:border-sky-500/30 rounded-xl transition-all group cursor-pointer"
          >
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg mb-4 group-hover:scale-110 transition-transform">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              پشتیبان گوگل درایو (Export)
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-sky-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              دانلود بسته کامل اطلاعات جهت ذخیره و همگام‌سازی ابری در Google Drive شخصی شما.
            </p>
          </button>

          {/* Restore Backup */}
          <label className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl transition-all group cursor-pointer">
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              بازیابی از گوگل درایو (Restore)
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              انتخاب و بازگردانی فایل پشتیبان ذخیره‌شده از Google Drive روی این دستگاه.
            </p>
          </label>

          {/* Scan Receipt */}
          <button
            onClick={onOpenReceiptModal}
            className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-xl transition-all group cursor-pointer"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              اسکن فاکتور (عکس)
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              پردازش هوشمند عکس فاکتور یا رسید کارتخوان و استخراج خودکار مبلغ و فروشگاه با Gemini.
            </p>
          </button>

          {/* Import CSV/Excel/Text */}
          <button
            onClick={onOpenCSVImport}
            className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl transition-all group cursor-pointer"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg mb-4 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              ورود فایل اکسل یا متن
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              آپلود فایل CSV/Excel یا کپی‌پیست ردیف‌های متنی تراکنش‌ها برای دسته‌بندی گروهی.
            </p>
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-zinc-800 border border-white/10 hover:border-zinc-700 rounded-xl transition-all group cursor-pointer"
          >
            <div className="p-3 bg-zinc-800 text-zinc-400 rounded-lg mb-4 group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              خروجی اکسل (CSV)
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              دانلود تراکنش‌های ماه جاری به صورت فایل اکسل (CSV) برای استفاده در نرم‌افزارهای دیگر.
            </p>
          </button>

          {/* Manual Entry */}
          <button
            onClick={onOpenAddExpense}
            className="flex flex-col text-right items-start p-5 bg-black/40 hover:bg-indigo-600/10 border border-white/10 hover:border-indigo-600/30 rounded-xl transition-all group cursor-pointer"
          >
            <div className="p-3 bg-indigo-600 text-white rounded-lg mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-600/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-1 flex items-center justify-between w-full">
              ثبت دستی تراکنش
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              ثبت دستی تراکنش جدید از طریق فرم اطلاعات بدون استفاده از هوش مصنوعی.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
