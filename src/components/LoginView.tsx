import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Home,
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
  User,
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
import { DatabaseHealthIndicator } from './DatabaseHealthIndicator';

interface LoginViewProps {
  state: DatabaseState;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ state, onLoginSuccess }) => {
  // Determine isolated portal from hash or query
  const getInitialPortal = (): 'warga' | 'admin' | 'satpam' => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#warga') return 'warga';
      if (hash === '#keamanan' || hash === '#satpam') return 'satpam';
      if (hash === '#admin') return 'admin';

      const path = window.location.pathname.toLowerCase();
      if (path.includes('warga')) return 'warga';
      if (path.includes('keamanan') || path.includes('satpam')) return 'satpam';
      if (path.includes('admin')) return 'admin';

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

  const [portal, setPortal] = useState<'warga' | 'admin' | 'satpam'>(getInitialPortal);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#warga') setPortal('warga');
      else if (hash === '#keamanan' || hash === '#satpam') setPortal('satpam');
      else if (hash === '#admin') setPortal('admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Admin form state
  const [adminRole, setAdminRole] = useState<'ketua' | 'bendahara'>('bendahara');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Warga form state (manual text input, no dropdown list)
  const [wargaUnitInput, setWargaUnitInput] = useState('');
  const [wargaPin, setWargaPin] = useState('');

  // Satpam form state (manual text input, no dropdown list)
  const officers = state.securityOfficers ?? [];
  const [guardName, setGuardName] = useState('');
  const [guardShift, setGuardShift] = useState<SecurityShiftLabel>(
    'Shift Malam (19.00 - 07.00 WIB)'
  );
  const [satpamPin, setSatpamPin] = useState('');

  const [error, setError] = useState<string | null>(null);

  const summary = calculateRealtimeSummary(state, '2026-10');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setError('ID Pengurus dan kata sandi wajib diisi manual.');
      return;
    }
    const res = authenticateAdmin(
      {
        adminRole,
        username: adminUsername.trim(),
        password: adminPassword.trim(),
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
    const trimmedUnit = wargaUnitInput.trim().toUpperCase();
    if (!trimmedUnit) {
      setError('Ketik nomor unit rumah Anda (contoh: A-01, B-05, C-10).');
      return;
    }
    if (!wargaPin.trim()) {
      setError('Masukkan PIN Akses Warga yang telah diberikan oleh Pengurus.');
      return;
    }
    const res = authenticateWarga(
      {
        unitId: trimmedUnit,
        pin: wargaPin.trim(),
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
    const trimmedName = guardName.trim();
    if (!trimmedName) {
      setError('Ketik nama lengkap atau nomor KTA petugas keamanan.');
      return;
    }
    if (!satpamPin.trim()) {
      setError('Masukkan PIN Akses Pos Satpam yang telah diberikan oleh Pengurus.');
      return;
    }
    const res = authenticateSatpam(
      {
        guardName: trimmedName,
        shift: guardShift,
        pin: satpamPin.trim(),
      },
      state.securityOfficers
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onLoginSuccess(res.session);
  };

  return (
    <div className="min-h-screen bg-[#eef2f8] text-slate-900 flex flex-col justify-between">
      {/* Top Header - Dedicated per portal */}
      <header
        className={`flex items-center justify-between gap-6 border-b border-slate-200 px-6 py-4 text-white sm:px-10 ${
          portal === 'warga'
            ? 'bg-gradient-to-r from-[#0b3b60] via-[#0d5c75] to-[#0f766e]'
            : portal === 'satpam'
            ? 'bg-gradient-to-r from-[#064e3b] via-[#0f766e] to-[#115e59]'
            : 'bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#28999e]'
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-[#5eead4] ring-1 ring-white/25">
            {portal === 'warga' ? (
              <Home className="h-5 w-5" />
            ) : portal === 'satpam' ? (
              <Shield className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <span className="block font-display text-base font-bold tracking-tight text-white">
              {portal === 'warga'
                ? 'Portal Warga — Perumahan Saung Kebun'
                : portal === 'satpam'
                ? 'Pos Keamanan & Satpam — Saung Kebun'
                : 'Portal Pengurus Paguyuban — Saung Kebun'}
            </span>
            <span className="block text-[11px] text-[#5eead4]">
              {state.settings.rtRwLabel} · {state.settings.housingAddress}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-sky-100">
          <div className="hidden lg:flex items-center gap-4">
            <span>55 Unit Rumah Terdaftar</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Iuran {formatRupiah(state.settings.monthlyFee)} / Bulan
            </span>
          </div>
          <DatabaseHealthIndicator />
        </div>
      </header>

      {/* Main Single-Portal Container */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:py-12 flex items-center">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* ======================================================== */}
          {/* 1. PORTAL KHUSUS WARGA (#warga)                         */}
          {/* ======================================================== */}
          {portal === 'warga' && (
            <>
              {/* Left Column: Warga Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-800">
                    <Home className="h-3.5 w-3.5 text-sky-600" />
                    <span>Portal Khusus Warga 55 Rumah</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Transparansi Iuran &amp; Informasi Lingkungan Warga
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Selamat datang di portal khusus warga <strong>{state.settings.housingName}</strong>. 
                    Melalui halaman privat ini, Bapak/Ibu warga dapat memantau catatan iuran lingkungan 
                    rumah sendiri secara transparan dan nyaman.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Riwayat Iuran Rumah Sendiri</strong>
                        <span className="text-slate-500">Melihat status lunas, bulan berjalan, dan riwayat kwitansi unit Anda.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pembayaran Mudah QRIS &amp; Transfer</strong>
                        <span className="text-slate-500">Scan QRIS resmi paguyuban atau konfirmasi bukti transfer dari m-banking.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pengumuman &amp; Laporan Pos Satpam</strong>
                        <span className="text-slate-500">Menerima informasi kegiatan warga dan laporan patroli pos jaga terkini.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Iuran Lingkungan Bulanan:</span>
                  <span className="font-mono font-bold text-slate-800">{formatRupiah(state.settings.monthlyFee)}</span>
                </div>
              </div>

              {/* Right Column: Warga Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-sky-400 bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block">
                      Akses Masuk Akun Warga
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Warga Perumahan
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Masukkan Nomor Unit Rumah dan PIN Akun yang telah dibagikan oleh Admin Pengurus.
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
                    >
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleWargaSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="warga-unit-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Nomor Unit Rumah (Ketik Manual)
                      </label>
                      <div className="relative mt-1">
                        <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="warga-unit-input"
                          type="text"
                          placeholder="Ketik nomor unit (contoh: A-01, B-05, C-10)"
                          value={wargaUnitInput}
                          onChange={(e) => {
                            setWargaUnitInput(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm uppercase text-slate-900 focus:border-sky-600 focus:outline-none"
                        />
                      </div>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Format nomor blok &amp; nomor rumah (contoh: A-01 sampai D-15).
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor="warga-pin-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        PIN Akses Warga
                      </label>
                      <div className="relative mt-1">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="warga-pin-input"
                          type="password"
                          placeholder="Masukkan PIN Akun Warga Anda"
                          value={wargaPin}
                          onChange={(e) => setWargaPin(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        * Masukkan PIN yang telah dikirimkan oleh Pengurus Paguyuban kepada nomor Anda.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#0d5c75] px-4 py-3 text-xs font-bold text-white hover:bg-[#0b4b60] transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk ke Portal Warga
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Keamanan Akun Terproteksi</span>
                  <span>RT/RW Paguyuban Saung Kebun</span>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 2. PORTAL KHUSUS SATUAN PENGAMANAN (#keamanan / #satpam) */}
          {/* ======================================================== */}
          {portal === 'satpam' && (
            <>
              {/* Left Column: Satpam Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-teal-800">
                    <Shield className="h-3.5 w-3.5 text-teal-600" />
                    <span>Portal Khusus Satuan Pengamanan (Satpam)</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Pos Penjagaan &amp; Patroli Lingkungan Saung Kebun
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Halaman ini dikhususkan untuk <strong>Petugas Satpam yang sedang bertugas jaga</strong> di Pos Gerbang Utama Perumahan Saung Kebun.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Laporan Situasi Shift Jaga</strong>
                        <span className="text-slate-500">Mencatat kondisi pos gerbang utama pada Shift Pagi maupun Shift Malam.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Patroli Blok A, B, C, D</strong>
                        <span className="text-slate-500">Merekam jam patroli keliling lingkungan dan kondisi rumah warga.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Himbauan Keamanan ke Warga</strong>
                        <span className="text-slate-500">Mem-publish himbauan kewaspadaan langsung ke dashboard portal warga.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Pos Jaga Gerbang Utama:</span>
                  <span className="font-semibold text-slate-800">Aktif 24 Jam Non-Stop</span>
                </div>
              </div>

              {/* Right Column: Satpam Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-teal-500 bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
                      Akses Masuk Petugas Keamanan
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Petugas Jaga Pos Satpam
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Ketikkan Nama/KTA dan PIN tugas yang telah diberikan oleh Pengurus Paguyuban.
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
                    >
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSatpamSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="satpam-name-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Nama Petugas / Nomor KTA Satpam (Ketik Manual)
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="satpam-name-input"
                          type="text"
                          placeholder="Ketik nama lengkap atau nomor KTA petugas"
                          value={guardName}
                          onChange={(e) => {
                            setGuardName(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
                        />
                      </div>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Pastikan sesuai dengan nama yang didaftarkan oleh Pengurus.
                      </span>
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
                        PIN Akses Petugas Pos Satpam
                      </label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="satpam-pin-input"
                          type="password"
                          placeholder="Masukkan PIN Petugas Anda"
                          value={satpamPin}
                          onChange={(e) => setSatpamPin(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#0f766e] focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        * Masukkan PIN tugas rahasia Anda.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#0f766e] px-4 py-3 text-xs font-bold text-white hover:bg-[#115e59] transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk Pos Satpam &amp; Mulai Jaga
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Pos Jaga Gerbang Utama 24 Jam</span>
                  <span>Sistem Satpam Saung Kebun</span>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 3. PORTAL KHUSUS PENGURUS ADMIN / BENDAHARA (#admin / /) */}
          {/* ======================================================== */}
          {portal === 'admin' && (
            <>
              {/* Left Column: Admin Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Portal Khusus Pengurus Paguyuban</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Sistem Pembukuan Kas &amp; Administrasi Lingkungan
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Akses khusus Pengurus Paguyuban (Ketua Paguyuban &amp; Bendahara) untuk pengelolaan kas warga 55 rumah Perumahan Saung Kebun.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Buku Kas &amp; Rekapitulasi Real-Time</strong>
                        <span className="text-slate-500">Pencatatan kas masuk dan kas keluar dengan rekonsiliasi saldo akurat.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Verifikasi Pembayaran &amp; Kwitansi Sah</strong>
                        <span className="text-slate-500">Verifikasi bukti transfer warga dan terbitkan kwitansi resmi digital/PDF.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Laporan LPJ Triwulan &amp; Pengingat WA</strong>
                        <span className="text-slate-500">Cetak laporan LPJ keuangan dan kirim pesan pengingat tagihan warga.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Saldo Kas Aktual:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{formatRupiah(summary.currentBalance)}</span>
                </div>
              </div>

              {/* Right Column: Admin Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-indigo-500 bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Akses Masuk Pengurus
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Ketua / Bendahara
                    </h2>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
                    >
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Pilih Jabatan Pengurus
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminRole('ketua');
                            setError(null);
                          }}
                          className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                            adminRole === 'ketua'
                              ? 'border-2 border-indigo-600 bg-indigo-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-indigo-700 shrink-0" />
                            <strong className="block text-xs font-bold text-slate-900">
                              Ketua Paguyuban
                            </strong>
                          </div>
                          <span className="mt-1 block text-[11px] text-slate-500 truncate">
                            {state.settings.chairpersonName || 'Erlangga'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminRole('bendahara');
                            setError(null);
                          }}
                          className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                            adminRole === 'bendahara'
                              ? 'border-2 border-indigo-600 bg-indigo-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-indigo-700 shrink-0" />
                            <strong className="block text-xs font-bold text-slate-900">
                              Bendahara Kas
                            </strong>
                          </div>
                          <span className="mt-1 block text-[11px] text-slate-500 truncate">
                            {state.settings.treasurerName || 'Andriansyah'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-username-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        ID Pengurus (Username)
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="admin-username-input"
                          type="text"
                          placeholder="Masukkan ID Pengurus Anda"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-password-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Kata Sandi Otorisasi (Password)
                      </label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="admin-password-input"
                          type="password"
                          placeholder="Masukkan kata sandi akun pengurus"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#1547b8] px-4 py-3 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk sebagai Pengurus ({adminRole === 'ketua' ? 'Ketua Paguyuban' : 'Bendahara'})
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Otorisasi Resmi Pengurus Paguyuban</span>
                  <span>Privasi Keuangan Terjamin</span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Clean Global Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        {state.settings.housingName} · {state.settings.housingAddress}
      </footer>
    </div>
  );
};
