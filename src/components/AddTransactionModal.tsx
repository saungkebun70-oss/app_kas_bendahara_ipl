import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Receipt, Sparkles, X } from 'lucide-react';
import type {
  DatabaseState,
  IncomeCategory,
  PaymentMethod,
} from '../types/finance';
import {
  formatMonthLabel,
  formatRupiah,
  INCOME_CATEGORIES,
} from '../lib/finance';
import { api, type CategorySuggestion, type CreateTransactionPayload } from '../lib/api';

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  state: DatabaseState;
  defaultPeriodMonth: string;
  presetMode: 'iuran' | 'income' | 'expense';
  onSubmitTransaction: (payload: CreateTransactionPayload) => Promise<void>;
  onOpenExpenseModal?: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transfer Bank',
  'QRIS',
  'Tunai',
];

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  open,
  onClose,
  state,
  defaultPeriodMonth,
  presetMode,
  onSubmitTransaction,
  onOpenExpenseModal,
}) => {
  const [mode, setMode] = useState<'iuran' | 'income'>(presetMode === 'expense' ? 'iuran' : presetMode);
  const [periodMonth, setPeriodMonth] = useState(defaultPeriodMonth);
  const [date, setDate] = useState('2026-10-24');
  const [unitId, setUnitId] = useState('');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Sewa Saung Warga');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer Bank');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI-Powered Category Helper State
  const [aiSuggestions, setAiSuggestions] = useState<CategorySuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (presetMode === 'expense') {
        onClose();
        onOpenExpenseModal?.();
        return;
      }

      setMode(presetMode === 'income' ? 'income' : 'iuran');
      setPeriodMonth(defaultPeriodMonth);
      setDate(`${defaultPeriodMonth === '2026-10' ? '2026-10-24' : `${defaultPeriodMonth}-10`}`);
      setError(null);
      setAiSuggestions([]);
      setAppliedFeedback(null);

      const paidInPeriod = new Set(
        state.transactions
          .filter(
            (t) =>
              t.type === 'income' &&
              t.category === 'Iuran Bulanan Warga' &&
              t.periodMonth === defaultPeriodMonth &&
              t.unitId
          )
          .map((t) => t.unitId!)
      );
      const firstUnpaid = state.residents.find((r) => !paidInPeriod.has(r.id));
      setUnitId(firstUnpaid?.id ?? state.residents[0]?.id ?? 'A-01');
      setAmountStr(presetMode === 'income' ? '' : String(state.settings.monthlyFee));
      setDescription('');
    }
  }, [open, presetMode, defaultPeriodMonth, state.residents, state.transactions, state.settings.monthlyFee, onClose, onOpenExpenseModal]);

  // Debounced category suggestions based on entered description
  useEffect(() => {
    if (mode !== 'income' || !description.trim() || description.trim().length < 3) {
      setAiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await api.suggestCategory(description.trim(), 'income');
        if (res.ok && Array.isArray(res.suggestions)) {
          setAiSuggestions(res.suggestions);
        }
      } catch (err) {
        console.error('Failed to get AI category suggestions:', err);
      } finally {
        setAiLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [description, mode]);

  const handleApplyCategory = (cat: string) => {
    if (INCOME_CATEGORIES.includes(cat as IncomeCategory)) {
      setIncomeCategory(cat as IncomeCategory);
      setAppliedFeedback(`Kategori "${cat}" berhasil diterapkan!`);
      setTimeout(() => setAppliedFeedback(null), 3500);
    }
  };

  if (!open) return null;

  const paidUnitsInSelectedMonth = new Set(
    state.transactions
      .filter(
        (t) =>
          t.type === 'income' &&
          t.category === 'Iuran Bulanan Warga' &&
          t.periodMonth === periodMonth &&
          t.unitId
      )
      .map((t) => t.unitId!)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amountStr.replace(/\D/g, '')) || 0;

    if (mode === 'iuran') {
      if (!unitId) {
        setError('Pilih unit rumah terlebih dahulu.');
        return;
      }
      if (paidUnitsInSelectedMonth.has(unitId)) {
        setError(
          `Unit ${unitId} sudah tercatat lunas untuk periode ${formatMonthLabel(
            periodMonth
          )}. Pilih unit lain atau ubah periode.`
        );
        return;
      }
      if (numericAmount <= 0) {
        setError('Nominal iuran harus lebih besar dari Rp 0.');
        return;
      }

      setSubmitting(true);
      try {
        const resObj = state.residents.find((r) => r.id === unitId);
        const autoDesc = description.trim()
          ? description.trim()
          : `Iuran bulanan lingkungan ${unitId} (${resObj?.headOfFamily ?? 'Warga'}) periode ${formatMonthLabel(periodMonth)}`;

        await onSubmitTransaction({
          date,
          periodMonth,
          type: 'income',
          category: 'Iuran Bulanan Warga',
          amount: numericAmount,
          unitId,
          paymentMethod,
          description: autoDesc,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan iuran.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Pemasukan Non-Iuran
    if (numericAmount <= 0) {
      setError('Nominal pemasukan harus lebih besar dari Rp 0.');
      return;
    }

    if (!description.trim()) {
      setError('Uraian / keterangan pemasukan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTransaction({
        date,
        periodMonth,
        type: 'income',
        category: incomeCategory,
        amount: numericAmount,
        unitId: null,
        paymentMethod,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi pemasukan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-trx-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 id="add-trx-modal-title" className="font-display text-base sm:text-lg font-bold text-slate-900">
              Catat Pemasukan Kas &amp; Iuran
            </h2>
            <p className="text-xs text-slate-500">
              Formulir khusus penerimaan kas masuk (Iuran warga &amp; non-iuran)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir transaksi"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Separated Tabs: Only Iuran and Income (Expense is in separate form) */}
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1"
            role="group"
            aria-label="Jenis pencatatan pemasukan"
          >
            <button
              type="button"
              onClick={() => {
                setMode('iuran');
                setAmountStr(String(state.settings.monthlyFee));
                setError(null);
              }}
              className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                mode === 'iuran'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iuran Bulanan Warga (55 Rumah)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('income');
                setAmountStr('');
                setError(null);
              }}
              className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                mode === 'income'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pemasukan Lainnya (Donasi / Sewa)
            </button>
          </div>

          {/* Quick Notice to open Separated Expense Form */}
          {onOpenExpenseModal && (
            <div className="flex items-center justify-between text-xs bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2 text-rose-900">
              <span className="font-medium flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-rose-700" />
                Catat pengeluaran kas operasional?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExpenseModal();
                }}
                className="font-bold text-rose-700 hover:text-rose-950 hover:underline cursor-pointer"
              >
                Buka Form Pengeluaran →
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="trx-period" className="block text-xs font-semibold text-slate-700">
                Periode Bulan Buku &amp; LPJ
              </label>
              <select
                id="trx-period"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none cursor-pointer"
              >
                {PERIOD_OPTIONS.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="trx-date" className="block text-xs font-semibold text-slate-700">
                Tanggal Transaksi
              </label>
              <input
                id="trx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'iuran' ? (
            <>
              <div>
                <label htmlFor="trx-unit" className="block text-xs font-semibold text-slate-700">
                  Pilih Unit Rumah (55 Rumah Saung Kebun)
                </label>
                <select
                  id="trx-unit"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none cursor-pointer"
                >
                  {state.residents.map((r) => {
                    const isPaid = paidUnitsInSelectedMonth.has(r.id);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.id} — {r.headOfFamily} ({isPaid ? 'Sudah Lunas' : 'Belum Bayar'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Tarif Iuran Bulanan Wajib
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Otomatis dihitung masuk ke kas dan kwitansi resmi
                  </span>
                </div>
                <span className="font-mono text-base font-extrabold text-emerald-900 tabular-nums">
                  {formatRupiah(state.settings.monthlyFee)}
                </span>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="trx-category" className="block text-xs font-semibold text-slate-700">
                  Kategori Pemasukan
                </label>
                <select
                  id="trx-category"
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value as IncomeCategory)}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none cursor-pointer"
                >
                  {INCOME_CATEGORIES.filter((c) => c !== 'Iuran Bulanan Warga').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="trx-amount" className="block text-xs font-semibold text-slate-700">
                  Nominal Pemasukan (Rp)
                </label>
                <input
                  id="trx-amount"
                  type="number"
                  min="1000"
                  step="500"
                  placeholder="Contoh: 500000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="trx-method" className="block text-xs font-semibold text-slate-700">
              Metode Pembayaran
            </label>
            <select
              id="trx-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-800 focus:outline-none cursor-pointer"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="trx-desc" className="block text-xs font-semibold text-slate-700">
                Uraian / Keterangan {mode === 'iuran' ? '(Opsional)' : '(Wajib)'}
              </label>
              {mode !== 'iuran' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Helper Otomatis</span>
                </span>
              )}
            </div>
            <input
              id="trx-desc"
              data-testid="transaction-description-input"
              type="text"
              placeholder={
                mode === 'iuran'
                  ? 'Otomatis diisi apabila dikosongkan'
                  : 'Contoh: Sewa saung warga acara syukuran keluarga atau donasi penerangan jalan'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
            />
          </div>

          {/* AI Suggestion Box */}
          {aiSuggestions.length > 0 && mode === 'income' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Rekomendasi Kategori:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.map((s) => (
                  <button
                    key={s.category}
                    type="button"
                    onClick={() => handleApplyCategory(s.category)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <span>{s.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {appliedFeedback && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-900 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-700" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0b2273] px-5 py-2 text-xs font-bold text-white hover:bg-[#1547b8] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Menyimpan...' : 'Simpan Pemasukan Kas'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
