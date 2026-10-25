import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Filter,
  MessageSquare,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import type { DatabaseState, PaymentConfirmation } from '../types/finance';
import type { AuthSession } from '../lib/auth';
import { formatMonthLabel, formatRupiah, formatShortDate, normalizePhoneToWa } from '../lib/finance';
import { api } from '../lib/api';

interface AdminPaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: DatabaseState;
  session: AuthSession;
  onStateUpdate: (nextState: DatabaseState) => void;
}

export const AdminPaymentVerificationModal: React.FC<AdminPaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  state,
  session,
  onStateUpdate,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProofZoom, setActiveProofZoom] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Bukti transfer tidak terbaca / dana belum masuk rekening kas');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const confirmations = state.paymentConfirmations ?? [];

  const pendingCount = useMemo(
    () => confirmations.filter((c) => c.status === 'MENUNGGU_VERIFIKASI').length,
    [confirmations]
  );

  const filteredConfirmations = useMemo(() => {
    return confirmations.filter((c) => {
      if (filterStatus === 'PENDING' && c.status !== 'MENUNGGU_VERIFIKASI') return false;
      if (filterStatus === 'APPROVED' && c.status !== 'DISETUJUI') return false;
      if (filterStatus === 'REJECTED' && c.status !== 'DITOLAK') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUnit = c.unitId.toLowerCase().includes(q);
        const matchName = c.residentName.toLowerCase().includes(q);
        const matchBank = c.senderBank.toLowerCase().includes(q);
        const matchAccount = c.senderAccountName.toLowerCase().includes(q);
        return matchUnit || matchName || matchBank || matchAccount;
      }
      return true;
    });
  }, [confirmations, filterStatus, searchQuery]);

  if (!isOpen) return null;

  const handleApprove = async (conf: PaymentConfirmation) => {
    setActionInProgressId(conf.id);
    setFeedback(null);
    try {
      const verifierName = `${session.roleLabel} (${session.displayName})`;
      const nextState = await api.approvePaymentConfirmation(conf.id, verifierName);
      setFeedback({
        type: 'success',
        message: `Pembayaran Unit ${conf.unitId} (${conf.residentName}) sebesar ${formatRupiah(conf.amount)} berhasil diverifikasi & dicatat ke Buku Kas!`,
      });
      onStateUpdate(nextState);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleConfirmReject = async (conf: PaymentConfirmation) => {
    setActionInProgressId(conf.id);
    setFeedback(null);
    try {
      const verifierName = `${session.roleLabel} (${session.displayName})`;
      const nextState = await api.rejectPaymentConfirmation(conf.id, rejectReason, verifierName);
      setFeedback({
        type: 'success',
        message: `Konfirmasi pembayaran Unit ${conf.unitId} telah ditolak. Warga dapat melihat alasan penolakan pada portalnya.`,
      });
      onStateUpdate(nextState);
      setRejectingId(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menolak konfirmasi',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="admin-payment-verification-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-emerald-300">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold">
                  Verifikasi Pembayaran Iuran Warga
                </h2>
                {pendingCount > 0 && (
                  <span
                    data-testid="pending-confirmations-badge"
                    className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[11px] font-extrabold"
                  >
                    {pendingCount} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200">
                Persetujuan bukti transfer iuran yang diunggah oleh warga melalui akun portal mereka.
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('PENDING')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === 'PENDING'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('APPROVED')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === 'APPROVED'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Disetujui ({confirmations.filter((c) => c.status === 'DISETUJUI').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('REJECTED')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === 'REJECTED'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ditolak ({confirmations.filter((c) => c.status === 'DITOLAK').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({confirmations.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari unit atau nama warga..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-emerald-800"
              />
            </div>
          </div>

          {/* Confirmations List */}
          {filteredConfirmations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Tidak ada pengajuan konfirmasi pembayaran pada filter ini.</p>
              <p>Warga yang mengunggah bukti transfer akan muncul di sini untuk Anda verifikasi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConfirmations.map((conf) => {
                const isPending = conf.status === 'MENUNGGU_VERIFIKASI';
                const isApproved = conf.status === 'DISETUJUI';
                const isRejected = conf.status === 'DITOLAK';
                const waUrl = `https://wa.me/${normalizePhoneToWa(conf.whatsapp)}`;

                return (
                  <div
                    key={conf.id}
                    data-testid={`admin-confirmation-item-${conf.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isPending
                        ? 'border-amber-200/90 bg-[#fffbeb]/40 shadow-xs'
                        : isApproved
                        ? 'border-emerald-200/90 bg-[#f0fdf4]/30'
                        : 'border-stone-200 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left Side: Resident and Transfer Details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Bukti Transfer Thumbnail */}
                        <div className="relative shrink-0 group">
                          <img
                            src={conf.proofImageUrl}
                            alt="Bukti Transfer"
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-stone-200 shadow-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveProofZoom(conf.proofImageUrl)}
                            title="Klik untuk memperbesar bukti transfer"
                            className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Zoom
                          </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 flex-1 min-w-0 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#0b2273]">
                              Unit {conf.unitId}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {conf.residentName}
                            </span>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {conf.whatsapp}
                            </a>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 pt-0.5">
                            <div>
                              Nominal: <strong className="font-mono text-emerald-900 font-extrabold text-sm">{formatRupiah(conf.amount)}</strong>
                            </div>
                            <div>
                              Periode: <strong className="text-slate-800 font-semibold">{conf.periodMonths.map(formatMonthLabel).join(', ')}</strong>
                            </div>
                            <div>
                              Metode: <span className="font-medium">{conf.paymentMethod}</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                            <p>
                              Bank: <strong>{conf.senderBank}</strong> · A.n Pengirim: <strong>{conf.senderAccountName}</strong> · Tgl: {formatShortDate(conf.transferDate)}
                            </p>
                            {conf.notes && (
                              <p className="text-slate-700 italic bg-white/70 px-2 py-1 rounded border border-stone-200">
                                Catatan warga: &ldquo;{conf.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {isApproved && (
                            <div className="mt-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                              ✓ Terverifikasi oleh {conf.verifiedBy} pada {formatShortDate(conf.verifiedAt || '')}
                              {conf.resultingReceiptNumber && (
                                <span className="ml-2 font-mono">No Kwitansi: {conf.resultingReceiptNumber}</span>
                              )}
                            </div>
                          )}

                          {isRejected && (
                            <div className="mt-2 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 inline-block">
                              ✗ Ditolak: {conf.rejectionReason} (oleh {conf.verifiedBy})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Action Buttons */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              data-testid={`approve-btn-${conf.id}`}
                              disabled={actionInProgressId === conf.id}
                              onClick={() => handleApprove(conf)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Setujui &amp; Verifikasi</span>
                            </button>

                            <button
                              type="button"
                              data-testid={`reject-btn-${conf.id}`}
                              disabled={actionInProgressId === conf.id}
                              onClick={() => {
                                setRejectingId(conf.id);
                                setRejectReason('Bukti transfer tidak terbaca / dana belum masuk rekening kas');
                              }}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Tolak</span>
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {isApproved ? 'Selesai Diverifikasi' : 'Pengajuan Ditolak'}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400">
                          Diajukan: {formatShortDate(conf.submittedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Prompt Drawer */}
                    {rejectingId === conf.id && (
                      <div className="mt-3 pt-3 border-t border-rose-200 bg-rose-50/80 -mx-4 -mb-4 p-4 rounded-b-xl space-y-2">
                        <label className="block text-xs font-bold text-rose-900">
                          Alasan Penolakan untuk Unit {conf.unitId}:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Tuliskan alasan penolakan..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-rose-300 bg-white focus:outline-none focus:border-rose-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(conf)}
                            disabled={actionInProgressId === conf.id}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 cursor-pointer shrink-0"
                          >
                            Kirim Penolakan
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-stone-200 text-slate-700 text-xs font-semibold hover:bg-stone-300 cursor-pointer shrink-0"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {pendingCount > 0 ? (
              <span className="text-amber-800 font-semibold">
                Terdapat {pendingCount} pembayaran warga yang menunggu konfirmasi.
              </span>
            ) : (
              <span>Semua pengajuan telah diproses.</span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-200 text-slate-700 hover:bg-stone-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Full-size Image Zoom Modal */}
      {activeProofZoom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setActiveProofZoom(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveProofZoom(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={activeProofZoom}
              alt="Bukti Transfer Penuh"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
