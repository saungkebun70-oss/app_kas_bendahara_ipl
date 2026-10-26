import React from 'react';
import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  QrCode,
  Settings,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import type { NavTab } from './Sidebar';
import type { AuthSession } from '../lib/auth';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: AuthSession;
  unpaidCount: number;
  pendingVerificationCount?: number;
  onOpenMobileMenu?: () => void;
  onLogout: () => void;
  onOpenWargaPaymentModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  session,
  unpaidCount,
  pendingVerificationCount = 0,
  onOpenMobileMenu,
  onLogout,
  onOpenWargaPaymentModal,
}) => {
  const isWarga = session.role === 'warga';
  const isSatpam = session.role === 'satpam';
  const isAdmin = session.isAdmin;

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Navigasi Bawah Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg lg:hidden"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-around px-1 py-1.5 min-h-[58px]">
        {/* ======================================================== */}
        {/* 1. ADMIN BOTTOM NAVIGATION                               */}
        {/* ======================================================== */}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-[#1547b8] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <LayoutDashboard className="h-5 w-5" />
                {pendingVerificationCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                    {pendingVerificationCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Kas &amp; Bal</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('residents')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'residents'
                  ? 'text-[#1547b8] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Home className="h-5 w-5" />
                {unpaidCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    {unpaidCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">55 Warga</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('transactions')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'text-[#1547b8] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Transaksi</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('reports')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-[#1547b8] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">LPJ &amp; PDF</span>
            </button>

            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Semua</span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 2. SATPAM BOTTOM NAVIGATION                              */}
        {/* ======================================================== */}
        {isSatpam && (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('publications')}
              className={`col-span-2 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'publications'
                  ? 'text-[#0f766e] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Laporan Situasi &amp; Patroli</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('security_officers')}
              className={`col-span-2 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'security_officers'
                  ? 'text-[#0f766e] font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Anggota Satpam</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
              title="Keluar dari akun satpam"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Keluar</span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 3. WARGA BOTTOM NAVIGATION                               */}
        {/* ======================================================== */}
        {isWarga && (
          <>
            <button
              type="button"
              onClick={() => scrollToSection('warga-status-section')}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-sky-800 hover:text-sky-950 transition-colors cursor-pointer"
            >
              <Home className="h-5 w-5 text-[#0d5c75]" />
              <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[60px]">Status Iuran</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('warga-qris-section')}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-sky-800 hover:text-sky-950 transition-colors cursor-pointer"
            >
              <QrCode className="h-5 w-5 text-[#0d5c75]" />
              <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[60px]">Bayar QRIS</span>
            </button>

            {onOpenWargaPaymentModal && (
              <button
                type="button"
                onClick={onOpenWargaPaymentModal}
                className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-emerald-700 font-bold hover:text-emerald-900 transition-colors cursor-pointer"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs -mt-1">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
                <span className="text-[9px] mt-0.5">Upload Bukti</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollToSection('warga-announcements-section')}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-sky-800 hover:text-sky-950 transition-colors cursor-pointer"
            >
              <Megaphone className="h-5 w-5 text-[#0d5c75]" />
              <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[60px]">Pengumuman</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex flex-col items-center justify-center py-1 px-1 rounded-lg text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[60px]">Keluar</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
