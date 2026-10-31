import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../lib/api';

export interface HealthState {
  status: 'checking' | 'connected' | 'error';
  latencyMs?: number;
  lastChecked?: Date;
  error?: string;
  totalResidents?: number;
  totalTransactions?: number;
  cloudDatabase?: string;
  cloudProvider?: string;
  projectId?: string;
  databaseId?: string;
  lastCloudSync?: string | null;
}

interface DatabaseHealthIndicatorProps {
  className?: string;
  variant?: 'compact' | 'pill' | 'badge';
}

export const DatabaseHealthIndicator: React.FC<DatabaseHealthIndicatorProps> = ({
  className = '',
}) => {
  const [health, setHealth] = useState<HealthState>({
    status: 'checking',
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkConnection = useCallback(async () => {
    setCheckingNow(true);
    try {
      const data = await api.getHealth();
      setHealth({
        status: data.status === 'ok' ? 'connected' : 'error',
        latencyMs: data.latencyMs,
        lastChecked: new Date(),
        totalResidents: data.totalResidents,
        totalTransactions: data.totalTransactions,
        cloudDatabase: data.cloudDatabase,
        cloudProvider: data.cloudProvider,
        projectId: data.projectId,
        databaseId: data.databaseId,
        lastCloudSync: data.lastCloudSync,
      });
    } catch (err: unknown) {
      setHealth({
        status: 'error',
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Gagal menghubungi database server',
      });
    } finally {
      setCheckingNow(false);
    }
  }, []);

  const handleSyncCloud = async () => {
    setSyncingCloud(true);
    setSyncSuccessMsg(null);
    try {
      const res = await api.syncCloudDatabase();
      if (res.success) {
        setSyncSuccessMsg('Database berhasil disinkronkan ke Google Cloud Firestore!');
        await checkConnection();
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
    } catch (err) {
      setSyncSuccessMsg(err instanceof Error ? err.message : 'Gagal sinkronisasi');
    } finally {
      setSyncingCloud(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Click outside to close details popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDetailsOpen(false);
      }
    };
    if (isDetailsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDetailsOpen]);

  const isConnected = health.status === 'connected';
  const isError = health.status === 'error';
  const isChecking = health.status === 'checking' || checkingNow;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button / Pill */}
      <button
        type="button"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
          isError
            ? 'bg-red-500/20 text-red-200 border border-red-400/40 hover:bg-red-500/30'
            : isConnected
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25'
            : 'bg-white/10 text-sky-200 border border-white/20 hover:bg-white/15'
        }`}
        title="Database tersimpan online secara aman di Google Cloud. Klik untuk melihat detail & diagnosa."
        aria-label="Status koneksi database cloud"
        data-testid="db-health-indicator-btn"
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          {isError && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isError
                ? 'bg-red-400'
                : isConnected
                ? 'bg-emerald-400'
                : 'bg-amber-400'
            }`}
          />
        </span>

        <span className="flex items-center gap-1">
          <Cloud className="h-3 w-3 text-emerald-400 opacity-90" />
          {isChecking ? (
            <span>Memeriksa Cloud...</span>
          ) : isConnected ? (
            <span className="flex items-center gap-1">
              <span>Cloud DB Aktif</span>
              {health.latencyMs !== undefined && (
                <span className="opacity-75 font-mono text-[10px] ml-0.5 font-normal">
                  ({health.latencyMs}ms)
                </span>
              )}
            </span>
          ) : (
            <span>DB Terputus</span>
          )}
        </span>
      </button>

      {/* Details Diagnostic Popover */}
      {isDetailsOpen && (
        <div
          data-testid="db-health-details-popover"
          className="absolute left-0 bottom-full mb-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isConnected ? <Cloud className="h-4.5 w-4.5" /> : <WifiOff className="h-4.5 w-4.5" />}
              </div>
              <div>
                <h4 className="font-display text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Penyimpanan Online Server</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cloud Firestore
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">Database tersimpan online & tersinkronisasi otomatis</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status Metrics */}
          <div className="space-y-2 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status Server Cloud:</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  isConnected ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Terhubung Online (24/7)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Tidak Terhubung (Offline)</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Provider Database:</span>
              <span className="font-semibold text-sky-300">
                Google Cloud Firestore
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Project Cloud:</span>
              <span className="font-mono text-[11px] text-[#5eead4] truncate max-w-[170px]" title={health.projectId || 'xenodochial-clover-g6tvw'}>
                {health.projectId || 'xenodochial-clover-g6tvw'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kecepatan Respon (Ping):</span>
              <span className="font-mono font-semibold text-slate-200">
                {health.latencyMs !== undefined ? `${health.latencyMs} ms` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Data Tersinkron:</span>
              <span className="text-slate-200 font-medium">
                {health.totalResidents ?? 0} Unit Warga · {health.totalTransactions ?? 0} Transaksi
              </span>
            </div>

            {health.lastChecked && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-700/50">
                <span>Pemeriksaan Terakhir:</span>
                <span>{health.lastChecked.toLocaleTimeString('id-ID')} WIB</span>
              </div>
            )}
          </div>

          {/* Cloud Persistence Guarantee Card */}
          <div className="mt-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 p-2.5 text-[11px] text-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Otomatis & Terenkripsi di Server</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Semua perubahan data warga, penambahan unit baru, pembayaran iuran, dan laporan keamanan langsung tersimpan permanen di cloud server Google. Tidak perlu menjalankan server MySQL atau MariaDB di Termux HP.
            </p>
          </div>

          {/* Sync Success Feedback */}
          {syncSuccessMsg && (
            <div className="mt-2 rounded-lg bg-sky-950/80 border border-sky-600/60 p-2 text-[10px] text-sky-200 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="h-3 w-3 text-sky-400 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Error Message & Troubleshooting */}
          {isError && (
            <div className="mt-2.5 rounded-xl bg-red-950/50 border border-red-800/60 p-2.5 text-[11px] text-red-200 space-y-1">
              <p className="font-semibold text-red-100 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span>Pesan Kesalahan:</span>
              </p>
              <p className="font-mono text-[10px] text-red-300 break-all">
                {health.error || 'Server backend tidak merespon.'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSyncCloud}
              disabled={syncingCloud || isChecking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Kirim dan sinkronkan seluruh database ke Cloud Firestore"
            >
              <Cloud className={`h-3.5 w-3.5 ${syncingCloud ? 'animate-bounce' : ''}`} />
              <span>{syncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
            </button>
            <button
              type="button"
              onClick={checkConnection}
              disabled={checkingNow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingNow ? 'animate-spin' : ''}`} />
              <span>{checkingNow ? 'Menguji...' : 'Tes Ping'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
