import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  MessageSquareShare,
  QrCode,
  Settings,
  Share2,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { AuthSession } from '../lib/auth';
import type { PresenceSummary } from '../lib/api';
import { DatabaseHealthIndicator } from './DatabaseHealthIndicator';

export type NavTab =
  | 'dashboard'
  | 'residents'
  | 'transactions'
  | 'reports'
  | 'publications'
  | 'security_officers'
  | 'whatsapp'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unpaidCount: number;
  session: AuthSession;
  onLogout: () => void;
  onOpenMyUnit?: (unitId: string) => void;
  onOpenTrialHub?: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingVerificationCount?: number;
  onOpenVerification?: () => void;
  presenceSummary?: PresenceSummary | null;
  wargaTab?: import('./WargaPortalView').WargaPortalTab;
  onSelectWargaTab?: (tab: import('./WargaPortalView').WargaPortalTab) => void;
  satpamTab?: 'keamanan' | 'anggota' | 'kegiatan';
  onSelectSatpamTab?: (tab: 'keamanan' | 'anggota' | 'kegiatan') => void;
  settings?: import('../types/finance').AdminSettings;
}

const MANAGE_NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Balance & Kas', icon: LayoutDashboard },
  { id: 'residents', label: 'Data Warga', icon: Home },
  { id: 'security_officers', label: 'Anggota Satpam', icon: ShieldCheck },
  { id: 'transactions', label: 'Buku Transaksi', icon: BookOpen },
  { id: 'reports', label: 'LPJ 3 Bulan & PDF', icon: FileSpreadsheet },
];

const USER_NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'publications', label: 'Publikasi & Laporan', icon: Megaphone },
  { id: 'whatsapp', label: 'Penagihan WA', icon: MessageSquareShare },
  { id: 'settings', label: 'Pengaturan Admin', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unpaidCount,
  session,
  onLogout,
  onOpenMyUnit,
  onOpenTrialHub,
  mobileOpen,
  onCloseMobile,
  pendingVerificationCount,
  onOpenVerification,
  presenceSummary,
  wargaTab = 'iuran',
  onSelectWargaTab,
  satpamTab = 'keamanan',
  onSelectSatpamTab,
  settings,
}) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyLink = (roleKey: string, pathHash: string, roleName: string) => {
    const fullUrl = `${window.location.origin}/#${pathHash}`;
    const text = `Halo Bpk/Ibu, berikut tautan resmi akses ${roleName} ${settings?.housingName || 'Perumahan Saung Kebun'}:\n${fullUrl}\n\nSilakan klik tautan di atas untuk langsung membuka portal.`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
    } catch {}
    setCopiedKey(roleKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSelect = (id: NavTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const scrollToWargaSection = (sectionId: string) => {
    onCloseMobile();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isWarga = session.role === 'warga';
  const isSatpam = session.role === 'satpam';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navigasi Utama"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-gradient-to-b from-[#0b2273] via-[#13459c] to-[#36b8b2] text-white transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="relative flex h-20 items-center justify-between px-4 sm:px-5 backdrop-blur-md bg-white/[0.04] border-b border-white/10 shadow-2xs after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-[#5eead4]/40 after:to-transparent min-w-0 overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#5eead4] ring-1 ring-white/25 overflow-hidden">
              {settings?.appLogoUrl ? (
                <img
                  src={settings.appLogoUrl}
                  alt={settings.housingName || 'Logo Aplikasi'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="17" r="3" />
                  <circle cx="17" cy="7" r="3" />
                  <path d="M9.1 14.9L14.9 9.1" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm sm:text-base font-bold tracking-tight text-white leading-snug">
                {settings?.housingName ? settings.housingName : 'Saung Kebun'}
              </span>
              <span className="block truncate text-[11px] text-sky-200/80 leading-normal mt-0.5">
                {isWarga
                  ? `Portal Warga · Unit ${session.unitId}`
                  : isSatpam
                  ? 'Pos Keamanan Satpam'
                  : settings?.rtRwLabel || '55 Rumah · Kas RT 004'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white shrink-0 ml-1.5 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto py-3" aria-label="Menu Modul">
          {isWarga ? (
            <div>
              <div className="px-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-sky-200/60">
                MENU KHUSUS WARGA
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('iuran');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'iuran'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <Home className="h-4 w-4 shrink-0" />
                    <span>Status Iuran &amp; QRIS</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('kwitansi');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'kwitansi'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    <span>Kwitansi Pembayaran</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('kegiatan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'kegiatan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <Megaphone className="h-4 w-4 shrink-0" />
                    <span>Kegiatan &amp; Info Admin</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('keamanan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'keamanan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Info Keamanan Satpam</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('tunggakan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'tunggakan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Transparansi Tunggakan</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectWargaTab?.('laporan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    wargaTab === 'laporan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    <span>Laporan Kas &amp; LPJ</span>
                  </span>
                </button>
              </div>
            </div>
          ) : isSatpam ? (
            <div>
              <div className="px-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-sky-200/60">
                POS PENGAMANAN JAGA
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSatpamTab?.('keamanan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    satpamTab === 'keamanan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Laporan Situasi &amp; Patroli</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectSatpamTab?.('anggota');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    satpamTab === 'anggota'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Rekan Satpam &amp; Kontak Pos</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectSatpamTab?.('kegiatan');
                    onCloseMobile();
                  }}
                  className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-bold transition-all cursor-pointer ${
                    satpamTab === 'kegiatan'
                      ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] shadow-md'
                      : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <Megaphone className="h-4 w-4 shrink-0" />
                    <span>Pengumuman Lingkungan</span>
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* MANAGE Group for Admin */}
              <div>
                <div className="px-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-sky-200/60">
                  MANAGE
                </div>
                <div className="space-y-1">
                  {MANAGE_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] font-bold shadow-md'
                            : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-[#082068]' : 'text-sky-200/75'
                            }`}
                          />
                          <span>{item.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* USER & ADMIN Group */}
              <div>
                <div className="px-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-sky-200/60">
                  USER &amp; ADMIN
                </div>
                <div className="space-y-1">
                  {onOpenVerification && (
                    <button
                      type="button"
                      data-testid="sidebar-open-verification-btn"
                      onClick={() => {
                        onOpenVerification();
                        onCloseMobile();
                      }}
                      className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold text-sky-100/85 hover:bg-white/10 hover:text-white transition-all duration-150 cursor-pointer"
                    >
                      <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-300" />
                        <span>Verifikasi Iuran</span>
                      </span>
                      {Boolean(pendingVerificationCount && pendingVerificationCount > 0) && (
                        <span
                          data-testid="sidebar-pending-verification-badge"
                          className="rounded-full bg-amber-500 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-xs tabular-nums animate-pulse"
                        >
                          {pendingVerificationCount}
                        </span>
                      )}
                    </button>
                  )}

                  {USER_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] text-[#082068] font-bold shadow-md'
                            : 'text-sky-100/85 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-[#082068]' : 'text-sky-200/75'
                            }`}
                          />
                          <span>{item.label}</span>
                        </span>
                        {item.id === 'whatsapp' && unpaidCount > 0 && (
                          <span className="rounded bg-[#f59e0b] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-xs tabular-nums">
                            {unpaidCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Bottom Logged-In User & Actions */}
        <div className="p-4 space-y-2.5 bg-black/10 backdrop-blur-xs border-t border-white/15">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200/70">
              Koneksi Server
            </span>
            <DatabaseHealthIndicator />
          </div>

          {session.isAdmin && presenceSummary && (
            <div className="flex items-center justify-between text-[10px] text-sky-200/90 px-2 py-1 rounded-lg bg-white/10 border border-white/10">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span>Online:</span>
              </span>
              <span className="font-bold text-[#5eead4] tabular-nums">
                {presenceSummary.wargaCount} Warga · {presenceSummary.satpamCount} Satpam
              </span>
            </div>
          )}

          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              {session.isAdmin || isSatpam ? (
                <ShieldCheck className="h-4 w-4 text-[#5eead4]" />
              ) : (
                <User className="h-4 w-4 text-[#5eead4]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#86efac]">
                {session.roleLabel}
              </p>
              <p className="truncate font-display text-xs font-bold text-white">
                {session.displayName}
              </p>
            </div>
          </div>

          {session.isAdmin && session.unitId && onOpenMyUnit && (
            <button
              type="button"
              onClick={() => {
                onOpenMyUnit(session.unitId!);
                onCloseMobile();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5 text-[#5eead4]" />
              <span>Cek Unit ({session.unitId})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-300" />
            <span>Bagikan Link WA Peran</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar sesi login"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-sky-100" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Share Role Links Modal for WhatsApp */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Tautan Publik WhatsApp Tiap Peran
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kirim link langsung ke WhatsApp warga, pengurus, atau pos satpam
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  id: 'warga',
                  hash: 'warga',
                  name: 'Portal Warga',
                  desc: 'Cek status iuran, konfirmasi bayar QRIS & unduh kwitansi',
                  color: 'sky',
                },
                {
                  id: 'ketua',
                  hash: 'ketua',
                  name: 'Ketua Lingkungan',
                  desc: 'Dashboard ringkasan kas, persetujuan dan monitoring tunggakan',
                  color: 'blue',
                },
                {
                  id: 'bendahara',
                  hash: 'bendahara',
                  name: 'Bendahara Kas',
                  desc: 'Pencatatan iuran, transaksi buku kas, dan verifikasi mutasi',
                  color: 'indigo',
                },
                {
                  id: 'keamanan',
                  hash: 'keamanan',
                  name: 'Pos Keamanan / Satpam',
                  desc: 'Checklist patroli ronda, buku tamu, dan laporan keamanan',
                  color: 'emerald',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        {item.name}
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.desc}</p>
                      <code className="mt-1 inline-block font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {typeof window !== 'undefined' ? `${window.location.origin}/#${item.hash}` : `/#${item.hash}`}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.id, item.hash, item.name)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        copiedKey === item.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {copiedKey === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin Link WA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hosting: Vercel Production</span>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
