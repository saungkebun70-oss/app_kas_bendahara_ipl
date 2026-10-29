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
  authenticateAdmin,
  authenticateSatpam,
  authenticateWarga,
  type AuthSession,
} from '../lib/auth';
import { calculateRealtimeSummary, formatRupiah } from '../lib/finance';
import { DatabaseHealthIndicator } from './DatabaseHealthIndicator';

interface LoginViewProps {
  state: DatabaseState;
  onLoginSuccess: (session: AuthSession) => void;
}

export type LoginPortalType = 'ketua' | 'bendahara' | 'warga' | 'satpam';

export const LoginView: React.FC<LoginViewProps> = ({ state, onLoginSuccess }) => {
  // Determine isolated portal from hash or query
  const getInitialPortal = (): LoginPortalType => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#ketua') return 'ketua';
      if (hash === '#bendahara') return 'bendahara';
      if (hash === '#warga') return 'warga';
      if (hash === '#keamanan' || hash === '#satpam') return 'satpam';

      const path = window.location.pathname.toLowerCase();
      if (path.includes('ketua')) return 'ketua';
      if (path.includes('bendahara')) return 'bendahara';
      if (path.includes('warga')) return 'warga';
      if (path.includes('keamanan') || path.includes('satpam')) return 'satpam';

      const search = new URLSearchParams(window.location.search);
      const portalParam = search.get('portal')?.toLowerCase();
      if (portalParam === 'ketua') return 'ketua';
      if (portalParam === 'bendahara') return 'bendahara';
      if (portalParam === 'warga') return 'warga';
      if (portalParam === 'keamanan' || portalParam === 'satpam') return 'satpam';
      if (portalParam === 'admin') return 'ketua';
    } catch {
      // ignore
    }
    return 'ketua';
  };

  const [portal, setPortal] = useState<LoginPortalType>(getInitialPortal);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#ketua') setPortal('ketua');
      else if (hash === '#bendahara') return setPortal('bendahara');
      else if (hash === '#warga') setPortal('warga');
      else if (hash === '#keamanan' || hash === '#satpam') setPortal('satpam');
      else if (hash === '#admin') setPortal('ketua');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchPortal = (target: LoginPortalType) => {
    setPortal(target);
    setError(null);
    try {
      if (target === 'satpam') window.location.hash = '#satpam';
      else window.location.hash = `#${target}`;
    } catch {}
  };

  // Separate Ketua form state
  const [ketuaUsername, setKetuaUsername] = useState('');
  const [ketuaPassword, setKetuaPassword] = useState('');

  // Separate Bendahara form state
  const [bendaharaUsername, setBendaharaUsername] = useState('');
  const [bendaharaPassword, setBendaharaPassword] = useState('');

  // Warga form state (manual text input, no dropdown list)
  const [wargaUnitInput, setWargaUnitInput] = useState('');
  const [wargaPin, setWargaPin] = useState('');

  // Satpam form state (manual text input, no dropdown list)
  const [guardName, setGuardName] = useState('');
  const [guardShift, setGuardShift] = useState<SecurityShiftLabel>(
    'Shift Malam (19.00 - 07.00 WIB)'
  );
  const [satpamPin, setSatpamPin] = useState('');

  const [error, setError] = useState<string | null>(null);

  const summary = calculateRealtimeSummary(state, '2026-10');

  const handleKetuaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ketuaUsername.trim() || !ketuaPassword.trim()) {
      setError('ID Pengurus dan kata sandi otorisasi Ketua wajib diisi.');
      return;
    }
    const res = authenticateAdmin(
      {
        adminRole: 'ketua',
        username: ketuaUsername.trim(),
        password: ketuaPassword.trim(),
      },
      state.settings
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onLoginSuccess(res.session);
  };

  const handleBendaharaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!bendaharaUsername.trim() || !bendaharaPassword.trim()) {
      setError('ID Pengurus dan kata sandi otorisasi Bendahara wajib diisi.');
      return;
    }
    const res = authenticateAdmin(
      {
        adminRole: 'bendahara',
        username: bendaharaUsername.trim(),
        password: bendaharaPassword.trim(),
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
      {/* Top Header */}
      <header
        className={`flex items-center justify-between gap-6 border-b border-slate-200 px-6 py-4 text-white sm:px-10 ${
          portal === 'warga'
            ? 'bg-gradient-to-r from-[#0b3b60] via-[#0d5c75] to-[#0f766e]'
            : portal === 'satpam'
            ? 'bg-gradient-to-r from-[#064e3b] via-[#0f766e] to-[#115e59]'
            : portal === 'ketua'
            ? 'bg-gradient-to-r from-[#0b2273] via-[#13459c] to-[#1e3a8a]'
            : 'bg-gradient-to-r from-[#0f2e6b] via-[#1547b8] to-[#0f766e]'
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-[#5eead4] ring-1 ring-white/25 overflow-hidden">
            {state.settings.appLogoUrl ? (
              <img
                src={state.settings.appLogoUrl}
                alt={state.settings.housingName}
                className="h-full w-full object-cover"
              />
            ) : portal === 'warga' ? (
              <Home className="h-5 w-5" />
            ) : portal === 'satpam' ? (
              <Shield className="h-5 w-5" />
            ) : portal === 'ketua' ? (
              <UserCheck className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <span className="block font-display text-base font-bold tracking-tight text-white">
              {portal === 'warga'
                ? `Portal Warga — ${state.settings.housingName}`
                : portal === 'satpam'
                ? `Pos Keamanan & Satpam — ${state.settings.housingName}`
                : portal === 'ketua'
                ? `Portal Pengurus (Ketua) — ${state.settings.housingName}`
                : `Portal Pengurus (Bendahara Kas) — ${state.settings.housingName}`}
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

      {/* SEPARATED PORTAL SELECTOR BAR */}
      <nav
        aria-label="Pilih Akses Masuk Akun"
        className="bg-white border-b border-slate-200/90 shadow-2xs sticky top-0 z-20"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Akses Masuk Terpisah:
          </span>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => switchPortal('ketua')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portal === 'ketua'
                  ? 'bg-[#0b2273] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Akses Ketua</span>
            </button>

            <button
              type="button"
              onClick={() => switchPortal('bendahara')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portal === 'bendahara'
                  ? 'bg-[#1547b8] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Bendahara</span>
            </button>

            <button
              type="button"
              onClick={() => switchPortal('warga')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portal === 'warga'
                  ? 'bg-[#0f766e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Portal Warga</span>
            </button>

            <button
              type="button"
              onClick={() => switchPortal('satpam')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portal === 'satpam'
                  ? 'bg-[#064e3b] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Pos Keamanan</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Single-Portal Container */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 lg:py-12 flex items-center">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* ======================================================== */}
          {/* 1. PORTAL KHUSUS KETUA (#ketua)                         */}
          {/* ======================================================== */}
          {portal === 'ketua' && (
            <>
              {/* Left Column: Ketua Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-900">
                    <UserCheck className="h-3.5 w-3.5 text-[#0b2273]" />
                    <span>Portal Khusus Ketua Lingkungan</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Sistem Pembukuan Kas &amp; Otorisasi Kebijakan
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Akses khusus Ketua (<strong>{state.settings.chairpersonName || 'Erlangga'}</strong>) untuk supervisi real-time arus kas lingkungan, persetujuan dan pengesahan LPJ Triwulan, serta kebijakan transparansi 55 rumah {state.settings.housingName}.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Supervisi Real-Time Saldo Kas</strong>
                        <span className="text-slate-500">Memantau mutasi buku kas, pemasukan iuran, dan pengeluaran operasional.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pengesahan LPJ Triwulan &amp; Laporan PDF</strong>
                        <span className="text-slate-500">Mengesahkan dokumen pertanggungjawaban keuangan dan ekspor laporan berkala.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Bebas Iuran &amp; Pengawasan Kepatuhan Warga</strong>
                        <span className="text-slate-500">Unit Ketua dibebaskan dari penarikan iuran bulanan dan mengawasi target kas.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Saldo Kas Aktual:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{formatRupiah(summary.currentBalance)}</span>
                </div>
              </div>

              {/* Right Column: Ketua Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-[#0b2273] bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b2273] block">
                      Akses Masuk Pengurus
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Ketua
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Ketikkan ID Pengurus dan Kata Sandi resmi Ketua.
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

                  <form onSubmit={handleKetuaSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="ketua-username-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        ID Pengurus (Username Ketua)
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="ketua-username-input"
                          type="text"
                          placeholder="Masukkan ID Pengurus Anda"
                          value={ketuaUsername}
                          onChange={(e) => {
                            setKetuaUsername(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 focus:border-[#0b2273] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="ketua-password-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Kata Sandi Otorisasi (Password Ketua)
                      </label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="ketua-password-input"
                          type="password"
                          placeholder="Masukkan kata sandi akun ketua"
                          value={ketuaPassword}
                          onChange={(e) => {
                            setKetuaPassword(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#0b2273] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#0b2273] px-4 py-3 text-xs font-bold text-white hover:bg-[#07174e] transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk sebagai Ketua
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Otorisasi Resmi Ketua Lingkungan</span>
                  <span>Privasi Keuangan Terjamin</span>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 2. PORTAL KHUSUS BENDAHARA (#bendahara)                 */}
          {/* ======================================================== */}
          {portal === 'bendahara' && (
            <>
              {/* Left Column: Bendahara Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#1547b8]" />
                    <span>Portal Khusus Bendahara Kas</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Sistem Pembukuan Kas &amp; Manajemen Keuangan
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Akses operasional Bendahara (<strong>{state.settings.treasurerName || 'Andriansyah'}</strong>) untuk pencatatan transaksi kas masuk &amp; kas keluar, verifikasi bukti transfer iuran, dan penerbitan kwitansi sah 55 rumah {state.settings.housingName}.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pencatatan Mutasi Kas &amp; Pengeluaran</strong>
                        <span className="text-slate-500">Mencatat operasional satpam, sampah, PJU, dan perawatan lingkungan.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Verifikasi Pembayaran &amp; Kwitansi PDF</strong>
                        <span className="text-slate-500">Verifikasi bukti transfer bank dan terbitkan nomor kwitansi sah digital.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Bebas Iuran &amp; Pengingat Tagihan WhatsApp</strong>
                        <span className="text-slate-500">Unit Bendahara dibebaskan dari tarikan iuran dan mengelola notifikasi warga.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Saldo Kas Aktual:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{formatRupiah(summary.currentBalance)}</span>
                </div>
              </div>

              {/* Right Column: Bendahara Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-[#1547b8] bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1547b8] block">
                      Akses Masuk Pengurus
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Bendahara Kas
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Ketikkan ID Pengurus dan Kata Sandi resmi Bendahara Kas.
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

                  <form onSubmit={handleBendaharaSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="bendahara-username-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        ID Pengurus (Username Bendahara)
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="bendahara-username-input"
                          type="text"
                          placeholder="Masukkan ID Pengurus Anda"
                          value={bendaharaUsername}
                          onChange={(e) => {
                            setBendaharaUsername(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="bendahara-password-input"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Kata Sandi Otorisasi (Password Bendahara)
                      </label>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="bendahara-password-input"
                          type="password"
                          placeholder="Masukkan kata sandi akun bendahara"
                          value={bendaharaPassword}
                          onChange={(e) => {
                            setBendaharaPassword(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-[#1547b8] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#1547b8] px-4 py-3 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk sebagai Bendahara Kas
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Otorisasi Resmi Bendahara Kas</span>
                  <span>Privasi Keuangan Terjamin</span>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 3. PORTAL KHUSUS WARGA (#warga)                         */}
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
                        <span className="text-slate-500">Scan QRIS resmi lingkungan atau konfirmasi bukti transfer dari m-banking.</span>
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
                          onChange={(e) => {
                            setWargaPin(e.target.value);
                            setError(null);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 font-mono text-sm text-slate-900 focus:border-sky-600 focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        * Masukkan PIN yang telah dikirimkan oleh Pengurus kepada nomor Anda.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-sky-600 px-4 py-3 text-xs font-bold text-white hover:bg-sky-700 transition-colors cursor-pointer shadow-sm"
                    >
                      Masuk ke Portal Warga
                    </button>
                  </form>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Akses Privat Warga 55 Rumah</span>
                  <span>RT/RW Saung Kebun</span>
                </div>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* 4. PORTAL KHUSUS SATPAM (#keamanan / #satpam)            */}
          {/* ======================================================== */}
          {portal === 'satpam' && (
            <>
              {/* Left Column: Satpam Info Only */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-6 shadow-xs">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Pos Komando Satuan Pengamanan</span>
                  </div>

                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Sistem Jaga &amp; Keamanan Lingkungan 24 Jam
                  </h1>

                  <p className="text-sm leading-relaxed text-slate-600">
                    Akses resmi khusus personel Petugas Satuan Pengamanan (Satpam) yang bertugas 
                    menjaga pos gerbang utama serta patroli keliling di lingkungan 55 rumah <strong>{state.settings.housingName}</strong>.
                  </p>

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pencatatan Buku Jurnal Patroli</strong>
                        <span className="text-slate-500">Mencatat situasi shift, tamu keluar-masuk, dan patroli jalan Blok A–D.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Pemeriksaan Kendaraan Tamu</strong>
                        <span className="text-slate-500">Mencocokkan plat nomor warga terdaftar dan kendaraan tamu lingkungan.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold">Laporan Situasi Lingkungan Sah</strong>
                        <span className="text-slate-500">Menerbitkan laporan situasi pos kepada warga secara transparan dan tertib.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Regu Keamanan Bertugas:</span>
                  <span className="font-semibold text-emerald-900">Shift Siang &amp; Shift Malam</span>
                </div>
              </div>

              {/* Right Column: Satpam Login Form Only */}
              <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500 bg-white p-6 sm:p-8 lg:col-span-6 shadow-sm">
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Akses Masuk Petugas Jaga
                    </span>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Login Petugas Keamanan
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Ketikkan Nama/KTA dan PIN tugas yang telah diberikan oleh Pengurus.
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
                        Nama Petugas / Nomor KTA
                      </label>
                      <div className="relative mt-1">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="satpam-name-input"
                          type="text"
                          placeholder="Ketik nama petugas atau KTA (contoh: Danru Suryadi)"
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
                          onChange={(e) => {
                            setSatpamPin(e.target.value);
                            setError(null);
                          }}
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
        </div>
      </main>

      {/* Clean Global Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        {state.settings.housingName} · {state.settings.housingAddress}
      </footer>
    </div>
  );
};
