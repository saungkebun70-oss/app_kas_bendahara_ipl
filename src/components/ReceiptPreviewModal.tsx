import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction, ResidentUnit } from '../types/finance';
import {
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
} from '../lib/finance';
import { downloadUnitReceiptPDF, getUnitReceiptPDFDataUri } from '../lib/pdfExport';

interface ReceiptPreviewModalProps {
  open: boolean;
  resident: ResidentUnit | null;
  transaction: LedgerTransaction | null;
  state: DatabaseState;
  onClose: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  open,
  resident,
  transaction,
  state,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'digital' | 'pdf'>('digital');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const pdfDataUri = useMemo(() => {
    if (!open || !resident || !transaction) return null;
    try {
      return getUnitReceiptPDFDataUri(state, resident, transaction);
    } catch {
      return null;
    }
  }, [open, resident, transaction, state]);

  if (!open || !resident || !transaction) return null;

  const recordedByDisplay = (transaction.recordedBy || state.settings.treasurerName || 'Admin — Ketua Paguyuban (Erlangga)')
    .replace(/Ratna\s*Sari\s*Dewi,?\s*S\.E\./gi, state.settings.treasurerName || 'Andriansyah')
    .replace(/H\.\s*Hendra\s*Wijaya,?\s*S\.T\./gi, state.settings.chairpersonName || 'Erlangga');

  const handleDownload = () => {
    const filename = downloadUnitReceiptPDF(state, resident, transaction);
    setDownloadSuccess(`File kwitansi "${filename}" berhasil diunduh ke perangkat Anda.`);
    setTimeout(() => {
      setDownloadSuccess(null);
    }, 4000);
  };

  const handlePrint = () => {
    if (viewMode === 'pdf' && pdfDataUri) {
      const iframe = document.getElementById('receipt-pdf-frame') as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    }
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-preview-title"
    >
      <div className="flex flex-col w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh]">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#28999e] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-[#5eead4]">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5eead4]">
                  Preview Bukti Transaksi Resmi
                </span>
                <span className="rounded bg-white/20 px-2 py-0.2 text-[10px] font-mono text-white">
                  {transaction.receiptNumber}
                </span>
              </div>
              <h2 id="receipt-preview-title" className="font-display text-base font-bold text-white">
                Kwitansi Pembayaran Iuran — Unit {resident.id}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup preview kwitansi"
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Mode Switcher & Notice */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-[#0f9f90]" />
            <span>
              Periksa rincian bukti transaksi di bawah sebelum mengunduh file PDF resmi.
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Kwitansi Digital Resmi</span>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mx-6 mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-teal-950">
            <CheckCircle2 className="h-4 w-4 text-[#0f9f90] shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Modal Body Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          {viewMode === 'digital' ? (
            /* Digital Official Receipt Document Card */
            <div
              data-testid="receipt-digital-preview"
              className="mx-auto max-w-2xl rounded-2xl border-2 border-emerald-800/80 bg-white p-6 shadow-md space-y-5 print:shadow-none print:border-none"
            >
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 block">
                    {state.settings.housingName}
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    KWITANSI PEMBAYARAN IURAN WARGA
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {state.settings.rtRwLabel} · {state.settings.housingAddress}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    Rekening Kas: {state.settings.bankAccountInfo}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block rounded-lg border-2 border-emerald-700 bg-emerald-50 px-3 py-1 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      STATUS
                    </span>
                    <span className="font-display text-sm font-extrabold text-emerald-900">
                      LUNAS
                    </span>
                  </div>
                  <div className="mt-2 text-right text-xs">
                    <div className="font-mono text-slate-500 font-semibold">
                      No: {transaction.receiptNumber}
                    </div>
                    <div className="text-slate-500">
                      Tanggal: <strong>{formatShortDate(transaction.date)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Details Breakdown Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <td className="w-1/3 py-2.5 px-4 font-bold text-slate-700">
                        Unit Rumah / Blok
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-900">
                        {resident.id} ({resident.streetName})
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2.5 px-4 font-bold text-slate-700">
                        Telah Diterima Dari
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {resident.headOfFamily}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-700">
                        Periode Iuran
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#0b2273]">
                        {formatMonthLabel(transaction.periodMonth)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2.5 px-4 font-bold text-slate-700">
                        Metode Pembayaran
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {transaction.paymentMethod}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-700">
                        Uraian Transaksi
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {transaction.description}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/80">
                      <td className="py-3 px-4 font-bold text-emerald-950 text-sm">
                        JUMLAH DITERIMA
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-base font-extrabold text-emerald-900 tabular-nums">
                          {formatRupiah(transaction.amount)}
                        </span>
                        <span className="block text-[11px] font-semibold text-emerald-800">
                          (Seratus Ribu Rupiah)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Signatures & Seal */}
              <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="space-y-1 text-[11px] text-slate-500">
                  <p>Catatan:</p>
                  <p className="italic">
                    • Bukti kwitansi resmi yang sah dari ketua pengurus saung kebun
                  </p>
                  <p className="italic">
                    • Dicatat oleh: {recordedByDisplay}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">
                    Karawang, {formatShortDate(transaction.date)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 block mt-1">
                    Bendahara Pengurus Kas,
                  </span>
                  <div className="h-10 flex items-center justify-end pr-4">
                    <span className="font-serif italic text-emerald-800 text-sm font-bold opacity-80">
                      [Tanda Tangan Terverifikasi]
                    </span>
                  </div>
                  <span className="font-display font-bold text-slate-900 block border-t border-slate-300 pt-1">
                    {state.settings.treasurerName}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Real Embedded PDF Document View */
            <div data-testid="receipt-pdf-frame-container" className="h-[480px] w-full rounded-xl overflow-hidden border border-slate-200 bg-white">
              {pdfDataUri ? (
                <iframe
                  id="receipt-pdf-frame"
                  src={pdfDataUri}
                  title={`Preview Dokumen PDF Kwitansi ${transaction.receiptNumber}`}
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Sedang menyiapkan pratinjau lembar PDF...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-xs text-slate-500">
            Nomor Bukti: <strong className="font-mono text-slate-800">{transaction.receiptNumber}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Bukti</span>
            </button>

            <button
              type="button"
              data-testid="receipt-download-pdf-btn"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1547b8] px-4 py-2 text-xs font-bold text-white hover:bg-[#103896] shadow-sm transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#5eead4]" />
              <span>Unduh File PDF Sekarang</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
