import React from 'react';
import {
  BookOpen,
  Calendar,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  QrCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import type { NavTab } from './Sidebar';
import type { AuthSession } from '../lib/auth';
import type { WargaPortalTab } from './WargaPortalView';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: AuthSession;
  unpaidCount: number;
  pendingVerificationCount?: number;
  onOpenMobileMenu?: () => void;
  onLogout: () => void;
  onOpenAddModal?: () => void;
  onOpenUnitModal?: (unitId: string, showQRIS?: boolean) => void;
  wargaTab?: WargaPortalTab;
  onSelectWargaTab?: (tab: WargaPortalTab) => void;
  satpamTab?: 'keamanan' | 'anggota' | 'kegiatan';
  onSelectSatpamTab?: (tab: 'keamanan' | 'anggota' | 'kegiatan') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  session,
  unpaidCount,
  pendingVerificationCount = 0,
  onOpenMobileMenu,
  onLogout,
  onOpenAddModal,
  onOpenUnitModal,
  wargaTab = 'iuran',
  onSelectWargaTab,
  satpamTab = 'keamanan',
  onSelectSatpamTab,
}) => {
  const isWarga = session.role === 'warga';
  const isSatpam = session.role === 'satpam';
  const isAdmin = session.isAdmin;

  return (
    <nav
      data-testid="aesthetic-bottom-nav"
      aria-label="Navigasi Bawah Estetik"
      className="fixed bottom-2.5 left-2.5 right-2.5 sm:left-6 sm:right-6 md:left-1/2 md:-translate-x-1/2 md:w-[620px] z-40 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.18)] rounded-2xl px-1.5 py-1.5 lg:hidden transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-0.5 w-full">
        {/* ======================================================== */}
        {/* 1. ADMIN (KETUA & BENDAHARA)                             */}
        {/* ======================================================== */}
        {isAdmin && (
          <>
            {/* Tab 1: Dashboard / Kas */}
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50/80 text-[#1547b8] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <LayoutDashboard className="h-5 w-5" />
                {pendingVerificationCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {pendingVerificationCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Kas &amp; Bal
              </span>
              {activeTab === 'dashboard' && (
                <span className="h-1 w-3.5 rounded-full bg-[#1547b8] mt-0.5" />
              )}
            </button>

            {/* Tab 2: 55 Warga */}
            <button
              type="button"
              onClick={() => onSelectTab('residents')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                activeTab === 'residents'
                  ? 'bg-indigo-50/80 text-[#1547b8] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <Home className="h-5 w-5" />
                {unpaidCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {unpaidCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                55 Warga
              </span>
              {activeTab === 'residents' && (
                <span className="h-1 w-3.5 rounded-full bg-[#1547b8] mt-0.5" />
              )}
            </button>

            {/* Elevated Center Action: Quick Catat Transaksi (+) */}
            <div className="flex items-center justify-center px-1">
              <button
                type="button"
                onClick={onOpenAddModal}
                title="Catat Transaksi Kas Baru"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#0b2273] to-[#1547b8] text-white shadow-md shadow-indigo-900/30 ring-3 ring-white hover:opacity-95 active:scale-90 transition-all cursor-pointer"
              >
                <Plus className="h-6 w-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Tab 3: Transaksi Ledger */}
            <button
              type="button"
              onClick={() => onSelectTab('transactions')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                activeTab === 'transactions'
                  ? 'bg-indigo-50/80 text-[#1547b8] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Transaksi
              </span>
              {activeTab === 'transactions' && (
                <span className="h-1 w-3.5 rounded-full bg-[#1547b8] mt-0.5" />
              )}
            </button>

            {/* Tab 4: Drawer Menu Lainnya */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Lainnya
              </span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 2. WARGA (55 RUMAH)                                      */}
        {/* ======================================================== */}
        {isWarga && (
          <>
            {/* Tab 1: Status Iuran & QRIS */}
            <button
              type="button"
              onClick={() => onSelectWargaTab?.('iuran')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                wargaTab === 'iuran'
                  ? 'bg-sky-50 text-[#0d5c75] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Iuran
              </span>
              {wargaTab === 'iuran' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0d5c75] mt-0.5" />
              )}
            </button>

            {/* Tab 2: Kwitansi Pembayaran */}
            <button
              type="button"
              onClick={() => onSelectWargaTab?.('kwitansi')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                wargaTab === 'kwitansi'
                  ? 'bg-sky-50 text-[#0d5c75] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Kwitansi
              </span>
              {wargaTab === 'kwitansi' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0d5c75] mt-0.5" />
              )}
            </button>

            {/* Elevated Center Action: Bayar QRIS */}
            <div className="flex items-center justify-center px-1">
              <button
                type="button"
                onClick={() => {
                  onSelectWargaTab?.('iuran');
                  if (session.unitId && onOpenUnitModal) {
                    onOpenUnitModal(session.unitId, true);
                  }
                }}
                title="Buka QRIS & Bayar Iuran"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#0d5c75] to-[#0f766e] text-white shadow-md shadow-teal-900/30 ring-3 ring-white hover:opacity-95 active:scale-90 transition-all cursor-pointer"
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>

            {/* Tab 3: Kegiatan & Pengumuman */}
            <button
              type="button"
              onClick={() => onSelectWargaTab?.('kegiatan')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                wargaTab === 'kegiatan'
                  ? 'bg-sky-50 text-[#0d5c75] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Info Warga
              </span>
              {wargaTab === 'kegiatan' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0d5c75] mt-0.5" />
              )}
            </button>

            {/* Tab 4: Laporan Kas & LPJ */}
            <button
              type="button"
              onClick={() => onSelectWargaTab?.('laporan')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                wargaTab === 'laporan'
                  ? 'bg-sky-50 text-[#0d5c75] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Laporan
              </span>
              {wargaTab === 'laporan' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0d5c75] mt-0.5" />
              )}
            </button>

            {/* Tab 5: Menu Drawer */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[55px]">
                Lainnya
              </span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 3. SATPAM (POS JAGA GERBANG)                             */}
        {/* ======================================================== */}
        {isSatpam && (
          <>
            {/* Tab 1: Situasi Jaga & Laporan Patroli */}
            <button
              type="button"
              onClick={() => onSelectSatpamTab?.('keamanan')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                satpamTab === 'keamanan'
                  ? 'bg-teal-50 text-[#0f766e] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Patroli</span>
              {satpamTab === 'keamanan' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0f766e] mt-0.5" />
              )}
            </button>

            {/* Tab 2: Anggota Rekan Satpam & Kontak */}
            <button
              type="button"
              onClick={() => onSelectSatpamTab?.('anggota')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                satpamTab === 'anggota'
                  ? 'bg-teal-50 text-[#0f766e] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Rekan Pos</span>
              {satpamTab === 'anggota' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0f766e] mt-0.5" />
              )}
            </button>

            {/* Elevated Center Action: Input Laporan Patroli */}
            <div className="flex items-center justify-center px-1">
              <button
                type="button"
                onClick={() => {
                  onSelectSatpamTab?.('keamanan');
                  const form = document.querySelector('form');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                title="Input Laporan Patroli Lingkungan"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0f766e] text-white shadow-md shadow-emerald-900/30 ring-3 ring-white hover:opacity-95 active:scale-90 transition-all cursor-pointer"
              >
                <ShieldCheck className="h-5 w-5" />
              </button>
            </div>

            {/* Tab 3: Pengumuman Lingkungan */}
            <button
              type="button"
              onClick={() => onSelectSatpamTab?.('kegiatan')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
                satpamTab === 'kegiatan'
                  ? 'bg-teal-50 text-[#0f766e] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Info Warga</span>
              {satpamTab === 'kegiatan' && (
                <span className="h-1 w-3.5 rounded-full bg-[#0f766e] mt-0.5" />
              )}
            </button>

            {/* Tab 4: Keluar Pos Jaga */}
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-rose-600 hover:bg-rose-50 transition-all cursor-pointer active:scale-95"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 truncate max-w-[60px]">Keluar</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
