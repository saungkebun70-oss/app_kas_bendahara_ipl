import React, { useMemo, useState } from 'react';
import { Check, Search, History, PlusCircle } from 'lucide-react';
import type { BlockCode, DatabaseState } from '../types/finance';
import {
  formatMonthLabel,
  formatRupiah,
  maskNik,
} from '../lib/finance';

interface ResidentsViewProps {
  state: DatabaseState;
  activePeriodMonth: string;
  onChangePeriodMonth: (pm: string) => void;
  onSelectUnit: (unitId: string) => void;
  onQuickPayCurrentMonth: (unitId: string) => Promise<void>;
  isAdmin: boolean;
}

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const ResidentsView: React.FC<ResidentsViewProps> = ({
  state,
  activePeriodMonth,
  onChangePeriodMonth,
  onSelectUnit,
  onQuickPayCurrentMonth,
  isAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState<'ALL' | BlockCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [payingUnitId, setPayingUnitId] = useState<string | null>(null);

  const paidUnitMap = useMemo(() => {
    const map = new Map<string, { receiptNumber: string; date: string }>();
    const countByUnit = new Map<string, number>();

    for (const t of state.transactions) {
      if (t.type === 'income' && t.category === 'Iuran Bulanan Warga' && t.unitId) {
        countByUnit.set(t.unitId, (countByUnit.get(t.unitId) ?? 0) + 1);
        if (t.periodMonth === activePeriodMonth) {
          map.set(t.unitId, { receiptNumber: t.receiptNumber, date: t.date });
        }
      }
    }
    return { map, countByUnit };
  }, [state.transactions, activePeriodMonth]);

  const filteredResidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.residents.filter((r) => {
      if (blockFilter !== 'ALL' && r.block !== blockFilter) return false;
      const isPaid = paidUnitMap.map.has(r.id);
      if (statusFilter === 'PAID' && !isPaid) return false;
      if (statusFilter === 'UNPAID' && isPaid) return false;

      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.headOfFamily.toLowerCase().includes(q) ||
        r.streetName.toLowerCase().includes(q) ||
        r.whatsapp.toLowerCase().includes(q) ||
        r.vehiclePlate.toLowerCase().includes(q)
      );
    });
  }, [state.residents, blockFilter, statusFilter, searchQuery, paidUnitMap.map]);

  const paidTotal = state.residents.filter((r) => paidUnitMap.map.has(r.id)).length;
  const unpaidTotal = state.residents.length - paidTotal;

  const handleQuickPay = async (unitId: string) => {
    setPayingUnitId(unitId);
    try {
      await onQuickPayCurrentMonth(unitId);
    } finally {
      setPayingUnitId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Database Terenkripsi Lokal · 55 Unit Hunian Terdaftar (Blok A, B, C, D)
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Direktori 55 Warga &amp; Riwayat Transaksi Unit
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="res-period-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Cek Status Bulan:
          </label>
          <select
            id="res-period-select"
            value={activePeriodMonth}
            onChange={(e) => onChangePeriodMonth(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-emerald-800 focus:outline-none"
          >
            {PERIOD_OPTIONS.map((pm) => (
              <option key={pm} value={pm}>
                {formatMonthLabel(pm)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 sm:p-4 w-full">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Cari unit rumah, nama kepala keluarga, WhatsApp, atau plat kendaraan"
            placeholder="Cari unit (A-01), nama warga, nomor WA, atau plat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
          {/* Blok Filter with smooth horizontal touch scroll without overflow */}
          <div className="overflow-x-auto scrollbar-none pb-0.5 max-w-full">
            <div
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 p-1"
              role="group"
              aria-label="Filter Blok Rumah"
            >
              {(['ALL', 'A', 'B', 'C', 'D'] as const).map((blk) => (
                <button
                  key={blk}
                  type="button"
                  onClick={() => setBlockFilter(blk)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    blockFilter === blk
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {blk === 'ALL' ? 'Semua (55)' : `Blok ${blk}`}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter with smooth horizontal touch scroll without overflow */}
          <div className="overflow-x-auto scrollbar-none pb-0.5 max-w-full">
            <div
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 p-1"
              role="group"
              aria-label="Filter Status Pembayaran"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PAID')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  statusFilter === 'PAID'
                    ? 'bg-white text-emerald-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lunas ({paidTotal})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNPAID')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  statusFilter === 'UNPAID'
                    ? 'bg-white text-rose-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum Bayar ({unpaidTotal})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {filteredResidents.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Tidak ada unit warga yang sesuai filter pencarian
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci pencarian atau tampilkan seluruh 55 rumah.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBlockFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="mt-4 rounded-lg border border-stone-300 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-50 cursor-pointer"
            >
              Reset Filter Pencarian
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< sm screens) */}
            <div className="block sm:hidden divide-y divide-stone-100 max-h-[560px] overflow-y-auto p-2 space-y-2">
              {filteredResidents.map((res) => {
                const paidInfo = paidUnitMap.map.get(res.id);
                const txCount = paidUnitMap.countByUnit.get(res.id) ?? 0;

                return (
                  <div
                    key={res.id}
                    className="p-3 bg-stone-50/60 rounded-xl border border-stone-200/80 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-white border border-stone-300 px-2 py-0.5 rounded shadow-2xs">
                          {res.id}
                        </span>
                        <div>
                          <h3 className="font-semibold text-xs text-slate-900 leading-tight">
                            {res.headOfFamily}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NIK {maskNik(res.nik, isAdmin)} · {res.familyMembers} jiwa
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {paidInfo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <Check className="h-3 w-3" />
                            <span>Lunas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Belum Bayar
                          </span>
                        )}
                        <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                          {formatRupiah(state.settings.monthlyFee)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-200/60 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Alamat / Status</span>
                        <span className="font-medium text-slate-800 truncate block">
                          {res.streetName} ({res.occupancyStatus})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">WhatsApp / Plat</span>
                        <span className="font-mono text-slate-700 truncate block">
                          {res.whatsapp} · {res.vehiclePlate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                      <span className="text-[10px] font-mono text-slate-500">
                        {txCount} riwayat kwitansi
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isAdmin && !paidInfo && (
                          <button
                            type="button"
                            disabled={payingUnitId === res.id}
                            onClick={() => handleQuickPay(res.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>{payingUnitId === res.id ? '...' : 'Bayar'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectUnit(res.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-stone-100 cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5 text-slate-500" />
                          <span>Profil &amp; Riwayat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table View (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto max-h-[520px] xl:max-h-[600px] overflow-y-auto rounded-b-xl table-scroll-container border-t border-stone-100">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-stone-100/95 backdrop-blur-xs shadow-2xs">
                  <tr className="border-b border-stone-200 text-xs font-semibold text-slate-700">
                    <th className="py-3 pl-5 pr-3">Unit</th>
                    <th className="px-3 py-3">Kepala Keluarga &amp; NIK</th>
                    <th className="px-3 py-3">Alamat &amp; Hunian</th>
                    <th className="px-3 py-3">WhatsApp &amp; Plat</th>
                    <th className="px-3 py-3">Status {formatMonthLabel(activePeriodMonth).split(' ')[0]}</th>
                    <th className="px-3 py-3 text-right">Riwayat</th>
                    <th className="py-3 pl-3 pr-5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredResidents.map((res) => {
                    const paidInfo = paidUnitMap.map.get(res.id);
                    const txCount = paidUnitMap.countByUnit.get(res.id) ?? 0;

                    return (
                      <tr key={res.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 pl-5 pr-3 font-mono text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {res.id}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{res.headOfFamily}</div>
                          <div className="font-mono text-xs text-slate-500 tabular-nums">
                            NIK {maskNik(res.nik, isAdmin)} · {res.familyMembers} jiwa
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          <div className="text-slate-800">{res.streetName}</div>
                          <div className="text-slate-500">{res.occupancyStatus}</div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                          <div>{res.whatsapp}</div>
                          <div className="text-slate-500">{res.vehiclePlate}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {paidInfo ? (
                            <div className="text-xs">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                                <Check className="h-3.5 w-3.5" />
                                <span>Lunas ({formatRupiah(state.settings.monthlyFee)})</span>
                              </span>
                              <div className="font-mono text-[11px] text-slate-500">
                                {paidInfo.receiptNumber}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="font-semibold text-red-700">Belum Bayar</span>
                              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                Tagihan {formatRupiah(state.settings.monthlyFee)}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {txCount} kwitansi
                        </td>
                        <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {isAdmin && !paidInfo && (
                              <button
                                type="button"
                                disabled={payingUnitId === res.id}
                                onClick={() => handleQuickPay(res.id)}
                                aria-label={`Catat lunas iuran ${formatMonthLabel(activePeriodMonth)} untuk Unit ${res.id}`}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>{payingUnitId === res.id ? '...' : 'Bayar'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onSelectUnit(res.id)}
                              aria-label={`Lihat profil dan riwayat transaksi Unit ${res.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-stone-50 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span>Profil &amp; Riwayat</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
