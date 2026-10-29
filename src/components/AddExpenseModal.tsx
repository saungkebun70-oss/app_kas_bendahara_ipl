import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  Check,
  Edit3,
  Lightbulb,
  Receipt,
  Sparkles,
  TrendingDown,
  X,
} from 'lucide-react';
import type { DatabaseState, ExpenseCategory, PaymentMethod } from '../types/finance';
import { EXPENSE_CATEGORIES, formatMonthLabel, formatRupiah } from '../lib/finance';
import { api, type CategorySuggestion, type CreateTransactionPayload } from '../lib/api';

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  state: DatabaseState;
  defaultPeriodMonth: string;
  onSubmitTransaction: (payload: CreateTransactionPayload) => Promise<void>;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transfer Bank',
  'Tunai',
  'QRIS',
  'Transfer BCA Kas',
  'Transfer Mandiri',
];

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

const QUICK_EXPENSE_PRESETS = [
  {
    label: 'Honor Satpam Jaga Malam',
    desc: 'Honor 2 personel satpam jaga malam dan patroli lingkungan',
    cat: 'Keamanan & Satpam' as ExpenseCategory,
    amt: '2400000',
  },
  {
    label: 'Pengangkutan Sampah 55 Rumah',
    desc: 'Retribusi dan operasional armada pengangkutan sampah 55 rumah',
    cat: 'Kebersihan & Sampah' as ExpenseCategory,
    amt: '1200000',
  },
  {
    label: 'Token Listrik PJU Jalan',
    desc: 'Pembelian token listrik penerangan jalan umum (PJU) 4 blok',
    cat: 'Listrik PJU & Air' as ExpenseCategory,
    amt: '650000',
  },
  {
    label: 'Perawatan Taman & Saung',
    desc: 'Pemotongan rumput, pemupukan tanaman hias, dan pembersihan saung warga',
    cat: 'Perawatan Taman & Saung' as ExpenseCategory,
    amt: '450000',
  },
  {
    label: 'Perbaikan Lampu & CCTV',
    desc: 'Penggantian 2 unit bohlam PJU LED Blok B dan servis adaptor CCTV gerbang',
    cat: 'Perbaikan Fasilitas Umum' as ExpenseCategory,
    amt: '350000',
  },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  open,
  onClose,
  state,
  defaultPeriodMonth,
  onSubmitTransaction,
}) => {
  const [periodMonth, setPeriodMonth] = useState(defaultPeriodMonth);
  const [date, setDate] = useState('2026-10-24');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Perawatan Taman & Saung');
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [manualCategoryText, setManualCategoryText] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer Bank');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI-Powered Suggestion State
  const [aiSuggestions, setAiSuggestions] = useState<CategorySuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPeriodMonth(defaultPeriodMonth);
      setDate(defaultPeriodMonth === '2026-10' ? '2026-10-24' : `${defaultPeriodMonth}-15`);
      setError(null);
      setIsManualCategory(false);
      setManualCategoryText('');
      setAmountStr('');
      setDescription('');
      setAiSuggestions([]);
      setAppliedFeedback(null);
    }
  }, [open, defaultPeriodMonth]);

  // AI suggestion watcher for description
  useEffect(() => {
    if (!description.trim() || description.trim().length < 3) {
      setAiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await api.suggestCategory(description.trim(), 'expense');
        if (res.ok && Array.isArray(res.suggestions)) {
          setAiSuggestions(res.suggestions);
        }
      } catch (err) {
        console.error('Failed to get expense suggestions:', err);
      } finally {
        setAiLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [description]);

  if (!open) return null;

  const resolvedCategory = isManualCategory ? manualCategoryText.trim() : expenseCategory;
  const numericAmount = Number(amountStr.replace(/\D/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resolvedCategory) {
      setError('Kategori pengeluaran wajib diisi.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }

    if (!description.trim()) {
      setError('Uraian / keterangan pengeluaran wajib diisi untuk transparansi pembukuan.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTransaction({
        date,
        periodMonth,
        type: 'expense',
        category: resolvedCategory as any,
        amount: numericAmount,
        unitId: null,
        paymentMethod,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pengeluaran kas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPreset = (preset: typeof QUICK_EXPENSE_PRESETS[0]) => {
    setIsManualCategory(false);
    setExpenseCategory(preset.cat);
    setDescription(preset.desc);
    setAmountStr(preset.amt);
    setAppliedFeedback(`Preset "${preset.label}" diterapkan!`);
    setTimeout(() => setAppliedFeedback(null), 3000);
  };

  const handleApplyAiCategory = (cat: string) => {
    if (EXPENSE_CATEGORIES.includes(cat as ExpenseCategory)) {
      setIsManualCategory(false);
      setExpenseCategory(cat as ExpenseCategory);
    } else {
      setIsManualCategory(true);
      setManualCategoryText(cat);
    }
    setAppliedFeedback(`Kategori "${cat}" diterapkan dari AI Helper!`);
    setTimeout(() => setAppliedFeedback(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden">
        {/* Dedicated Expense Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 id="expense-modal-title" className="font-display text-base sm:text-lg font-bold tracking-tight">
                Catat Pengeluaran Kas
              </h2>
              <p className="text-xs text-rose-100">
                Formulir terpisah khusus belanja operasional, gaji satpam, &amp; fasum
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup form pengeluaran"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {appliedFeedback && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-900 font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          {/* Quick Presets Strip */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pilihan Cepat / Template Pengeluaran
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Klik untuk isi otomatis</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EXPENSE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-rose-400 hover:bg-rose-50/70 hover:text-rose-900 transition-all cursor-pointer"
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="expense-period" className="block text-xs font-semibold text-slate-700 mb-1">
                Periode Bulan Buku &amp; LPJ
              </label>
              <select
                id="expense-period"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 cursor-pointer"
              >
                {PERIOD_OPTIONS.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Transaksi Pengeluaran
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Expense Category Selection & Manual Input Option */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="expense-category-select" className="text-xs font-bold text-slate-800">
                Kategori Akun Pengeluaran
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualCategory}
                  onChange={(e) => setIsManualCategory(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <Edit3 className="h-3.5 w-3.5" />
                <span>Input Kategori Manual</span>
              </label>
            </div>

            {isManualCategory ? (
              <div>
                <input
                  type="text"
                  placeholder="Ketik nama kategori pengeluaran kustom (contoh: Biaya Tak Terduga / Konsumsi Rapat)"
                  value={manualCategoryText}
                  onChange={(e) => setManualCategoryText(e.target.value)}
                  className="w-full rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
                <span className="text-[11px] text-rose-600 mt-1 block">
                  Kategori kustom akan otomatis masuk ke rekapitulasi buku kas dan laporan bulanan.
                </span>
              </div>
            ) : (
              <select
                id="expense-category-select"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="expense-amount" className="text-xs font-semibold text-slate-700">
                  Nominal Pengeluaran (Rp)
                </label>
                {numericAmount > 0 && (
                  <span className="font-mono text-xs font-bold text-rose-700">
                    -{formatRupiah(numericAmount)}
                  </span>
                )}
              </div>
              <input
                id="expense-amount"
                type="number"
                min="1000"
                step="1000"
                placeholder="Contoh: 350000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div>
              <label htmlFor="expense-method" className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran Kas
              </label>
              <select
                id="expense-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 cursor-pointer"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description with AI Helper */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="expense-desc" className="text-xs font-semibold text-slate-700">
                Uraian / Keterangan Transaksi (Wajib)
              </label>
              {aiLoading && (
                <span className="text-[10px] text-rose-600 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-spin" /> Menganalisis...
                </span>
              )}
            </div>
            <textarea
              id="expense-desc"
              rows={2}
              placeholder="Contoh: Pembelian token listrik PJU jalan Blok A-D atau Honor 2 satpam jaga malam"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
            />
          </div>

          {/* AI Category Suggestions Box */}
          {aiSuggestions.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                <span>Rekomendasi Kategori Otomatis:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.map((s) => (
                  <button
                    key={s.category}
                    type="button"
                    onClick={() => handleApplyAiCategory(s.category)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>{s.category}</span>
                    <span className="text-[9px] text-slate-400 font-mono capitalize">({s.confidence})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Impact Preview */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-800 block">
                  {resolvedCategory || 'Pilih Kategori'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {date} · {paymentMethod}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-extrabold text-rose-700 block tabular-nums">
                {numericAmount > 0 ? `-${formatRupiah(numericAmount)}` : 'Rp 0'}
              </span>
              <span className="text-[10px] text-slate-400">Arus Kas Keluar</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-800 hover:to-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <TrendingDown className="h-4 w-4" />
              <span>{submitting ? 'Menyimpan Pengeluaran...' : 'Simpan Pengeluaran Kas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
