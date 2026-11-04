import React, { useState } from 'react';
import {
  Compass,
  Copy,
  Check,
  ExternalLink,
  Shield,
  ShieldCheck,
  UserCheck,
  Home,
  Sparkles,
  X,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import type { AuthSession } from '../lib/auth';
import type { DatabaseState } from '../types/finance';

interface TrialPortalHubProps {
  state: DatabaseState;
  onDirectLogin?: (session: AuthSession) => void;
  onSwitchPortal?: (portal: 'ketua' | 'bendahara' | 'warga' | 'satpam') => void;
  currentPortal?: string;
  isLoggedIn?: boolean;
  onClose?: () => void;
}

export const TrialPortalHub: React.FC<TrialPortalHubProps> = ({
  state,
  onDirectLogin,
  onSwitchPortal,
  currentPortal,
  isLoggedIn = false,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedWargaUnit, setSelectedWargaUnit] = useState<string>('B8-05');

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const wargaTestUnits = [
    { id: 'B8-05', name: 'IWAN', role: 'PEMBINA', pin: '3005', desc: 'Pembina Saung Kebun' },
    { id: 'B3-07', name: 'ERLANGGA', role: 'KETUA', pin: '3007', desc: 'Ketua Pengurus' },
    { id: 'B7-16', name: 'ANDRIANSYAH', role: 'BENDAHARA', pin: '3016', desc: 'Bendahara Kas' },
    { id: 'B5-21', name: 'DONI', role: 'HUMAS', pin: '3021', desc: 'Humas Lingkungan' },
    { id: 'B5-24', name: 'WAHYU', role: 'HUMAS', pin: '3024', desc: 'Humas Lingkungan' },
    { id: 'B8-06', name: 'DENI', role: 'SEKSI OLAH RAGA', pin: '3006', desc: 'Seksi Olahraga' },
    { id: 'B3-01', name: 'Asep Sukarma', role: 'WARGA BIASA', pin: '3001', desc: 'Warga Biasa' },
  ];

  const handleTestKetua = () => {
    if (onDirectLogin) {
      onDirectLogin({
        role: 'ketua',
        isAdmin: true,
        displayName: state.settings.chairpersonName || 'ERLANGGA',
        roleLabel: 'Admin — Ketua Pengurus',
        unitId: 'B3-07',
        loginAt: new Date().toISOString(),
      });
    } else if (onSwitchPortal) {
      window.location.hash = '#ketua';
      onSwitchPortal('ketua');
    }
  };

  const handleTestBendahara = () => {
    if (onDirectLogin) {
      onDirectLogin({
        role: 'bendahara',
        isAdmin: true,
        displayName: state.settings.treasurerName || 'ANDRIANSYAH',
        roleLabel: 'Admin — Bendahara Kas',
        unitId: 'B7-16',
        loginAt: new Date().toISOString(),
      });
    } else if (onSwitchPortal) {
      window.location.hash = '#bendahara';
      onSwitchPortal('bendahara');
    }
  };

  const handleTestWarga = (targetUnitId?: string) => {
    const target = targetUnitId || selectedWargaUnit;
    const resident = state.residents.find((r) => r.id === target) || state.residents[0];
    if (onDirectLogin && resident) {
      onDirectLogin({
        role: 'warga',
        isAdmin: false,
        displayName: resident.headOfFamily,
        roleLabel: `Warga Unit ${resident.id} (${resident.memberType === 'pengurus' ? resident.officerRole || 'Pengurus' : 'Warga'})`,
        unitId: resident.id,
        loginAt: new Date().toISOString(),
      });
    } else if (onSwitchPortal) {
      window.location.hash = '#warga';
      onSwitchPortal('warga');
    }
  };

  const handleTestSatpam = () => {
    if (onDirectLogin) {
      onDirectLogin({
        role: 'satpam',
        isAdmin: false,
        isSecurity: true,
        displayName: 'Danru Suryana',
        roleLabel: 'Petugas Keamanan (Pos Gerbang Utama)',
        unitId: null,
        shiftLabel: 'Shift Malam (19.00 - 07.00 WIB)',
        officerBadge: 'SEC-001',
        loginAt: new Date().toISOString(),
      });
    } else if (onSwitchPortal) {
      window.location.hash = '#keamanan';
      onSwitchPortal('satpam');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-4 sm:p-6 shadow-md space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-xs">
            <Compass className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base font-bold text-slate-900">
                Pusat Alamat Portal &amp; Uji Coba Akses
              </h2>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                Mode Pengujian Langsung
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Gunakan alamat URL spesifik atau klik tombol uji coba untuk mengetes hak akses masing-masing peran.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid of 4 Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 1. Admin - Ketua */}
        <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold text-xs">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">1. Admin Ketua (Erlangga)</span>
                <span className="text-[10px] text-slate-500 font-mono">Unit B3-07 · Bebas Iuran</span>
              </div>
            </div>
            <span className="rounded bg-blue-50 text-blue-800 font-bold text-[10px] px-1.5 py-0.5 border border-blue-200">
              Supervisi &amp; LPJ
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono flex items-center justify-between border border-slate-200">
            <span className="text-blue-900 font-bold truncate">{baseUrl}#ketua</span>
            <button
              type="button"
              onClick={() => copyToClipboard(`${baseUrl}#ketua`, 'ketua')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 ml-2 px-1.5 py-0.5 bg-white border border-slate-300 rounded cursor-pointer"
            >
              {copiedKey === 'ketua' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'ketua' ? 'Tersalin' : 'Salin URL'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
            <span>Login: <strong className="font-mono text-slate-900">ketua</strong> / Pass: <strong className="font-mono text-slate-900">ketua123</strong></span>
            <button
              type="button"
              onClick={handleTestKetua}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] px-2.5 py-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-blue-300" />
              <span>Uji Coba Ketua</span>
            </button>
          </div>
        </div>

        {/* 2. Admin - Bendahara */}
        <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">2. Admin Bendahara (Andriansyah)</span>
                <span className="text-[10px] text-slate-500 font-mono">Unit B7-16 · Bebas Iuran</span>
              </div>
            </div>
            <span className="rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 border border-emerald-200">
              Kas &amp; Data Warga
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono flex items-center justify-between border border-slate-200">
            <span className="text-emerald-900 font-bold truncate">{baseUrl}#bendahara</span>
            <button
              type="button"
              onClick={() => copyToClipboard(`${baseUrl}#bendahara`, 'bendahara')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 ml-2 px-1.5 py-0.5 bg-white border border-slate-300 rounded cursor-pointer"
            >
              {copiedKey === 'bendahara' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'bendahara' ? 'Tersalin' : 'Salin URL'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
            <span>Login: <strong className="font-mono text-slate-900">bendahara</strong> / Pass: <strong className="font-mono text-slate-900">bendahara123</strong></span>
            <button
              type="button"
              onClick={handleTestBendahara}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-[11px] px-2.5 py-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>Uji Coba Bendahara</span>
            </button>
          </div>
        </div>

        {/* 3. Warga Lingkungan */}
        <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-sky-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-900 font-bold text-xs">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">3. Portal Warga &amp; Pengurus</span>
                <span className="text-[10px] text-slate-500">Iuran, Kwitansi, LPJ, &amp; Transparansi</span>
              </div>
            </div>
            <span className="rounded bg-sky-50 text-sky-800 font-bold text-[10px] px-1.5 py-0.5 border border-sky-200">
              Akses Privat
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono flex items-center justify-between border border-slate-200">
            <span className="text-sky-900 font-bold truncate">{baseUrl}#warga</span>
            <button
              type="button"
              onClick={() => copyToClipboard(`${baseUrl}#warga`, 'warga')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 ml-2 px-1.5 py-0.5 bg-white border border-slate-300 rounded cursor-pointer"
            >
              {copiedKey === 'warga' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'warga' ? 'Tersalin' : 'Salin URL'}</span>
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-semibold">Pilih Akun Uji Coba:</span>
              <select
                value={selectedWargaUnit}
                onChange={(e) => setSelectedWargaUnit(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-800"
              >
                {wargaTestUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} - {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                PIN: {wargaTestUnits.find((u) => u.id === selectedWargaUnit)?.pin || '1234'}
              </span>
              <button
                type="button"
                onClick={() => handleTestWarga(selectedWargaUnit)}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-800 hover:bg-sky-700 text-white font-bold text-[11px] px-2.5 py-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-sky-200" />
                <span>Uji Coba Warga ({selectedWargaUnit})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Keamanan / Pos Satpam */}
        <div className="rounded-xl border border-teal-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-teal-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-900 font-bold text-xs">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">4. Pos Keamanan &amp; Satpam</span>
                <span className="text-[10px] text-slate-500">Danru Suryana · Gerbang 24 Jam</span>
              </div>
            </div>
            <span className="rounded bg-teal-50 text-teal-800 font-bold text-[10px] px-1.5 py-0.5 border border-teal-200">
              Buku Tamu &amp; Ronda
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 text-[11px] font-mono flex items-center justify-between border border-slate-200">
            <span className="text-teal-900 font-bold truncate">{baseUrl}#keamanan</span>
            <button
              type="button"
              onClick={() => copyToClipboard(`${baseUrl}#keamanan`, 'keamanan')}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 ml-2 px-1.5 py-0.5 bg-white border border-slate-300 rounded cursor-pointer"
            >
              {copiedKey === 'keamanan' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'keamanan' ? 'Tersalin' : 'Salin URL'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
            <span>Nama: <strong className="font-mono text-slate-900">Suryana</strong> / PIN: <strong className="font-mono text-slate-900">7001</strong></span>
            <button
              type="button"
              onClick={handleTestSatpam}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold text-[11px] px-2.5 py-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-teal-200" />
              <span>Uji Coba Satpam</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
