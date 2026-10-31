import React, { useMemo, useState } from 'react';
import {
  Check,
  Search,
  History,
  PlusCircle,
  ShieldCheck,
  UserPlus,
  Edit3,
  Trash2,
  AlertTriangle,
  Layers,
  MapPin,
} from 'lucide-react';
import type { BlockCode, BlockConfig, DatabaseState, ResidentUnit } from '../types/finance';
import {
  formatMonthLabel,
  formatRupiah,
  isUnitExemptFromIuran,
  maskNik,
} from '../lib/finance';
import { ResidentFormModal } from './ResidentFormModal';
import { ManageBlocksModal } from './ManageBlocksModal';

interface ResidentsViewProps {
  state: DatabaseState;
  activePeriodMonth: string;
  onChangePeriodMonth: (pm: string) => void;
  onSelectUnit: (unitId: string) => void;
  onQuickPayCurrentMonth: (unitId: string) => Promise<void>;
  isAdmin: boolean;
  onAddResident?: (resident: Partial<ResidentUnit>) => Promise<void>;
  onUpdateResident?: (unitId: string, updates: Partial<ResidentUnit>) => Promise<void>;
  onDeleteResident?: (unitId: string) => Promise<void>;
  onAddBlock?: (block: BlockConfig) => Promise<void>;
  onUpdateBlock?: (id: string, updates: Partial<BlockConfig>) => Promise<void>;
  onDeleteBlock?: (id: string) => Promise<void>;
  onAddStreet?: (name: string) => Promise<void>;
  onDeleteStreet?: (name: string) => Promise<void>;
}

const PERIOD_OPTIONS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const ResidentsView: React.FC<ResidentsViewProps> = ({
  state,
  activePeriodMonth,
  onChangePeriodMonth,
  onSelectUnit,
  onQuickPayCurrentMonth,
  isAdmin,
  onAddResident,
  onUpdateResident,
  onDeleteResident,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onAddStreet,
  onDeleteStreet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState<'ALL' | BlockCode>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'EXEMPT'>('ALL');
  const [payingUnitId, setPayingUnitId] = useState<string | null>(null);

  // Modals state for Add, Edit, Delete, Manage Blocks
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageBlocksOpen, setIsManageBlocksOpen] = useState(false);
  const [editResident, setEditResident] = useState<ResidentUnit | null>(null);
  const [deleteConfirmResident, setDeleteConfirmResident] = useState<ResidentUnit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const availableBlocks = useMemo(() => {
    const configured = state.settings.customBlocks || [];
    const fromResidents = new Set(state.residents.map((r) => r.block));
    const blockMap = new Map<string, BlockConfig>();

    for (const b of configured) {
      blockMap.set(b.id.toUpperCase(), b);
    }
    for (const bId of fromResidents) {
      const upper = bId.toUpperCase();
      if (!blockMap.has(upper)) {
        blockMap.set(upper, {
          id: upper,
          name: `Blok ${upper}`,
          defaultStreet: upper.startsWith('B') ? 'Gang Anggur' : 'Gang Duren',
        });
      }
    }
    return Array.from(blockMap.values()).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [state.settings.customBlocks, state.residents]);

  const availableStreets = useMemo(() => {
    const streets = new Set<string>(state.settings.customStreets || ['Gang Duren', 'Gang Anggur']);
    for (const r of state.residents) {
      if (r.streetName) streets.add(r.streetName);
    }
    return Array.from(streets);
  }, [state.settings.customStreets, state.residents]);

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

  const exemptTotal = useMemo(() => {
    return state.residents.filter((r) => isUnitExemptFromIuran(r.id)).length;
  }, [state.residents]);

  const paidTotal = useMemo(() => {
    return state.residents.filter(
      (r) => !isUnitExemptFromIuran(r.id) && paidUnitMap.map.has(r.id)
    ).length;
  }, [state.residents, paidUnitMap.map]);

  const unpaidTotal = useMemo(() => {
    return state.residents.filter(
      (r) => !isUnitExemptFromIuran(r.id) && !paidUnitMap.map.has(r.id)
    ).length;
  }, [state.residents, paidUnitMap.map]);

  const filteredResidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.residents.filter((r) => {
      if (blockFilter !== 'ALL' && r.block !== blockFilter) return false;
      const isExempt = isUnitExemptFromIuran(r.id);
      const isPaid = paidUnitMap.map.has(r.id);

      if (statusFilter === 'PAID') {
        if (isExempt || !isPaid) return false;
      } else if (statusFilter === 'UNPAID') {
        if (isExempt || isPaid) return false;
      } else if (statusFilter === 'EXEMPT') {
        if (!isExempt) return false;
      }

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
            Database Terenkripsi Lokal · {state.residents.length} Unit Hunian Terdaftar (Blok {availableBlocks.map((b) => b.id).join(', ')})
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Direktori {state.residents.length} Warga &amp; Riwayat Transaksi Unit
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && onAddBlock && (
            <button
              type="button"
              onClick={() => setIsManageBlocksOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 shadow-xs hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Layers className="h-4 w-4 text-emerald-800" />
              <span>Kelola Blok &amp; Gang</span>
            </button>
          )}

          {isAdmin && onAddResident && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tambah Warga Baru</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="res-period-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Cek Status:
            </label>
            <select
              id="res-period-select"
              value={activePeriodMonth}
              onChange={(e) => onChangePeriodMonth(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-800 focus:outline-none"
            >
              {PERIOD_OPTIONS.map((pm) => (
                <option key={pm} value={pm}>
                  {formatMonthLabel(pm)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 sm:p-4 w-full">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Cari unit rumah, nama kepala keluarga, WhatsApp, atau plat kendaraan"
            placeholder="Cari unit (A-01, B1-01), nama warga, nomor WA, plat, atau nama gang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
          />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
          {/* Blok Filter with responsive horizontal scroll / wrap */}
          <div className="w-full lg:w-auto">
            <div
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-stone-100/90 p-1 w-full sm:w-auto overflow-x-auto max-w-full"
              role="group"
              aria-label="Filter Blok Rumah"
            >
              <button
                type="button"
                onClick={() => setBlockFilter('ALL')}
                className={`text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  blockFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-stone-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Semua ({state.residents.length})
              </button>
              {availableBlocks.map((blk) => (
                <button
                  key={blk.id}
                  type="button"
                  onClick={() => setBlockFilter(blk.id)}
                  className={`text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    blockFilter === blk.id
                      ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-stone-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Blok {blk.id}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter with responsive wrapping */}
          <div className="w-full lg:w-auto">
            <div
              className="flex flex-wrap items-center gap-1 sm:gap-1.5 rounded-xl bg-stone-100/90 p-1 w-full sm:w-auto"
              role="group"
              aria-label="Filter Status Pembayaran"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 sm:flex-initial text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold ring-1 ring-stone-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Semua ({state.residents.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PAID')}
                className={`flex-1 sm:flex-initial text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  statusFilter === 'PAID'
                    ? 'bg-emerald-50 text-emerald-900 shadow-xs font-bold ring-1 ring-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Lunas ({paidTotal})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNPAID')}
                className={`flex-1 sm:flex-initial text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  statusFilter === 'UNPAID'
                    ? 'bg-rose-50 text-rose-700 shadow-xs font-bold ring-1 ring-rose-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Belum Bayar ({unpaidTotal})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('EXEMPT')}
                className={`flex-1 sm:flex-initial text-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  statusFilter === 'EXEMPT'
                    ? 'bg-slate-200 text-slate-900 shadow-xs font-bold ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Pengelola ({exemptTotal})
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
            {/* Mobile & Tablet Card View (< lg screens) */}
            <div className="block lg:hidden divide-y divide-stone-100 max-h-[580px] overflow-y-auto p-2 space-y-2">
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
                        {isUnitExemptFromIuran(res.id) ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <ShieldCheck className="h-3 w-3 text-slate-500" />
                              <span>Pengelola ({res.id === 'A-01' ? 'Ketua' : 'Bendahara'})</span>
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              Bagian Pengelolaan
                            </span>
                          </div>
                        ) : paidInfo ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <Check className="h-3 w-3" />
                              <span>Lunas</span>
                            </span>
                            <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                              {formatRupiah(state.settings.monthlyFee)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Belum Bayar
                            </span>
                            <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                              {formatRupiah(state.settings.monthlyFee)}
                            </span>
                          </>
                        )}
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

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isAdmin && !isUnitExemptFromIuran(res.id) && !paidInfo && (
                          <button
                            type="button"
                            disabled={payingUnitId === res.id}
                            onClick={() => handleQuickPay(res.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>{payingUnitId === res.id ? '...' : 'Bayar'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectUnit(res.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-stone-100 cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5 text-slate-500" />
                          <span>Profil</span>
                        </button>
                        {isAdmin && onUpdateResident && (
                          <button
                            type="button"
                            onClick={() => setEditResident(res)}
                            title="Edit data warga"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>
                        )}
                        {isAdmin && onDeleteResident && (
                          <button
                            type="button"
                            disabled={isUnitExemptFromIuran(res.id)}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteConfirmResident(res);
                            }}
                            title={
                              isUnitExemptFromIuran(res.id)
                                ? 'Unit Pengurus Lingkungan tidak dapat dihapus'
                                : `Hapus unit ${res.id}`
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= lg screens) */}
            <div className="hidden lg:block overflow-x-auto max-h-[520px] xl:max-h-[600px] overflow-y-auto rounded-b-xl table-scroll-container border-t border-stone-100">
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
                          {isUnitExemptFromIuran(res.id) ? (
                            <div className="text-xs">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                                <span>Pengelola ({res.id === 'A-01' ? 'Ketua' : 'Bendahara'})</span>
                              </span>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Bagian Pengelolaan
                              </div>
                            </div>
                          ) : paidInfo ? (
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
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isAdmin && !isUnitExemptFromIuran(res.id) && !paidInfo && (
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

                            {isAdmin && onUpdateResident && (
                              <button
                                type="button"
                                onClick={() => setEditResident(res)}
                                aria-label={`Ubah data warga Unit ${res.id}`}
                                title="Ubah data warga"
                                className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-300 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                                <span>Edit</span>
                              </button>
                            )}

                            {isAdmin && onDeleteResident && (
                              <button
                                type="button"
                                disabled={isUnitExemptFromIuran(res.id)}
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteConfirmResident(res);
                                }}
                                aria-label={`Hapus data warga Unit ${res.id}`}
                                title={
                                  isUnitExemptFromIuran(res.id)
                                    ? 'Unit Pengurus Lingkungan tidak dapat dihapus'
                                    : `Hapus data Unit ${res.id}`
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                <span>Hapus</span>
                              </button>
                            )}
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

      {/* Add Resident Modal */}
      {isAddModalOpen && onAddResident && (
        <ResidentFormModal
          isOpen={isAddModalOpen}
          mode="add"
          existingIds={state.residents.map((r) => r.id)}
          availableBlocks={availableBlocks}
          availableStreets={availableStreets}
          onOpenManageBlocks={() => setIsManageBlocksOpen(true)}
          onClose={() => setIsAddModalOpen(false)}
          onSave={onAddResident}
        />
      )}

      {/* Edit Resident Modal */}
      {editResident && onUpdateResident && (
        <ResidentFormModal
          isOpen={Boolean(editResident)}
          mode="edit"
          resident={editResident}
          existingIds={state.residents.map((r) => r.id)}
          availableBlocks={availableBlocks}
          availableStreets={availableStreets}
          onOpenManageBlocks={() => setIsManageBlocksOpen(true)}
          onClose={() => setEditResident(null)}
          onSave={async (updates) => {
            await onUpdateResident(editResident.id, updates);
            setEditResident(null);
          }}
        />
      )}

      {/* Manage Blocks & Gangs Modal */}
      {isManageBlocksOpen && onAddBlock && onUpdateBlock && onDeleteBlock && onAddStreet && onDeleteStreet && (
        <ManageBlocksModal
          isOpen={isManageBlocksOpen}
          onClose={() => setIsManageBlocksOpen(false)}
          state={state}
          onAddBlock={onAddBlock}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
          onAddStreet={onAddStreet}
          onDeleteStreet={onDeleteStreet}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmResident && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Hapus Data Warga?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini akan menghapus unit dari direktori lingkungan.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3.5 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">
                Unit {deleteConfirmResident.id} — {deleteConfirmResident.headOfFamily}
              </p>
              <p className="text-slate-600">
                Alamat: {deleteConfirmResident.streetName} · Status: {deleteConfirmResident.occupancyStatus}
              </p>
              <p className="text-rose-700 font-medium pt-1">
                Data warga ini tidak akan muncul lagi di daftar iuran atau portal warga.
              </p>
            </div>

            {deleteError && (
              <div className="rounded-lg bg-rose-100 p-2.5 text-xs font-semibold text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => {
                  setDeleteConfirmResident(null);
                  setDeleteError(null);
                }}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={async () => {
                  if (!onDeleteResident) return;
                  setDeletingId(deleteConfirmResident.id);
                  setDeleteError(null);
                  try {
                    await onDeleteResident(deleteConfirmResident.id);
                    setDeleteConfirmResident(null);
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus warga');
                  } finally {
                    setDeletingId(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deletingId ? 'Menghapus...' : 'Ya, Hapus Data Warga'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
