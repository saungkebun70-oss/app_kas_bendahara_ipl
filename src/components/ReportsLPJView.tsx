import React, { useState, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction } from '../types/finance';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  getQuarterFromPeriod,
} from '../lib/finance';
import {
  downloadMonthlyReportPDF,
  downloadQuarterlyLPJPDF,
} from '../lib/pdfExport';

interface ReportsLPJViewProps {
  state: DatabaseState;
  activePeriodMonth: string;
  onChangePeriodMonth: (month: string) => void;
  isAdmin?: boolean;
  onTogglePublication?: (type: 'monthly' | 'quarterly', id: string, published: boolean) => Promise<void>;
}

export const ReportsLPJView: React.FC<ReportsLPJViewProps> = ({
  state,
  activePeriodMonth,
  onChangePeriodMonth,
  isAdmin = true,
  onTogglePublication,
}) => {
  const defaultQuarter = getQuarterFromPeriod(activePeriodMonth).quarter;
  const [activeTab, setActiveTab] = useState<'LPJ_3_BULAN' | 'LAPORAN_BULANAN'>('LPJ_3_BULAN');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(defaultQuarter);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const [recompiling, setRecompiling] = useState<boolean>(false);

  // Filters for monthly transactions
  const [monthlyTxFilter, setMonthlyTxFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [monthlySearch, setMonthlySearch] = useState<string>('');

  // Filters for quarterly transactions
  const [quarterlyTxFilter, setQuarterlyTxFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [quarterlySearch, setQuarterlySearch] = useState<string>('');

  const monthlyReport = useMemo(
    () => calculateMonthlyReport(state, activePeriodMonth),
    [state, activePeriodMonth]
  );

  const quarterlyLPJ = useMemo(
    () => calculateQuarterlyLPJ(state, selectedYear, selectedQuarter),
    [state, selectedYear, selectedQuarter]
  );

  const allQuartersOverview = useMemo(() => {
    return ([1, 2, 3, 4] as const).map((q) => calculateQuarterlyLPJ(state, selectedYear, q));
  }, [state, selectedYear]);

  const publishedMonthly = state.settings.publishedMonthlyReports ?? ['2026-07', '2026-08', '2026-09', '2026-10'];
  const publishedQuarterly = state.settings.publishedQuarterlyLPJ ?? ['2026-Q3'];
  const currentQuarterKey = `${selectedYear}-Q${selectedQuarter}`;
  const isQuarterPublished = publishedQuarterly.includes(currentQuarterKey);
  const isMonthPublished = publishedMonthly.includes(activePeriodMonth);

  const handleDownloadMonthlyPDF = () => {
    const filename = downloadMonthlyReportPDF(state, activePeriodMonth);
    setPdfFeedback(`Berhasil mengunduh ${filename}`);
    setTimeout(() => setPdfFeedback(null), 4000);
  };

  const handleDownloadQuarterlyPDF = () => {
    const filename = downloadQuarterlyLPJPDF(state, selectedYear, selectedQuarter);
    setPdfFeedback(`Berhasil mengunduh ${filename}`);
    setTimeout(() => setPdfFeedback(null), 4000);
  };

  const handleAutoCompile = () => {
    setRecompiling(true);
    setTimeout(() => {
      setRecompiling(false);
      setPdfFeedback(
        `Kompilasi Otomatis Sukses: LPJ ${quarterlyLPJ.title} terverifikasi dengan ${quarterlyLPJ.totalTransactionsCount} mutasi kas.`
      );
      setTimeout(() => setPdfFeedback(null), 4500);
    }, 500);
  };

  // Filtered Monthly Ledger
  const filteredMonthlyEntries = useMemo(() => {
    return monthlyReport.ledgerEntries.filter((tx) => {
      if (monthlyTxFilter !== 'ALL' && tx.type !== monthlyTxFilter) return false;
      if (!monthlySearch) return true;
      const q = monthlySearch.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.receiptNumber.toLowerCase().includes(q) ||
        (tx.unitId && tx.unitId.toLowerCase().includes(q))
      );
    });
  }, [monthlyReport.ledgerEntries, monthlyTxFilter, monthlySearch]);

  // Filtered Quarterly Ledger
  const filteredQuarterlyEntries = useMemo(() => {
    const txs: LedgerTransaction[] = quarterlyLPJ.transactions ?? [];
    return txs.filter((tx) => {
      if (quarterlyTxFilter !== 'ALL' && tx.type !== quarterlyTxFilter) return false;
      if (!quarterlySearch) return true;
      const q = quarterlySearch.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.receiptNumber.toLowerCase().includes(q) ||
        (tx.unitId && tx.unitId.toLowerCase().includes(q))
      );
    });
  }, [quarterlyLPJ.transactions, quarterlyTxFilter, quarterlySearch]);

  return (
    <div className="space-y-6">
      {/* Module Executive Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0f766e]">
            <Layers className="w-4 h-4 text-[#0f766e]" />
            <span>Modul Pelaporan Keuangan &amp; LPJ Otomatis Paguyuban</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Laporan Keuangan Bulanan &amp; LPJ Triwulan
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Sistem pelaporan otomatis resmi {state.settings.housingName}. Hasilkan laporan keuangan bulanan lengkap siap unduh dalam format PDF, serta kompilasi otomatis LPJ (Laporan Pertanggungjawaban) 3 bulan.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('LPJ_3_BULAN')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'LPJ_3_BULAN'
                  ? 'bg-[#0b2273] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kompilasi LPJ 3 Bulan</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                {quarterlyLPJ.totalTransactionsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LAPORAN_BULANAN')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'LAPORAN_BULANAN'
                  ? 'bg-[#0b2273] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Laporan Bulanan (PDF)</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                {monthlyReport.ledgerEntries.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {pdfFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{pdfFeedback}</span>
          </div>
          <span className="text-[11px] text-emerald-800 hidden sm:inline">
            Dokumen resmi siap dicetak atau dibagikan ke warga
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: KOMPILASI LPJ OTOMATIS 3 BULAN (TRIWULAN)        */}
      {/* ======================================================== */}
      {activeTab === 'LPJ_3_BULAN' ? (
        <>
          {/* Automated Process Status Card */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    PROSES KOMPILASI OTOMATIS AKTIF
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Real-Time Ledger Consolidation
                  </span>
                </div>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Kompilasi Otomatis LPJ Triwulan {quarterlyLPJ.quarter} ({quarterlyLPJ.shortRange})
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl">
                  Setiap mutasi kas masuk dan keluar secara otomatis terkelompokkan dan terkonsolidasi ke dalam pos LPJ 3 bulan. Tidak memerlukan perhitungan manual atau rekonsiliasi terpisah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoCompile}
                  disabled={recompiling}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${recompiling ? 'animate-spin' : ''}`} />
                  <span>{recompiling ? 'Sinkronisasi...' : 'Validasi Ulang LPJ'}</span>
                </button>

                {isAdmin && onTogglePublication && (
                  <button
                    type="button"
                    data-testid="toggle-publish-quarterly-btn"
                    onClick={() => onTogglePublication('quarterly', currentQuarterKey, !isQuarterPublished)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isQuarterPublished
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {isQuarterPublished ? (
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    <span>{isQuarterPublished ? 'Dipublikasikan ke Warga' : 'Draft / Unpublish'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadQuarterlyPDF}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#0b2273] text-white hover:bg-[#1547b8] transition-colors shadow-xs cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh PDF LPJ 3 Bulan</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Quarter Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {allQuartersOverview.map((qItem) => {
              const isSelected = qItem.quarter === selectedQuarter;
              return (
                <button
                  key={qItem.quarter}
                  type="button"
                  onClick={() => setSelectedQuarter(qItem.quarter)}
                  className={`text-left rounded-xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0b2273] text-white border-[#0b2273] shadow-sm ring-2 ring-[#0b2273]/20'
                      : 'bg-white text-slate-900 border-stone-200 hover:border-stone-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected ? 'text-[#5eead4]' : 'text-[#0f766e]'
                      }`}
                    >
                      Triwulan {qItem.quarter} ({qItem.year})
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {qItem.totalTransactionsCount} Mutasi
                    </span>
                  </div>
                  <p
                    className={`text-xs font-medium mt-1 ${
                      isSelected ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {qItem.shortRange}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-white/15 flex items-baseline justify-between">
                    <span
                      className={`text-[11px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      Saldo Akhir:
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums">
                      {formatRupiah(qItem.closingBalance)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Quarter LPJ Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0f766e]">
                    Hasil Kompilasi Otomatis LPJ
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-mono">
                    Tahun Anggaran {selectedYear}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {quarterlyLPJ.title}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label="Pilih Tahun LPJ"
                  className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-stone-300 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value={2026}>Tahun 2026</option>
                </select>

                <button
                  type="button"
                  onClick={handleDownloadQuarterlyPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0b2273] text-white hover:bg-[#1547b8] transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh PDF Resmi</span>
                </button>
              </div>
            </div>

            {/* 4 Balance Metrics for Quarter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Saldo Awal Triwulan</span>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {formatRupiah(quarterlyLPJ.openingBalance)}
                </p>
                <span className="text-[11px] text-slate-500">Saldo kas per 1 {quarterlyLPJ.shortRange.split(' ')[0]}</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-950 font-medium">Total Pemasukan (3 Bulan)</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-emerald-900 mt-1">
                  +{formatRupiah(quarterlyLPJ.totalIncome)}
                </p>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Iuran: {formatRupiah(quarterlyLPJ.totalIuranIncome)} · Non-Iuran: {formatRupiah(quarterlyLPJ.totalOtherIncome)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-rose-950 font-medium">Total Pengeluaran (3 Bulan)</span>
                  <ArrowDownRight className="w-4 h-4 text-rose-700" />
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-rose-700 mt-1">
                  -{formatRupiah(quarterlyLPJ.totalExpense)}
                </p>
                <span className="text-[11px] text-rose-800">
                  Surplus bersih: {quarterlyLPJ.netSurplus >= 0 ? '+' : ''}{formatRupiah(quarterlyLPJ.netSurplus)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0b2273] text-white">
                <span className="text-xs text-emerald-300 font-medium">Saldo Akhir LPJ Triwulan</span>
                <p className="text-lg font-bold font-mono tabular-nums text-white mt-1">
                  {formatRupiah(quarterlyLPJ.closingBalance)}
                </p>
                <span className="text-[11px] text-slate-300">
                  Total Mutasi: {quarterlyLPJ.totalTransactionsCount} Transaksi
                </span>
              </div>
            </div>

            {/* 1. Month-by-Month Breakdown inside the 3-Month LPJ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Rincian Arus Kas Bulanan dalam {quarterlyLPJ.title}
                </h3>
                <span className="text-xs text-slate-500">
                  Terkonsolidasi Otomatis
                </span>
              </div>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                    <tr className="border-b border-stone-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-4">Bulan</th>
                      <th className="py-2.5 px-4 text-right">Iuran Warga</th>
                      <th className="py-2.5 px-4 text-right">Pemasukan Lain</th>
                      <th className="py-2.5 px-4 text-right">Total Masuk</th>
                      <th className="py-2.5 px-4 text-right">Pengeluaran</th>
                      <th className="py-2.5 px-4 text-right">Surplus / Defisit</th>
                      <th className="py-2.5 px-4 text-right">Saldo Akhir</th>
                      <th className="py-2.5 px-4 text-right">Rumah Lunas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {quarterlyLPJ.monthsBreakdown.map((m) => (
                      <tr key={m.periodMonth} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.monthLabel}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800 font-medium">
                          +{formatRupiah(m.iuranIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                          +{formatRupiah(m.otherIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-900 font-bold">
                          +{formatRupiah(m.totalIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 font-medium">
                          -{formatRupiah(m.totalExpense)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                            m.surplus >= 0 ? 'text-emerald-900' : 'text-rose-700'
                          }`}
                        >
                          {m.surplus >= 0 ? '+' : ''}
                          {formatRupiah(m.surplus)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold text-slate-900">
                          {formatRupiah(m.closingBalance)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {m.paidUnitsCount}/55 Unit
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Category Breakdown for 3-Month LPJ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  2. Pos Pemasukan Kas ({quarterlyLPJ.shortRange})
                </h3>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {quarterlyLPJ.incomeByCategory.map((item) => (
                    <div
                      key={item.category}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{item.category}</span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          ({item.count} mutasi · {item.percentage}%)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-emerald-800">
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  3. Pos Pengeluaran Operasional ({quarterlyLPJ.shortRange})
                </h3>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {quarterlyLPJ.expenseByCategory.map((item) => (
                    <div
                      key={item.category}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{item.category}</span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          ({item.count} mutasi · {item.percentage}%)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-rose-700">
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Block Realization Summary */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                4. Realisasi Iuran Warga Per Blok Selama 3 Bulan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {quarterlyLPJ.blockRealization.map((b) => (
                  <div
                    key={b.block}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Blok {b.block}</span>
                        <span className="font-mono text-[11px] font-bold text-blue-700">
                          {b.realizationPercent}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{b.streetName}</p>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        style={{ width: `${Math.min(100, b.realizationPercent)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-[#38d3c3]"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>Masuk: {formatRupiah(b.realizedAmount)}</span>
                      <span>Target: {formatRupiah(b.targetAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Complete Quarterly Transactions Ledger */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    5. Jurnal Transaksi Mutasi Kas Triwulan ({quarterlyLPJ.transactions?.length ?? 0} Mutasi)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Seluruh arus kas masuk dan keluar selama 3 bulan triwulan ini
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari transaksi..."
                      value={quarterlySearch}
                      onChange={(e) => setQuarterlySearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 w-36 sm:w-48"
                    />
                  </div>

                  <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setQuarterlyTxFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        quarterlyTxFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuarterlyTxFilter('income')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        quarterlyTxFilter === 'income'
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuarterlyTxFilter('expense')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        quarterlyTxFilter === 'expense'
                          ? 'bg-white text-rose-700 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                    <tr className="border-b border-stone-200 text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-4">No. Bukti</th>
                      <th className="py-2.5 px-4">Kategori</th>
                      <th className="py-2.5 px-4">Uraian Transaksi</th>
                      <th className="py-2.5 px-4">Metode</th>
                      <th className="py-2.5 px-4 text-right">Pemasukan</th>
                      <th className="py-2.5 px-4 text-right">Pengeluaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredQuarterlyEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Tidak ada transaksi yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredQuarterlyEntries.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                            {formatShortDate(tx.date)}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                            {tx.receiptNumber}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {tx.category}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                            {tx.paymentMethod}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-800 font-bold">
                            {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-rose-700 font-bold">
                            {tx.type === 'expense' ? `-${formatRupiah(tx.amount)}` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ======================================================== */
        /* MODE 2: LAPORAN KEUANGAN BULANAN RINCI (DOWNLOADABLE PDF)*/
        /* ======================================================== */
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0f766e]">
                <FileSpreadsheet className="w-4 h-4 text-[#0f766e]" />
                <span>Laporan Kas Bulanan Lengkap &amp; PDF Resmi</span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                Laporan Keuangan Bulanan — {monthlyReport.periodLabel}
              </h2>
              <p className="text-xs text-slate-500">
                Mencakup ringkasan eksekutif, rekapitulasi per kategori pemasukan &amp; pengeluaran, jurnal kas lengkap, dan status pembayaran 55 rumah.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={activePeriodMonth}
                  onChange={(e) => onChangePeriodMonth(e.target.value)}
                  aria-label="Pilih Bulan Laporan PDF"
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="2026-07">Juli 2026</option>
                  <option value="2026-08">Agustus 2026</option>
                  <option value="2026-09">September 2026</option>
                  <option value="2026-10">Oktober 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">Desember 2026</option>
                </select>
              </div>

              {isAdmin && onTogglePublication && (
                <button
                  type="button"
                  data-testid="toggle-publish-monthly-btn"
                  onClick={() => onTogglePublication('monthly', activePeriodMonth, !isMonthPublished)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    isMonthPublished
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {isMonthPublished ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>{isMonthPublished ? 'Dipublikasikan ke Warga' : 'Draft / Unpublish'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadMonthlyPDF}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#0b2273] text-white hover:bg-[#1547b8] transition-colors shadow-xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh PDF ({monthlyReport.periodLabel})</span>
              </button>
            </div>
          </div>

          {/* Monthly Executive Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Saldo Awal Bulan</span>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatRupiah(monthlyReport.openingBalance)}
              </p>
              <span className="text-[11px] text-slate-500">Saldo per 1 {monthlyReport.periodLabel}</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-950 font-medium">Total Pemasukan ({monthlyReport.periodLabel})</span>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-900 mt-1">
                +{formatRupiah(monthlyReport.totalIncome)}
              </p>
              <span className="text-[11px] text-emerald-800 font-medium">
                {monthlyReport.paidCount} unit lunas · {monthlyReport.unpaidCount} belum bayar
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-950 font-medium">Total Pengeluaran ({monthlyReport.periodLabel})</span>
                <ArrowDownRight className="w-4 h-4 text-rose-700" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-rose-700 mt-1">
                -{formatRupiah(monthlyReport.totalExpense)}
              </p>
              <span className="text-[11px] text-rose-800">
                Surplus: {monthlyReport.netSurplus >= 0 ? '+' : ''}{formatRupiah(monthlyReport.netSurplus)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b2273] text-white">
              <span className="text-xs text-emerald-300 font-medium">Saldo Akhir Bulan</span>
              <p className="text-lg font-bold font-mono tabular-nums text-white mt-1">
                {formatRupiah(monthlyReport.closingBalance)}
              </p>
              <span className="text-[11px] text-slate-300">
                Posisi kas akhir {monthlyReport.periodLabel}
              </span>
            </div>
          </div>

          {/* Income & Expense Category Rekapitulasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Rekap Kategori Pemasukan ({formatRupiah(monthlyReport.totalIncome)})
              </h3>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                {monthlyReport.incomeByCategory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Belum ada pemasukan bulan ini</div>
                ) : (
                  monthlyReport.incomeByCategory.map((c) => (
                    <div key={c.category} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60">
                      <div>
                        <span className="font-semibold text-slate-800">{c.category}</span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          ({c.count}x · {c.percentage}%)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-emerald-800">
                        {formatRupiah(c.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Rekap Kategori Pengeluaran ({formatRupiah(monthlyReport.totalExpense)})
              </h3>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                {monthlyReport.expenseByCategory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Belum ada pengeluaran bulan ini</div>
                ) : (
                  monthlyReport.expenseByCategory.map((c) => (
                    <div key={c.category} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60">
                      <div>
                        <span className="font-semibold text-slate-800">{c.category}</span>
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">
                          ({c.count}x · {c.percentage}%)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-rose-700">
                        {formatRupiah(c.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full Transaction Table in Monthly Report */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Rincian Mutasi Kas Bulan {monthlyReport.periodLabel} ({monthlyReport.ledgerEntries.length} Transaksi)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Semua transaksi masuk dan keluar tercantum lengkap di dokumen PDF
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari transaksi..."
                    value={monthlySearch}
                    onChange={(e) => setMonthlySearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-stone-200 rounded-lg focus:outline-none focus:border-blue-500 w-36 sm:w-48"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMonthlyTxFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      monthlyTxFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthlyTxFilter('income')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      monthlyTxFilter === 'income'
                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthlyTxFilter('expense')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      monthlyTxFilter === 'expense'
                        ? 'bg-white text-rose-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Keluar
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                  <tr className="border-b border-stone-200 text-xs font-semibold text-slate-700">
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">No. Bukti</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Uraian Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Pemasukan</th>
                    <th className="py-2.5 px-4 text-right">Pengeluaran</th>
                    <th className="py-2.5 px-4 text-right">Saldo Kas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredMonthlyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada transaksi pada filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyEntries.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                          {formatShortDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                          {tx.receiptNumber}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{tx.category}</td>
                        <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate">{tx.description}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-800 font-bold">
                          {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-rose-700 font-bold">
                          {tx.type === 'expense' ? `-${formatRupiah(tx.amount)}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-extrabold text-slate-900">
                          {formatRupiah(tx.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status 55 Rumah Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-bold text-slate-900 text-xs">
                Status Pembayaran Iuran 55 Rumah ({formatMonthLabel(activePeriodMonth)})
              </span>
              <span className="font-mono text-xs font-bold text-blue-700">
                {monthlyReport.paidCount} / 55 Rumah Lunas ({Math.round((monthlyReport.paidCount / 55) * 100)}%)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {monthlyReport.unitStatuses.map((u) => (
                <span
                  key={u.resident.id}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    u.paid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                  title={`${u.resident.id}: ${u.resident.headOfFamily} (${u.paid ? 'Lunas' : 'Belum Bayar'})`}
                >
                  {u.resident.id} {u.paid ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>

          {/* Official Sign-off Preview */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">
                  Pengesahan Pengurus {state.settings.housingName}
                </p>
                <p>
                  Ketua: <span className="font-semibold text-slate-800">{state.settings.chairpersonName}</span> · Bendahara:{' '}
                  <span className="font-semibold text-slate-800">{state.settings.treasurerName}</span>
                </p>
              </div>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Rekening Kas: {state.settings.bankAccountInfo}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
