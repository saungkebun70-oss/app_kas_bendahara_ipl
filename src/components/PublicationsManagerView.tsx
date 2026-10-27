import React, { useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Key,
  Megaphone,
  Phone,
  Plus,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  AnnouncementCategory,
  CommunityActivityAnnouncement,
  DatabaseState,
  SecurityGuardReport,
  SecurityOfficer,
  SecurityOfficerStatus,
  SecurityShiftLabel,
  SecuritySituationStatus,
} from '../types/finance';
import type { AuthSession } from '../lib/auth';
import {
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  getUnpaidResidentsForBilling,
} from '../lib/finance';

interface PublicationsManagerViewProps {
  state: DatabaseState;
  session: AuthSession;
  activePeriodMonth: string;
  onChangePeriodMonth: (pm: string) => void;
  onCreateAnnouncement: (
    payload: Omit<CommunityActivityAnnouncement, 'id' | 'createdAt'>
  ) => Promise<void>;
  onToggleAnnouncementPublish: (id: string, published?: boolean) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onUpdateArrearsPublication: (payload: {
    publishArrearsToResidents?: boolean;
    toggleUnitId?: string;
  }) => Promise<void>;
  onCreateSecurityReport: (
    payload: Omit<SecurityGuardReport, 'id' | 'createdAt'>
  ) => Promise<void>;
  onToggleSecurityReportPublish: (id: string, published?: boolean) => Promise<void>;
  onDeleteSecurityReport: (id: string) => Promise<void>;
  onCreateSecurityOfficer?: (
    payload: Omit<SecurityOfficer, 'id' | 'joinedDate'>
  ) => Promise<void>;
  onUpdateSecurityOfficer?: (
    id: string,
    updates: Partial<SecurityOfficer>
  ) => Promise<void>;
  onDeleteSecurityOfficer?: (id: string) => Promise<void>;
  initialSubTab?: 'kegiatan' | 'tunggakan' | 'keamanan' | 'anggota';
  activeSubTab?: 'kegiatan' | 'tunggakan' | 'keamanan' | 'anggota';
  onChangeSubTab?: (tab: 'kegiatan' | 'tunggakan' | 'keamanan' | 'anggota') => void;
}

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const PublicationsManagerView: React.FC<PublicationsManagerViewProps> = ({
  state,
  session,
  activePeriodMonth,
  onChangePeriodMonth,
  onCreateAnnouncement,
  onToggleAnnouncementPublish,
  onDeleteAnnouncement,
  onUpdateArrearsPublication,
  onCreateSecurityReport,
  onToggleSecurityReportPublish,
  onDeleteSecurityReport,
  onCreateSecurityOfficer,
  onUpdateSecurityOfficer,
  onDeleteSecurityOfficer,
  initialSubTab,
  activeSubTab: externalSubTab,
  onChangeSubTab: setExternalSubTab,
}) => {
  const isSatpamOnly = session.role === 'satpam';
  const canManageAdminItems = session.isAdmin;

  const [internalSubTab, setInternalSubTab] = useState<'kegiatan' | 'tunggakan' | 'keamanan' | 'anggota'>(
    isSatpamOnly ? 'keamanan' : initialSubTab || 'kegiatan'
  );
  const activeSubTab = externalSubTab || internalSubTab;
  const setActiveSubTab = (tab: 'kegiatan' | 'tunggakan' | 'keamanan' | 'anggota') => {
    setInternalSubTab(tab);
    setExternalSubTab?.(tab);
  };
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>('Kegiatan Warga');
  const [annDate, setAnnDate] = useState('2026-10-27');
  const [annLocation, setAnnLocation] = useState('Pendopo Perumahan Saung Kebun');
  const [annContent, setAnnContent] = useState('');

  // Security Guard Situation Report Form State
  const [guardName, setGuardName] = useState(
    isSatpamOnly ? session.displayName : 'Danru Suryadi & Petugas Jaga Herman'
  );
  const [shift, setShift] = useState<SecurityShiftLabel>(
    session.shiftLabel || 'Shift Malam (19.00 - 07.00 WIB)'
  );
  const [secDate, setSecDate] = useState('2026-10-24');
  const [patrolArea, setPatrolArea] = useState('Pos Gerbang Utama & Patroli Blok A–D');
  const [situationStatus, setSituationStatus] =
    useState<SecuritySituationStatus>('Aman Terkendali');
  const [secTitle, setSecTitle] = useState('');
  const [secSummary, setSecSummary] = useState('');

  // Security Officer Member Management Form State (Admin)
  const [officerName, setOfficerName] = useState('');
  const [officerRank, setOfficerRank] = useState('Petugas Jaga Pos');
  const [officerBadge, setOfficerBadge] = useState('');
  const [officerPhone, setOfficerPhone] = useState('');
  const [officerShift, setOfficerShift] = useState<SecurityShiftLabel>(
    'Shift Malam (19.00 - 07.00 WIB)'
  );
  const [officerPin, setOfficerPin] = useState('satpam123');
  const [officerStatus, setOfficerStatus] = useState<SecurityOfficerStatus>('Aktif');
  const [officerNotes, setOfficerNotes] = useState('Petugas keamanan lingkungan Saung Kebun');

  const announcements = state.announcements ?? [];
  const securityReports = state.securityReports ?? [];
  const securityOfficers = state.securityOfficers ?? [];
  const unpaidItems = getUnpaidResidentsForBilling(state, activePeriodMonth);
  const isAllArrearsPublished = state.settings.publishArrearsToResidents !== false;
  const hiddenUnitsSet = new Set(state.settings.hiddenArrearsUnitIds ?? []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    setBusy(true);
    try {
      await onCreateAnnouncement({
        title: annTitle.trim(),
        category: annCategory,
        eventDate: annDate,
        location: annLocation.trim() || 'Lingkungan Saung Kebun',
        content: annContent.trim(),
        authorName: `${session.displayName} (${session.roleLabel})`,
        published: true,
      });
      setAnnTitle('');
      setAnnContent('');
      showToast('Informasi kegiatan berhasil ditambahkan dan di-publish ke Akun Warga.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSecurityReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !secTitle.trim() || !secSummary.trim()) return;
    setBusy(true);
    try {
      await onCreateSecurityReport({
        guardName: guardName.trim(),
        shift,
        reportDate: secDate,
        patrolArea: patrolArea.trim() || 'Pos Gerbang Utama & Blok A–D',
        situationStatus,
        title: secTitle.trim(),
        summary: secSummary.trim(),
        published: true,
      });
      setSecTitle('');
      setSecSummary('');
      showToast(
        'Laporan situasi pemukiman dan jaga berhasil dipublikasikan ke Portal Warga.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerName.trim() || !officerPhone.trim() || !onCreateSecurityOfficer) return;
    setBusy(true);
    try {
      const nextNum = securityOfficers.length + 1;
      const genBadge = officerBadge.trim() || `KTA-SK-${String(nextNum).padStart(3, '0')}`;
      await onCreateSecurityOfficer({
        name: officerName.trim(),
        badgeNumber: genBadge,
        rankOrRole: officerRank.trim() || 'Petugas Jaga Pos',
        phone: officerPhone.trim(),
        assignedShift: officerShift,
        pin: officerPin.trim() || 'satpam123',
        status: officerStatus,
        notes: officerNotes.trim() || 'Anggota Satuan Pengamanan resmi Saung Kebun',
      });
      setOfficerName('');
      setOfficerBadge('');
      setOfficerPhone('');
      setOfficerNotes('Petugas keamanan lingkungan Saung Kebun');
      showToast(`Anggota pengamanan "${officerName}" berhasil ditambahkan secara terpisah dari data warga.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menambahkan anggota pengamanan.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleOfficerStatus = async (officer: SecurityOfficer) => {
    if (!onUpdateSecurityOfficer) return;
    const nextStatus: SecurityOfficerStatus =
      officer.status === 'Aktif' ? 'Cuti' : officer.status === 'Cuti' ? 'Nonaktif' : 'Aktif';
    try {
      await onUpdateSecurityOfficer(officer.id, { status: nextStatus });
      showToast(`Status petugas ${officer.name} diubah menjadi "${nextStatus}".`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui status petugas.');
    }
  };

  const handleDeleteOfficer = async (officer: SecurityOfficer) => {
    if (!onDeleteSecurityOfficer) return;
    try {
      await onDeleteSecurityOfficer(officer.id);
      showToast(`Anggota pengamanan "${officer.name}" berhasil dihapus.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus anggota pengamanan.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#28999e] p-6 text-white shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold text-[#5eead4]">
              Pusat Publikasi Portal Warga &amp; Pos Satuan Pengamanan
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white mt-1">
              Kelola Informasi Kegiatan, Warga Menunggak &amp; Keamanan Satpam
            </h1>
            <p className="text-xs text-sky-100 mt-1 max-w-2xl">
              Atur hak tayang pengumuman kegiatan warga, kontrol publish transparansi warga yang menunggak, publikasikan laporan situasi pemukiman dari pos satpam, serta kelola anggota satuan pengamanan secara terpisah dari data 55 warga.
            </p>
          </div>
        </div>

        {/* Sub-navigation pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          {canManageAdminItems ? (
            <>
              <button
                type="button"
                data-testid="tab-pub-kegiatan"
                onClick={() => setActiveSubTab('kegiatan')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'kegiatan'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Megaphone className="h-4 w-4" />
                <span>1. Informasi Kegiatan Admin ({announcements.length})</span>
              </button>

              <button
                type="button"
                data-testid="tab-pub-tunggakan"
                onClick={() => setActiveSubTab('tunggakan')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'tunggakan'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>
                  2. Publish / Unpublish Warga Menunggak ({unpaidItems.length} Rumah)
                </span>
              </button>

              <button
                type="button"
                data-testid="tab-pub-keamanan"
                onClick={() => setActiveSubTab('keamanan')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'keamanan'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>3. Laporan Situasi Satpam Jaga ({securityReports.length})</span>
              </button>

              <button
                type="button"
                data-testid="tab-pub-anggota"
                onClick={() => setActiveSubTab('anggota')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'anggota'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>4. Anggota Pengamanan Terpisah dari Warga ({securityOfficers.length})</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid="tab-pub-keamanan"
                onClick={() => setActiveSubTab('keamanan')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'keamanan'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Laporan Situasi &amp; Patroli ({securityReports.length})</span>
              </button>

              <button
                type="button"
                data-testid="tab-pub-anggota"
                onClick={() => setActiveSubTab('anggota')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'anggota'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Rekan Satpam &amp; Kontak Pos ({securityOfficers.length})</span>
              </button>

              <button
                type="button"
                data-testid="tab-pub-kegiatan"
                onClick={() => setActiveSubTab('kegiatan')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activeSubTab === 'kegiatan'
                    ? 'bg-[#5eead4] text-[#082068]'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Megaphone className="h-4 w-4" />
                <span>Pengumuman Kegiatan ({announcements.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-center gap-2 text-xs font-semibold text-teal-950"
        >
          <CheckCircle2 className="h-4 w-4 text-[#0f9f90] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* PANEL 1: INFORMASI KEGIATAN & PENGUMUMAN */}
      {activeSubTab === 'kegiatan' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Form: Publish New Activity (Admin / RT) */}
          {canManageAdminItems && (
            <form
              onSubmit={handleAddAnnouncement}
              className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
            >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Megaphone className="h-4 w-4 text-[#1547b8]" />
              <h2 className="font-display text-sm font-bold text-slate-900">
                Buat &amp; Publish Informasi Kegiatan Baru
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Kegiatan / Pengumuman Admin
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Contoh: Kerja Bakti & Senam Pagi Warga Saung Kebun"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#1547b8] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Informasi
                </label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as AnnouncementCategory)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="Kegiatan Warga">Kegiatan Warga</option>
                  <option value="Pengumuman Pengurus">Pengumuman Pengurus</option>
                  <option value="Kerja Bakti & Lingkungan">Kerja Bakti &amp; Lingkungan</option>
                  <option value="Rapat Paguyuban">Rapat Paguyuban</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  value={annDate}
                  onChange={(e) => setAnnDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lokasi Kegiatan
              </label>
              <input
                type="text"
                value={annLocation}
                onChange={(e) => setAnnLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Isi Informasi / Pengumuman untuk Warga
              </label>
              <textarea
                rows={4}
                required
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Tuliskan rincian waktu, agenda kegiatan, atau himbauan pengurus..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#1547b8] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1547b8] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#103896] disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Publish Kegiatan ke Akun Warga</span>
            </button>
          </form>
          )}

          {/* Right/Full List: Manage Publish / Unpublish Announcements */}
          <div className={`${canManageAdminItems ? 'lg:col-span-7' : 'lg:col-span-12'} rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-1">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Daftar Informasi Kegiatan &amp; Pengumuman ({announcements.length})
                </h2>
                <span className="text-xs text-slate-500">
                  {canManageAdminItems
                    ? 'Klik tombol Publish / Unpublish untuk mengatur tampilan di warga'
                    : 'Pengumuman dan jadwal kegiatan resmi paguyuban warga Saung Kebun'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 space-y-2 ${
                    item.published
                      ? 'border-teal-200 bg-[#f0fdfa]/40'
                      : 'border-slate-200 bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#e8effd] px-2 py-0.5 text-[10px] font-bold text-[#1547b8]">
                        {item.category}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {formatShortDate(item.eventDate)}
                      </span>
                    </div>

                    {canManageAdminItems ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`toggle-announcement-publish-${item.id}`}
                          onClick={async () => {
                            await onToggleAnnouncementPublish(item.id, !item.published);
                            showToast(
                              item.published
                                ? `Informasi "${item.title}" di-unpublish dari Akun Warga.`
                                : `Informasi "${item.title}" berhasil di-publish ke Akun Warga.`
                            );
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                            item.published
                              ? 'bg-teal-100 text-teal-900 hover:bg-teal-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {item.published ? (
                            <>
                              <Eye className="h-3 w-3" />
                              <span>Published (Klik untuk Unpublish)</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span>Draft (Klik untuk Publish)</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteAnnouncement(item.id)}
                          aria-label={`Hapus pengumuman ${item.title}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        <CheckCircle2 className="h-3 w-3 text-teal-600" />
                        <span>Resmi Pengurus</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600">{item.content}</p>
                  <div className="text-[11px] text-slate-500">
                    Lokasi: <strong>{item.location}</strong> · Penulis: {item.authorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: PUBLISH / UNPUBLISH WARGA YANG MENUNGGAK */}
      {activeSubTab === 'tunggakan' && canManageAdminItems && (
        <div
          data-testid="admin-arrears-publication-panel"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Kontrol Publish / Unpublish Daftar Warga yang Menunggak ({formatMonthLabel(activePeriodMonth)})
              </h2>
              <p className="text-xs text-slate-500">
                Admin dapat mem-publish atau meng-unpublish seluruh daftar tunggakan maupun per unit rumah dari tampilan Akun Warga
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={activePeriodMonth}
                onChange={(e) => onChangePeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0b2273]"
              >
                {PERIOD_OPTIONS.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                data-testid="toggle-publish-all-arrears"
                onClick={async () => {
                  const nextVal = !isAllArrearsPublished;
                  await onUpdateArrearsPublication({ publishArrearsToResidents: nextVal });
                  showToast(
                    nextVal
                      ? 'Daftar warga menunggak berhasil di-PUBLISH ke seluruh Akun Warga.'
                      : 'Daftar warga menunggak berhasil di-UNPUBLISH (disembunyikan) dari Akun Warga.'
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer ${
                  isAllArrearsPublished
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-[#1547b8] text-white hover:bg-[#103896]'
                }`}
              >
                {isAllArrearsPublished ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span>Unpublish Semua dari Akun Warga</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Publish Semua ke Akun Warga</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-2.5 pl-4 pr-3">Unit Rumah</th>
                  <th className="px-3 py-2.5">Nama Kepala Keluarga</th>
                  <th className="px-3 py-2.5">Bulan Menunggak</th>
                  <th className="px-3 py-2.5 text-right">Total Tunggakan</th>
                  <th className="py-2.5 pl-3 pr-4 text-right">Status Tayang di Akun Warga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unpaidItems.map((item) => {
                  const isUnitHidden = hiddenUnitsSet.has(item.resident.id);
                  const visibleInWarga = isAllArrearsPublished && !isUnitHidden;
                  return (
                    <tr key={item.resident.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pl-4 pr-3 font-mono font-bold text-[#1547b8]">
                        Unit {item.resident.id}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {item.resident.headOfFamily}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {item.unpaidLabels.join(', ')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600 tabular-nums">
                        {formatRupiah(item.totalArrears)}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right">
                        <button
                          type="button"
                          data-testid={`toggle-unit-arrears-${item.resident.id}`}
                          onClick={async () => {
                            await onUpdateArrearsPublication({
                              toggleUnitId: item.resident.id,
                            });
                            showToast(
                              isUnitHidden
                                ? `Tunggakan Unit ${item.resident.id} di-publish ke Akun Warga.`
                                : `Tunggakan Unit ${item.resident.id} di-unpublish dari Akun Warga.`
                            );
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold cursor-pointer ${
                            visibleInWarga
                              ? 'bg-teal-100 text-teal-900 hover:bg-teal-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {visibleInWarga ? (
                            <>
                              <Eye className="h-3 w-3" />
                              <span>Published (Klik Unpublish)</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span>Unpublished (Klik Publish)</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PANEL 3: INFORMASI KEAMANAN & LAPORAN SITUASI PEMUKIMAN PERUMAHAN DAN JAGA */}
      {activeSubTab === 'keamanan' && (
        <div
          data-testid="security-guard-publication-panel"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
        >
          {/* Left Form: Satuan Pengamanan Jaga Input */}
          <form
            onSubmit={handleAddSecurityReport}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Laporan Situasi Pemukiman Perumahan &amp; Jaga
                </h2>
                <span className="text-[11px] text-slate-500">
                  Dipublikasikan oleh Satuan Pengamanan yang bertugas
                </span>
              </div>
            </div>

            {/* Officer Quick Picker if officers exist */}
            {securityOfficers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Anggota Satpam Terdaftar (Atau ketik bebas)
                </label>
                <select
                  aria-label="Pilih anggota satpam terdaftar"
                  onChange={(e) => {
                    const sel = securityOfficers.find((o) => o.id === e.target.value);
                    if (sel) {
                      setGuardName(sel.name);
                      setShift(sel.assignedShift);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900"
                >
                  <option value="">-- Gunakan Pilihan Personel Terdaftar --</option>
                  {securityOfficers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.rankOrRole} · {o.badgeNumber}) — {o.assignedShift.split(' ')[0]} ({o.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Petugas Pengamanan yang Berjaga
              </label>
              <input
                type="text"
                required
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                placeholder="Contoh: Danru Suryadi & Petugas Herman"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0f766e] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shift Jaga Satpam
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as SecurityShiftLabel)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="Shift Pagi (07.00 - 19.00 WIB)">
                    Shift Pagi (07.00 - 19.00 WIB)
                  </option>
                  <option value="Shift Malam (19.00 - 07.00 WIB)">
                    Shift Malam (19.00 - 07.00 WIB)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Situasi Lingkungan
                </label>
                <select
                  value={situationStatus}
                  onChange={(e) =>
                    setSituationStatus(e.target.value as SecuritySituationStatus)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="Aman Terkendali">Aman Terkendali</option>
                  <option value="Waspada Lingkungan">Waspada Lingkungan</option>
                  <option value="Perhatian Khusus">Perhatian Khusus</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={secDate}
                  onChange={(e) => setSecDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area Pos / Patroli
                </label>
                <input
                  type="text"
                  value={patrolArea}
                  onChange={(e) => setPatrolArea(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Laporan Situasi Lingkungan Pemukiman
              </label>
              <input
                type="text"
                required
                data-testid="security-title-input"
                value={secTitle}
                onChange={(e) => setSecTitle(e.target.value)}
                placeholder="Contoh: Patroli Ronda Malam Blok A–D & Penutupan Portal Jam 22.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0f766e] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rincian Situasi Pemukiman Perumahan dan Jaga
              </label>
              <textarea
                rows={4}
                required
                data-testid="security-summary-input"
                value={secSummary}
                onChange={(e) => setSecSummary(e.target.value)}
                placeholder="Tuliskan hasil patroli keliling blok, pantauan CCTV, lampu PJU, keamanan tamu luar, dan himbauan pengamanan..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0f766e] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              data-testid="submit-security-report-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#115e59] disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Publish Laporan Situasi ke Portal Warga</span>
            </button>
          </form>

          {/* Right List: Published & Unpublished Security Reports */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Riwayat Laporan Situasi Satpam Jaga ({securityReports.length})
              </h2>
              <span className="text-xs text-slate-500">
                Dapat di-publish / unpublish setiap saat
              </span>
            </div>

            <div className="space-y-3">
              {securityReports.map((sec) => (
                <div
                  key={sec.id}
                  className={`rounded-xl border p-4 space-y-2 ${
                    sec.published
                      ? 'border-teal-200 bg-[#f0fdfa]/50'
                      : 'border-slate-200 bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                        {sec.situationStatus}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {formatShortDate(sec.reportDate)} · {sec.shift}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`toggle-security-publish-${sec.id}`}
                        onClick={async () => {
                          await onToggleSecurityReportPublish(sec.id, !sec.published);
                          showToast(
                            sec.published
                              ? `Laporan situasi "${sec.title}" di-unpublish.`
                              : `Laporan situasi "${sec.title}" di-publish ke Akun Warga.`
                          );
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                          sec.published
                            ? 'bg-teal-100 text-teal-900 hover:bg-teal-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {sec.published ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Published (Klik Unpublish)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>Unpublished (Klik Publish)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteSecurityReport(sec.id)}
                        aria-label={`Hapus laporan situasi ${sec.title}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display text-sm font-bold text-slate-900">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-slate-600">{sec.summary}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Area: {sec.patrolArea}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#0b2273]">
                      <UserCheck className="h-3.5 w-3.5 text-[#0f9f90]" />
                      <span>Petugas Jaga: {sec.guardName}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 4: KELOLA ANGGOTA SATUAN PENGAMANAN & REKAN POS */}
      {activeSubTab === 'anggota' && (
        <div data-testid="security-officers-manager-panel" className="space-y-6">
          {!canManageAdminItems ? (
            <div className="space-y-6">
              {/* Satpam Directory Header */}
              <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/80 p-5 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-teal-950">
                      Rekan Satuan Pengamanan &amp; Kontak Pos Jaga
                    </h2>
                    <p className="mt-0.5 text-teal-800 leading-relaxed">
                      Daftar seluruh rekan petugas pengamanan klaster Saung Kebun beserta nomor darurat instansi dan pimpinan lingkungan untuk koordinasi cepat saat patroli.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <span className="rounded-lg bg-white border border-teal-200 px-3 py-1.5 font-bold text-teal-900 text-xs shadow-xs">
                    Total: {securityOfficers.length} Rekan
                  </span>
                  <span className="rounded-lg bg-teal-800 text-white px-3 py-1.5 font-bold text-xs shadow-xs">
                    {securityOfficers.filter((o) => o.status === 'Aktif').length} Bertugas Aktif
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Officers List */}
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#0f766e]" />
                    <span>Daftar Rekan Petugas Pengamanan ({securityOfficers.length})</span>
                  </h3>

                  {securityOfficers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                      Belum ada rekan pengamanan yang terdaftar.
                    </div>
                  ) : (
                    securityOfficers.map((officer) => {
                      const isAktif = officer.status === 'Aktif';
                      const isCuti = officer.status === 'Cuti';
                      return (
                        <div
                          key={officer.id}
                          data-testid={`officer-card-${officer.id}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-white font-bold font-display text-base shadow-xs">
                                {officer.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-display text-sm font-bold text-slate-900">
                                    {officer.name}
                                  </h4>
                                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                                    {officer.badgeNumber}
                                  </span>
                                </div>
                                <span className="text-xs font-semibold text-[#0f766e]">
                                  {officer.rankOrRole}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                isAktif
                                  ? 'bg-teal-100 text-teal-900 border border-teal-200'
                                  : isCuti
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-rose-100 text-rose-900 border border-rose-200'
                              }`}
                            >
                              {officer.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{officer.assignedShift}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                              <a
                                href={`tel:${officer.phone}`}
                                className="font-mono tabular-nums text-teal-800 hover:underline font-semibold"
                              >
                                {officer.phone}
                              </a>
                            </div>
                          </div>

                          {officer.notes && (
                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                              Catatan tugas: {officer.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={`tel:${officer.phone}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
                            >
                              <Phone className="h-3.5 w-3.5 text-teal-700" />
                              <span>Telepon Rekan</span>
                            </a>
                            <a
                              href={`https://wa.me/${officer.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Emergency & Official Directory */}
                <div className="lg:col-span-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <div>
                      <h3 className="font-display text-sm font-bold text-rose-950">
                        Kontak Darurat &amp; Bantuan Cepat
                      </h3>
                      <p className="text-[11px] text-rose-800">
                        Hubungi instansi berwenang saat terjadi insiden di lingkungan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: 'Polsek / Binmas Pol', phone: '021-5978110', label: 'Keamanan Kriminal' },
                      { name: 'Babinsa Koramil', phone: '0812-8877-6655', label: 'Bantuan TNI Teritorial' },
                      { name: 'Pemadam Kebakaran (Damkar)', phone: '113', label: 'Darurat Kebakaran' },
                      { name: 'Puskesmas / Ambulans Darurat', phone: '119', label: 'Medis Gawat Darurat' },
                      { name: 'Ketua RT / Paguyuban Saung Kebun', phone: '0812-8901-2345', label: 'Pimpinan Lingkungan' },
                    ].map((c) => (
                      <div
                        key={c.name}
                        className="rounded-xl border border-white bg-white p-3 shadow-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <h4 className="font-display text-xs font-bold text-slate-900">{c.name}</h4>
                          <span className="text-[10px] text-slate-500 font-medium">{c.label}</span>
                        </div>
                        <a
                          href={`tel:${c.phone.replace(/[^0-9]/g, '')}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{c.phone}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
          {/* Informational Separation Banner */}
          <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/70 p-5 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-teal-950">
                  Manajemen Anggota Satuan Pengamanan (Terpisah dari Data 55 Warga)
                </h2>
                <p className="mt-0.5 text-teal-800 leading-relaxed">
                  Data personel keamanan ini dicatat dan dikelola secara mandiri oleh Admin terpisah dari database 55 kepala keluarga warga. Setiap anggota pengamanan memiliki akun, nomor KTA/Badge, serta PIN untuk login dan melaporkan situasi pemukiman.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <span className="rounded-lg bg-white border border-teal-200 px-3 py-1.5 font-bold text-teal-900">
                Total: {securityOfficers.length} Personel
              </span>
              <span className="rounded-lg bg-teal-800 text-white px-3 py-1.5 font-bold">
                {securityOfficers.filter((o) => o.status === 'Aktif').length} Bertugas Aktif
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Form: Tambah Anggota Pengamanan Baru */}
            <form
              onSubmit={handleAddOfficer}
              data-testid="add-security-officer-form"
              className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus className="h-4 w-4 text-[#0f766e]" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Tambah Anggota Satuan Pengamanan Baru
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Petugas
                </label>
                <input
                  type="text"
                  required
                  data-testid="officer-name-input"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Contoh: Mulyadi Pratama"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0f766e] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan / Pangkat
                  </label>
                  <input
                    type="text"
                    value={officerRank}
                    onChange={(e) => setOfficerRank(e.target.value)}
                    placeholder="Contoh: Petugas Jaga Pos"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor KTA / Badge
                  </label>
                  <input
                    type="text"
                    value={officerBadge}
                    onChange={(e) => setOfficerBadge(e.target.value)}
                    placeholder="Contoh: KTA-SK-006"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    required
                    value={officerPhone}
                    onChange={(e) => setOfficerPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Akses Login Pos
                  </label>
                  <input
                    type="text"
                    value={officerPin}
                    onChange={(e) => setOfficerPin(e.target.value)}
                    placeholder="satpam123"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Tugas Utama
                  </label>
                  <select
                    value={officerShift}
                    onChange={(e) => setOfficerShift(e.target.value as SecurityShiftLabel)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Shift Malam (19.00 - 07.00 WIB)">
                      Shift Malam (19.00 - 07.00 WIB)
                    </option>
                    <option value="Shift Pagi (07.00 - 19.00 WIB)">
                      Shift Pagi (07.00 - 19.00 WIB)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Petugas
                  </label>
                  <select
                    value={officerStatus}
                    onChange={(e) => setOfficerStatus(e.target.value as SecurityOfficerStatus)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tugas &amp; Penugasan
                </label>
                <textarea
                  rows={2}
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="Keterangan penugasan gerbang, patroli blok, atau jadwal ronda..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#0f766e] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                data-testid="submit-add-officer-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#115e59] disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Simpan Anggota Pengamanan Baru</span>
              </button>
            </form>

            {/* List: Daftar Anggota Pengamanan */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Daftar Anggota Satuan Pengamanan ({securityOfficers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Terpisah dari 55 unit rumah warga Saung Kebun
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {securityOfficers.map((officer) => {
                  const isAktif = officer.status === 'Aktif';
                  const isCuti = officer.status === 'Cuti';
                  return (
                    <div
                      key={officer.id}
                      data-testid={`officer-card-${officer.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f766e] text-white font-bold font-display text-sm">
                            {officer.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display text-sm font-bold text-slate-900">
                                {officer.name}
                              </h4>
                              <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                {officer.badgeNumber}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-[#0f766e]">
                              {officer.rankOrRole}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleOfficerStatus(officer)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                              isAktif
                                ? 'bg-teal-100 text-teal-900 hover:bg-teal-200'
                                : isCuti
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-rose-100 text-rose-900 hover:bg-rose-200'
                            }`}
                          >
                            Status: {officer.status}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(officer)}
                            aria-label={`Hapus petugas ${officer.name}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{officer.assignedShift.split(' ')[0]} {officer.assignedShift.split(' ')[1]}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono tabular-nums">{officer.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px]">PIN: {officer.pin}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        Catatan: {officer.notes}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
          )}
        </div>
      )}
    </div>
  );
};
