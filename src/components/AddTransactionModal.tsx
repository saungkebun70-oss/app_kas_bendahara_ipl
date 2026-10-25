import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Lightbulb, Loader2, Sparkles, X } from 'lucide-react';
import type {
  DatabaseState,
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
} from '../types/finance';
import {
  EXPENSE_CATEGORIES,
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
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transfer BCA Kas',
  'QRIS Saung Kebun',
  'Transfer Mandiri',
  'Tunai Bendahara',
];

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  open,
  onClose,
  state,
  defaultPeriodMonth,
  presetMode,
  onSubmitTransaction,
}) => {
  const [mode, setMode] = useState<'iuran' | 'income' | 'expense'>(presetMode);
  const [periodMonth, setPeriodMonth] = useState(defaultPeriodMonth);
  const [date, setDate] = useState('2026-10-24');
  const [unitId, setUnitId] = useState('');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Sewa Saung Warga');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Perawatan Taman & Saung');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer BCA Kas');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI-Powered Category Helper State
  const [aiSuggestions, setAiSuggestions] = useState<CategorySuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'heuristic' | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(presetMode);
      setPeriodMonth(defaultPeriodMonth);
      setDate(`${defaultPeriodMonth === '2026-10' ? '2026-10-24' : `${defaultPeriodMonth}-10`}`);
      setError(null);
      setAiSuggestions([]);
      setAiSource(null);
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
      setAmountStr(presetMode === 'iuran' ? String(state.settings.monthlyFee) : '');
      setDescription('');
    }
  }, [open, presetMode, defaultPeriodMonth, state.residents, state.transactions, state.settings.monthlyFee]);

  // Debounced category suggestions based on entered description
  useEffect(() => {
    if (!description.trim() || description.trim().length < 3) {
      setAiSuggestions([]);
      setAiSource(null);
      return;
    }

    const timer = setTimeout(async () => {
      setAiLoading(true);
      try {
        const targetMode = mode === 'iuran' ? 'income' : mode;
        const res = await api.suggestCategory(description.trim(), targetMode);
        if (res.ok && Array.isArray(res.suggestions)) {
          setAiSuggestions(res.suggestions);
          setAiSource(res.source);
        }
      } catch (err) {
        console.error('Failed to get AI category suggestions:', err);
      } finally {
        setAiLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [description, mode]);

  const handleApplyCategory = (cat: string, suggestedType?: 'income' | 'expense') => {
    if (suggestedType && suggestedType !== mode && mode !== 'iuran') {
      setMode(suggestedType);
    }
    if (EXPENSE_CATEGORIES.includes(cat as ExpenseCategory)) {
      setExpenseCategory(cat as ExpenseCategory);
      if (mode === 'income') setMode('expense');
    } else if (INCOME_CATEGORIES.includes(cat as IncomeCategory)) {
      setIncomeCategory(cat as IncomeCategory);
      if (mode === 'expense') setMode('income');
    }
    setAppliedFeedback(`Kategori "${cat}" berhasil diterapkan!`);
    setTimeout(() => setAppliedFeedback(null), 3500);
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

    if (!date || !periodMonth) {
      setError('Tanggal dan periode bulan wajib diisi.');
      return;
    }

    if (mode === 'iuran') {
      if (!unitId) {
        setError('Pilih salah satu unit rumah warga.');
        return;
      }
      if (paidUnitsInSelectedMonth.has(unitId)) {
        setError(`Unit ${unitId} sudah berstatus LUNAS pada periode ${formatMonthLabel(periodMonth)}.`);
        return;
      }
      const resident = state.residents.find((r) => r.id === unitId);
      const autoDesc =
        description.trim() ||
        `Iuran bulanan lingkungan ${unitId} (${resident?.headOfFamily ?? ''}) periode ${periodMonth}`;

      setSubmitting(true);
      try {
        await onSubmitTransaction({
          date,
          periodMonth,
          type: 'income',
          category: 'Iuran Bulanan Warga',
          amount: state.settings.monthlyFee,
          unitId,
          paymentMethod,
          description: autoDesc,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran iuran.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const numericAmount = Number(amountStr.replace(/[^\d]/g, ''));
    if (!amountStr.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Masukkan nominal transaksi yang valid (lebih dari Rp 0).');
      return;
    }

    if (!description.trim()) {
      setError('Uraian keterangan transaksi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTransaction({
        date,
        periodMonth,
        type: mode === 'income' ? 'income' : 'expense',
        category: mode === 'income' ? incomeCategory : expenseCategory,
        amount: numericAmount,
        unitId: null,
        paymentMethod,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
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
      <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 id="add-trx-modal-title" className="font-display text-lg font-bold text-slate-900">
            Catat Transaksi Kas Saung Kebun
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir transaksi"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div
            className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1"
            role="group"
            aria-label="Jenis pencatatan transaksi"
          >
            <button
              type="button"
              onClick={() => {
                setMode('iuran');
                setAmountStr(String(state.settings.monthlyFee));
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                mode === 'iuran'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iuran Warga
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('income');
                setAmountStr('');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                mode === 'income'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pemasukan Lain
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('expense');
                setAmountStr('');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                mode === 'expense'
                  ? 'bg-white text-red-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengeluaran Kas
            </button>
          </div>

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
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
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
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
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
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
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

              <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Tarif Iuran Bulanan Tetap
                </span>
                <span className="font-mono text-base font-bold text-emerald-900 tabular-nums">
                  {formatRupiah(state.settings.monthlyFee)}
                </span>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="trx-category" className="block text-xs font-semibold text-slate-700">
                  Kategori Akun Kas
                </label>
                {mode === 'income' ? (
                  <select
                    id="trx-category"
                    value={incomeCategory}
                    onChange={(e) => setIncomeCategory(e.target.value as IncomeCategory)}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                  >
                    {INCOME_CATEGORIES.filter((c) => c !== 'Iuran Bulanan Warga').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id="trx-category"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="trx-amount" className="block text-xs font-semibold text-slate-700">
                  Nominal (Rp)
                </label>
                <input
                  id="trx-amount"
                  type="number"
                  min="1000"
                  step="500"
                  placeholder="Contoh: 350000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-800 focus:outline-none"
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
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
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
                  : 'Contoh: Pembayaran retribusi pengangkutan sampah atau perbaikan lampu gerbang...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
            />
          </div>

          {/* AI-Powered Category Helper Panel */}
          {mode !== 'iuran' && (
            <div
              data-testid="ai-category-helper"
              className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/50 p-3.5 space-y-2.5 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Saran Kategori AI (AI Category Helper)</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                    {aiSource === 'gemini' ? 'Gemini 3.8 Flash' : 'Smart Rule-AI'}
                  </span>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Menganalisis uraian...</span>
                  </div>
                )}
              </div>

              {appliedFeedback && (
                <div
                  data-testid="ai-applied-feedback"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 animate-in fade-in"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{appliedFeedback}</span>
                </div>
              )}

              {aiSuggestions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {aiSuggestions.map((sug, idx) => {
                      const isCurrent =
                        (mode === 'expense' && expenseCategory === sug.category) ||
                        (mode === 'income' && incomeCategory === sug.category);

                      return (
                        <button
                          key={idx}
                          type="button"
                          data-testid="ai-suggested-category-btn"
                          onClick={() => handleApplyCategory(sug.category, sug.suggestedType)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-900 text-white shadow-xs ring-2 ring-emerald-500/50'
                              : 'bg-white border border-indigo-200 text-indigo-950 hover:bg-indigo-50 hover:border-indigo-300 shadow-2xs'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>{sug.category}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              sug.confidence === 'high'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sug.confidence === 'high' ? 'Sangat Cocok' : 'Cocok'}
                          </span>
                          {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-300 ml-0.5" />}
                        </button>
                      );
                    })}

                    {/* Alternatives from first suggestion */}
                    {aiSuggestions[0]?.alternatives?.map((alt) => {
                      const isCurrent =
                        (mode === 'expense' && expenseCategory === alt) ||
                        (mode === 'income' && incomeCategory === alt);
                      return (
                        <button
                          key={alt}
                          type="button"
                          data-testid="ai-alternative-category-btn"
                          onClick={() => handleApplyCategory(alt)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-800 text-white font-bold'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {alt}
                        </button>
                      );
                    })}
                  </div>

                  {aiSuggestions[0]?.explanation && (
                    <p className="text-[11px] text-indigo-900/80 italic">
                      💡 {aiSuggestions[0].explanation}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-500">
                    Ketik uraian transaksi untuk mendapatkan rekomendasi kategori otomatis dari AI. Contoh cepat:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      'Pengangkutan sampah 55 rumah',
                      'Honor 2 personel satpam jaga malam',
                      'Perbaikan engsel gerbang utama & CCTV',
                      'Pembelian token listrik PJU jalan',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setDescription(example)}
                        className="rounded-md border border-indigo-100 bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        + &ldquo;{example}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Menyimpan...' : 'Simpan ke Buku Kas & LPJ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
