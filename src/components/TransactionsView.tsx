import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction } from '../types/finance';
import {
  formatRupiah,
  formatMonthLabel,
  formatShortDate,
  getQuarterFromPeriod,
  getQuarterInfo,
  sortTransactionsChronologically,
} from '../lib/finance';
import { TransactionsMonthlyTrendChart } from './TransactionsMonthlyTrendChart';


interface TransactionsViewProps {
  state: DatabaseState;
  activePeriodMonth: string;
  onChangePeriodMonth: (month: string) => void;
  isAdmin: boolean;
  onOpenAddModal: (presetMode?: 'iuran' | 'income' | 'expense') => void;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onSelectUnit: (unitId: string) => void;
  onPreviewReceipt?: (resident: import('../types/finance').ResidentUnit, trx: LedgerTransaction) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  state,
  activePeriodMonth,
  onChangePeriodMonth,
  isAdmin,
  onOpenAddModal,
  onDeleteTransaction,
  onSelectUnit,
  onPreviewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL'); // 'ALL' | 'NON_UNIT' | unitId
  const [dateRangeMode, setDateRangeMode] = useState<'ALL' | 'MONTH' | 'CUSTOM'>('MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const unitMap = useMemo(() => {
    const map = new Map<string, DatabaseState['residents'][0]>();
    for (const r of state.residents) {
      map.set(r.id, r);
    }
    return map;
  }, [state.residents]);

  const sortedTransactions = useMemo(
    () => sortTransactionsChronologically(state.transactions).reverse(),
    [state.transactions]
  );

  // Group residents by Block for clean Unit ID selector
  const residentsByBlock = useMemo(() => {
    const blocks: Record<string, DatabaseState['residents']> = {
      A: [],
      B: [],
      C: [],
      D: [],
    };
    for (const r of state.residents) {
      if (blocks[r.block]) {
        blocks[r.block].push(r);
      }
    }
    return blocks;
  }, [state.residents]);

  // Check if any filter is actively applied beyond defaults
  const isFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      typeFilter !== 'ALL' ||
      unitFilter !== 'ALL' ||
      dateRangeMode !== 'MONTH' ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [searchQuery, typeFilter, unitFilter, dateRangeMode, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setUnitFilter('ALL');
    setDateRangeMode('MONTH');
    setStartDate('');
    setEndDate('');
  };

  const handleSetQuickPreset = (preset: 'CURRENT_MONTH' | 'ALL_TIME' | 'LAST_30_DAYS') => {
    if (preset === 'CURRENT_MONTH') {
      setDateRangeMode('MONTH');
      setStartDate('');
      setEndDate('');
    } else if (preset === 'ALL_TIME') {
      setDateRangeMode('ALL');
      setStartDate('');
      setEndDate('');
    } else if (preset === 'LAST_30_DAYS') {
      setDateRangeMode('CUSTOM');
      const end = new Date('2026-10-24');
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      // 1. Transaction Type filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
        return false;
      }

      // 2. Unit ID filter
      if (unitFilter === 'NON_UNIT') {
        if (tx.unitId) return false;
      } else if (unitFilter !== 'ALL') {
        if (tx.unitId !== unitFilter) return false;
      }

      // 3. Date Range filter
      if (dateRangeMode === 'MONTH') {
        if (tx.periodMonth !== activePeriodMonth) return false;
      } else if (dateRangeMode === 'CUSTOM') {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
      }

      // 4. Keyword search (receiptNumber, description, category, paymentMethod, unit, recordedBy)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const unit = tx.unitId ? unitMap.get(tx.unitId) : undefined;
        const matchCode = tx.receiptNumber.toLowerCase().includes(q);
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCategory = tx.category.toLowerCase().includes(q);
        const matchMethod = tx.paymentMethod.toLowerCase().includes(q);
        const matchUnitId = tx.unitId ? tx.unitId.toLowerCase().includes(q) : false;
        const matchUnitHead = unit ? unit.headOfFamily.toLowerCase().includes(q) : false;
        const matchDate = tx.date.includes(q);
        const matchRecorder = tx.recordedBy.toLowerCase().includes(q);

        if (
          !matchCode &&
          !matchDesc &&
          !matchCategory &&
          !matchMethod &&
          !matchUnitId &&
          !matchUnitHead &&
          !matchDate &&
          !matchRecorder
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    sortedTransactions,
    typeFilter,
    unitFilter,
    dateRangeMode,
    activePeriodMonth,
    startDate,
    endDate,
    searchQuery,
    unitMap,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        income += tx.amount;
        incomeCount++;
      } else {
        expense += tx.amount;
        expenseCount++;
      }
    }
    return {
      income,
      expense,
      net: income - expense,
      incomeCount,
      expenseCount,
      totalCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const qRef = getQuarterFromPeriod(activePeriodMonth);
  const activeQuarter = getQuarterInfo(qRef.year, qRef.quarter);

  // Selected unit details if filtering by a unit
  const selectedUnitDetail = unitFilter !== 'ALL' && unitFilter !== 'NON_UNIT' ? unitMap.get(unitFilter) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Buku Kas Umum &amp; Jurnal Transaksi</span>
            <span className="text-slate-300">·</span>
            <span>Sinkron Otomatis ke {activeQuarter.title}</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Pencatatan Pemasukan &amp; Pengeluaran Kas
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Setiap transaksi yang dicatat pada jurnal ini langsung memperbarui saldo kas real-time dan Rekap LPJ 3 Bulanan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => onOpenAddModal('iuran')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Bayar Iuran</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAddModal('income')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-slate-800 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-800" />
                <span>Pemasukan Lain</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAddModal('expense')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-900 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Pengeluaran</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TOP SEARCH & MULTI-FILTER BAR (Search by date range, unit ID, or transaction type) */}
      <section
        aria-label="Filter dan Pencarian Transaksi"
        data-testid="transactions-search-filter-bar"
        className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-800" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pencarian &amp; Filter Multikriteria Transaksi
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
              {filteredTransactions.length} dari {state.transactions.length} Mutasi
            </span>
          </div>

          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="reset-filters-btn"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* 1. Main Search Bar Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            data-testid="transactions-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci: nomor bukti (SK/KW/...), nama warga, nomor unit (A-05), kategori, uraian..."
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-stone-50/70 border border-stone-300 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. Filter Controls: Date Range, Unit ID, & Transaction Type */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* FILTER A: Jenis Transaksi (Transaction Type) */}
          <div className="md:col-span-3 space-y-1.5">
            <label htmlFor="tx-type-filter" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Jenis Transaksi:
            </label>
            <div className="relative">
              <select
                id="tx-type-filter"
                data-testid="filter-tx-type-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'income' | 'expense')}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Jenis (Pemasukan &amp; Pengeluaran)</option>
                <option value="income">Hanya Pemasukan (+)</option>
                <option value="expense">Hanya Pengeluaran (-)</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* FILTER B: Unit ID (Nomor Unit Rumah 55 Warga) */}
          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="tx-unit-filter" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Unit Rumah (Unit ID):
            </label>
            <div className="relative">
              <select
                id="tx-unit-filter"
                data-testid="filter-unit-select"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Unit (55 Rumah &amp; Operasional)</option>
                <option value="NON_UNIT">Non-Unit (Fasum / Operasional / Pengeluaran)</option>
                <optgroup label="Blok A (Jl. Saung Melati)">
                  {residentsByBlock.A.map((res) => (
                    <option key={res.id} value={res.id}>
                      Unit {res.id} — {res.headOfFamily}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Blok B (Jl. Kebun Asri)">
                  {residentsByBlock.B.map((res) => (
                    <option key={res.id} value={res.id}>
                      Unit {res.id} — {res.headOfFamily}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Blok C (Jl. Saung Cendana)">
                  {residentsByBlock.C.map((res) => (
                    <option key={res.id} value={res.id}>
                      Unit {res.id} — {res.headOfFamily}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Blok D (Jl. Kebun Kenanga)">
                  {residentsByBlock.D.map((res) => (
                    <option key={res.id} value={res.id}>
                      Unit {res.id} — {res.headOfFamily}
                    </option>
                  ))}
                </optgroup>
              </select>
              <Home className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* FILTER C: Rentang Tanggal (Date Range Mode & Pickers) */}
          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="tx-date-mode" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Rentang Tanggal Transaksi:
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSetQuickPreset('CURRENT_MONTH')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    dateRangeMode === 'MONTH' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bulan Aktif
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickPreset('LAST_30_DAYS')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    dateRangeMode === 'CUSTOM' && startDate ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  30 Hari
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickPreset('ALL_TIME')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    dateRangeMode === 'ALL' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Date Range Inputs */}
            {dateRangeMode === 'MONTH' ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    id="tx-date-mode"
                    data-testid="filter-month-select"
                    value={activePeriodMonth}
                    onChange={(e) => onChangePeriodMonth(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
                  >
                    <option value="2026-07">Juli 2026</option>
                    <option value="2026-08">Agustus 2026</option>
                    <option value="2026-09">September 2026</option>
                    <option value="2026-10">Oktober 2026</option>
                    <option value="2026-11">November 2026</option>
                    <option value="2026-12">Desember 2026</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setDateRangeMode('CUSTOM')}
                  className="rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                >
                  Kustom Tanggal
                </button>
              </div>
            ) : dateRangeMode === 'CUSTOM' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="date"
                    data-testid="filter-start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Tanggal Awal"
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
                  />
                </div>
                <span className="text-xs text-slate-400">s/d</span>
                <div className="flex-1">
                  <input
                    type="date"
                    data-testid="filter-end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="Tanggal Akhir"
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDateRangeMode('MONTH')}
                  className="rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                >
                  Per Bulan
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-slate-600">
                <span>Seluruh riwayat transaksi kas tercatat</span>
                <button
                  type="button"
                  onClick={() => setDateRangeMode('MONTH')}
                  className="text-emerald-800 font-semibold hover:underline cursor-pointer"
                >
                  Filter Per Bulan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Active Filter Chips Summary */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold uppercase">Filter Aktif:</span>

            {typeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                <span>Jenis: {typeFilter === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}</span>
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  aria-label="Hapus filter jenis"
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {unitFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                <span>
                  Unit: {unitFilter === 'NON_UNIT' ? 'Non-Unit (Fasum)' : `Unit ${unitFilter} ${selectedUnitDetail ? `(${selectedUnitDetail.headOfFamily})` : ''}`}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitFilter('ALL')}
                  aria-label="Hapus filter unit"
                  className="text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRangeMode === 'CUSTOM' && (startDate || endDate) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                <span>
                  Tanggal: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateRangeMode('MONTH');
                  }}
                  aria-label="Hapus filter rentang tanggal"
                  className="text-amber-700 hover:text-amber-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRangeMode === 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                <span>Rentang: Semua Periode</span>
                <button
                  type="button"
                  onClick={() => setDateRangeMode('MONTH')}
                  aria-label="Kembalikan ke bulan aktif"
                  className="text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200">
                <span>Kata Kunci: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus filter kata kunci"
                  className="text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </section>

      {/* SUMMARY SECTION ABOVE TRANSACTION TABLE: Total Income, Total Expenses, and Net Balance for Filtered Result Set */}
      <section
        aria-label="Ringkasan Hasil Filter Transaksi"
        data-testid="filtered-summary-section"
        className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 shadow-xs">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Ringkasan Hasil Filter Mutasi Kas (Filtered Results Summary)
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    totals.net > 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : totals.net < 0
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {totals.net > 0 ? 'Surplus Kas' : totals.net < 0 ? 'Defisit Kas' : 'Saldo Seimbang'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Akumulasi pemasukan, pengeluaran, dan saldo bersih untuk{' '}
                <strong className="text-slate-700 font-mono">{filteredTransactions.length} transaksi</strong> yang
                sesuai dengan kriteria filter aktif saat ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-stone-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
              {filteredTransactions.length} dari {state.transactions.length} Mutasi
            </span>
            <span className="text-[11px] text-slate-400">
              Periode:{' '}
              <strong className="text-slate-600">
                {dateRangeMode === 'MONTH'
                  ? formatMonthLabel(activePeriodMonth)
                  : dateRangeMode === 'CUSTOM'
                  ? `${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`
                  : 'Semua Periode'}
              </strong>
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Cards: Total Income, Total Expenses, Net Balance */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Total Income (Pemasukan) */}
          <div className="rounded-xl border border-emerald-200/90 bg-[#f0fdf4]/70 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Total Pemasukan (Total Income)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p
              data-testid="summary-total-income"
              className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-emerald-900"
            >
              +{formatRupiah(totals.income)}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-800/90 border-t border-emerald-100/80 pt-1.5">
              <span>{totals.incomeCount} transaksi masuk</span>
              <span className="font-semibold">
                {totals.income + totals.expense > 0
                  ? `${Math.round((totals.income / (totals.income + totals.expense)) * 100)}% dari arus kas`
                  : '0%'}
              </span>
            </div>
            {/* Alias testid for compatibility */}
            <span data-testid="filtered-income-total" className="sr-only">
              +{formatRupiah(totals.income)}
            </span>
          </div>

          {/* Card 2: Total Expenses (Pengeluaran) */}
          <div className="rounded-xl border border-rose-200/90 bg-[#fff1f2]/70 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Total Pengeluaran (Total Expenses)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-800">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <p
              data-testid="summary-total-expenses"
              className="mt-2 font-mono text-2xl font-extrabold tabular-nums text-rose-700"
            >
              -{formatRupiah(totals.expense)}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-rose-800/90 border-t border-rose-100/80 pt-1.5">
              <span>{totals.expenseCount} transaksi keluar</span>
              <span className="font-semibold">
                {totals.income + totals.expense > 0
                  ? `${Math.round((totals.expense / (totals.income + totals.expense)) * 100)}% dari arus kas`
                  : '0%'}
              </span>
            </div>
            {/* Alias testid for compatibility */}
            <span data-testid="filtered-expense-total" className="sr-only">
              -{formatRupiah(totals.expense)}
            </span>
          </div>

          {/* Card 3: Net Balance (Saldo Bersih / Surplus / Defisit) */}
          <div
            className={`rounded-xl border p-4 transition-all ${
              totals.net >= 0
                ? 'border-blue-200/90 bg-[#f8faff]'
                : 'border-amber-200/90 bg-[#fffbeb]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  totals.net >= 0 ? 'text-[#1547b8]' : 'text-amber-900'
                }`}
              >
                Saldo Bersih (Net Balance)
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  totals.net >= 0
                    ? 'bg-blue-100 text-[#1547b8]'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {totals.net >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            </div>
            <p
              data-testid="summary-net-balance"
              className={`mt-2 font-mono text-2xl font-extrabold tabular-nums ${
                totals.net >= 0 ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {totals.net >= 0 ? '+' : ''}
              {formatRupiah(totals.net)}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
              <span>
                {totals.net > 0
                  ? 'Surplus penerimaan kas'
                  : totals.net < 0
                  ? 'Defisit pengeluaran kas'
                  : 'Arus kas berimbang'}
              </span>
              <span className="font-mono text-[10px] font-semibold text-slate-600">
                Pemasukan - Pengeluaran
              </span>
            </div>
            {/* Alias testid for compatibility */}
            <span data-testid="filtered-net-total" className="sr-only">
              {totals.net >= 0 ? '+' : ''}
              {formatRupiah(totals.net)}
            </span>
          </div>
        </div>
      </section>

      {/* VISUAL SUMMARY SECTION (RECHARTS): Monthly Trend of Total Income vs Expenses */}
      <TransactionsMonthlyTrendChart
        transactions={state.transactions}
        activePeriodMonth={activePeriodMonth}
        onChangePeriodMonth={onChangePeriodMonth}
      />

      {/* Ledger Table with Integrated Sub-Header Summary */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Top Sub-Bar */}
        <div className="px-5 py-3 border-b border-stone-200/80 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <FileText className="w-4 h-4 text-emerald-800" />
            <span>Tabel Rincian Jurnal Mutasi Kas</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-normal">
              Menampilkan {filteredTransactions.length} baris data
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-800 font-bold">
              Masuk: +{formatRupiah(totals.income)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-rose-700 font-bold">
              Keluar: -{formatRupiah(totals.expense)}
            </span>
            <span className="text-slate-300">|</span>
            <span className={`font-bold ${totals.net >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
              Net: {totals.net >= 0 ? '+' : ''}{formatRupiah(totals.net)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Tanggal &amp; Bukti</th>
                <th className="py-3 px-4">Periode &amp; LPJ</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Uraian &amp; Unit Rumah</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                {isAdmin && <th className="py-3 px-4 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-500">
                    Tidak ada transaksi yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx: LedgerTransaction) => {
                  const unit = tx.unitId ? unitMap.get(tx.unitId) : undefined;
                  const qPos = getQuarterFromPeriod(tx.periodMonth);
                  const qInfo = getQuarterInfo(qPos.year, qPos.quarter);
                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800 tabular-nums">
                          {formatShortDate(tx.date)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {tx.receiptNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{formatMonthLabel(tx.periodMonth)}</div>
                        <div className="text-[11px] text-emerald-800 font-medium">
                          LPJ Triwulan {qInfo.roman} ({qInfo.year})
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            tx.type === 'income' ? 'text-emerald-800' : 'text-red-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.type === 'income' ? 'bg-emerald-700' : 'bg-red-600'
                            }`}
                          />
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        {unit ? (
                          <button
                            type="button"
                            onClick={() => onSelectUnit(unit.id)}
                            className="text-[11px] text-emerald-900 hover:underline font-semibold mt-0.5 cursor-pointer"
                          >
                            Unit {unit.id} — {unit.headOfFamily} (Lihat Riwayat Unit)
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Dicatat oleh: {tx.recordedBy}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {tx.paymentMethod}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                          tx.type === 'income' ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatRupiah(tx.amount)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {unit && onPreviewReceipt && (
                              <button
                                type="button"
                                onClick={() => onPreviewReceipt(unit, tx)}
                                title={`Lihat & Unduh Kwitansi ${tx.receiptNumber}`}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#1547b8] bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Kwitansi</span>
                              </button>
                            )}
                            {confirmDeleteId === tx.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteTransaction(tx.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold bg-red-700 text-white rounded hover:bg-red-800 cursor-pointer"
                                >
                                  Ya, Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-stone-100 text-slate-700 rounded hover:bg-stone-200 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(tx.id)}
                                title="Hapus Transaksi"
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
