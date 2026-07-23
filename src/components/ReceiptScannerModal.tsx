import React, { useState, useRef } from 'react';
import { X, Camera, Upload, RefreshCw, CheckCircle2, AlertCircle, ShoppingBag, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import { AIScanReceipt, AppSettings, Transaction } from '../types';
import { formatMoney } from '../utils/formatters';

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

  // Editable fields for user verification/adjustment
  const [editableVendor, setEditableVendor] = useState('');
  const [editableAmount, setEditableAmount] = useState<number | ''>('');
  const [editableCategory, setEditableCategory] = useState<string>('Groceries');
  const [editableDate, setEditableDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      const half = Math.round((total / 2) * 100) / 100;

      await onSaveTransaction({
        title: editableVendor ? `${editableVendor} Receipt` : 'Scanned Receipt',
        amount: total,
        type: 'EXPENSE',
        category: (editableCategory as any) || 'Groceries',
        paidBy,
        date: editableDate || new Date().toISOString().split('T')[0],
        vendor: editableVendor,
        splitType: 'EQUAL',
        partnerAShare: half,
        partnerBShare: Math.round((total - half) * 100) / 100,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gemini Receipt Scanner</h2>
              <p className="text-xs text-slate-500">Extract totals, merchant, date & line items from photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image Upload Box / Preview */}
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 group"
            >
              <div className="p-3 bg-white group-hover:bg-emerald-50 rounded-full text-slate-400 group-hover:text-emerald-600 border border-slate-200 transition mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Click or drag receipt photo to upload</p>
              <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP, or smartphone camera snaps</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden max-h-48 bg-slate-100 border border-slate-200 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Receipt Preview"
                  className="max-h-48 object-contain"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 bg-white/90 text-slate-600 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200 shadow-xs"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!scanResult && (
                <button
                  onClick={handleScanReceipt}
                  disabled={isScanning}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-100"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gemini Vision is analyzing receipt image...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Extract Expense Data with Gemini</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Scan Results Card */}
          {scanResult && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Receipt Extracted</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  Ready to Log
                </span>
              </div>

              {/* Payer Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Who paid for this receipt?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaidBy(settings.partnerA.id)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 ${
                      paidBy === settings.partnerA.id
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{settings.partnerA.avatar}</span>
                    <span>{settings.partnerA.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidBy(settings.partnerB.id)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 ${
                      paidBy === settings.partnerB.id
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{settings.partnerB.avatar}</span>
                    <span>{settings.partnerB.name}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {/* Total Amount & Rial to Toman Converter */}
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-slate-600">
                      Total Amount ({settings.currencySymbol}):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof editableAmount === 'number' ? editableAmount : Number(editableAmount) || 0;
                        if (cur > 0) {
                          setEditableAmount(Math.round(cur / 10));
                        }
                      }}
                      title="If receipt was in Rials (ریال), divide by 10 to get Tomans (تومان)"
                      className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold transition cursor-pointer"
                    >
                      <span>کارتخوان (ریال ➔ تومان: ÷۱۰)</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    value={editableAmount}
                    onChange={(e) => setEditableAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-extrabold text-emerald-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Formatted: <span className="font-semibold text-slate-800">{formatMoney(typeof editableAmount === 'number' ? editableAmount : 0, settings.currencySymbol)}</span>
                  </p>
                </div>

                {/* Vendor & Date */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Vendor / Store:</label>
                    <input
                      type="text"
                      value={editableVendor}
                      onChange={(e) => setEditableVendor(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Date (YYYY-MM-DD):</label>
                    <input
                      type="date"
                      value={editableDate}
                      onChange={(e) => setEditableDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Category:</label>
                  <select
                    value={editableCategory}
                    onChange={(e) => setEditableCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
                  >
                    <option value="Groceries">Groceries (سوپرمارکت / مواد غذایی)</option>
                    <option value="Dining & Takeout">Dining & Takeout (رستوران / کافه)</option>
                    <option value="Rent & Mortgage">Rent & Mortgage (اجاره / مسکن)</option>
                    <option value="Utilities & Internet">Utilities & Internet (قبوض / اینترنت)</option>
                    <option value="Household & Supplies">Household & Supplies (وسایل خانه)</option>
                    <option value="Entertainment & Subscriptions">Entertainment & Subscriptions (تفریح / فیلیمو)</option>
                    <option value="Travel & Transport">Travel & Transport (اسنپ / تاکسی / بنزین)</option>
                    <option value="Healthcare & Wellness">Healthcare & Wellness (داروخانه / درمان)</option>
                    <option value="Shopping & Personal">Shopping & Personal (پوشاک / خرید)</option>
                    <option value="Other">Other (سایر)</option>
                  </select>
                </div>

                {/* Gemini AI Confidence / Note */}
                {scanResult.confidenceNotes && (
                  <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-[10px] text-slate-600 italic">
                    <span className="font-bold not-italic">AI Note: </span>
                    {scanResult.confidenceNotes}
                  </div>
                )}
              </div>

              {/* Line Items List */}
              {scanResult.items && scanResult.items.length > 0 && (
                <div className="border-t border-emerald-100 pt-2">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center space-x-1">
                    <ShoppingBag className="w-3 h-3 text-emerald-600" />
                    <span>Line Items ({scanResult.items.length}):</span>
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs pr-1">
                    {scanResult.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700 py-0.5 border-b border-emerald-100/60">
                        <span className="truncate pr-2">{item.name}</span>
                        <span className="font-mono font-semibold">{formatMoney(item.price || 0, settings.currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmAndSave}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-md shadow-emerald-100"
              >
                Log Scanned Receipt to Household Ledger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
