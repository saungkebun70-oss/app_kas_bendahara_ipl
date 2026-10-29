import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Building2,
  MessageSquare,
  QrCode,
  Upload,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  X,
  FileImage,
  Bell,
  Calendar,
  Send,
  ExternalLink,
  Sparkles,
  CheckCheck,
  Clock,
} from 'lucide-react';
import type { AdminSettings } from '../types/finance';
import { formatRupiah, formatShortDate } from '../lib/finance';
import {
  DEFAULT_QRIS_IMAGE_DATA_URL,
  validateQRISUploadFile,
} from '../lib/qris';
import { api } from '../lib/api';

interface AdminSettingsViewProps {
  settings: AdminSettings;
  isAdmin: boolean;
  onSaveSettings: (updated: AdminSettings) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onTriggerAutomatedReminders?: () => Promise<{ sentCount: number; message: string }>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  isAdmin,
  onSaveSettings,
  onResetDemoData,
  onTriggerAutomatedReminders,
}) => {
  const [formData, setFormData] = useState<AdminSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
  const [autoTriggerResult, setAutoTriggerResult] = useState<{
    sentCount: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const processLogoFile = (file: File) => {
    if (!isAdmin) return;
    setLogoError(null);

    if (!file.type.startsWith('image/')) {
      setLogoError('File harus berupa gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setLogoError('Ukuran file logo maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!resultDataUrl.startsWith('data:image/')) {
          setLogoError('Gagal memproses file gambar logo.');
          return;
        }

        const updatedSettings: AdminSettings = {
          ...formData,
          appLogoUrl: resultDataUrl,
          appLogoFileName: file.name,
        };

        setFormData(updatedSettings);
        await onSaveSettings(updatedSettings);
        showSuccessMessage(`Logo aplikasi "${file.name}" berhasil diunggah dan disimpan.`);
      } catch (err) {
        setLogoError(err instanceof Error ? err.message : 'Gagal menyimpan logo aplikasi.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestAutoRemind = async () => {
    if (!isAdmin) return;
    setTriggeringAuto(true);
    setAutoTriggerResult(null);
    try {
      if (onTriggerAutomatedReminders) {
        const res = await onTriggerAutomatedReminders();
        setAutoTriggerResult(res);
      } else {
        const res = await api.runAutomatedWhatsAppReminders({ force: true });
        setAutoTriggerResult({ sentCount: res.sentCount, message: res.message });
      }
    } catch (err) {
      setAutoTriggerResult({
        sentCount: 0,
        message: err instanceof Error ? err.message : 'Gagal memproses otomasi penagihan',
      });
    } finally {
      setTriggeringAuto(false);
    }
  };

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const showSuccessMessage = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => {
      setSavedBanner((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setQrisError(null);
    try {
      await onSaveSettings(formData);
      showSuccessMessage('Pengaturan Admin & konfigurasi QRIS berhasil diperbarui di database.');
    } finally {
      setSaving(false);
    }
  };

  const processQrisFile = (file: File) => {
    if (!isAdmin) return;
    setQrisError(null);

    const validation = validateQRISUploadFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!validation.valid) {
      setQrisError(validation.error || 'File QRIS tidak valid.');
      return;
    }

    setUploadingQris(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!resultDataUrl.startsWith('data:image/')) {
          setQrisError('Gagal membaca file gambar QRIS. Pastikan file berupa gambar valid.');
          return;
        }

        const updatedSettings: AdminSettings = {
          ...formData,
          qrisImageUrl: resultDataUrl,
          qrisFileName: file.name,
          qrisUpdatedAt: new Date().toISOString(),
        };

        setFormData(updatedSettings);
        await onSaveSettings(updatedSettings);
        showSuccessMessage(
          `File QRIS "${file.name}" berhasil diunggah dan langsung diterapkan untuk pembayaran warga.`
        );
      } catch (err) {
        setQrisError(
          err instanceof Error ? err.message : 'Gagal menyimpan file QRIS ke server.'
        );
      } finally {
        setUploadingQris(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setUploadingQris(false);
      setQrisError('Terjadi kesalahan saat membaca file gambar dari perangkat Anda.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processQrisFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!isAdmin) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processQrisFile(file);
    }
  };

  const handleResetDefaultQris = async () => {
    if (!isAdmin) return;
    setUploadingQris(true);
    setQrisError(null);
    try {
      const updatedSettings: AdminSettings = {
        ...formData,
        qrisImageUrl: DEFAULT_QRIS_IMAGE_DATA_URL,
        qrisFileName: 'QRIS-Standar-Saung-Kebun.svg',
        qrisUpdatedAt: new Date().toISOString(),
      };
      setFormData(updatedSettings);
      await onSaveSettings(updatedSettings);
      showSuccessMessage('Gambar QRIS dikembalikan ke QRIS Standar Perumahan Saung Kebun.');
    } finally {
      setUploadingQris(false);
    }
  };

  const activeQrisUrl = formData.qrisImageUrl || DEFAULT_QRIS_IMAGE_DATA_URL;
  const activeQrisFileName = formData.qrisFileName || 'QRIS-Standar-Saung-Kebun.svg';
  const isCustomUploadedQris =
    activeQrisFileName !== 'QRIS-Standar-Saung-Kebun.svg' &&
    activeQrisUrl !== DEFAULT_QRIS_IMAGE_DATA_URL;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0b2273] to-[#1547b8] text-white rounded-2xl p-6 shadow-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5eead4]">
          <Settings className="w-4 h-4" />
          <span>Konfigurasi Pengurus, Upload QRIS &amp; Parameter Kas</span>
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
          Pengaturan Admin — {settings.housingName}
        </h1>
        <p className="text-xs text-sky-100 mt-1 max-w-2xl">
          Kelola upload file kode pembayaran QRIS resmi perumahan, tarif iuran bulanan rumah, pejabat penandatangan laporan PDF &amp; LPJ, serta template penagihan WhatsApp.
        </p>
      </div>

      {savedBanner && (
        <div
          role="status"
          data-testid="settings-saved-banner"
          className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-teal-950 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-[#149e90] shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0" />
          <span>
            Anda sedang masuk melalui <strong>Portal Warga</strong>. Anda dapat melihat dan mengunduh kode QRIS resmi perumahan di bawah ini, namun hanya pengurus{' '}
            <strong>Admin (Ketua / Bendahara)</strong> yang dapat mengunggah atau mengganti file QRIS.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* QRIS File Upload & Configuration Section */}
        <section
          aria-label="Pengaturan & Upload File QRIS"
          data-testid="settings-qris-section"
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1547b8] text-white flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Pengaturan Pembayaran QRIS &amp; Upload File QRIS
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                      isCustomUploadedQris
                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                        : 'bg-sky-100 text-[#0b2273]'
                    }`}
                  >
                    {isCustomUploadedQris ? 'File QRIS Diunggah' : 'QRIS Standar Aktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Unggah gambar kode QRIS resmi kas perumahan (PNG, JPG, WEBP, atau SVG) untuk ditampilkan pada modal pembayaran warga
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1547b8] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat QRIS Penuh</span>
              </button>
              <a
                href={activeQrisUrl}
                download={activeQrisFileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh QRIS</span>
              </a>
            </div>
          </div>

          {qrisError && (
            <div
              role="alert"
              data-testid="qris-upload-error"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-semibold text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{qrisError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Active QRIS Preview Card */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-[#0b2273] mb-2 px-1">
                <span>PRATINJAU FILE QRIS AKTIF</span>
                <span className="text-[#149e90]">GPN · QRIS</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs w-full max-w-[240px] flex items-center justify-center">
                <img
                  src={activeQrisUrl}
                  alt={`Kode QRIS ${formData.housingName}`}
                  data-testid="settings-qris-preview-img"
                  className="max-h-64 w-auto object-contain rounded-lg"
                />
              </div>

              <div className="mt-3 w-full space-y-1 text-left bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">Nama File:</span>
                  <span
                    data-testid="settings-qris-filename"
                    className="font-mono font-semibold text-slate-900 truncate max-w-[180px]"
                  >
                    {activeQrisFileName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">Merchant:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {formData.qrisMerchantName || 'KAS PERUMAHAN SAUNG KEBUN'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">NMID:</span>
                  <span className="font-mono text-slate-700">
                    {formData.qrisNmid || 'ID1026000550070'}
                  </span>
                </div>
                {formData.qrisUpdatedAt && (
                  <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Diperbarui:</span>
                    <span className="font-mono text-slate-500">
                      {formatShortDate(formData.qrisUpdatedAt.slice(0, 10))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: File Upload Dropzone & QRIS Metadata Fields */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label
                  htmlFor="qris-upload-input"
                  className="block text-xs font-bold text-slate-800 mb-1.5"
                >
                  Upload File Gambar QRIS Baru (PNG / JPG / WEBP / SVG)
                </label>

                <input
                  ref={fileInputRef}
                  id="qris-upload-input"
                  data-testid="qris-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={!isAdmin || uploadingQris}
                  onChange={handleFileInputChange}
                  className="sr-only"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (isAdmin) setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    !isAdmin
                      ? 'border-slate-200 bg-slate-100 opacity-75'
                      : isDraggingOver
                      ? 'border-[#1547b8] bg-sky-50/70'
                      : 'border-slate-300 bg-slate-50/60 hover:border-[#1547b8] hover:bg-sky-50/30'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-sky-100 text-[#1547b8] flex items-center justify-center mx-auto mb-3">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {uploadingQris
                      ? 'Sedang mengunggah & menyimpan file QRIS...'
                      : 'Tarik & letakkan file gambar QRIS di sini, atau klik tombol di bawah'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mendukung cetakan QRIS statis/dinamis dari BCA, Mandiri, BRI, BNI, GoPay, atau cetakan GPN (Maks. 5 MB)
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      data-testid="upload-qris-btn"
                      disabled={!isAdmin || uploadingQris}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1547b8] text-white hover:bg-[#103896] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingQris ? 'Mengunggah...' : 'Pilih / Upload File QRIS'}
                      </span>
                    </button>

                    {isAdmin && isCustomUploadedQris && (
                      <button
                        type="button"
                        data-testid="reset-qris-btn"
                        disabled={uploadingQris}
                        onClick={handleResetDefaultQris}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Kembalikan QRIS Default</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label
                    htmlFor="qris-merchant-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nama Merchant QRIS Resmi
                  </label>
                  <input
                    id="qris-merchant-name"
                    type="text"
                    disabled={!isAdmin}
                    value={formData.qrisMerchantName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, qrisMerchantName: e.target.value })
                    }
                    placeholder="KAS PERUMAHAN SAUNG KEBUN"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="qris-nmid"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nomor NMID Nasional (Standar GPN)
                  </label>
                  <input
                    id="qris-nmid"
                    type="text"
                    disabled={!isAdmin}
                    value={formData.qrisNmid || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, qrisNmid: e.target.value })
                    }
                    placeholder="ID1026000550070"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logo & Identity & Fee Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-[#1547b8]" />
            <h2 className="font-display text-sm font-bold text-slate-900">
              Logo Aplikasi, Alamat &amp; Identitas Perumahan
            </h2>
          </div>

          {/* Logo Management Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden">
                  {formData.appLogoUrl ? (
                    <img
                      src={formData.appLogoUrl}
                      alt="Logo Aplikasi"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#1547b8] rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      {formData.housingName ? formData.housingName.charAt(0) : 'S'}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Logo Aplikasi Saat Ini
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {formData.appLogoUrl
                      ? formData.appLogoFileName
                        ? `File: ${formData.appLogoFileName}`
                        : 'Logo kustom aktif'
                      : 'Menggunakan logo default sistem'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-mono">
                    Tampil di Header Dasbor, Sidebar, Cetak PDF, &amp; Layar Login
                  </span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processLogoFile(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1547b8] hover:bg-[#10368a] rounded-lg transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Ganti Logo (Upload)
                  </button>

                  {formData.appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          appLogoUrl: '',
                          appLogoFileName: '',
                        }));
                        showSuccessMessage('Logo dikembalikan ke default sistem.');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Default
                    </button>
                  )}
                </div>
              )}
            </div>

            {logoError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            {/* Quick preset choices */}
            {isAdmin && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">
                  Pilihan Logo Template Cepat:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const preset = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="24" fill="%23059669"/><path d="M50 20L20 44V80H42V58H58V80H80V44L50 20Z" fill="white"/><circle cx="50" cy="40" r="6" fill="%2334d399"/></svg>';
                    setFormData((prev) => ({
                      ...prev,
                      appLogoUrl: preset,
                      appLogoFileName: 'Preset-Saung-Hijau.svg',
                    }));
                    showSuccessMessage('Logo diubah ke template Saung Hijau.');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors"
                >
                  🌿 Saung Hijau
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="24" fill="%231547b8"/><path d="M50 20L74 30V52C74 67.5 63.8 81.6 50 86C36.2 81.6 26 67.5 26 52V30L50 20Z" fill="white"/><path d="M42 50L48 56L60 42" stroke="%231547b8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                    setFormData((prev) => ({
                      ...prev,
                      appLogoUrl: preset,
                      appLogoFileName: 'Preset-Perisai-Biru.svg',
                    }));
                    showSuccessMessage('Logo diubah ke template Perisai Biru.');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors"
                >
                  🛡️ Perisai Biru
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="24" fill="%23b45309"/><path d="M50 22L24 42H32V78H68V42H76L50 22Z" fill="white"/><path d="M44 78V54H56V78H44Z" fill="%23fbbf24"/></svg>';
                    setFormData((prev) => ({
                      ...prev,
                      appLogoUrl: preset,
                      appLogoFileName: 'Preset-Emblem-Emas.svg',
                    }));
                    showSuccessMessage('Logo diubah ke template Emblem Emas.');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md transition-colors"
                >
                  👑 Emblem Emas
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Perumahan
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.housingName}
                onChange={(e) =>
                  setFormData({ ...formData, housingName: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Judul / Sekretariat RT-RW
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.rtRwLabel}
                onChange={(e) =>
                  setFormData({ ...formData, rtRwLabel: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap Perumahan / Sekretariat RT
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.housingAddress || ''}
                onChange={(e) =>
                  setFormData({ ...formData, housingAddress: e.target.value })
                }
                placeholder="Contoh: Jl. Saung Melati Indah Blok Utama No. 1, RT 04 / RW 08"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Alamat ini dicantumkan pada kop surat laporan keuangan PDF, bukti bayar kuitansi, dan rincian kontak.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal Iuran Bulanan Wajib per Rumah (Rp)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.monthlyFee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthlyFee: Number(e.target.value) || 100000,
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Saat ini: {formatRupiah(formData.monthlyFee)} / rumah (Target 55 rumah ={' '}
                {formatRupiah(formData.monthlyFee * 55)} / bulan)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Jatuh Tempo Setiap Bulan
              </label>
              <input
                type="number"
                min={1}
                max={28}
                disabled={!isAdmin}
                value={formData.dueDayOfMonth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDayOfMonth: Number(e.target.value) || 10,
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Ketua Lingkungan / RT (Penandatangan LPJ)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.chairpersonName}
                onChange={(e) =>
                  setFormData({ ...formData, chairpersonName: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Bendahara Pengurus (Penandatangan PDF)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.treasurerName}
                onChange={(e) =>
                  setFormData({ ...formData, treasurerName: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Informasi Rekening Kas Perumahan (Tampil di Tagihan WA &amp; Laporan PDF)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.bankAccountInfo}
                onChange={(e) =>
                  setFormData({ ...formData, bankAccountInfo: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Automated Reminders Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
          {/* Card Header & Master Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                    Sistem Otomasi Notifikasi WhatsApp Warga
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      formData.autoWhatsappEnabled
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        formData.autoWhatsappEnabled
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{formData.autoWhatsappEnabled ? 'Otomasi Aktif' : 'Nonaktif'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengingat otomatis dikirim ke WhatsApp warga ketika iuran bulanan ({formatRupiah(formData.monthlyFee)}) belum dibayar saat jatuh tempo.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.autoWhatsappEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, autoWhatsappEnabled: e.target.checked })
                }
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4"
              />
              <span>Aktifkan Pengingat Otomatis</span>
            </label>
          </div>

          {/* Configuration Grid: Due Date, Trigger Day, and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tanggal Jatuh Tempo Iuran Bulanan
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!isAdmin}
                  value={formData.dueDayOfMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dueDayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 10)),
                    })
                  }
                  className="w-full px-3 py-2 pl-9 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 disabled:bg-slate-100"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-500">
                Iuran wajib {formatRupiah(formData.monthlyFee)} jatuh tempo setiap tanggal {formData.dueDayOfMonth}.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tanggal Pemicu Pengingat Otomatis
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={!isAdmin}
                  value={formData.autoReminderTriggerDay ?? formData.dueDayOfMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoReminderTriggerDay: Math.max(1, Math.min(31, Number(e.target.value) || 10)),
                    })
                  }
                  className="w-full px-3 py-2 pl-9 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 disabled:bg-slate-100"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan otomatis dan pesan WhatsApp dijalankan setiap tanggal {formData.autoReminderTriggerDay ?? formData.dueDayOfMonth}.
              </p>
            </div>
          </div>

          {/* Multi-stage Reminder Schedule */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2.5">
            <span className="block text-xs font-bold text-slate-800">
              Tahapan Jadwal Pengingat WhatsApp Bertahap:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={formData.autoReminderSchedule?.hMinus3 ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoReminderSchedule: {
                        ...(formData.autoReminderSchedule ?? { dueDate: true, hPlus5Overdue: true }),
                        hMinus3: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>H-3 Sebelum Jatuh Tempo</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={formData.autoReminderSchedule?.dueDate ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoReminderSchedule: {
                        ...(formData.autoReminderSchedule ?? { hMinus3: true, hPlus5Overdue: true }),
                        dueDate: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>Tepat Hari Jatuh Tempo (Tgl {formData.dueDayOfMonth})</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={formData.autoReminderSchedule?.hPlus5Overdue ?? true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      autoReminderSchedule: {
                        ...(formData.autoReminderSchedule ?? { hMinus3: true, dueDate: true }),
                        hPlus5Overdue: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>H+5 Keterlambatan Iuran</span>
              </label>
            </div>
          </div>

          {/* Payment Link & Payment Instructions inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                URL Link Pembayaran Warga &amp; Portal QRIS ({'{link_bayar}'})
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={
                  formData.whatsappPaymentLink ??
                  'https://ais-pre-jvxodjqg27n6kf6g4ukblc-547004294471.asia-east1.run.app/#warga'
                }
                onChange={(e) =>
                  setFormData({ ...formData, whatsappPaymentLink: e.target.value })
                }
                placeholder="https://.../#warga"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Warga dapat mengklik tautan ini dari WhatsApp untuk melihat tagihan &amp; scan QRIS.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Instruksi Cara Pembayaran ({'{instruksi_bayar}'})
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={
                  formData.whatsappPaymentInstructions ??
                  '1. Transfer Bank BCA: 7410-8892-10 a/n Kas Saung Kebun\n2. Atau Scan QRIS via Portal Warga\n3. Unggah bukti pembayaran melalui link Portal Warga'
                }
                onChange={(e) =>
                  setFormData({ ...formData, whatsappPaymentInstructions: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500">
                Instruksi nomor rekening transfer dan panduan konfirmasi pembayaran.
              </p>
            </div>
          </div>

          {/* Template Textarea with Quick Variables */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-xs font-semibold text-slate-700">
                Format Template Pesan WhatsApp
              </label>
              <span className="text-[11px] text-slate-500">
                Klik variabel untuk menambahkan ke template:
              </span>
            </div>

            {/* Quick Variable Insert Chips */}
            {isAdmin && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                  '{nama}',
                  '{unit}',
                  '{alamat}',
                  '{nominal}',
                  '{periode}',
                  '{jatuh_tempo}',
                  '{rekening}',
                  '{link_bayar}',
                  '{instruksi_bayar}',
                ].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        whatsappTemplate: `${formData.whatsappTemplate} ${variable}`,
                      });
                    }}
                    className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-indigo-50 border border-indigo-200 text-[#1547b8] hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    + {variable}
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={5}
              disabled={!isAdmin}
              value={formData.whatsappTemplate}
              onChange={(e) =>
                setFormData({ ...formData, whatsappTemplate: e.target.value })
              }
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-700 disabled:bg-slate-100 leading-relaxed"
            />
          </div>

          {/* Live WhatsApp Message Preview Balloon */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-800">
              Pratinjau Pesan WhatsApp Diterima Warga (Live Preview):
            </span>
            <div className="rounded-xl border border-emerald-200 bg-[#efeae2] p-4">
              <div className="max-w-md bg-white rounded-lg p-3.5 shadow-sm text-xs text-slate-900 space-y-2 font-sans border border-slate-200/80">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Kas Perumahan Saung Kebun
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">10:00 WIB</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-[11px]">
                  {formData.whatsappTemplate
                    .replace(/\{nama\}/g, 'Dedi Kurniawan')
                    .replace(/\{unit\}/g, 'A-05')
                    .replace(/\{alamat\}/g, 'Jl. Saung Kebun I')
                    .replace(/\{periode\}/g, 'Oktober 2026')
                    .replace(/\{nominal\}/g, formatRupiah(formData.monthlyFee))
                    .replace(/\{jatuh_tempo\}/g, String(formData.dueDayOfMonth))
                    .replace(/\{rekening\}/g, formData.bankAccountInfo)
                    .replace(
                      /\{link_bayar\}/g,
                      formData.whatsappPaymentLink ||
                        'https://ais-pre-jvxodjqg27n6kf6g4ukblc-547004294471.asia-east1.run.app/#warga'
                    )
                    .replace(
                      /\{instruksi_bayar\}/g,
                      formData.whatsappPaymentInstructions ||
                        `1. Transfer Bank BCA: ${formData.bankAccountInfo}\n2. Atau Scan QRIS via link Portal Warga\n3. Unggah bukti pembayaran melalui link Portal Warga`
                    )}
                </div>
                <div className="pt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                  <span>Terkirim</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Test Automation Action Banner & Trigger Button */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Uji Coba Pengingat Otomatis Sekarang
                </p>
                <p className="text-[11px] text-slate-500">
                  Scan 55 rumah dan kirimkan notifikasi otomatis ke warga yang belum membayar iuran {formatRupiah(formData.monthlyFee)}.
                </p>
              </div>

              <button
                type="button"
                disabled={triggeringAuto}
                onClick={handleTestAutoRemind}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {triggeringAuto ? 'Memproses Otomasi...' : 'Jalankan Pengingat Otomatis Sekarang'}
                </span>
              </button>
            </div>
          )}

          {autoTriggerResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                autoTriggerResult.sentCount > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{autoTriggerResult.message}</span>
              </div>
              <span className="font-mono font-bold shrink-0 ml-2">
                {autoTriggerResult.sentCount} Terkirim
              </span>
            </div>
          )}
        </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {confirmReset ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs text-red-700 font-semibold">
                      Reset database ke kondisi awal 55 rumah?
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await onResetDemoData();
                        setConfirmReset(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-red-700 text-white rounded-md hover:bg-red-800 cursor-pointer"
                    >
                      Ya, Reset Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Data Standar</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#1547b8] text-white hover:bg-[#103896] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Admin'}</span>
              </button>
            </div>
          )}
      </form>

      {/* Fullscreen QRIS Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Kode QRIS"
        >
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between bg-[#0b2273] text-white px-5 py-3.5">
              <div>
                <h3 className="font-display text-sm font-bold">
                  Kode QRIS Resmi — {formData.housingName}
                </h3>
                <p className="text-[11px] text-[#5eead4] font-mono">
                  {activeQrisFileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                aria-label="Tutup pratinjau QRIS"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center bg-slate-50">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <img
                  src={activeQrisUrl}
                  alt={`QRIS ${formData.housingName}`}
                  className="max-h-96 w-auto object-contain"
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-700">
                {formData.qrisMerchantName || 'KAS PERUMAHAN SAUNG KEBUN'}
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                NMID: {formData.qrisNmid || 'ID1026000550070'}
              </p>
            </div>

            <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
              <a
                href={activeQrisUrl}
                download={activeQrisFileName}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#1547b8] bg-sky-50 hover:bg-sky-100 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar QRIS</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
