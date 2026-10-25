import React, { useEffect, useState, useMemo } from 'react';
import {
  Check,
  Download,
  Edit3,
  FileDown,
  QrCode,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  DatabaseState,
  LedgerTransaction,
  OccupancyStatus,
  PaymentMethod,
  ResidentUnit,
} from '../types/finance';
import {
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  getUnitMonthsMatrix,
  getUnitTransactions,
  maskNik,
} from '../lib/finance';
import {
  getResidentQRISPaymentInfo,
  getUnitUnpaidMonths,
} from '../lib/qris';
import { downloadUnitReceiptPDF } from '../lib/pdfExport';

interface UnitDetailModalProps {
  resident: ResidentUnit | null;
  state: DatabaseState;
  isAdmin: boolean;
  initialShowQRIS?: boolean;
  onClose: () => void;
  onPayMonths: (payload: {
    unitId: string;
    periodMonths: string[];
    date: string;
    paymentMethod: PaymentMethod;
  }) => Promise<void>;
  onUpdateResident: (id: string, updates: Partial<ResidentUnit>) => Promise<void>;
  onPreviewReceipt?: (resident: ResidentUnit, trx: LedgerTransaction) => void;
}

const MATRIX_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const UnitDetailModal: React.FC<UnitDetailModalProps> = ({
  resident,
  state,
  isAdmin,
  initialShowQRIS = false,
  onClose,
  onPayMonths,
  onUpdateResident,
  onPreviewReceipt,
}) => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [headOfFamily, setHeadOfFamily] = useState('');
  const [nik, setNik] = useState('');
  const [kkNumber, setKkNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('Dihuni Pemilik');
  const [familyMembers, setFamilyMembers] = useState(3);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [notes, setNotes] = useState('');

  const [selectedMonthsToPay, setSelectedMonthsToPay] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS Saung Kebun');
  const [payDate, setPayDate] = useState('2026-10-24');
  const [showQRISPanel, setShowQRISPanel] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resident) {
      setEditingProfile(false);
      setHeadOfFamily(resident.headOfFamily);
      setNik(resident.nik);
      setKkNumber(resident.kkNumber);
      setWhatsapp(resident.whatsapp);
      setEmail(resident.email);
      setOccupancyStatus(resident.occupancyStatus);
      setFamilyMembers(resident.familyMembers);
      setVehiclePlate(resident.vehiclePlate);
      setNotes(resident.notes);

      const defaultUnpaid = getUnitUnpaidMonths(state, resident.id, '2026-10');
      setSelectedMonthsToPay(defaultUnpaid);
      setShowQRISPanel(initialShowQRIS);
      setFeedback(null);
      setError(null);
    }
  }, [resident, initialShowQRIS, state]);

  const qrisInfo = useMemo(() => {
    if (!resident) return null;
    return getResidentQRISPaymentInfo(
      state,
      resident,
      selectedMonthsToPay.length > 0 ? selectedMonthsToPay : undefined
    );
  }, [state, resident, selectedMonthsToPay]);

  if (!resident || !qrisInfo) return null;

  const matrix = getUnitMonthsMatrix(state.transactions, resident.id, MATRIX_MONTHS);
  const history = getUnitTransactions(state.transactions, resident.id);
  const totalContributed = history.reduce((sum, t) => sum + t.amount, 0);

  const toggleSelectMonth = (pm: string) => {
    setSelectedMonthsToPay((prev) =>
      prev.includes(pm) ? prev.filter((x) => x !== pm) : [...prev, pm]
    );
  };

  const handleOpenQRIS = () => {
    if (selectedMonthsToPay.length === 0) {
      const fallbackUnpaid = getUnitUnpaidMonths(state, resident.id, '2026-10');
      setSelectedMonthsToPay(fallbackUnpaid);
    }
    setPaymentMethod('QRIS Saung Kebun');
    setShowQRISPanel(true);
    setError(null);
  };

  const handleBatchPay = async (overrideMethod?: PaymentMethod) => {
    const monthsToSettle =
      selectedMonthsToPay.length > 0 ? selectedMonthsToPay : qrisInfo.unpaidMonths;
    if (monthsToSettle.length === 0) return;

    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await onPayMonths({
        unitId: resident.id,
        periodMonths: monthsToSettle,
        date: payDate,
        paymentMethod: overrideMethod ?? paymentMethod,
      });
      setFeedback(
        `Pembayaran iuran ${monthsToSettle.length} bulan (${formatRupiah(
          monthsToSettle.length * state.settings.monthlyFee
        )}) untuk Unit ${resident.id} berhasil dicatat via ${overrideMethod ?? paymentMethod}.`
      );
      setSelectedMonthsToPay([]);
      setShowQRISPanel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pembayaran.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headOfFamily.trim()) {
      setError('Nama kepala keluarga wajib diisi.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpdateResident(resident.id, {
        headOfFamily: headOfFamily.trim(),
        nik: nik.trim(),
        kkNumber: kkNumber.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        occupancyStatus,
        familyMembers: Number(familyMembers) || 1,
        vehiclePlate: vehiclePlate.trim(),
        notes: notes.trim(),
      });
      setEditingProfile(false);
      setFeedback('Profil lengkap warga berhasil diperbarui di database.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui profil warga.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadReceipt = (trx: LedgerTransaction) => {
    if (onPreviewReceipt) {
      onPreviewReceipt(resident, trx);
    } else {
      downloadUnitReceiptPDF(state, resident, trx);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unit-drawer-title"
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Top Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0b2273] to-[#1547b8] px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-200">
              <span className="rounded bg-white/15 px-2 py-0.5 font-mono font-bold text-[#5eead4]">
                Unit {resident.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{resident.streetName}</span>
              <span aria-hidden="true">·</span>
              <span>{resident.occupancyStatus}</span>
            </div>
            <h2
              id="unit-drawer-title"
              className="mt-1 font-display text-xl font-bold text-white"
            >
              {resident.headOfFamily}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenQRIS}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#34d399] px-3.5 py-2 text-xs font-bold text-[#082068] shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Tampilkan QRIS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail unit rumah"
              className="rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6 bg-[#f8fafc]">
          {feedback && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-950">
              {feedback}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"
            >
              {error}
            </div>
          )}

          {/* Uploaded QRIS Payment Card (From Settings) */}
          {showQRISPanel && (
            <section
              aria-label="Kode Pembayaran QRIS Saung Kebun"
              data-testid="uploaded-qris-panel"
              className="rounded-2xl border-2 border-[#38d3c3] bg-white p-5 shadow-md space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1547b8] text-white">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-slate-900">
                        QRIS Pembayaran Kas — {qrisInfo.merchantName}
                      </span>
                      <span className="rounded bg-[#1547b8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        QRIS PENGURUS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      NMID: {qrisInfo.nmid} · File: {qrisInfo.qrisFileName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={qrisInfo.qrisImageUrl}
                    download={qrisInfo.qrisFileName}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh QRIS</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowQRISPanel(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Sembunyikan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 items-center">
                {/* Left: Uploaded QRIS Image from Pengaturan */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="w-full flex items-center justify-between mb-2 px-1">
                    <span className="font-display text-[11px] font-extrabold tracking-wider text-[#0b2273]">
                      QRIS RESMI
                    </span>
                    <span className="text-[10px] font-bold text-[#149e90] truncate max-w-[130px]">
                      {qrisInfo.qrisFileName}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white p-2.5 shadow-xs border border-slate-200 flex items-center justify-center">
                    <img
                      src={qrisInfo.qrisImageUrl}
                      alt={`Kode QRIS ${state.settings.housingName}`}
                      data-testid="unit-uploaded-qris-img"
                      className="h-48 w-auto object-contain"
                    />
                  </div>

                  <span className="mt-2 text-[10px] font-semibold text-slate-500 text-center">
                    Scan dengan BCA Mobile, Livin&apos;, GoPay, OVO, DANA
                  </span>
                </div>

                {/* Right: Resident Billing Summary & Actions */}
                <div className="sm:col-span-7 space-y-3.5">
                  <div className="rounded-xl bg-gradient-to-br from-[#0b2273] to-[#1547b8] p-4 text-white">
                    <span className="text-[11px] font-medium text-sky-200">
                      Nominal Tagihan Iuran Warga (Unit {resident.id})
                    </span>
                    <p
                      data-testid="qris-billing-amount"
                      className="mt-1 font-mono text-2xl font-bold tracking-tight text-[#5eead4] tabular-nums"
                    >
                      {qrisInfo.formattedAmount}
                    </p>
                    <p className="mt-1 text-xs text-sky-100">
                      Warga: <strong>{resident.headOfFamily}</strong> ({qrisInfo.unpaidMonths.length} bulan iuran)
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Periode Tercakup:</span>
                      <span className="font-semibold text-slate-900">
                        {qrisInfo.unpaidLabels.length > 0
                          ? qrisInfo.unpaidLabels.join(', ')
                          : 'Tidak ada tunggakan'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Merchant QRIS:</span>
                      <span className="font-semibold text-slate-900">
                        {qrisInfo.merchantName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Rekening Tujuan Kas:</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-800">
                        {state.settings.bankAccountInfo}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    Silakan scan gambar QRIS di samping dan masukkan nominal{' '}
                    <strong className="font-mono text-slate-900">{qrisInfo.formattedAmount}</strong>.
                    Gambar QRIS ini dikelola oleh Admin pada menu <strong>Pengaturan Admin</strong>.
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isAdmin && qrisInfo.outstandingAmount > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleBatchPay('QRIS Saung Kebun')}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1547b8] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#103896] disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#5eead4]" />
                        <span>
                          {busy
                            ? 'Memproses...'
                            : `Konfirmasi Lunas QRIS (${qrisInfo.formattedAmount})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Monthly Iuran Matrix */}
          <section
            aria-label="Status Iuran Semester II 2026"
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Kartu Iuran Bulanan 2026 ({formatRupiah(state.settings.monthlyFee)} / Bulan)
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih bulan belum lunas untuk melihat total tagihan atau mencatat pelunasan
                </p>
              </div>
              {!showQRISPanel && (
                <button
                  type="button"
                  onClick={handleOpenQRIS}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#38d3c3] bg-[#f0fdfa] px-3 py-1.5 text-xs font-bold text-[#0f766e] hover:bg-[#ccfbf1] cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Lihat QRIS ({qrisInfo.formattedAmount})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {matrix.map((cell) => {
                const selected = selectedMonthsToPay.includes(cell.periodMonth);
                if (cell.paid) {
                  return (
                    <div
                      key={cell.periodMonth}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center"
                    >
                      <div className="text-xs font-semibold text-slate-900">
                        {cell.monthShort} 26
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#149e90]">
                        <Check className="h-3 w-3" />
                        <span>Lunas</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={cell.periodMonth}
                    type="button"
                    onClick={() => toggleSelectMonth(cell.periodMonth)}
                    aria-label={`Pilih bayar iuran ${formatMonthLabel(cell.periodMonth)} untuk Unit ${resident.id}`}
                    className={`rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                      selected
                        ? 'border-[#1547b8] bg-[#1547b8] text-white shadow-xs'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-[#38d3c3]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{cell.monthShort} 26</div>
                    <div
                      className={`mt-1 text-[11px] font-bold ${
                        selected ? 'text-[#5eead4]' : 'text-rose-600'
                      }`}
                    >
                      {selected ? 'Dipilih' : 'Belum'}
                    </div>
                  </button>
                );
              })}
            </div>

            {isAdmin && selectedMonthsToPay.length > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">
                    Tagihan Dipilih ({selectedMonthsToPay.length} Bulan):{' '}
                    {selectedMonthsToPay.map(formatMonthLabel).join(', ')}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#1547b8] tabular-nums">
                    Total: {formatRupiah(selectedMonthsToPay.length * state.settings.monthlyFee)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <input
                    type="date"
                    aria-label="Tanggal bayar iuran"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs"
                  />
                  <select
                    aria-label="Metode pembayaran iuran"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  >
                    <option value="QRIS Saung Kebun">QRIS Saung Kebun</option>
                    <option value="Transfer BCA Kas">Transfer BCA Kas</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Tunai Bendahara">Tunai Bendahara</option>
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleBatchPay()}
                    className="rounded-lg bg-[#1547b8] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#103896] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {busy ? 'Memproses...' : 'Konfirmasi Lunas'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Complete Resident Profile Section */}
          <section
            aria-label="Profil Lengkap Warga"
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Profil Lengkap Warga Database
              </h3>
              {isAdmin && !editingProfile && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1547b8] hover:underline cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Ubah Profil</span>
                </button>
              )}
            </div>

            {editingProfile ? (
              <form
                onSubmit={handleSaveProfile}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-name" className="block text-xs font-medium text-slate-700">
                      Nama Kepala Keluarga
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={headOfFamily}
                      onChange={(e) => setHeadOfFamily(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-wa" className="block text-xs font-medium text-slate-700">
                      Nomor WhatsApp Aktif
                    </label>
                    <input
                      id="edit-wa"
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-nik" className="block text-xs font-medium text-slate-700">
                      NIK KTP (16 Digit)
                    </label>
                    <input
                      id="edit-nik"
                      type="text"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-kk" className="block text-xs font-medium text-slate-700">
                      Nomor Kartu Keluarga (KK)
                    </label>
                    <input
                      id="edit-kk"
                      type="text"
                      value={kkNumber}
                      onChange={(e) => setKkNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-email" className="block text-xs font-medium text-slate-700">
                      Email Warga
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-plate" className="block text-xs font-medium text-slate-700">
                      Kendaraan Terdaftar
                    </label>
                    <input
                      id="edit-plate"
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-occ" className="block text-xs font-medium text-slate-700">
                      Status Hunian
                    </label>
                    <select
                      id="edit-occ"
                      value={occupancyStatus}
                      onChange={(e) => setOccupancyStatus(e.target.value as OccupancyStatus)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    >
                      <option value="Dihuni Pemilik">Dihuni Pemilik</option>
                      <option value="Dikontrakkan">Dikontrakkan</option>
                      <option value="Kosong Terawat">Kosong Terawat</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-fam" className="block text-xs font-medium text-slate-700">
                      Jumlah Anggota Keluarga
                    </label>
                    <input
                      id="edit-fam"
                      type="number"
                      min="1"
                      max="15"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-notes" className="block text-xs font-medium text-slate-700">
                    Catatan Khusus Unit
                  </label>
                  <input
                    id="edit-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1547b8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#103896]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Profil</span>
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-slate-400">WhatsApp Aktif</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {resident.whatsapp}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">NIK Kepala Keluarga</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
                    {maskNik(resident.nik, isAdmin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">No. Kartu Keluarga</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
                    {maskNik(resident.kkNumber, isAdmin)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Email Warga</dt>
                  <dd className="mt-0.5 truncate text-slate-800">{resident.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Kendaraan / Stiker</dt>
                  <dd className="mt-0.5 font-mono font-medium text-slate-800">
                    {resident.vehiclePlate}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Keluarga &amp; Mulai Huni</dt>
                  <dd className="mt-0.5 text-slate-800 tabular-nums">
                    {resident.familyMembers} jiwa · Sejak {resident.joinedYear}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Catatan: {resident.notes}</span>
                  <span className="font-mono font-bold text-[#149e90] tabular-nums">
                    Total Setoran: {formatRupiah(totalContributed)}
                  </span>
                </div>
              </dl>
            )}
          </section>

          {/* Transaction History for Unit */}
          <section
            aria-label="Riwayat Transaksi Unit Rumah"
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs"
          >
            <h3 className="font-display text-sm font-bold text-slate-900">
              Catatan Riwayat Transaksi Unit {resident.id} ({history.length} Kwitansi)
            </h3>

            {history.length === 0 ? (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                Belum ada riwayat transaksi tercatat untuk unit ini.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                      <th className="py-2.5 pl-4 pr-2">Tgl Bayar</th>
                      <th className="px-2 py-2.5">Periode</th>
                      <th className="px-2 py-2.5">No. Kwitansi &amp; Metode</th>
                      <th className="px-2 py-2.5 text-right">Nominal</th>
                      <th className="py-2.5 pl-2 pr-4 text-right">Bukti PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((trx) => (
                      <tr key={trx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pl-4 pr-2 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {formatShortDate(trx.date)}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {formatMonthLabel(trx.periodMonth)}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="font-mono text-slate-800">{trx.receiptNumber}</div>
                          <div className="text-[11px] text-slate-500">{trx.paymentMethod}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-bold text-[#149e90] tabular-nums whitespace-nowrap">
                          +{formatRupiah(trx.amount)}
                        </td>
                        <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(trx)}
                            aria-label={`Unduh kwitansi PDF ${trx.receiptNumber}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#1547b8] hover:underline cursor-pointer"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Kwitansi</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
