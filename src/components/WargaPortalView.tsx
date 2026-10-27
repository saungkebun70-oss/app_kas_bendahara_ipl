import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Lock,
  MapPin,
  Megaphone,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction, ResidentUnit } from '../types/finance';
import type { AuthSession } from '../lib/auth';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  getPublishedAnnouncements,
  getPublishedArrearsForWargaPortal,
  getPublishedSecurityReports,
  getUnitMonthsMatrix,
  getUnitTransactions,
} from '../lib/finance';
import { getResidentQRISPaymentInfo } from '../lib/qris';
import { downloadMonthlyReportPDF, downloadQuarterlyLPJPDF, downloadUnitReceiptPDF } from '../lib/pdfExport';
import { WargaPaymentConfirmationModal } from './WargaPaymentConfirmationModal';

export type WargaPortalTab =
  | 'iuran'
  | 'kwitansi'
  | 'kegiatan'
  | 'keamanan'
  | 'tunggakan'
  | 'laporan';

interface WargaPortalViewProps {
  state: DatabaseState;
  session: AuthSession;
  activePeriodMonth: string;
  onChangePeriodMonth: (pm: string) => void;
  onPreviewReceipt?: (resident: ResidentUnit, trx: LedgerTransaction) => void;
  onStateUpdate?: (nextState: DatabaseState) => void;
  activeTab?: WargaPortalTab;
  onChangeTab?: (tab: WargaPortalTab) => void;
}

const MATRIX_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const WargaPortalView: React.FC<WargaPortalViewProps> = ({
  state,
  session,
  activePeriodMonth,
  onChangePeriodMonth,
  onPreviewReceipt,
  onStateUpdate,
  activeTab: externalTab,
  onChangeTab: setExternalTab,
}) => {
  const [internalTab, setInternalTab] = useState<WargaPortalTab>('iuran');
  const currentTab = externalTab || internalTab;

  const handleTabChange = (tab: WargaPortalTab) => {
    setInternalTab(tab);
    setExternalTab?.(tab);
  };

  const [showQRISBox, setShowQRISBox] = useState(true);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  const unitId = session.unitId || 'A-05';
  const resident =
    state.residents.find((r) => r.id === unitId) || state.residents[0];

  const myMatrix = getUnitMonthsMatrix(state.transactions, resident.id, MATRIX_MONTHS);
  const myHistory = getUnitTransactions(state.transactions, resident.id);
  const myTotalPaid = myHistory.reduce((sum, t) => sum + t.amount, 0);
  const qrisInfo = getResidentQRISPaymentInfo(state, resident);

  const publishedAnnouncements = getPublishedAnnouncements(state);
  const publishedSecurityReports = getPublishedSecurityReports(state);
  const arrearsPublication = getPublishedArrearsForWargaPortal(state, activePeriodMonth);

  const pendingConfirmation = (state.paymentConfirmations ?? []).find(
    (c) => c.unitId === resident.id && c.status === 'MENUNGGU_VERIFIKASI'
  );

  const handleDownloadMyReceipt = (trx: LedgerTransaction) => {
    if (onPreviewReceipt) {
      onPreviewReceipt(resident, trx);
    } else {
      downloadUnitReceiptPDF(state, resident, trx);
    }
  };

  return (
    <div
      data-testid="warga-portal-view"
      className="p-3.5 sm:p-6 lg:p-8 max-w-[1380px] mx-auto w-full space-y-5 overflow-hidden"
    >
      {/* Top Personal Resident Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#28999e] p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200">
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 font-mono font-bold text-[#5eead4]">
                Portal Akun Warga · Unit {resident.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{resident.streetName}</span>
              <span aria-hidden="true">·</span>
              <span>{resident.occupancyStatus}</span>
            </div>
            <h1 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-white">
              Selamat Datang, {resident.headOfFamily}
            </h1>
            <p className="mt-1 text-xs text-sky-100 max-w-2xl">
              Portal mandiri Perumahan Saung Kebun untuk cek status iuran, bayar QRIS, unduh kwitansi, pantau agenda warga, laporan keamanan satpam, dan laporan keuangan resmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="warga-open-confirmation-btn"
              onClick={() => setConfirmationModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#082068] shadow-sm hover:bg-teal-50 transition-colors cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-[#1547b8]" />
              <span>Konfirmasi Bayar</span>
            </button>
            <button
              type="button"
              data-testid="warga-toggle-qris-btn"
              onClick={() => setShowQRISBox((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] px-3.5 py-2 text-xs font-bold text-[#082068] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>{showQRISBox ? 'Sembunyikan QRIS' : 'Lihat QRIS'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Confirmation Alert for Resident */}
      {pendingConfirmation && (
        <div
          data-testid="warga-pending-confirmation-alert"
          className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 text-sm">
                Konfirmasi Pembayaran Anda Sedang Diverifikasi oleh Admin
              </p>
              <p className="text-amber-800 mt-0.5">
                Pengajuan pembayaran periode <strong>{pendingConfirmation.periodMonths.map(formatMonthLabel).join(', ')}</strong> ({formatRupiah(pendingConfirmation.amount)}) dalam antrean verifikasi Bendahara.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmationModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            Lihat Detail Konfirmasi
          </button>
        </div>
      )}

      {/* Navigation Bar: Tampilan Per Item Sesuai Judul Item Warga */}
      <div className="overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 max-w-full">
        <div
          role="tablist"
          aria-label="Navigasi Halaman Portal Warga"
          className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'iuran'}
            onClick={() => handleTabChange('iuran')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'iuran'
                ? 'bg-[#1547b8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Status Iuran &amp; QRIS</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'kwitansi'}
            onClick={() => handleTabChange('kwitansi')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'kwitansi'
                ? 'bg-[#1547b8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Kwitansi ({myHistory.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'kegiatan'}
            onClick={() => handleTabChange('kegiatan')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'kegiatan'
                ? 'bg-[#1547b8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Kegiatan Warga ({publishedAnnouncements.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'keamanan'}
            onClick={() => handleTabChange('keamanan')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'keamanan'
                ? 'bg-[#0f766e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Laporan Satpam ({publishedSecurityReports.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'tunggakan'}
            onClick={() => handleTabChange('tunggakan')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'tunggakan'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Tunggakan ({arrearsPublication.publishedItems.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'laporan'}
            onClick={() => handleTabChange('laporan')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTab === 'laporan'
                ? 'bg-[#1547b8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Laporan Kas &amp; LPJ</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HALAMAN 1: STATUS IURAN & QRIS PEMBAYARAN                                 */}
      {/* ========================================================================= */}
      {currentTab === 'iuran' && (
        <div className="space-y-5">
          {/* Collapsible Uploaded QRIS Payment Box */}
          {showQRISBox && (
            <section
              aria-label="Kode QRIS Pembayaran Iuran"
              data-testid="warga-qris-box"
              className="rounded-2xl border-2 border-[#38d3c3] bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[11px] font-bold text-[#0b2273] mb-2 uppercase tracking-wider">
                    QRIS Resmi Paguyuban ({qrisInfo.qrisFileName})
                  </span>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs max-w-full">
                    <img
                      src={qrisInfo.qrisImageUrl}
                      alt={`QRIS ${state.settings.housingName}`}
                      className="h-44 sm:h-52 w-auto object-contain mx-auto"
                    />
                  </div>
                  <a
                    href={qrisInfo.qrisImageUrl}
                    download={qrisInfo.qrisFileName}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1547b8] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Gambar QRIS</span>
                  </a>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div className="rounded-xl bg-[#0b2273] p-4 text-white">
                    <span className="text-xs text-sky-200">
                      Total Tagihan Unit {resident.id} — {resident.headOfFamily}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-[#5eead4] tabular-nums">
                      {qrisInfo.formattedAmount}
                    </p>
                    <p className="mt-1 text-xs text-sky-100">
                      Periode: {qrisInfo.unpaidLabels.join(', ') || 'Tidak ada tunggakan'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px]">Merchant QRIS</span>
                      <strong className="text-slate-900 font-semibold text-xs">
                        {qrisInfo.merchantName}
                      </strong>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        NMID: {qrisInfo.nmid}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[11px]">Rekening Kas Paguyuban</span>
                      <strong className="text-slate-900 font-mono text-xs block">
                        {state.settings.bankAccountInfo}
                      </strong>
                    </div>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmationModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Konfirmasi Transfer &amp; Upload Struk</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section: Status Iuran Rumah Sendiri */}
          <section
            id="warga-section-iuran"
            aria-label="Riwayat Iuran Rumah Anda Sendiri"
            data-testid="warga-own-iuran-section"
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f9f90]">
                  Status Iuran Bulanan
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Matriks Iuran Unit {resident.id} ({resident.headOfFamily})
                </h2>
                <p className="text-xs text-slate-500">
                  Tarif iuran wajib lingkungan: {formatRupiah(state.settings.monthlyFee)} / bulan (jatuh tempo tanggal {state.settings.dueDayOfMonth})
                </p>
              </div>

              <div className="rounded-xl bg-[#f0fdfa] border border-teal-200 px-4 py-2 text-left sm:text-right">
                <span className="block text-[11px] text-[#0f766e] font-semibold">
                  Total Terbayar Unit {resident.id}
                </span>
                <span
                  data-testid="warga-own-total-paid"
                  className="font-mono text-base font-extrabold text-[#0b2273] tabular-nums"
                >
                  {formatRupiah(myTotalPaid)} ({myHistory.length} Kwitansi)
                </span>
              </div>
            </div>

            {/* 6-Month Status Grid for This Resident's Unit */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {myMatrix.map((cell) => (
                <div
                  key={cell.periodMonth}
                  className={`rounded-xl border p-3 text-center transition-colors ${
                    cell.paid
                      ? 'border-teal-200 bg-[#f0fdfa]/70'
                      : 'border-rose-200 bg-rose-50/50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">
                    {formatMonthLabel(cell.periodMonth)}
                  </div>
                  {cell.paid ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#0f9f90]">
                      <Check className="h-3.5 w-3.5" />
                      <span>Lunas</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-xs font-bold text-rose-600">
                      Belum Bayar
                    </div>
                  )}
                  <div className="mt-1 font-mono text-[10px] text-slate-500 truncate">
                    {cell.transaction ? cell.transaction.receiptNumber : formatRupiah(state.settings.monthlyFee)}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-600">
                Butuh melihat bukti kwitansi resmi atau mengunduh PDF?
              </span>
              <button
                type="button"
                onClick={() => handleTabChange('kwitansi')}
                className="inline-flex items-center gap-1.5 font-bold text-[#1547b8] hover:underline cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Buka Halaman Kwitansi Pembayaran &rarr;</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 2: DAFTAR KWITANSI PEMBAYARAN UNIT SENDIRI                        */}
      {/* ========================================================================= */}
      {currentTab === 'kwitansi' && (
        <section
          id="warga-section-kwitansi"
          aria-label="Riwayat Kwitansi Pembayaran Unit Anda"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1547b8]">
                Bukti Pembayaran Resmi
              </span>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                Kwitansi Pembayaran Iuran Unit {resident.id}
              </h2>
              <p className="text-xs text-slate-500">
                Daftar transaksi yang telah diverifikasi dan masuk kas resmi paguyuban. Anda dapat mengunduh dokumen PDF kwitansi kapan saja.
              </p>
            </div>
            <span className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-1 font-mono text-xs font-bold text-[#0f766e]">
              Total: {myHistory.length} Kwitansi ({formatRupiah(myTotalPaid)})
            </span>
          </div>

          {myHistory.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Belum ada kwitansi transaksi tercatat</p>
              <p>Segera lakukan pembayaran iuran lalu ajukan konfirmasi transfer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-xl border border-slate-200 table-scroll-container">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 pl-4 pr-3">Tanggal Bayar</th>
                    <th className="px-3 py-2.5">Periode Iuran</th>
                    <th className="px-3 py-2.5">No. Kwitansi</th>
                    <th className="px-3 py-2.5">Metode</th>
                    <th className="px-3 py-2.5 text-right">Nominal</th>
                    <th className="py-2.5 pl-3 pr-4 text-right">Bukti Resmi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myHistory.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pl-4 pr-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatShortDate(trx.date)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {formatMonthLabel(trx.periodMonth)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {trx.receiptNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                        {trx.paymentMethod}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-[#0f9f90] tabular-nums whitespace-nowrap">
                        {formatRupiah(trx.amount)}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDownloadMyReceipt(trx)}
                          className="inline-flex items-center gap-1 font-bold text-[#1547b8] hover:underline cursor-pointer"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span>Unduh PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 3: INFORMASI KEGIATAN & PENGUMUMAN WARGA                          */}
      {/* ========================================================================= */}
      {currentTab === 'kegiatan' && (
        <section
          id="warga-section-kegiatan"
          aria-label="Informasi Kegiatan dan Pengumuman Admin"
          data-testid="warga-published-announcements"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1547b8] text-white">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1547b8]">
                  Dipublikasikan oleh Admin Pengurus
                </span>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Informasi Kegiatan &amp; Pengumuman Warga
                </h2>
              </div>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-mono text-xs font-bold text-[#1547b8]">
              {publishedAnnouncements.length} Aktif
            </span>
          </div>

          {publishedAnnouncements.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Belum ada informasi kegiatan atau pengumuman yang dipublikasikan oleh Admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedAnnouncements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-[#e8effd] px-2.5 py-0.5 text-[10px] font-bold text-[#1547b8]">
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-600">
                      <Calendar className="h-3 w-3 text-[#1547b8]" />
                      <span>{formatShortDate(item.eventDate)}</span>
                    </span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="text-xs leading-relaxed text-slate-600">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{item.location}</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      Oleh: {item.authorName}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 4: INFORMASI KEAMANAN & PATROLI JAGA SATPAM                       */}
      {/* ========================================================================= */}
      {currentTab === 'keamanan' && (
        <section
          id="warga-section-keamanan"
          aria-label="Informasi Keamanan Satuan Pengamanan yang Jaga"
          data-testid="warga-published-security"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f766e] text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f766e]">
                  Satuan Pengamanan (Satpam Jaga)
                </span>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Informasi Keamanan Lingkungan &amp; Patroli Pos Gerbang
                </h2>
              </div>
            </div>
            <span className="rounded-full bg-[#e0f7f4] px-2.5 py-1 font-mono text-xs font-bold text-[#0f766e]">
              {publishedSecurityReports.length} Laporan
            </span>
          </div>

          {publishedSecurityReports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Belum ada laporan keamanan yang dipublikasikan oleh Satuan Pengamanan yang bertugas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedSecurityReports.map((sec) => {
                const isAman = sec.situationStatus === 'Aman Terkendali';
                const isWaspada = sec.situationStatus === 'Waspada Lingkungan';
                return (
                  <article
                    key={sec.id}
                    className="rounded-xl border border-teal-200/80 bg-[#f0fdfa]/40 p-4 space-y-2.5 hover:bg-[#f0fdfa]/70 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold ${
                          isAman
                            ? 'bg-teal-100 text-teal-900'
                            : isWaspada
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        <ShieldAlert className="h-3 w-3" />
                        <span>Status: {sec.situationStatus}</span>
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        {formatShortDate(sec.reportDate)} · {sec.shift}
                      </span>
                    </div>

                    <h3 className="font-display text-sm font-bold text-slate-900">
                      {sec.title}
                    </h3>

                    <p className="text-xs leading-relaxed text-slate-600">
                      {sec.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-200/60 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3 w-3 text-[#0f766e]" />
                        <span>{sec.patrolArea}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#0b2273]">
                        <UserCheck className="h-3.5 w-3.5 text-[#0f9f90]" />
                        <span>Petugas Jaga: {sec.guardName}</span>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 5: TRANSPARANSI WARGA YANG MENUNGGAK IURAN                        */}
      {/* ========================================================================= */}
      {currentTab === 'tunggakan' && (
        <section
          id="warga-section-tunggakan"
          aria-label="Informasi Warga Menunggak yang Dipublikasikan Admin"
          data-testid="warga-published-arrears-section"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Transparansi Warga Menunggak Iuran
                  </h2>
                  <span
                    data-testid="warga-arrears-publish-badge"
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      arrearsPublication.isPublishedByAdmin
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {arrearsPublication.isPublishedByAdmin
                      ? 'Dipublikasikan'
                      : 'Di-unpublish'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Daftar ini diatur hak tayangnya oleh Admin Pengurus demi transparansi kas paguyuban.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="warga-arrears-month" className="text-xs font-semibold text-slate-500">
                Periode:
              </label>
              <select
                id="warga-arrears-month"
                value={activePeriodMonth}
                onChange={(e) => onChangePeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0b2273] cursor-pointer"
              >
                {MATRIX_MONTHS.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!arrearsPublication.isPublishedByAdmin ? (
            <div
              data-testid="warga-arrears-unpublished-notice"
              className="rounded-xl border border-slate-200 bg-slate-50 p-8 flex items-center justify-center gap-3 text-xs text-slate-600"
            >
              <Lock className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                Daftar warga yang menunggak untuk periode ini sedang <strong>di-unpublish (disembunyikan)</strong> oleh Admin Pengurus.
              </span>
            </div>
          ) : arrearsPublication.publishedItems.length === 0 ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-8 text-center text-xs font-semibold text-teal-900">
              Alhamdulillah, tidak ada data tunggakan warga yang ditampilkan pada periode {formatMonthLabel(activePeriodMonth)}.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 table-scroll-container">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 pl-4 pr-3">Unit Rumah</th>
                    <th className="px-3 py-2.5">Nama Kepala Keluarga</th>
                    <th className="px-3 py-2.5">Blok &amp; Jalan</th>
                    <th className="px-3 py-2.5">Bulan Menunggak</th>
                    <th className="py-2.5 pl-3 pr-4 text-right">Total Tunggakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrearsPublication.publishedItems.map((item) => (
                    <tr key={item.resident.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pl-4 pr-3 font-mono font-bold text-[#1547b8] whitespace-nowrap">
                        Unit {item.resident.id}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {item.resident.headOfFamily}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.resident.streetName}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {item.unpaidLabels.map((lbl) => (
                            <span
                              key={lbl}
                              className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right font-mono font-bold text-rose-600 tabular-nums whitespace-nowrap">
                        {formatRupiah(item.totalArrears)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 6: LAPORAN KEUANGAN BULANAN & LPJ TRIWULAN RESMI                  */}
      {/* ========================================================================= */}
      {currentTab === 'laporan' && (
        <section
          id="warga-section-laporan"
          aria-label="Laporan Keuangan dan LPJ Resmi"
          data-testid="warga-reports-section"
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1547b8]">
                Transparansi Kas Paguyuban
              </span>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                Laporan Keuangan Bulanan &amp; LPJ Triwulan Resmi
              </h2>
              <p className="text-xs text-slate-500">
                Laporan akuntabilitas kas paguyuban yang telah diverifikasi dan dipublikasikan resmi oleh Admin Pengurus.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="warga-report-month-select" className="text-xs font-semibold text-slate-500">
                Pilih Bulan Laporan:
              </label>
              <select
                id="warga-report-month-select"
                data-testid="warga-report-month-select"
                value={activePeriodMonth}
                onChange={(e) => onChangePeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0b2273] cursor-pointer"
              >
                {MATRIX_MONTHS.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6.1 Laporan Bulanan Terpilih */}
          {(() => {
            const isMonthPublished = Boolean(
              state.settings.publishedMonthlyReports?.includes(activePeriodMonth)
            );
            const monthlyReport = calculateMonthlyReport(state, activePeriodMonth);

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
                    <h3 className="font-display text-sm font-bold text-slate-800">
                      Laporan Kas Bulanan — {formatMonthLabel(activePeriodMonth)}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isMonthPublished
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {isMonthPublished ? 'Dipublikasikan' : 'Draft / Belum Dipublikasikan'}
                  </span>
                </div>

                {!isMonthPublished ? (
                  <div
                    data-testid="warga-monthly-unpublished-notice"
                    className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex items-center justify-center gap-3 text-xs text-slate-600"
                  >
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Laporan Keuangan Bulanan periode <strong>{formatMonthLabel(activePeriodMonth)}</strong> sedang dalam proses audit pengurus dan <strong>belum dipublikasikan</strong> ke portal warga.
                    </span>
                  </div>
                ) : (
                  <div
                    data-testid="warga-monthly-published-content"
                    className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-white p-3 border border-emerald-100">
                        <span className="text-[11px] text-slate-500 block">Total Pemasukan Kas</span>
                        <span className="font-mono text-base font-bold text-emerald-800 tabular-nums">
                          +{formatRupiah(monthlyReport.totalIncome)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-rose-100">
                        <span className="text-[11px] text-slate-500 block">Total Pengeluaran Kas</span>
                        <span className="font-mono text-base font-bold text-rose-700 tabular-nums">
                          -{formatRupiah(monthlyReport.totalExpense)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-blue-100">
                        <span className="text-[11px] text-slate-500 block">Saldo Kas Akhir Bulan</span>
                        <span className="font-mono text-base font-bold text-[#0b2273] tabular-nums">
                          {formatRupiah(monthlyReport.closingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                      <span className="text-slate-600">
                        Tercatat {monthlyReport.ledgerEntries.length} mutasi kas pada periode ini ({monthlyReport.paidCount}/55 rumah lunas).
                      </span>
                      <button
                        type="button"
                        data-testid="warga-download-monthly-pdf-btn"
                        onClick={() => downloadMonthlyReportPDF(state, activePeriodMonth)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Unduh PDF Laporan Bulanan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 6.2 Laporan Pertanggungjawaban (LPJ) Triwulan III */}
          {(() => {
            const quarterKey = '2026-Q3';
            const isQuarterPublished = Boolean(
              state.settings.publishedQuarterlyLPJ?.includes(quarterKey)
            );
            const quarterlyLPJ = calculateQuarterlyLPJ(state, 2026, 3);

            return (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1547b8]" />
                    <h3 className="font-display text-sm font-bold text-slate-800">
                      Laporan Pertanggungjawaban (LPJ) Triwulan III 2026 (Juli – September)
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isQuarterPublished
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {isQuarterPublished ? 'Dipublikasikan' : 'Draft / Belum Dipublikasikan'}
                  </span>
                </div>

                {!isQuarterPublished ? (
                  <div
                    data-testid="warga-quarterly-unpublished-notice"
                    className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex items-center justify-center gap-3 text-xs text-slate-600"
                  >
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Laporan Pertanggungjawaban (LPJ) Triwulan III 2026 sedang dalam penyusunan pengurus dan <strong>belum dipublikasikan</strong> ke portal warga.
                    </span>
                  </div>
                ) : (
                  <div
                    data-testid="warga-quarterly-published-content"
                    className="rounded-xl border border-sky-200 bg-sky-50/30 p-4 space-y-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-white p-3 border border-stone-200">
                        <span className="text-[11px] text-slate-500 block">Saldo Awal (1 Juli)</span>
                        <span className="font-mono text-sm font-bold text-slate-800 tabular-nums">
                          {formatRupiah(quarterlyLPJ.openingBalance)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-emerald-200">
                        <span className="text-[11px] text-emerald-800 block">Pemasukan (3 Bln)</span>
                        <span className="font-mono text-sm font-bold text-emerald-800 tabular-nums">
                          +{formatRupiah(quarterlyLPJ.totalIncome)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-rose-200">
                        <span className="text-[11px] text-rose-800 block">Pengeluaran (3 Bln)</span>
                        <span className="font-mono text-sm font-bold text-rose-700 tabular-nums">
                          -{formatRupiah(quarterlyLPJ.totalExpense)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-sky-200">
                        <span className="text-[11px] text-[#0b2273] block">Saldo Akhir LPJ</span>
                        <span className="font-mono text-sm font-bold text-[#0b2273] tabular-nums">
                          {formatRupiah(quarterlyLPJ.closingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                      <span className="text-slate-600">
                        Rekapitulasi 3 bulan resmi mencakup {quarterlyLPJ.totalTransactionsCount} mutasi kas dan rincian per kategori.
                      </span>
                      <button
                        type="button"
                        data-testid="warga-download-quarterly-pdf-btn"
                        onClick={() => downloadQuarterlyLPJPDF(state, 2026, 3)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0b2273] text-white font-bold text-xs hover:bg-[#1547b8] transition-colors cursor-pointer shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Unduh PDF LPJ Triwulan III</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* Confirmation Modal */}
      <WargaPaymentConfirmationModal
        isOpen={confirmationModalOpen}
        onClose={() => setConfirmationModalOpen(false)}
        state={state}
        resident={resident}
        onSuccess={(nextState) => {
          if (onStateUpdate) {
            onStateUpdate(nextState);
          }
        }}
      />
    </div>
  );
};
