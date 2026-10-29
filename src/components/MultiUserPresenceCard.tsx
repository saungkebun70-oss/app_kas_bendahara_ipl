import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Home,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import type { PresenceSummary } from '../lib/api';

interface MultiUserPresenceCardProps {
  presence: PresenceSummary | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export const MultiUserPresenceCard: React.FC<MultiUserPresenceCardProps> = ({
  presence,
  onRefresh,
  loading = false,
}) => {
  const wargaCount = presence?.wargaCount ?? 0;
  const satpamCount = presence?.satpamCount ?? 0;
  const adminCount = presence?.adminCount ?? 0;
  const totalOnline = presence?.totalOnline ?? 0;

  return (
    <div
      data-testid="multi-user-presence-card"
      className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-sky-50/30 p-5 sm:p-6 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-indigo-100/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b2273] text-[#5eead4] shadow-xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                Pemantauan Pengguna Multi-User Aktif (Warga &amp; Keamanan)
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{totalOnline} Pengguna Sedang Online</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistem akses multi-user terisolasi: Warga, Pos Satpam, dan Pengurus Admin aktif bersamaan tanpa bentrok sesi.
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            title="Perbarui data pengguna online"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Status</span>
          </button>
        )}
      </div>

      {/* 3 Dedicated Presence Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. AKUN WARGA ONLINE */}
        <div className="rounded-xl border border-sky-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                  Portal Warga (55 Unit)
                </span>
                <strong className="text-sm font-extrabold text-slate-900">
                  {wargaCount} Warga Online
                </strong>
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                wargaCount > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {wargaCount > 0 ? 'Sedang Aktif' : 'Standby'}
            </span>
          </div>

          <div className="min-h-[64px] rounded-lg bg-sky-50/60 p-2.5 text-xs">
            {presence?.wargaList && presence.wargaList.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {presence.wargaList.map((w, idx) => (
                  <div
                    key={`${w.unitId}-${idx}`}
                    className="flex items-center justify-between bg-white rounded-md px-2 py-1 border border-sky-100 text-[11px]"
                  >
                    <span className="font-semibold text-sky-950 truncate max-w-[150px]">
                      Unit {w.unitId} · {w.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {w.lastSeenSecondsAgo}d lalu
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-2 text-center">
                Belum ada warga yang sedang membuka portal warga saat ini.
              </p>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Warga dapat masuk bersamaan untuk cek iuran &amp; upload bukti transfer.
          </p>
        </div>

        {/* 2. AKUN KEAMANAN / SATPAM ONLINE */}
        <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                  Pos Jaga Satpam
                </span>
                <strong className="text-sm font-extrabold text-slate-900">
                  {satpamCount} Petugas Jaga Online
                </strong>
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                satpamCount > 0
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {satpamCount > 0 ? 'Sedang Bertugas' : 'Standby'}
            </span>
          </div>

          <div className="min-h-[64px] rounded-lg bg-teal-50/60 p-2.5 text-xs">
            {presence?.satpamList && presence.satpamList.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {presence.satpamList.map((s, idx) => (
                  <div
                    key={`${s.displayName}-${idx}`}
                    className="flex items-center justify-between bg-white rounded-md px-2 py-1 border border-teal-100 text-[11px]"
                  >
                    <span className="font-semibold text-teal-950 truncate max-w-[150px]">
                      {s.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {s.lastSeenSecondsAgo}d lalu
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-2 text-center">
                Belum ada petugas yang sedang login di pos jaga.
              </p>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Petugas keamanan dapat melaporkan patroli blok &amp; situasi pos tanpa keluar akun.
          </p>
        </div>

        {/* 3. AKUN PENGURUS ADMIN ONLINE */}
        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Pengurus Lingkungan
                </span>
                <strong className="text-sm font-extrabold text-slate-900">
                  {adminCount} Admin Online
                </strong>
              </div>
            </div>
            <span className="rounded-full bg-indigo-100 text-indigo-900 px-2 py-0.5 text-[10px] font-bold">
              Pengawasan Kas
            </span>
          </div>

          <div className="min-h-[64px] rounded-lg bg-indigo-50/60 p-2.5 text-xs">
            {presence?.adminList && presence.adminList.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {presence.adminList.map((a, idx) => (
                  <div
                    key={`${a.displayName}-${idx}`}
                    className="flex items-center justify-between bg-white rounded-md px-2 py-1 border border-indigo-100 text-[11px]"
                  >
                    <span className="font-semibold text-indigo-950 truncate max-w-[150px]">
                      {a.displayName} ({a.roleLabel.replace('Admin — ', '')})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {a.lastSeenSecondsAgo}d lalu
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic py-2 text-center">
                Sedang memuat data sesi pengurus...
              </p>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Ketua &amp; Bendahara dapat login terpisah atau bersamaan untuk verifikasi kas.
          </p>
        </div>
      </div>
    </div>
  );
};
