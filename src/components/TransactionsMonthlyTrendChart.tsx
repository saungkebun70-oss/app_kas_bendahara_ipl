import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  Layers,
  LineChart as LineChartIcon,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LedgerTransaction } from '../types/finance';
import {
  formatCompactRupiah,
  formatRupiah,
  getYearlyMonthlyTrend,
  MonthlyCashFlowSummary,
} from '../lib/finance';

interface TransactionsMonthlyTrendChartProps {
  transactions: LedgerTransaction[];
  activePeriodMonth?: string;
  onChangePeriodMonth?: (periodMonth: string) => void;
}

export type ChartDisplayMode = 'grouped-bar' | 'area-trend' | 'net-bar';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: MonthlyCashFlowSummary;
  }>;
  label?: string;
  activePeriodMonth?: string;
}

const CustomTrendTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  activePeriodMonth,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isCurrentActive = activePeriodMonth === data.periodMonth;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xs text-white rounded-xl shadow-xl border border-slate-700 p-3.5 min-w-[240px] text-xs pointer-events-none">
      <div className="flex items-center justify-between border-b border-slate-750 pb-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{data.monthName} {data.periodMonth.slice(0, 4)}</span>
        </div>
        {isCurrentActive && (
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
            Bulan Aktif
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-emerald-300 font-mono">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Total Pemasukan:
          </span>
          <span className="font-bold">+{formatRupiah(data.income)}</span>
        </div>

        <div className="flex items-center justify-between text-rose-300 font-mono">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Total Pengeluaran:
          </span>
          <span className="font-bold">-{formatRupiah(data.expense)}</span>
        </div>

        <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-mono">
          <span className="text-slate-300 font-sans">Saldo Bersih (Net):</span>
          <span
            className={`font-bold ${
              data.net > 0 ? 'text-emerald-400' : data.net < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {data.net > 0 ? '+' : ''}{formatRupiah(data.net)}
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>{data.totalCount} transaksi ({data.incomeCount} masuk / {data.expenseCount} keluar)</span>
        {data.income > 0 && (
          <span className="text-slate-300">
            Margin: {Math.round((data.net / data.income) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
};

export const TransactionsMonthlyTrendChart: React.FC<TransactionsMonthlyTrendChartProps> = ({
  transactions,
  activePeriodMonth = '2026-10',
  onChangePeriodMonth,
}) => {
  // Available distinct years from all recorded transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const t of transactions) {
      const y = Number(t.periodMonth.slice(0, 4));
      if (Number.isFinite(y)) years.add(y);
    }
    const currentActiveYear = Number(activePeriodMonth.slice(0, 4)) || 2026;
    years.add(currentActiveYear);
    years.add(2026);
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, activePeriodMonth]);

  const defaultYear = Number(activePeriodMonth.slice(0, 4)) || 2026;
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('grouped-bar');

  // Yearly monthly metrics
  const trendData = useMemo(() => {
    return getYearlyMonthlyTrend(transactions, selectedYear);
  }, [transactions, selectedYear]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return trendData.months.map((m) => ({
      ...m,
      name: m.shortMonthName,
      fullName: m.monthName,
      pemasukan: m.income,
      pengeluaran: m.expense,
      saldoBersih: m.net,
      isActive: m.periodMonth === activePeriodMonth,
    }));
  }, [trendData.months, activePeriodMonth]);

  const handleBarClick = (entry: unknown) => {
    if (
      entry &&
      typeof entry === 'object' &&
      'activePayload' in entry &&
      Array.isArray((entry as { activePayload?: Array<{ payload?: MonthlyCashFlowSummary }> }).activePayload)
    ) {
      const payload = (entry as { activePayload?: Array<{ payload?: MonthlyCashFlowSummary }> }).activePayload?.[0]?.payload;
      if (payload?.periodMonth && onChangePeriodMonth) {
        onChangePeriodMonth(payload.periodMonth);
      }
    }
  };

  return (
    <section
      aria-label="Tren Bulanan Pemasukan vs Pengeluaran"
      data-testid="transactions-monthly-trend-section"
      className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Top Header & Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <BarChart2 className="w-4 h-4 text-emerald-700" />
            <span className="uppercase tracking-wider">Visualisasi Tren Keuangan Kas</span>
            <span className="text-slate-300">·</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              Tahun {selectedYear}
            </span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
            Tren Bulanan Pemasukan vs Pengeluaran Kas (Monthly Trend)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Grafik komparasi arus kas masuk dan keluar per bulan sepanjang tahun {selectedYear}. Klik batang bulan untuk memfilter jurnal transaksi.
          </p>
        </div>

        {/* Controls: Mode Switcher & Year Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Display Mode Tabs */}
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1 text-xs">
            <button
              type="button"
              data-testid="trend-mode-bar-btn"
              onClick={() => setDisplayMode('grouped-bar')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                displayMode === 'grouped-bar'
                  ? 'bg-white text-emerald-950 shadow-xs border border-stone-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Berdampingan"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Batang Ganda</span>
            </button>
            <button
              type="button"
              data-testid="trend-mode-area-btn"
              onClick={() => setDisplayMode('area-trend')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                displayMode === 'area-trend'
                  ? 'bg-white text-emerald-950 shadow-xs border border-stone-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Area Tren Kontinu"
            >
              <LineChartIcon className="w-3.5 h-3.5 text-blue-700" />
              <span>Area Tren</span>
            </button>
            <button
              type="button"
              data-testid="trend-mode-net-btn"
              onClick={() => setDisplayMode('net-bar')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                displayMode === 'net-bar'
                  ? 'bg-white text-emerald-950 shadow-xs border border-stone-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Saldo Bersih Bulanan"
            >
              <Scale className="w-3.5 h-3.5 text-amber-700" />
              <span>Net Surplus</span>
            </button>
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              data-testid="trend-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Pilih Tahun Analisis Tren"
              className="appearance-none rounded-lg border border-stone-300 bg-white pl-8 pr-7 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-800 focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPI Cards: Year-To-Date Snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Pemasukan Tahun */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-900">
            <span>Pemasukan {selectedYear}</span>
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <p
            data-testid="trend-total-income-ytd"
            className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-emerald-900 tabular-nums"
          >
            +{formatRupiah(trendData.yearTotalIncome)}
          </p>
          <p className="text-[10px] text-emerald-700/90 mt-0.5">
            Rerata: {formatCompactRupiah(trendData.monthlyAverageIncome)} / bln
          </p>
        </div>

        {/* KPI 2: Total Pengeluaran Tahun */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-900">
            <span>Pengeluaran {selectedYear}</span>
            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-800">
              <ArrowDownRight className="w-3 h-3" />
            </div>
          </div>
          <p
            data-testid="trend-total-expense-ytd"
            className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-rose-700 tabular-nums"
          >
            -{formatRupiah(trendData.yearTotalExpense)}
          </p>
          <p className="text-[10px] text-rose-700/90 mt-0.5">
            Rerata: {formatCompactRupiah(trendData.monthlyAverageExpense)} / bln
          </p>
        </div>

        {/* KPI 3: Saldo Bersih / Surplus Tahun */}
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-900">
            <span>Saldo Bersih (Net)</span>
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-800">
              {trendData.yearNetBalance >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
            </div>
          </div>
          <p
            data-testid="trend-net-balance-ytd"
            className={`mt-1 font-mono text-lg sm:text-xl font-extrabold tabular-nums ${
              trendData.yearNetBalance >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {trendData.yearNetBalance >= 0 ? '+' : ''}
            {formatRupiah(trendData.yearNetBalance)}
          </p>
          <p className="text-[10px] text-blue-700/90 mt-0.5">
            {trendData.yearTotalIncome > 0
              ? `Rasio tabungan: ${Math.round((trendData.yearNetBalance / trendData.yearTotalIncome) * 100)}%`
              : 'Belum ada arus kas'}
          </p>
        </div>

        {/* KPI 4: Bulan Puncak (Peak Months) */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <span>Bulan Tertinggi</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1 space-y-0.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Masuk Tertinggi:</span>
              <span className="font-semibold text-emerald-800">
                {trendData.highestIncomeMonth
                  ? `${trendData.highestIncomeMonth.shortMonthName} (${formatCompactRupiah(trendData.highestIncomeMonth.income)})`
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Keluar Terbesar:</span>
              <span className="font-semibold text-rose-700">
                {trendData.highestExpenseMonth
                  ? `${trendData.highestExpenseMonth.shortMonthName} (${formatCompactRupiah(trendData.highestExpenseMonth.expense)})`
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Recharts Chart Canvas */}
      <div
        data-testid="transactions-trend-chart"
        className="w-full h-72 sm:h-80 pt-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          {displayMode === 'grouped-bar' ? (
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => formatCompactRupiah(val)}
              />
              <Tooltip
                content={
                  <CustomTrendTooltip activePeriodMonth={activePeriodMonth} />
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />
              <Bar
                dataKey="pemasukan"
                name="Total Pemasukan"
                fill="#059669" // Emerald 600
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="pengeluaran"
                name="Total Pengeluaran"
                fill="#e11d48" // Rose 600
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          ) : displayMode === 'area-trend' ? (
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              onClick={handleBarClick}
            >
              <defs>
                <linearGradient id="incomeTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => formatCompactRupiah(val)}
              />
              <Tooltip
                content={
                  <CustomTrendTooltip activePeriodMonth={activePeriodMonth} />
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="pemasukan"
                name="Total Pemasukan"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeTrendGrad)"
              />
              <Area
                type="monotone"
                dataKey="pengeluaran"
                name="Total Pengeluaran"
                stroke="#e11d48"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseTrendGrad)"
              />
            </AreaChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => formatCompactRupiah(val)}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Tooltip
                content={
                  <CustomTrendTooltip activePeriodMonth={activePeriodMonth} />
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />
              <Bar
                dataKey="saldoBersih"
                name="Saldo Bersih (Net)"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Month Navigation Quick Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
        <span className="text-slate-500 text-[11px] font-semibold">
          Pilih Bulan Periode:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {chartData.map((m) => {
            const isSelected = m.periodMonth === activePeriodMonth;
            const hasData = m.totalCount > 0;
            return (
              <button
                key={m.periodMonth}
                type="button"
                onClick={() => onChangePeriodMonth && onChangePeriodMonth(m.periodMonth)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : hasData
                    ? 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                    : 'bg-transparent text-slate-400 hover:text-slate-600'
                }`}
                title={`${m.fullName}: Masuk ${formatCompactRupiah(m.income)}, Keluar ${formatCompactRupiah(m.expense)}`}
              >
                {m.shortMonthName}
                {hasData && (
                  <span
                    className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
