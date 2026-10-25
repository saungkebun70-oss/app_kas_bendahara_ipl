import React, { useState, useMemo } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import type { DatabaseState } from '../types/finance';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-900">
            <Layers className="w-3.5 h-3.5" />
            <span>Rekapitulasi LPJ 3 Bulanan &amp; Laporan PDF Resmi</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Laporan Pertanggungjawaban (LPJ) &amp; Bukti Kas PDF
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Seluruh pencatatan pemasukan dan pengeluaran otomatis masuk ke Rekap LPJ per 3 bulan (Triwulan) dan siap diunduh dalam bentuk PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('LPJ_3_BULAN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'LPJ_3_BULAN'
                  ? 'bg-emerald-950 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap LPJ Per 3 Bulan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LAPORAN_BULANAN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'LAPORAN_BULANAN'
                  ? 'bg-emerald-950 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Bulanan Rinci (PDF)
            </button>
          </div>
        </div>
      </div>

      {pdfFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span>{pdfFeedback}</span>
          </div>
          <span className="text-[11px] text-emerald-800">
            Dokumen siap dicetak / dibagikan ke grup warga
          </span>
        </div>
      )}

      {activeTab === 'LPJ_3_BULAN' ? (
        <>
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
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-xs'
                      : 'bg-white text-slate-900 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        isSelected ? 'text-emerald-300' : 'text-emerald-900'
                      }`}
                    >
                      Triwulan {qItem.quarter} ({qItem.year})
                    </span>
                    <span
                      className={`text-[11px] font-mono ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      3 Bulan
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {qItem.shortRange}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-stone-200/20 flex items-baseline justify-between">
                    <span
                      className={`text-[11px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
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
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-900">
                    Rekapitulasi Otomatis 3 Bulan
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
                  className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value={2026}>Tahun 2026</option>
                </select>

                {isAdmin && onTogglePublication && (
                  <button
                    type="button"
                    data-testid="toggle-publish-quarterly-btn"
                    onClick={() => onTogglePublication('quarterly', currentQuarterKey, !isQuarterPublished)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh PDF LPJ 3 Bulan</span>
                </button>
              </div>
            </div>

            {/* 4 Balance Metrics for Quarter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs text-slate-500 font-medium">Saldo Awal Triwulan</span>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {formatRupiah(quarterlyLPJ.openingBalance)}
                </p>
                <span className="text-[11px] text-slate-500">Saldo pindahan awal triwulan</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-950 font-medium">Total Pemasukan (3 Bln)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-800" />
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-emerald-900 mt-1">
                  +{formatRupiah(quarterlyLPJ.totalIncome)}
                </p>
                <span className="text-[11px] text-emerald-900">
                  Iuran: {formatRupiah(quarterlyLPJ.totalIuranIncome)} · Non-Iuran: {formatRupiah(quarterlyLPJ.totalOtherIncome)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-950 font-medium">Total Pengeluaran (3 Bln)</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-700" />
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-red-700 mt-1">
                  -{formatRupiah(quarterlyLPJ.totalExpense)}
                </p>
                <span className="text-[11px] text-red-900">
                  Akumulasi seluruh pos beban 3 bulan
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950 text-white">
                <span className="text-xs text-emerald-200 font-medium">Saldo Akhir LPJ Triwulan</span>
                <p className="text-lg font-bold font-mono tabular-nums text-white mt-1">
                  {formatRupiah(quarterlyLPJ.closingBalance)}
                </p>
                <span className="text-[11px] text-emerald-200">
                  Total Mutasi: {quarterlyLPJ.totalTransactionsCount} transaksi
                </span>
              </div>
            </div>

            {/* Month-by-Month Breakdown inside the 3-Month LPJ */}
            <div>
              <h3 className="text-xs font-semibold text-slate-600 mb-3">
                1. Rincian Rekapitulasi Bulanan dalam {quarterlyLPJ.title}
              </h3>
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-slate-600">
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
                      <tr key={m.periodMonth} className="hover:bg-stone-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{m.monthLabel}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800 font-medium">
                          +{formatRupiah(m.iuranIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                          +{formatRupiah(m.otherIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-900 font-semibold">
                          +{formatRupiah(m.totalIncome)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-red-700 font-medium">
                          -{formatRupiah(m.totalExpense)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                            m.surplus >= 0 ? 'text-slate-900' : 'text-red-700'
                          }`}
                        >
                          {m.surplus >= 0 ? '+' : ''}
                          {formatRupiah(m.surplus)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatRupiah(m.closingBalance)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {m.paidUnitsCount}/55 unit
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown for 3-Month LPJ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <h3 className="text-xs font-semibold text-slate-600 mb-3">
                  2. Pos Pemasukan Kas ({quarterlyLPJ.shortRange})
                </h3>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {quarterlyLPJ.incomeByCategory.map((item) => (
                    <div
                      key={item.category}
                      className="p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{item.category}</span>
                        <span className="text-slate-500 ml-2 font-mono">
                          ({item.count} transaksi)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-emerald-800">
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-600 mb-3">
                  3. Pos Pengeluaran Operasional ({quarterlyLPJ.shortRange})
                </h3>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {quarterlyLPJ.expenseByCategory.map((item) => (
                    <div
                      key={item.category}
                      className="p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{item.category}</span>
                        <span className="text-slate-500 ml-2 font-mono">
                          ({item.count} transaksi)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-red-700">
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Detailed Monthly Report & Direct PDF Export */
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Laporan Kas Bulanan Terperinci</span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                Laporan Keuangan Bulanan — {monthlyReport.periodLabel}
              </h2>
              <p className="text-xs text-slate-500">
                Mencakup ringkasan eksekutif, rincian per kategori, jurnal transaksi lengkap, dan status pembayaran 55 rumah.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-3 py-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={activePeriodMonth}
                  onChange={(e) => onChangePeriodMonth(e.target.value)}
                  aria-label="Pilih Bulan Laporan PDF"
                  className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
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
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh PDF Laporan Bulanan ({monthlyReport.periodLabel})</span>
              </button>
            </div>
          </div>

          {/* Monthly Executive Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs text-slate-500">Saldo Awal Bulan</span>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatRupiah(monthlyReport.openingBalance)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <span className="text-xs text-emerald-950">Total Pemasukan ({monthlyReport.periodLabel})</span>
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-900 mt-1">
                +{formatRupiah(monthlyReport.totalIncome)}
              </p>
              <span className="text-[11px] text-emerald-900">
                {monthlyReport.paidCount} unit lunas · {monthlyReport.unpaidCount} belum lunas
              </span>
            </div>
            <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/70">
              <span className="text-xs text-red-950">Total Pengeluaran ({monthlyReport.periodLabel})</span>
              <p className="text-lg font-bold font-mono tabular-nums text-red-700 mt-1">
                -{formatRupiah(monthlyReport.totalExpense)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950 text-white">
              <span className="text-xs text-emerald-200">Saldo Akhir Bulan</span>
              <p className="text-lg font-bold font-mono tabular-nums text-white mt-1">
                {formatRupiah(monthlyReport.closingBalance)}
              </p>
            </div>
          </div>

          {/* Full Transaction Table in Monthly Report */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-600">
                Rincian Jurnal Transaksi Bulan {monthlyReport.periodLabel} ({monthlyReport.ledgerEntries.length} Transaksi)
              </h3>
              <span className="text-xs text-slate-500">
                Tercantum penuh di dokumen PDF
              </span>
            </div>
            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">No. Bukti</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Uraian Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Pemasukan</th>
                    <th className="py-2.5 px-4 text-right">Pengeluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {monthlyReport.ledgerEntries.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/70">
                      <td className="py-2.5 px-4 font-mono text-slate-700 tabular-nums">
                        {formatShortDate(tx.date)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{tx.category}</td>
                      <td className="py-2.5 px-4 text-slate-700">{tx.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-800 font-semibold">
                        {tx.type === 'income' ? formatRupiah(tx.amount) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700 font-semibold">
                        {tx.type === 'expense' ? formatRupiah(tx.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Sign-off Preview */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">
                  Pengesahan Pengurus {state.settings.housingName}
                </p>
                <p>
                  Ketua: <span className="font-medium text-slate-800">{state.settings.chairpersonName}</span> · Bendahara:{' '}
                  <span className="font-medium text-slate-800">{state.settings.treasurerName}</span>
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
