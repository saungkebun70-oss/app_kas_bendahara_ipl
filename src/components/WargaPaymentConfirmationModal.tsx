import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Send,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import type { DatabaseState, PaymentConfirmation, PaymentMethod, ResidentUnit } from '../types/finance';
import { formatMonthLabel, formatRupiah, formatShortDate } from '../lib/finance';
import { getUnitUnpaidMonths } from '../lib/qris';
import { api } from '../lib/api';

interface WargaPaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  resident: ResidentUnit;
  onSuccess: (nextState: DatabaseState) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transfer BCA Kas',
  'QRIS Saung Kebun',
  'Transfer Mandiri',
  'Tunai Bendahara',
];

export const WargaPaymentConfirmationModal: React.FC<WargaPaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  state,
  resident,
  onSuccess,
}) => {
  const unpaidMonths = getUnitUnpaidMonths(state, resident.id);
  const monthlyFee = state.settings.monthlyFee || 100000;

  // Form state
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() =>
    unpaidMonths.length > 0 ? [unpaidMonths[0]] : ['2026-10']
  );
  const [customAmount, setCustomAmount] = useState<string>(
    String((unpaidMonths.length > 0 ? 1 : 1) * monthlyFee)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer BCA Kas');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [senderBank, setSenderBank] = useState<string>('Bank BCA');
  const [senderAccountName, setSenderAccountName] = useState<string>(resident.headOfFamily);
  const [notes, setNotes] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter this resident's confirmations
  const myConfirmations = (state.paymentConfirmations ?? []).filter(
    (c) => c.unitId === resident.id
  );

  if (!isOpen) return null;

  const toggleMonth = (m: string) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      setCustomAmount(String(next.length * monthlyFee));
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Mohon unggah file gambar bukti transfer (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5 MB.');
      return;
    }

    setError(null);
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (selectedMonths.length === 0) {
      setError('Pilih minimal 1 periode bulan iuran yang dibayarkan.');
      return;
    }

    const numericAmount = Number(customAmount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Nominal pembayaran wajib lebih dari Rp 0.');
      return;
    }

    if (!proofImage) {
      setError('Silakan unggah foto/struk bukti transaksi pembayaran.');
      return;
    }

    if (!senderAccountName.trim()) {
      setError('Nama pemilik rekening atau pengirim wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const nextState = await api.submitPaymentConfirmation({
        unitId: resident.id,
        residentName: resident.headOfFamily,
        whatsapp: resident.whatsapp,
        periodMonths: selectedMonths,
        amount: Math.round(numericAmount),
        paymentMethod,
        transferDate,
        senderBank: senderBank.trim() || 'Transfer Bank',
        senderAccountName: senderAccountName.trim(),
        notes: notes.trim(),
        proofImageUrl: proofImage,
        proofFileName: proofFileName || 'bukti-transfer.png',
      });

      setSuccessMessage('Konfirmasi pembayaran berhasil dikirim! Menunggu verifikasi dari Bendahara Admin.');
      onSuccess(nextState);
      // Reset form
      setProofImage('');
      setProofFileName('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim konfirmasi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="warga-payment-confirmation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0b2273] to-[#1547b8] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-teal-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold">
                Konfirmasi Pembayaran Iuran Warga
              </h2>
              <p className="text-xs text-sky-200">
                Unit {resident.id} — {resident.headOfFamily}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Modal"
            className="rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div
              data-testid="confirmation-error-alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              data-testid="confirmation-success-alert"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Periode Bulan Iuran yang Dibayarkan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Pilih Periode Bulan Iuran yang Dibayar:
              </label>
              <div className="flex flex-wrap gap-2">
                {['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'].map((pm) => {
                  const isChecked = selectedMonths.includes(pm);
                  const isUnpaid = unpaidMonths.includes(pm);
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => toggleMonth(pm)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[#0b2273] text-white border-[#0b2273] shadow-xs'
                          : 'bg-stone-50 text-slate-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="pointer-events-none w-3.5 h-3.5 text-emerald-600 rounded"
                      />
                      <span>{formatMonthLabel(pm)}</span>
                      {isUnpaid && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 rounded px-1">
                          Tertagih
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Iuran bulanan: <strong className="text-slate-700">{formatRupiah(monthlyFee)}</strong> per bulan.
                Total dihitung: <strong className="text-emerald-800">{formatRupiah(selectedMonths.length * monthlyFee)}</strong>
              </p>
            </div>

            {/* 2. Nominal & Tanggal Transfer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Total Nominal Ditransfer (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    data-testid="confirmation-amount-input"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Tanggal Transfer:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    data-testid="confirmation-date-input"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800"
                  />
                </div>
              </div>
            </div>

            {/* 3. Metode Pembayaran & Bank Pengirim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Metode Pembayaran:
                </label>
                <select
                  data-testid="confirmation-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Bank / Dompet Pengirim:
                </label>
                <input
                  type="text"
                  data-testid="confirmation-bank-input"
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  placeholder="Contoh: BCA / Mandiri / GoPay"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800"
                />
              </div>
            </div>

            {/* 4. Nama Pengirim & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Pemilik Rekening / Pengirim:
                </label>
                <input
                  type="text"
                  data-testid="confirmation-sender-input"
                  value={senderAccountName}
                  onChange={(e) => setSenderAccountName(e.target.value)}
                  placeholder="Nama sesuai buku tabungan/mutasi"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  data-testid="confirmation-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan transfer (opsional)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-800"
                />
              </div>
            </div>

            {/* 5. Upload Bukti Transaksi */}
            <div className="space-y-2 border-t border-stone-100 pt-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Upload Foto / Struk Bukti Transaksi:
              </label>

              {!proofImage ? (
                <label
                  htmlFor="warga-proof-file"
                  data-testid="confirmation-upload-dropzone"
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    Klik untuk memilih file foto struk atau bukti transfer
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Format gambar JPG, PNG, atau WEBP (Maksimal 5 MB)
                  </span>
                  <input
                    id="warga-proof-file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <img
                    src={proofImage}
                    alt="Pratinjau Bukti Transfer"
                    className="w-20 h-20 object-contain rounded-lg border border-stone-200 bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {proofFileName || 'bukti-transfer.png'}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      ✓ Foto bukti siap dikirimkan untuk verifikasi
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setProofImage('');
                        setProofFileName('');
                      }}
                      className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                      Ganti Foto Bukti
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                data-testid="confirmation-submit-btn"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0b2273] text-white text-xs font-bold hover:bg-[#1547b8] transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mengirimkan Konfirmasi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Konfirmasi Pembayaran ke Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Section Riwayat Konfirmasi Unit Ini */}
          <div className="border-t border-stone-200 pt-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Riwayat Konfirmasi Pembayaran Unit {resident.id}</span>
              <span className="text-xs font-normal text-slate-500">
                {myConfirmations.length} Pengajuan
              </span>
            </h3>

            {myConfirmations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada konfirmasi pembayaran yang diajukan untuk unit ini.
              </p>
            ) : (
              <div className="space-y-2">
                {myConfirmations.map((c) => {
                  const isPending = c.status === 'MENUNGGU_VERIFIKASI';
                  const isApproved = c.status === 'DISETUJUI';
                  const isRejected = c.status === 'DITOLAK';

                  return (
                    <div
                      key={c.id}
                      data-testid={`confirmation-ticket-${c.id}`}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={c.proofImageUrl}
                          alt="Bukti Transfer"
                          className="w-12 h-12 object-cover rounded-lg border border-stone-200 shrink-0 bg-white"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-mono">
                              {formatRupiah(c.amount)}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 font-medium">
                              Periode: {c.periodMonths.map(formatMonthLabel).join(', ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.paymentMethod} ({c.senderBank}) · Tgl: {formatShortDate(c.transferDate)}
                          </p>
                          {c.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">
                              &ldquo;{c.notes}&rdquo;
                            </p>
                          )}
                          {isRejected && c.rejectionReason && (
                            <p className="text-[11px] font-semibold text-rose-700 mt-1">
                              Alasan Penolakan: {c.rejectionReason}
                            </p>
                          )}
                          {isApproved && c.resultingReceiptNumber && (
                            <p className="text-[11px] font-semibold text-emerald-800 mt-1 font-mono">
                              No. Kwitansi Resmi: {c.resultingReceiptNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Menunggu Verifikasi Admin</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terverifikasi (Lunas)</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Konfirmasi Ditolak</span>
                          </span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Dikirim: {formatShortDate(c.submittedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-200 text-slate-700 hover:bg-stone-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
