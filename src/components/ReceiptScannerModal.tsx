import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';
import { AIScanReceipt, AppSettings, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  settings: AppSettings;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveTransaction,
  settings,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paidBy, setPaidBy] = useState(settings.partnerA.id);

  const [editableVendor, setEditableVendor] = useState('');
  const [editableAmount, setEditableAmount] = useState<number | ''>('');
  const [editableCategory, setEditableCategory] = useState<string>('Groceries');
  const [editableDate, setEditableDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setScanResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScanReceipt = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await api.scanReceipt(selectedImage, mimeType);
      setScanResult(result);
      setEditableVendor(result.vendor || 'Scanned Store');
      setEditableAmount(result.totalAmount || 0);
      setEditableCategory(result.category || 'Groceries');
      setEditableDate(result.date || new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Error scanning receipt:', err);
      setError(err.message || 'Gemini Vision failed to scan receipt image. Verify your Gemini API key in Settings.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!scanResult) return;

    try {
      const total = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;

      await onSaveTransaction({
        title: editableVendor ? `${editableVendor} Receipt` : 'Scanned Receipt',
        amount: total,
        type: 'EXPENSE',
        category: (editableCategory as any) || 'Groceries',
        paidBy,
        date: editableDate || new Date().toISOString().split('T')[0],
        vendor: editableVendor,
        notes: scanResult.items && scanResult.items.length > 0
          ? `Items: ${scanResult.items.map((i) => i.name).join(', ')}`
          : 'Receipt OCR processed by Gemini Vision',
      });

      onClose();
      setSelectedImage(null);
      setScanResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="اسکن هوشمند فاکتور">
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedImage ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 group"
          >
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:scale-110 transition-transform duration-300 mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">آپلود فاکتور یا عکس از دوربین</p>
            <p className="text-xs text-zinc-500 mt-2">پشتیبانی از PNG, JPG, WEBP</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden max-h-48 bg-black/40 border border-white/10 flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Receipt Preview"
                className="max-h-48 object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-zinc-400 hover:text-white p-2 rounded-lg transition-colors"
              >
                تعویض عکس
              </button>
            </div>

            {!scanResult && (
              <Button
                onClick={handleScanReceipt}
                disabled={isScanning}
                isLoading={isScanning}
                leftIcon={<Camera className="w-4 h-4" />}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-emerald-500/20"
              >
                استخراج اطلاعات با Gemini
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3 text-sm text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {scanResult && (
          <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-sm font-semibold text-emerald-400 flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1.5" />
                اطلاعات استخراج شد
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaidBy(settings.partnerA.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    paidBy === settings.partnerA.id
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <span>{settings.partnerA.avatar}</span>
                  <span>{settings.partnerA.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy(settings.partnerB.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    paidBy === settings.partnerB.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <span>{settings.partnerB.avatar}</span>
                  <span>{settings.partnerB.name}</span>
                </button>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400">
                    مبلغ کل ({settings.currencySymbol}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
                      if (cur > 0) setEditableAmount(Math.round(cur / 10));
                    }}
                    className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    ÷۱۰ (تومان)
                  </button>
                </div>
                <Input
                  type="number"
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="font-mono font-bold text-lg text-emerald-400"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {formatMoney(typeof editableAmount === 'number' ? editableAmount : 0, settings.currencySymbol)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="فروشگاه"
                  value={editableVendor}
                  onChange={(e) => setEditableVendor(e.target.value)}
                />
                <Input
                  label="تاریخ (میلادی)"
                  type="date"
                  value={editableDate}
                  onChange={(e) => setEditableDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 ml-1 mb-1 block">دسته‌بندی:</label>
                <select
                  value={editableCategory}
                  onChange={(e) => setEditableCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option className="bg-zinc-900" value="Groceries">سوپرمارکت / مواد غذایی</option>
                  <option className="bg-zinc-900" value="Dining & Takeout">رستوران / کافه</option>
                  <option className="bg-zinc-900" value="Rent & Mortgage">اجاره / مسکن</option>
                  <option className="bg-zinc-900" value="Utilities & Internet">قبوض / اینترنت</option>
                  <option className="bg-zinc-900" value="Household & Supplies">وسایل خانه</option>
                  <option className="bg-zinc-900" value="Entertainment & Subscriptions">تفریح / فیلم</option>
                  <option className="bg-zinc-900" value="Travel & Transport">اسنپ / بنزین</option>
                  <option className="bg-zinc-900" value="Healthcare & Wellness">داروخانه / درمان</option>
                  <option className="bg-zinc-900" value="Shopping & Personal">پوشاک / خرید</option>
                  <option className="bg-zinc-900" value="Other">سایر</option>
                </select>
              </div>

              {scanResult.items && scanResult.items.length > 0 && (
                <div className="border-t border-white/5 pt-3 mt-3">
                  <span className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                    اقلام شناسایی شده ({scanResult.items.length}):
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs pr-1 no-scrollbar">
                    {scanResult.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-zinc-300 py-1.5 border-b border-white/5">
                        <span className="truncate pr-2">{item.name}</span>
                        <span className="font-mono text-emerald-400/80">{formatMoney(item.price || 0, settings.currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleConfirmAndSave}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2 border-emerald-500/50 shadow-emerald-500/20"
              >
                تایید و ثبت فاکتور در هزینه‌ها
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
