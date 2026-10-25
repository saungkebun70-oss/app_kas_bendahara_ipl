import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  MessageSquareShare,
  QrCode,
  Settings,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { AuthSession } from '../lib/auth';

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
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingVerificationCount?: number;
  onOpenVerification?: () => void;
}

const MANAGE_NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Balance & Kas', icon: LayoutDashboard },
  { id: 'residents', label: 'Data 55 Warga', icon: Home },
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
  mobileOpen,
  onCloseMobile,
  pendingVerificationCount,
  onOpenVerification,
}) => {
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
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#5eead4] ring-1 ring-white/25">
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
            </div>
            <div className="min-w-0">
              <span className="block truncate font-display text-lg font-bold tracking-tight text-white">
                saungkebun
              </span>
              <span className="block truncate text-[11px] text-sky-200/80">
                {isWarga
                  ? `Portal Warga · Unit ${session.unitId}`
                  : isSatpam
                  ? 'Pos Keamanan Satpam'
                  : '55 Rumah · Kas RT 004'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
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
                  onClick={() => scrollToWargaSection('warga-section-iuran')}
                  className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] py-2.5 pl-6 pr-4 text-left text-xs font-bold text-[#082068] shadow-md cursor-pointer"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <Home className="h-4 w-4 shrink-0 text-[#082068]" />
                    <span>Riwayat Iuran Saya ({session.unitId})</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToWargaSection('warga-section-kegiatan')}
                  className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold text-sky-100/85 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <Megaphone className="h-4 w-4 shrink-0 text-sky-200/75" />
                    <span>Kegiatan &amp; Info Admin</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToWargaSection('warga-section-keamanan')}
                  className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold text-sky-100/85 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-sky-200/75" />
                    <span>Info Keamanan Satpam</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToWargaSection('warga-section-tunggakan')}
                  className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full py-2.5 pl-6 pr-4 text-left text-xs font-semibold text-sky-100/85 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-sky-200/75" />
                    <span>Warga Menunggak</span>
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
                  onClick={() => handleSelect('publications')}
                  className="flex w-[calc(100%-16px)] items-center justify-between rounded-r-full bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] py-2.5 pl-6 pr-4 text-left text-xs font-bold text-[#082068] shadow-md cursor-pointer"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#082068]" />
                    <span>Publish Info Keamanan</span>
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

        {/* Direct Portal Links Box */}
        <div className="px-3 py-2 bg-black/20 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-200/70 mb-1.5 px-1">
            <Link2 className="w-3 h-3 text-[#5eead4]" />
            <span>Tautan Portal Langsung</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <a
              href="#admin"
              data-testid="portal-link-admin"
              onClick={onLogout}
              className="px-1.5 py-1 text-center rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-sky-100 transition-colors"
              title="Portal Khusus Pengurus Admin / Bendahara"
            >
              #admin
            </a>
            <a
              href="#warga"
              data-testid="portal-link-warga"
              onClick={onLogout}
              className="px-1.5 py-1 text-center rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-[#5eead4] transition-colors"
              title="Portal Khusus Warga"
            >
              #warga
            </a>
            <a
              href="#keamanan"
              data-testid="portal-link-keamanan"
              onClick={onLogout}
              className="px-1.5 py-1 text-center rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-amber-200 transition-colors"
              title="Portal Khusus Pos Satpam"
            >
              #keamanan
            </a>
          </div>
        </div>

        {/* Bottom Logged-In User & Actions */}
        <div className="p-4 space-y-2.5 bg-black/10 backdrop-blur-xs border-t border-white/15">
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
            onClick={onLogout}
            aria-label="Keluar sesi login"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-sky-100" />
            <span>Keluar / Ganti Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
};
