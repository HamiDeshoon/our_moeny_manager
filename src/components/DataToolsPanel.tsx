import React from 'react';
import { Camera, FileSpreadsheet, Download, ChevronLeft } from 'lucide-react';
import { AppSettings } from '../types';

interface DataToolsPanelProps {
  onOpenCSVImport: () => void;
  onOpenReceiptModal: () => void;
  onExportCSV: () => void;
  settings: AppSettings;
}

export const DataToolsPanel: React.FC<DataToolsPanelProps> = ({
  onOpenCSVImport,
  onOpenReceiptModal,
  onExportCSV,
  settings,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-100 mb-2">مدیریت اطلاعات و هوش مصنوعی</h2>
        <p className="text-sm text-zinc-400 mb-6">
          از این بخش می‌توانید فاکتورهای خود را اسکن کنید، فایل‌های اکسل را وارد کنید یا از داده‌های خود خروجی بگیرید.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              خروجی اطلاعات (Export)
              <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              دانلود تراکنش‌های ماه جاری به صورت فایل اکسل (CSV) برای استفاده در نرم‌افزارهای دیگر.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
