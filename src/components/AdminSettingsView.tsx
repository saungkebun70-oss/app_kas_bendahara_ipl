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
  Cloud,
  Database,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Lock,
  Users,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Shield,
  Wallet,
  Megaphone,
  Activity,
  Check,
  Phone,
} from 'lucide-react';
import type { AdminSettings, CommitteeMember, ResidentUnit } from '../types/finance';
import { DEFAULT_COMMITTEE_MEMBERS } from '../lib/seedData';
import { formatRupiah, formatShortDate } from '../lib/finance';
import {
  DEFAULT_QRIS_IMAGE_DATA_URL,
  validateQRISUploadFile,
} from '../lib/qris';
import { api } from '../lib/api';
import { StrukturPengurusTable } from './StrukturPengurusTable';

interface AdminSettingsViewProps {
  settings: AdminSettings;
  residents?: ResidentUnit[];
  isAdmin: boolean;
  isBendahara?: boolean;
  onSaveSettings: (updated: AdminSettings) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onResetTransactions?: () => Promise<{ ok: boolean; backupFile?: string }>;
  onTriggerAutomatedReminders?: () => Promise<{ sentCount: number; message: string }>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  residents = [],
  isAdmin,
  isBendahara = false,
  onSaveSettings,
  onResetDemoData,
  onResetTransactions,
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
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [resetKasModalOpen, setResetKasModalOpen] = useState(false);
  const [resetKasConfirmInput, setResetKasConfirmInput] = useState('');
  const [resettingKas, setResettingKas] = useState(false);
  const [resetKasMessage, setResetKasMessage] = useState<string | null>(null);
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);

  // Committee Management States
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [deleteConfirmMemberId, setDeleteConfirmMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<{
    id: string;
    role: string;
    category: CommitteeMember['category'];
    name: string;
    block: string;
    houseNumber: string;
    unitId: string;
    addressDisplay: string;
    duties: string;
    status: CommitteeMember['status'];
    phone: string;
  }>({
    id: '',
    role: 'HUMAS',
    category: 'humas',
    name: '',
    block: 'B5',
    houseNumber: '21',
    unitId: 'B5-21',
    addressDisplay: 'Blok B05 / 21',
    duties: '',
    status: 'Aktif',
    phone: '',
  });

  const openAddMemberModal = () => {
    const existingUnitIds = new Set((formData.committeeMembers || []).map((m) => m.unitId));
    const availableResident = residents.find((r) => !existingUnitIds.has(r.id)) || residents[0];

    const unitId = availableResident?.id || 'B5-21';
    const block = availableResident?.block || 'B5';
    const houseNumber = availableResident?.houseNumber || '21';
    const name = availableResident?.headOfFamily || '';

    setEditingMember(null);
    setMemberForm({
      id: `PENGURUS-${Date.now()}`,
      role: 'HUMAS',
      category: 'humas',
      name,
      block,
      houseNumber,
      unitId,
      addressDisplay: `Blok ${block} / ${houseNumber}`,
      duties: 'Penyambung informasi dan aspirasi warga lingkungan Saung Kebun.',
      status: 'Aktif',
      phone: availableResident?.whatsapp || '',
    });
    setMemberModalOpen(true);
  };

  const openEditMemberModal = (member: CommitteeMember) => {
    setEditingMember(member);
    setMemberForm({
      id: member.id,
      role: member.role,
      category: member.category,
      name: member.name,
      block: member.block,
      houseNumber: member.houseNumber,
      unitId: member.unitId,
      addressDisplay: member.addressDisplay,
      duties: member.duties,
      status: member.status,
      phone: member.phone || '',
    });
    setMemberModalOpen(true);
  };

  const handleSelectResidentForMember = (selectedUnitId: string) => {
    const resident = residents.find((r) => r.id === selectedUnitId);
    if (!resident) return;
    setMemberForm((prev) => ({
      ...prev,
      unitId: resident.id,
      name: resident.headOfFamily,
      block: resident.block,
      houseNumber: resident.houseNumber,
      addressDisplay: `Blok ${resident.block} / ${resident.houseNumber}`,
      phone: resident.whatsapp || prev.phone,
    }));
  };

  const handleRolePresetSelect = (presetRole: string) => {
    let cat: CommitteeMember['category'] = 'lainnya';
    let defaultDuty = '';
    const upper = presetRole.toUpperCase();

    if (upper === 'PEMBINA') {
      cat = 'pembina';
      defaultDuty = 'Pengarah umum, penasihat kebijakan paguyuban, serta pengawas kerukunan warga.';
    } else if (upper === 'KETUA') {
      cat = 'ketua';
      defaultDuty = 'Penanggung jawab utama operasional lingkungan, pengambil keputusan kebijakan & pengesahan kas.';
    } else if (upper === 'BENDAHARA') {
      cat = 'bendahara';
      defaultDuty = 'Pengelolaan pembukuan kas lingkungan, pencatatan mutasi realtime, penerimaan iuran & LPJ berkala.';
    } else if (upper === 'HUMAS' || upper === 'SEKRETARIS') {
      cat = 'humas';
      defaultDuty = 'Penyambung komunikasi antarwarga, penyerapan aspirasi, dan publikasi edaran resmi lingkungan.';
    } else if (upper === 'SEKSI OLAH RAGA') {
      cat = 'olahraga';
      defaultDuty = 'Pengorganisasian senam bersama, turnamen olahraga, dan kegiatan kebugaran warga.';
    } else if (upper === 'SEKSI KEAMANAN') {
      cat = 'lainnya';
      defaultDuty = 'Koordinasi dengan pos satpam, sistem satu pintu (one gate system), dan jadwal ronda lingkungan.';
    } else if (upper === 'SEKSI KEBERSIHAN') {
      cat = 'lainnya';
      defaultDuty = 'Pengawasan jadwal pengangkutan sampah, kebersihan saluran drainase, dan kerja bakti warga.';
    } else {
      cat = 'lainnya';
      defaultDuty = 'Mendukung kelancaran program paguyuban lingkungan Saung Kebun.';
    }

    setMemberForm((prev) => ({
      ...prev,
      role: presetRole,
      category: cat,
      duties: prev.duties.trim() ? prev.duties : defaultDuty,
    }));
  };

  const handleSaveMember = () => {
    if (!memberForm.name.trim() || !memberForm.role.trim() || !memberForm.unitId.trim()) {
      alert('Nama pengurus, jabatan, dan unit rumah wajib diisi.');
      return;
    }

    const currentMembers = formData.committeeMembers && formData.committeeMembers.length > 0
      ? [...formData.committeeMembers]
      : [...DEFAULT_COMMITTEE_MEMBERS];

    const cleanRole = memberForm.role.trim().toUpperCase();
    const cleanName = memberForm.name.trim().toUpperCase();
    const cleanUnitId = memberForm.unitId.trim().toUpperCase();

    const newOrUpdatedMember: CommitteeMember = {
      id: memberForm.id || `PENGURUS-${Date.now()}`,
      role: cleanRole,
      category: memberForm.category,
      name: cleanName,
      block: memberForm.block.trim().toUpperCase(),
      houseNumber: memberForm.houseNumber.trim(),
      unitId: cleanUnitId,
      addressDisplay: memberForm.addressDisplay.trim() || `Blok ${memberForm.block} / ${memberForm.houseNumber}`,
      duties: memberForm.duties.trim() || 'Bertanggung jawab dalam kepengurusan lingkungan.',
      status: memberForm.status,
      phone: memberForm.phone.trim() || undefined,
    };

    let updatedList: CommitteeMember[];
    const existingIndex = currentMembers.findIndex((m) => m.id === newOrUpdatedMember.id);
    if (existingIndex !== -1) {
      currentMembers[existingIndex] = newOrUpdatedMember;
      updatedList = currentMembers;
    } else {
      updatedList = [...currentMembers, newOrUpdatedMember];
    }

    const newSettings: AdminSettings = {
      ...formData,
      committeeMembers: updatedList,
    };

    if (newOrUpdatedMember.category === 'ketua' || cleanRole.includes('KETUA')) {
      newSettings.chairpersonName = cleanName;
    }
    if (newOrUpdatedMember.category === 'bendahara' || cleanRole.includes('BENDAHARA')) {
      newSettings.treasurerName = cleanName;
    }
    if (newOrUpdatedMember.category === 'pembina' || cleanRole.includes('PEMBINA')) {
      newSettings.supervisorName = cleanName;
    }
    if (newOrUpdatedMember.category === 'humas' || cleanRole.includes('SEKRETARIS') || cleanRole.includes('HUMAS')) {
      newSettings.secretaryName = cleanName;
    }

    setFormData(newSettings);
    setMemberModalOpen(false);
    setEditingMember(null);
    showSuccessMessage(`Pengurus ${newOrUpdatedMember.role} (${newOrUpdatedMember.name} - Unit ${newOrUpdatedMember.unitId}) berhasil disimpan.`);
  };

  const handleDeleteMember = (memberId: string) => {
    const currentMembers = formData.committeeMembers && formData.committeeMembers.length > 0
      ? formData.committeeMembers
      : DEFAULT_COMMITTEE_MEMBERS;
    const target = currentMembers.find((m) => m.id === memberId);
    const updatedList = currentMembers.filter((m) => m.id !== memberId);
    setFormData((prev) => ({
      ...prev,
      committeeMembers: updatedList,
    }));
    setDeleteConfirmMemberId(null);
    showSuccessMessage(`Pejabat ${target?.name || ''} telah dihapus dari struktur pengurus.`);
  };

  const handleResetDefaultCommittee = () => {
    if (!window.confirm('Kembalikan struktur pengurus ke susunan resmi default:\n- IWAN (Pembina)\n- ERLANGGA (Ketua)\n- ANDRIANSYAH (Bendahara)\n- DONI (Humas)\n- WAHYU (Humas)\n- DENI (Seksi Olahraga)?')) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      committeeMembers: DEFAULT_COMMITTEE_MEMBERS,
      chairpersonName: 'ERLANGGA',
      treasurerName: 'ANDRIANSYAH',
      supervisorName: 'IWAN',
      secretaryName: 'WAHYU',
    }));
    showSuccessMessage('Struktur pengurus dikembalikan ke susunan resmi default.');
  };

  const handleDownloadBackup = () => {
    const link = document.createElement('a');
    link.href = '/api/database/backup';
    link.download = `backup-saung-kebun-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setHasDownloadedBackup(true);
  };

  const handleExecuteResetKas = async () => {
    if (!isBendahara || !onResetTransactions) return;
    if (resetKasConfirmInput.trim() !== 'RESET-KAS') return;
    setResettingKas(true);
    try {
      if (!hasDownloadedBackup) {
        handleDownloadBackup();
      }
      const res = await onResetTransactions();
      setResetKasMessage(
        res.backupFile
          ? `Seluruh transaksi kas berhasil direset. Backup server: ${res.backupFile}`
          : 'Seluruh riwayat transaksi kas (pemasukan & pengeluaran) berhasil direset.'
      );
      setResetKasModalOpen(false);
      setResetKasConfirmInput('');
      setTimeout(() => setResetKasMessage(null), 8000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mereset transaksi kas');
    } finally {
      setResettingKas(false);
    }
  };

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
                Pembina Lingkungan (Penasihat Paguyuban)
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.supervisorName || 'BP. IWAN (Blok B08/05)'}
                onChange={(e) =>
                  setFormData({ ...formData, supervisorName: e.target.value })
                }
                placeholder="Contoh: BP. IWAN (Blok B08/05)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
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
                placeholder="Contoh: BP. ERLANGGA (Blok B03/07)"
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
                placeholder="Contoh: BP. ANDRIANSYAH (Blok B07/16)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sekretaris / Humas Lingkungan
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.secretaryName || 'BP. WAHYU (Blok B05/24)'}
                onChange={(e) =>
                  setFormData({ ...formData, secretaryName: e.target.value })
                }
                placeholder="Contoh: BP. WAHYU (Blok B05/24)"
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

          {/* Dedicated Kelola Struktur & Personel Pengurus Lingkungan in Settings */}
          <div className="pt-6 border-t border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Kelola Struktur &amp; Personel Kepengurusan Lingkungan
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    {(formData.committeeMembers || DEFAULT_COMMITTEE_MEMBERS).length} Pejabat Terdaftar
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Tentukan personil pembina, ketua, bendahara, humas, dan seksi lingkungan. Pejabat yang tercatat di sini otomatis berstatus <strong>Pengurus Aktif</strong> dan <strong>Bebas Iuran Kas Bulanan</strong> di seluruh sistem.
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openAddMemberModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1547b8] hover:bg-[#103896] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pengurus</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultCommittee}
                    title="Kembalikan susunan ke 6 pengurus resmi default (Iwan, Erlangga, Andriansyah, Doni, Wahyu, Deni)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>
              )}
            </div>

            {/* Ardiansyah Note Clarification Banner */}
            <div className="bg-sky-50/70 border border-sky-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-sky-950">
              <ShieldCheck className="w-4 h-4 text-[#1547b8] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Catatan Validasi Pengurus:</strong> Sesuai penetapan paguyuban, <strong>Bp. ANDRIANSYAH</strong> di Unit <strong>Blok B07 / 16 (B7-16)</strong> adalah <strong>Bendahara Kas Resmi</strong>. Sedangkan <strong>Bp. ARDIANSYAH ZEIN</strong> di Unit <strong>Blok B03 / 20 (B3-20)</strong> adalah <strong>Warga Biasa Aktif</strong> (bukan pengurus). Anda dapat mengubah, menambah, atau mencopot jabatan pengurus kapan saja melalui daftar di bawah.
              </div>
            </div>

            {/* List of current committee members */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(formData.committeeMembers && formData.committeeMembers.length > 0
                ? formData.committeeMembers
                : DEFAULT_COMMITTEE_MEMBERS
              ).map((member, idx) => {
                const getRoleColor = (cat: string) => {
                  switch (cat) {
                    case 'pembina':
                      return 'bg-amber-100 text-amber-900 border-amber-300';
                    case 'ketua':
                      return 'bg-blue-100 text-blue-900 border-blue-300';
                    case 'bendahara':
                      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    case 'humas':
                      return 'bg-teal-100 text-teal-900 border-teal-300';
                    case 'olahraga':
                      return 'bg-orange-100 text-orange-900 border-orange-300';
                    default:
                      return 'bg-slate-100 text-slate-800 border-slate-300';
                  }
                };

                const getRoleIcon = (cat: string) => {
                  switch (cat) {
                    case 'pembina':
                      return <Shield className="w-3.5 h-3.5 text-amber-600" />;
                    case 'ketua':
                      return <Crown className="w-3.5 h-3.5 text-blue-600" />;
                    case 'bendahara':
                      return <Wallet className="w-3.5 h-3.5 text-emerald-600" />;
                    case 'humas':
                      return <Megaphone className="w-3.5 h-3.5 text-teal-600" />;
                    case 'olahraga':
                      return <Activity className="w-3.5 h-3.5 text-orange-600" />;
                    default:
                      return <Users className="w-3.5 h-3.5 text-slate-500" />;
                  }
                };

                return (
                  <div
                    key={member.id || `pm-${idx}`}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getRoleColor(
                            member.category
                          )}`}
                        >
                          {getRoleIcon(member.category)}
                          <span>{member.role}</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            member.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditMemberModal(member)}
                            className="p-1.5 text-slate-600 hover:text-[#1547b8] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit data & jabatan pengurus"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus ${member.role} (${member.name}) dari susunan pengurus? Unit ${member.unitId} akan kembali berstatus Warga Biasa.`)) {
                                handleDeleteMember(member.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus dari pengurus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                          {member.name}
                        </h4>
                        <span className="text-[11px] font-mono font-semibold text-[#1547b8] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                          Unit {member.unitId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {member.addressDisplay}
                        {member.phone && ` · WA: ${member.phone}`}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100">
                        {member.duties}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formal Organization Table Preview */}
            <div className="pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Pratinjau Tabel Resmi yang Dipublikasikan ke Warga:
              </h4>
              <StrukturPengurusTable
                committeeMembers={formData.committeeMembers}
                housingName={formData.housingName}
                rtRwLabel={formData.rtRwLabel}
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

        {/* Database Online Cloud Server Section */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0b2273] rounded-2xl p-6 text-white shadow-md border border-slate-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <span>Penyimpanan Database Cloud Online</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Google Cloud Firestore
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Data tersimpan online otomatis & aman di server Google Cloud 24/7 (Tidak memerlukan Termux/MySQL di HP)
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={cloudSyncing}
              onClick={async () => {
                setCloudSyncing(true);
                setCloudSyncMessage(null);
                try {
                  const res = await api.syncCloudDatabase();
                  if (res.success) {
                    setCloudSyncMessage('Seluruh data berhasil disinkronkan ke Google Cloud Firestore!');
                    setTimeout(() => setCloudSyncMessage(null), 5000);
                  }
                } catch (err) {
                  setCloudSyncMessage(err instanceof Error ? err.message : 'Gagal sinkronisasi');
                } finally {
                  setCloudSyncing(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncing ? 'animate-spin' : ''}`} />
              <span>{cloudSyncing ? 'Menyinkronkan...' : 'Sinkronkan Database Sekarang'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-xs">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-slate-400 text-[11px] block">Status Koneksi</span>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Terhubung Online Otomatis</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-slate-400 text-[11px] block">Project Google Cloud</span>
              <span className="font-mono text-emerald-300 font-medium block mt-1 truncate" title="xenodochial-clover-g6tvw">
                xenodochial-clover-g6tvw
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-slate-400 text-[11px] block">Proteksi Keamanan Data</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-200 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enkripsi Cloud & Multi-User RBAC</span>
              </div>
            </div>
          </div>

          {cloudSyncMessage && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cloudSyncMessage}</span>
            </div>
          )}
        </div>

        {/* Card Reset Transaksi Kas Khusus Bendahara & Backup Data */}
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-red-50/40 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Reset Pembukuan Transaksi Kas (Pemasukan &amp; Pengeluaran)
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    <Lock className="w-2.5 h-2.5" />
                    Khusus Bendahara
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  Fitur untuk mengosongkan seluruh riwayat penerimaan iuran &amp; pengeluaran kas tanpa menghapus data warga. Sebelum reset, cadangkan data terlebih dahulu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Unduh Backup Data (JSON)</span>
            </button>
          </div>

          <div className="bg-amber-100/60 rounded-xl p-3 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Ketentuan Keamanan Transaksi Kas:
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900">
                1. Tombol reset transaksi <strong>hanya aktif untuk peran Bendahara</strong> demi keamanan dan audit lingkungan.<br />
                2. Sistem secara otomatis membuat file arsip backup snapshot ke server sebelum reset dieksekusi.<br />
                3. Profil warga (116 unit hunian Blok B3, B5, B6, B7, B8) tetap aman tersimpan.
              </p>
            </div>
          </div>

          {resetKasMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{resetKasMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-500">
              {isBendahara ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Anda masuk sebagai Bendahara (Otorisasi Penuh Tersedia)
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Hanya akun Bendahara yang dapat mengeksekusi reset transaksi.
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!isBendahara}
              onClick={() => {
                setResetKasConfirmInput('');
                setResetKasModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seluruh Transaksi Kas...</span>
            </button>
          </div>
        </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {confirmReset ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs text-red-700 font-semibold">
                      Reset database ke master data 116 unit hunian (B3, B5, B6, B7, B8)?
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
                    <span>Reset Data Master Standar</span>
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

      {/* Modal Dialog Konfirmasi Reset Transaksi Kas Khusus Bendahara */}
      {resetKasModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-kas-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between bg-red-700 text-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <h3 id="reset-kas-modal-title" className="font-display text-sm sm:text-base font-bold">
                  Konfirmasi Reset Pembukuan Kas (Bendahara)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetKasModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 space-y-2">
                <p className="font-bold text-red-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  PERINGATAN: Tindakan ini mengosongkan seluruh riwayat kas!
                </p>
                <p className="leading-relaxed text-[11px] text-red-800">
                  Semua transaksi pemasukan (iuran bulanan) dan pengeluaran operasional akan dihapus dari buku besar. Data daftar warga 116 rumah tetap dipertahankan.
                </p>
              </div>

              {/* Langkah 1: Backup */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Langkah 1: Wajib Cadangkan / Backup Data
                  </span>
                  {hasDownloadedBackup && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Backup Diunduh
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">
                  Simpan arsip seluruh data warga dan transaksi ke laptop/HP Anda sebelum mereset.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Cadangan (JSON Backup)</span>
                </button>
              </div>

              {/* Langkah 2: Konfirmasi Kata Kunci */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-confirm-keyword"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Langkah 2: Ketik <span className="font-mono text-red-700 font-bold bg-red-100 px-1 py-0.5 rounded">RESET-KAS</span> untuk melanjutkan:
                </label>
                <input
                  id="reset-confirm-keyword"
                  type="text"
                  placeholder="Ketik persis: RESET-KAS"
                  value={resetKasConfirmInput}
                  onChange={(e) => setResetKasConfirmInput(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-300 px-3.5 py-2 font-mono text-sm tracking-wider uppercase text-slate-900 focus:border-red-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetKasModalOpen(false)}
                disabled={resettingKas}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batalkan
              </button>

              <button
                type="button"
                disabled={resetKasConfirmInput.trim() !== 'RESET-KAS' || resettingKas}
                onClick={handleExecuteResetKas}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer shadow-sm transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingKas ? 'animate-spin' : ''}`} />
                <span>{resettingKas ? 'Memproses Reset...' : 'Saya Yakin, Reset Transaksi Kas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pengurus Lingkungan */}
      {memberModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-[#0b2273] to-[#1547b8] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">
                    {editingMember ? 'Edit Data Pengurus Lingkungan' : 'Tambah Jabatan / Pengurus Baru'}
                  </h3>
                  <p className="text-[11px] text-sky-100">
                    Tentukan nama pejabat, unit rumah, dan tanggung jawab lingkungan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Preset Jabatan Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Cepat Jabatan Resmi:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Pembina', role: 'PEMBINA' },
                    { label: 'Ketua', role: 'KETUA' },
                    { label: 'Bendahara', role: 'BENDAHARA' },
                    { label: 'Humas', role: 'HUMAS' },
                    { label: 'Sekretaris', role: 'SEKRETARIS' },
                    { label: 'Seksi Olahraga', role: 'SEKSI OLAH RAGA' },
                    { label: 'Seksi Keamanan', role: 'SEKSI KEAMANAN' },
                    { label: 'Seksi Kebersihan', role: 'SEKSI KEBERSIHAN' },
                    { label: 'Koordinator Blok', role: 'KOORDINATOR BLOK' },
                  ].map((preset) => {
                    const isSelected = memberForm.role.toUpperCase() === preset.role.toUpperCase();
                    return (
                      <button
                        key={preset.role}
                        type="button"
                        onClick={() => handleRolePresetSelect(preset.role)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1547b8] text-white border-[#1547b8]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jabatan / Role & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Jabatan / Posisi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    placeholder="Contoh: BENDAHARA, HUMAS"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Organisasi
                  </label>
                  <select
                    value={memberForm.category}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        category: e.target.value as CommitteeMember['category'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] bg-white"
                  >
                    <option value="pembina">Pembina (Penasihat Paguyuban)</option>
                    <option value="ketua">Ketua (Penanggung Jawab)</option>
                    <option value="bendahara">Bendahara (Pengelola Kas)</option>
                    <option value="humas">Humas / Sekretariat</option>
                    <option value="olahraga">Seksi Olah Raga</option>
                    <option value="lainnya">Seksi Lainnya / Koordinator</option>
                  </select>
                </div>
              </div>

              {/* Select Warga dari Data Warga */}
              <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-bold text-[#0b2273]">
                  Pilih Warga dari Daftar Hunian ({residents.length} Rumah):
                </label>
                <select
                  value={memberForm.unitId}
                  onChange={(e) => handleSelectResidentForMember(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-sky-300 rounded-lg focus:outline-none focus:border-[#1547b8] bg-white"
                >
                  <option value="">-- Pilih Unit Warga --</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} — {r.headOfFamily} ({r.occupancyStatus})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-sky-800">
                  Memilih unit warga otomatis mengisi nama, blok, nomor rumah, dan nomor telepon.
                </p>
              </div>

              {/* Nama Pejabat & No Telp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Pejabat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    placeholder="Contoh: ANDRIANSYAH"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] uppercase font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="Contoh: 0812-8410-7016"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8]"
                  />
                </div>
              </div>

              {/* Unit ID, Alamat Display, dan Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberForm.unitId}
                    onChange={(e) => setMemberForm({ ...memberForm, unitId: e.target.value })}
                    placeholder="B7-16"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Tampilan
                  </label>
                  <input
                    type="text"
                    value={memberForm.addressDisplay}
                    onChange={(e) => setMemberForm({ ...memberForm, addressDisplay: e.target.value })}
                    placeholder="Blok B07 / 16"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Jabatan
                  </label>
                  <select
                    value={memberForm.status}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        status: e.target.value as CommitteeMember['status'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8] bg-white font-semibold"
                  >
                    <option value="Aktif">Aktif (Bebas Iuran)</option>
                    <option value="Cuti">Cuti Sementara</option>
                    <option value="Purna">Purna Tugas</option>
                  </select>
                </div>
              </div>

              {/* Uraian Tugas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uraian Tugas &amp; Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  value={memberForm.duties}
                  onChange={(e) => setMemberForm({ ...memberForm, duties: e.target.value })}
                  placeholder="Deskripsikan wewenang atau tugas jabatan ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#1547b8]"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Jika Anda menetapkan jabatan sebagai <strong>Ketua</strong>, <strong>Bendahara</strong>, atau <strong>Pembina</strong>, nama penandatangan laporan PDF dan kuitansi kas akan otomatis diperbarui.
                </span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batalkan
              </button>

              <button
                type="button"
                onClick={handleSaveMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1547b8] hover:bg-[#103896] rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Pengurus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
