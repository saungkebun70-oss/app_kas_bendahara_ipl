import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
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
}

interface DatabaseHealthIndicatorProps {
  className?: string;
  variant?: 'compact' | 'pill' | 'badge';
}

export const DatabaseHealthIndicator: React.FC<DatabaseHealthIndicatorProps> = ({
  className = '',
  variant = 'pill',
}) => {
  const [health, setHealth] = useState<HealthState>({
    status: 'checking',
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [checkingNow, setCheckingNow] = useState(false);
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

  useEffect(() => {
    checkConnection();
    // Poll health status every 30 seconds
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
        title="Klik untuk melihat status koneksi database & diagnosa jaringan"
        aria-label="Status koneksi database"
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
          <Database className="h-3 w-3 opacity-80" />
          {isChecking ? (
            <span>Memeriksa...</span>
          ) : isConnected ? (
            <span>
              DB Aktif
              {health.latencyMs !== undefined && (
                <span className="opacity-75 font-mono ml-0.5 font-normal">
                  ({health.latencyMs}ms)
                </span>
              )}
            </span>
          ) : (
            <span>DB Gangguan</span>
          )}
        </span>
      </button>

      {/* Details Diagnostic Popover */}
      {isDetailsOpen && (
        <div
          data-testid="db-health-details-popover"
          className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </div>
              <div>
                <h4 className="font-display text-xs font-bold text-white">Status Koneksi Database</h4>
                <p className="text-[10px] text-slate-400">Diagnostik kesehatan jaringan backend</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status Metrics */}
          <div className="space-y-2 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kondisi Server:</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  isConnected ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Terhubung (Online)</span>
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
              <span className="text-slate-400">Kecepatan Respon (Ping):</span>
              <span className="font-mono font-semibold text-slate-200">
                {health.latencyMs !== undefined ? `${health.latencyMs} ms` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">File Database:</span>
              <span className="font-mono text-[11px] text-[#5eead4] truncate max-w-[140px]">
                saung-kebun-db.json
              </span>
            </div>

            {health.lastChecked && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/50">
                <span>Pemeriksaan Terakhir:</span>
                <span>{health.lastChecked.toLocaleTimeString('id-ID')} WIB</span>
              </div>
            )}
          </div>

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
              <p className="text-[10px] text-slate-300 pt-1 border-t border-red-800/40">
                💡 <strong>Solusi:</strong> Periksa koneksi internet Anda atau muat ulang halaman. Jika baru saja deploy, tunggu 10-15 detik hingga kontainer Cloud Run siap menerima lalu lintas.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={checkConnection}
              disabled={checkingNow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1547b8] hover:bg-[#103896] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingNow ? 'animate-spin' : ''}`} />
              <span>{checkingNow ? 'Menguji...' : 'Tes Ping Sekarang'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
