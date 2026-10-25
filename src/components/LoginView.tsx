import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Home,
  KeyRound,
  Link2,
  Lock,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { DatabaseState, SecurityShiftLabel } from '../types/finance';
import {
  ADMIN_CREDENTIALS,
  authenticateAdmin,
  authenticateSatpam,
  authenticateWarga,
  DEFAULT_SATPAM_PIN,
  DEFAULT_WARGA_PIN,
  type AuthSession,
} from '../lib/auth';
import { calculateRealtimeSummary, formatRupiah } from '../lib/finance';

interface LoginViewProps {
  state: DatabaseState;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ state, onLoginSuccess }) => {
  const getInitialPortal = (): 'warga' | 'admin' | 'satpam' => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#warga') return 'warga';
      if (hash === '#keamanan' || hash === '#satpam') return 'satpam';
      if (hash === '#admin') return 'admin';
      const search = new URLSearchParams(window.location.search);
      const portalParam = search.get('portal');
      if (portalParam === 'warga') return 'warga';
      if (portalParam === 'keamanan' || portalParam === 'satpam') return 'satpam';
      if (portalParam === 'admin') return 'admin';
    } catch {
      // ignore
    }
    return 'admin';
  };

  const [portalTab, setPortalTab] = useState<'warga' | 'admin' | 'satpam'>(getInitialPortal);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#warga') setPortalTab('warga');
      else if (hash === '#keamanan' || hash === '#satpam') setPortalTab('satpam');
      else if (hash === '#admin') setPortalTab('admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchPortalTab = (tab: 'warga' | 'admin' | 'satpam') => {
    setPortalTab(tab);
    setError(null);
    try {
      const targetHash = tab === 'satpam' ? '#keamanan' : `#${tab}`;
      window.history.replaceState(null, '', targetHash);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = (tab: 'admin' | 'warga' | 'satpam') => {
    const hash = tab === 'satpam' ? '#keamanan' : `#${tab}`;
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(tab);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const [adminRole, setAdminRole] = useState<'ketua' | 'bendahara'>('bendahara');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [selectedUnitId, setSelectedUnitId] = useState('A-05');
  const [wargaPin, setWargaPin] = useState('');

  const officers = state.securityOfficers ?? [];
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(
    officers[0]?.id || ''
  );
  const [guardName, setGuardName] = useState(
    officers[0]?.name || 'Danru Suryadi & Petugas Jaga Herman'
  );
  const [guardShift, setGuardShift] = useState<SecurityShiftLabel>(
    officers[0]?.assignedShift || 'Shift Malam (19.00 - 07.00 WIB)'
  );
  const [satpamPin, setSatpamPin] = useState('');

  const [error, setError] = useState<string | null>(null);

  const summary = calculateRealtimeSummary(state, '2026-10');
  const selectedResident = state.residents.find((r) => r.id === selectedUnitId);
  const selectedOfficer = officers.find((o) => o.id === selectedOfficerId);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authenticateAdmin(
      {
        adminRole,
        username: adminUsername,
        password: adminPassword,
      },
      state.settings
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onLoginSuccess(res.session);
  };

  const handleWargaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authenticateWarga(
      {
        unitId: selectedUnitId,
        pin: wargaPin,
      },
      state.residents
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onLoginSuccess(res.session);
  };

  const handleSatpamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authenticateSatpam(
      {
        guardName,
        shift: guardShift,
        pin: satpamPin,
        officerId: selectedOfficerId || undefined,
      },
      state.securityOfficers
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onLoginSuccess(res.session);
  };

  const fillAdminPreset = (role: 'ketua' | 'bendahara') => {
    setPortalTab('admin');
    setAdminRole(role);
    setAdminUsername(ADMIN_CREDENTIALS[role].username);
    setAdminPassword(ADMIN_CREDENTIALS[role].password);
    setError(null);
  };

  const fillWargaPreset = (unitId: string) => {
    setPortalTab('warga');
    setSelectedUnitId(unitId);
    setWargaPin(DEFAULT_WARGA_PIN);
    setError(null);
  };

  const fillSatpamPreset = () => {
    setPortalTab('satpam');
    setGuardName('Danru Suryadi & Petugas Jaga Herman');
    setGuardShift('Shift Malam (19.00 - 07.00 WIB)');
    setSatpamPin(DEFAULT_SATPAM_PIN);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#eef2f8] text-slate-900 flex flex-col justify-between">
      {/* Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 border-b border-slate-200 bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#28999e] px-6 py-4 text-white sm:px-10">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[#5eead4] ring-1 ring-white/25">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
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
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Kas Perumahan Saung Kebun
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs text-sky-100">
          <span>55 Unit Rumah Terdaftar</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Iuran {formatRupiah(state.settings.monthlyFee)} / Bulan
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Saldo Kas Aktual: <strong className="text-[#5eead4]">{formatRupiah(summary.currentBalance)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPortalTab(portalTab === 'admin' ? 'warga' : 'admin');
              setError(null);
            }}
            className="rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#5eead4] px-3.5 py-2 text-xs font-bold text-[#082068] hover:opacity-95 whitespace-nowrap shrink-0 transition-opacity cursor-pointer"
          >
            {portalTab === 'admin' ? 'Buka Portal Warga' : 'Buka Portal Admin'}
          </button>
        </div>
      </header>

      {/* Main Split Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 lg:py-12 flex items-center">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Housing Context & Role Separation Info */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
            <div className="space-y-5">
              <p className="text-xs font-bold text-[#1547b8]">
                {state.settings.rtRwLabel} · Sistem Informasi Kas, Warga &amp; Keamanan
              </p>
              <h1
                className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                style={{ textWrap: 'balance' }}
              >
                Portal Akses Terpisah Warga, Pengurus Admin &amp; Satpam Jaga
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Sistem manajemen lingkungan Perumahan Saung Kebun dengan hak akses terpisah untuk{' '}
                <strong>Admin (Ketua &amp; Bendahara)</strong>,{' '}
                <strong>Akun Warga (55 Rumah)</strong>, serta{' '}
                <strong>Satuan Pengamanan (Satpam Jaga)</strong>.
              </p>

              {/* Access Separation Matrix */}
              <div className="divide-y divide-slate-200 border-t border-b border-slate-200 py-1 text-xs">
                <div className="py-3">
                  <div className="font-display font-bold text-slate-900">
                    1. Portal Admin — Ketua Paguyuban &amp; Bendahara
                  </div>
                  <p className="mt-1 text-slate-600">
                    Mengelola buku kas 55 rumah, LPJ Triwulan, upload file QRIS, serta mengatur{' '}
                    <strong>Publish / Unpublish</strong> informasi kegiatan dan daftar warga yang menunggak.
                  </p>
                </div>

                <div className="py-3">
                  <div className="font-display font-bold text-slate-900">
                    2. Portal Akun Warga (Unit A-01 s/d D-10)
                  </div>
                  <p className="mt-1 text-slate-600">
                    Hanya menampilkan <strong>riwayat iuran rumah sendiri</strong>, informasi kegiatan yang di-publish Admin, daftar warga menunggak yang di-publish Admin, serta informasi keamanan dari Satpam Jaga.
                  </p>
                </div>

                <div className="py-3">
                  <div className="font-display font-bold text-slate-900">
                    3. Portal Satuan Pengamanan (Satpam yang Jaga)
                  </div>
                  <p className="mt-1 text-slate-600">
                    Petugas keamanan yang sedang bertugas jaga dapat mem-publish laporan situasi keamanan, patroli blok, dan himbauan pos jaga ke Akun Warga.
                  </p>
                </div>
              </div>
            </div>

            {/* Real-Time Public Transparency Summary */}
            <div className="mt-6 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 pt-5">
              <div className="pr-4">
                <span className="block text-[11px] text-slate-500">Saldo Kas Real-Time</span>
                <span className="mt-0.5 block font-mono text-sm font-bold text-[#0f9f90] tabular-nums">
                  {formatRupiah(summary.currentBalance)}
                </span>
              </div>
              <div className="px-4">
                <span className="block text-[11px] text-slate-500">Status Oktober 2026</span>
                <span className="mt-0.5 block font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {summary.paidUnitsCount} / 55 Lunas
                </span>
              </div>
              <div className="pl-4">
                <span className="block text-[11px] text-slate-500">Iuran Bulanan</span>
                <span className="mt-0.5 block font-mono text-sm font-bold text-[#1547b8] tabular-nums">
                  {formatRupiah(state.settings.monthlyFee)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Separate Login Card */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#38d3c3] bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
            <div>
              {/* Dedicated Portal Links Box */}
              <div className="mb-4 p-3 rounded-xl border border-stone-200 bg-stone-50/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-[#0b2273]">
                    <Link2 className="w-3.5 h-3.5" />
                    Tautan Langsung Masing-masing Portal:
                  </span>
                  {copiedLink && (
                    <span className="text-emerald-700 font-semibold normal-case flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Link {copiedLink} disalin!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                  {/* Link Admin */}
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      portalTab === 'admin'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-white border-stone-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="link-login-admin"
                      onClick={() => switchPortalTab('admin')}
                      className="flex items-center gap-1.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                      <span className="truncate">Link Admin (#admin)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="copy-link-admin-btn"
                      onClick={() => handleCopyLink('admin')}
                      title="Salin tautan login admin"
                      className="p-1 text-slate-400 hover:text-emerald-800 cursor-pointer ml-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Link Warga */}
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      portalTab === 'warga'
                        ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                        : 'bg-white border-stone-200 text-slate-700 hover:border-sky-300'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="link-login-warga"
                      onClick={() => switchPortalTab('warga')}
                      className="flex items-center gap-1.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5 text-sky-800 shrink-0" />
                      <span className="truncate">Link Warga (#warga)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="copy-link-warga-btn"
                      onClick={() => handleCopyLink('warga')}
                      title="Salin tautan login warga"
                      className="p-1 text-slate-400 hover:text-sky-800 cursor-pointer ml-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Link Keamanan */}
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      portalTab === 'satpam'
                        ? 'bg-teal-50 border-teal-300 text-teal-950 font-bold'
                        : 'bg-white border-stone-200 text-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="link-login-keamanan"
                      onClick={() => switchPortalTab('satpam')}
                      className="flex items-center gap-1.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                      <span className="truncate">Link Satpam (#keamanan)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="copy-link-keamanan-btn"
                      onClick={() => handleCopyLink('satpam')}
                      title="Salin tautan login keamanan"
                      className="p-1 text-slate-400 hover:text-teal-800 cursor-pointer ml-1"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Portal Selector Tabs: Login Admin vs Login Warga vs Satpam */}
              <div
                className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1.5"
                role="group"
                aria-label="Pilih portal login"
              >
                <button
                  type="button"
                  data-testid="tab-login-admin"
                  onClick={() => switchPortalTab('admin')}
                  aria-pressed={portalTab === 'admin'}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    portalTab === 'admin'
                      ? 'bg-[#1547b8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Login Admin</span>
                </button>

                <button
                  type="button"
                  data-testid="tab-login-warga"
                  onClick={() => switchPortalTab('warga')}
                  aria-pressed={portalTab === 'warga'}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    portalTab === 'warga'
                      ? 'bg-[#1547b8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Login Warga</span>
                </button>

                <button
                  type="button"
                  data-testid="tab-login-satpam"
                  onClick={() => switchPortalTab('satpam')}
                  aria-pressed={portalTab === 'satpam'}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    portalTab === 'satpam'
                      ? 'bg-[#0f766e] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Satpam Jaga</span>
                </button>
              </div>


              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
                >
                  {error}
                </div>
              )}

              {portalTab === 'admin' ? (
                <form onSubmit={handleAdminSubmit} className="mt-5 space-y-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">
                      Pilih Jabatan Admin Pengurus
                    </span>
                    <div
                      className="mt-1.5 grid grid-cols-2 gap-2.5"
                      role="group"
                      aria-label="Pilih jabatan pengurus admin"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAdminRole('ketua');
                          setError(null);
                        }}
                        aria-pressed={adminRole === 'ketua'}
                        className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          adminRole === 'ketua'
                            ? 'border-2 border-[#38d3c3] bg-[#f0fdfa] text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-slate-900">
                            Ketua Paguyuban
                          </span>
                          <UserCheck
                            className={`h-4 w-4 ${
                              adminRole === 'ketua' ? 'text-[#1547b8]' : 'text-slate-300'
                            }`}
                          />
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-600">
                          {state.settings.chairpersonName}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAdminRole('bendahara');
                          setError(null);
                        }}
                        aria-pressed={adminRole === 'bendahara'}
                        className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          adminRole === 'bendahara'
                            ? 'border-2 border-[#38d3c3] bg-[#f0fdfa] text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-slate-900">
                            Bendahara Pengurus
                          </span>
                          <UserCheck
                            className={`h-4 w-4 ${
                              adminRole === 'bendahara' ? 'text-[#1547b8]' : 'text-slate-300'
                            }`}
                          />
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-600">
                          {state.settings.treasurerName}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-username-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      ID Pengurus ({adminRole === 'ketua' ? 'ketua' : 'bendahara'})
                    </label>
                    <input
                      id="admin-username-input"
                      type="text"
                      autoComplete="username"
                      placeholder={
                        adminRole === 'ketua' ? 'Masukkan ID: ketua' : 'Masukkan ID: bendahara'
                      }
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Kata Sandi Otorisasi Admin
                    </label>
                    <div className="relative mt-1">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="admin-password-input"
                        type="password"
                        autoComplete="current-password"
                        placeholder={
                          adminRole === 'ketua'
                            ? 'Sandi: ketua123'
                            : 'Sandi: bendahara123'
                        }
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#1547b8] px-4 py-3 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer"
                  >
                    {adminRole === 'ketua'
                      ? 'Masuk sebagai Admin — Ketua Paguyuban'
                      : 'Masuk sebagai Admin — Bendahara'}
                  </button>
                </form>
              ) : portalTab === 'warga' ? (
                <form onSubmit={handleWargaSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="warga-unit-select"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Pilih Nomor Unit Rumah (55 Unit Saung Kebun)
                    </label>
                    <select
                      id="warga-unit-select"
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                    >
                      {state.residents.map((r) => (
                        <option key={r.id} value={r.id}>
                          Unit {r.id} — {r.headOfFamily} ({r.streetName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedResident && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between">
                      <span>
                        Kepala Keluarga: <strong className="text-slate-900">{selectedResident.headOfFamily}</strong>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        WA: {selectedResident.whatsapp}
                      </span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="warga-pin-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      PIN Akses Warga / 4 Digit Terakhir Nomor WhatsApp
                    </label>
                    <div className="relative mt-1">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="warga-pin-input"
                        type="password"
                        placeholder="Masukkan PIN Warga (default: 1234)"
                        value={wargaPin}
                        onChange={(e) => setWargaPin(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#1547b8] px-4 py-3 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer"
                  >
                    Masuk sebagai Warga Unit {selectedUnitId}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSatpamSubmit} className="mt-5 space-y-4">
                  {officers.length > 0 && (
                    <div>
                      <label
                        htmlFor="satpam-officer-select"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Pilih Akun Petugas Pengamanan Terdaftar (Dikelola Admin)
                      </label>
                      <select
                        id="satpam-officer-select"
                        value={selectedOfficerId}
                        onChange={(e) => {
                          const chosen = officers.find((o) => o.id === e.target.value);
                          if (chosen) {
                            setSelectedOfficerId(chosen.id);
                            setGuardName(chosen.name);
                            setGuardShift(chosen.assignedShift);
                            setSatpamPin(chosen.pin);
                            setError(null);
                          } else {
                            setSelectedOfficerId('');
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
                      >
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.rankOrRole} · {o.badgeNumber}) — {o.assignedShift.split(' ')[0]} [{o.status}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedOfficer && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2.5 text-xs text-teal-950 flex items-center justify-between">
                      <div>
                        <span className="font-bold">{selectedOfficer.name}</span>
                        <span className="text-teal-700 ml-1.5">({selectedOfficer.rankOrRole} · {selectedOfficer.badgeNumber})</span>
                      </div>
                      <span className={`rounded px-2 py-0.5 font-bold text-[10px] ${
                        selectedOfficer.status === 'Aktif'
                          ? 'bg-teal-200 text-teal-900'
                          : selectedOfficer.status === 'Cuti'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}>
                        {selectedOfficer.status}
                      </span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="satpam-guard-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nama Petugas Satuan Pengamanan yang Bertugas Jaga
                    </label>
                    <input
                      id="satpam-guard-name"
                      type="text"
                      value={guardName}
                      onChange={(e) => setGuardName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="satpam-shift-select"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Shift Jaga Pos Keamanan
                    </label>
                    <select
                      id="satpam-shift-select"
                      value={guardShift}
                      onChange={(e) => setGuardShift(e.target.value as SecurityShiftLabel)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
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
                    <label
                      htmlFor="satpam-pin-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      PIN Akses Petugas / Sandi Pos Satpam (default: satpam123)
                    </label>
                    <div className="relative mt-1">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="satpam-pin-input"
                        type="password"
                        placeholder="Masukkan sandi: satpam123"
                        value={satpamPin}
                        onChange={(e) => setSatpamPin(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#0f766e] px-4 py-3 text-xs font-bold text-white hover:bg-[#115e59] transition-colors cursor-pointer"
                  >
                    Masuk Pos Satpam &amp; Laporkan Situasi Jaga
                  </button>
                </form>
              )}
            </div>

            {/* Quick Credential Helper Strip for Testing */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold text-slate-500">
                Pengisian Cepat Kredensial Resmi (Klik untuk isi formulir):
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fillAdminPreset('ketua')}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi Akun Ketua (ketua / ketua123)
                </button>
                <button
                  type="button"
                  onClick={() => fillAdminPreset('bendahara')}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi Akun Bendahara (bendahara / bendahara123)
                </button>
                <button
                  type="button"
                  onClick={() => fillWargaPreset('A-05')}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi Akun Warga A-05 (PIN 1234)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstOff = officers[0];
                    if (firstOff) {
                      setPortalTab('satpam');
                      setSelectedOfficerId(firstOff.id);
                      setGuardName(firstOff.name);
                      setGuardShift(firstOff.assignedShift);
                      setSatpamPin(firstOff.pin);
                      setError(null);
                    } else {
                      fillSatpamPreset();
                    }
                  }}
                  className="rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi Akun Satpam ({officers[0]?.name || 'Suryadi'} · {officers[0]?.pin || 'satpam123'})
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        {state.settings.housingName} · {state.settings.housingAddress}
      </footer>
    </div>
  );
};
