import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import type { LedgerTransaction } from '../types/finance';
import {
  formatCompactRupiah,
  formatRupiah,
  getLast6MonthsCashFlow,
  SixMonthCashFlowPoint,
} from '../lib/finance';

interface SixMonthCashflowBarChartProps {
  transactions: LedgerTransaction[];
  activePeriodMonth: string;
  onChangePeriodMonth?: (periodMonth: string) => void;
  onNavigateToTransactions?: () => void;
}

type ChartMode = 'grouped' | 'stacked' | 'net';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: SixMonthCashFlowPoint & { label: string };
  }>;
  label?: string;
  activePeriodMonth?: string;
}

const CustomCashflowTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  activePeriodMonth,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const isCurrentActive = activePeriodMonth === point.periodMonth;
  const isSurplus = point.net >= 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xs text-white rounded-xl shadow-xl border border-slate-700 p-3.5 min-w-[240px] text-xs pointer-events-none">
      <div className="flex items-center justify-between border-b border-slate-750 pb-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>{point.monthName} {point.year}</span>
        </div>
        {isCurrentActive && (
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
            Bulan Aktif
          </span>
        )}
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between text-emerald-300">
          <span className="flex items-center gap-1.5 text-slate-300 font-sans">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0f766e] inline-block" />
            Pemasukan:
          </span>
          <span className="font-bold">+{formatRupiah(point.income)}</span>
        </div>

        <div className="flex items-center justify-between text-rose-300">
          <span className="flex items-center gap-1.5 text-slate-300 font-sans">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#e11d48] inline-block" />
            Pengeluaran:
          </span>
          <span className="font-bold">-{formatRupiah(point.expense)}</span>
        </div>

        <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between">
          <span className="text-slate-300 font-sans">Saldo Bersih (Net):</span>
          <span
            className={`font-bold ${
              isSurplus ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isSurplus ? '+' : ''}{formatRupiah(point.net)}
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-sans">
        <span>{point.totalCount} transaksi ({point.incomeCount} masuk / {point.expenseCount} keluar)</span>
        <span className="text-slate-400 italic">Klik untuk pilih</span>
      </div>
    </div>
  );
};

export const SixMonthCashflowBarChart: React.FC<SixMonthCashflowBarChartProps> = ({
  transactions,
  activePeriodMonth,
  onChangePeriodMonth,
  onNavigateToTransactions,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('grouped');

  // Compute the 6-month cashflow data dynamically ending at the active period month
  const cashflowSummary = useMemo(() => {
    return getLast6MonthsCashFlow(transactions, activePeriodMonth);
  }, [transactions, activePeriodMonth]);

  // Format data specifically for Recharts
  const chartData = useMemo(() => {
    return cashflowSummary.points.map((p) => ({
      ...p,
      label: `${p.shortName} '${String(p.year).slice(-2)}`,
      pemasukan: p.income,
      pengeluaran: p.expense,
      saldoBersih: p.net,
      isActive: p.periodMonth === activePeriodMonth,
    }));
  }, [cashflowSummary.points, activePeriodMonth]);

  const handleBarClick = (entry: unknown) => {
    if (
      entry &&
      typeof entry === 'object' &&
      'activePayload' in entry &&
      Array.isArray((entry as { activePayload?: Array<{ payload?: SixMonthCashFlowPoint }> }).activePayload)
    ) {
      const payload = (entry as { activePayload?: Array<{ payload?: SixMonthCashFlowPoint }> }).activePayload?.[0]?.payload;
      if (payload?.periodMonth && onChangePeriodMonth) {
        onChangePeriodMonth(payload.periodMonth);
      }
    }
  };

  const isNetSurplus = cashflowSummary.netSurplus >= 0;

  return (
    <section
      aria-label="Tren Pemasukan dan Pengeluaran 6 Bulan Terakhir"
      data-testid="six-month-cashflow-chart-card"
      className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
    >
      {/* Top Header & Interactive Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0f766e]">
            <TrendingUp className="w-4 h-4 text-[#0f766e]" />
            <span className="uppercase tracking-wider">Tren Arus Kas (Recharts)</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-500">
              {cashflowSummary.points[0]?.monthName} {cashflowSummary.points[0]?.year} –{' '}
              {cashflowSummary.points[cashflowSummary.points.length - 1]?.monthName}{' '}
              {cashflowSummary.points[cashflowSummary.points.length - 1]?.year}
            </span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
            Tren Pemasukan &amp; Pengeluaran (6 Bulan Terakhir)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Komparasi pemasukan iuran &amp; operasional terhadap pengeluaran kas lingkungan selama 6 bulan terakhir. Klik batang bulan untuk beralih periode.
          </p>
        </div>

        {/* View Mode Controls & Transactions Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Display Mode Switcher */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Berdampingan
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Bertumpuk
            </button>
            <button
              type="button"
              onClick={() => setChartMode('net')}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                chartMode === 'net'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Saldo Bersih
            </button>
          </div>

          {onNavigateToTransactions && (
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#1547b8] transition-colors cursor-pointer"
            >
              <span>Jurnal Kas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Kicker Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-teal-200/80 bg-[#f0fdfa]/70 p-3">
          <div className="flex items-center justify-between text-xs text-[#0f766e]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Pemasukan (6 Bln)</span>
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
          <p
            data-testid="six-month-total-income"
            className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#0f766e] tabular-nums"
          >
            {formatRupiah(cashflowSummary.totalIncome)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Rata-rata: {formatRupiah(cashflowSummary.averageIncome)} / bln
          </span>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3">
          <div className="flex items-center justify-between text-xs text-rose-700">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Pengeluaran (6 Bln)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p
            data-testid="six-month-total-expense"
            className="mt-1 font-mono text-base sm:text-lg font-extrabold text-rose-700 tabular-nums"
          >
            {formatRupiah(cashflowSummary.totalExpense)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Rata-rata: {formatRupiah(cashflowSummary.averageExpense)} / bln
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Surplus/Defisit Kas</span>
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p
            data-testid="six-month-net-surplus"
            className={`mt-1 font-mono text-base sm:text-lg font-extrabold tabular-nums ${
              isNetSurplus ? 'text-[#0f766e]' : 'text-rose-600'
            }`}
          >
            {isNetSurplus ? '+' : ''}{formatRupiah(cashflowSummary.netSurplus)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            {isNetSurplus ? 'Kondisi Kas Sehat' : 'Defisit Arus Kas'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Puncak Pemasukan</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-slate-800 tabular-nums">
            {cashflowSummary.highestIncomePoint?.shortName} '{String(cashflowSummary.highestIncomePoint?.year).slice(-2)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            {formatRupiah(cashflowSummary.highestIncomePoint?.income ?? 0)}
          </span>
        </div>
      </div>

      {/* Main Recharts BarChart Canvas */}
      <div className="relative pt-2">
        <div className="h-[290px] w-full" data-testid="recharts-six-month-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              onClick={handleBarClick}
              margin={{ top: 16, right: 12, left: -4, bottom: 6 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCompactRupiah}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomCashflowTooltip activePeriodMonth={activePeriodMonth} />}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />

              {chartMode === 'net' ? (
                <>
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                  <Bar
                    dataKey="saldoBersih"
                    name="Saldo Bersih (Net)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.periodMonth}`}
                        fill={entry.saldoBersih >= 0 ? '#0f766e' : '#e11d48'}
                        opacity={entry.isActive ? 1 : 0.85}
                        stroke={entry.isActive ? '#0b2273' : 'transparent'}
                        strokeWidth={entry.isActive ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </>
              ) : chartMode === 'stacked' ? (
                <>
                  <Bar
                    dataKey="pemasukan"
                    name="Pemasukan"
                    stackId="cashflow"
                    fill="#0f766e"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={44}
                    cursor="pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-income-${entry.periodMonth}`}
                        fill="#0f766e"
                        opacity={entry.isActive ? 1 : 0.85}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    stackId="cashflow"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    cursor="pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-expense-${entry.periodMonth}`}
                        fill="#e11d48"
                        opacity={entry.isActive ? 1 : 0.85}
                      />
                    ))}
                  </Bar>
                </>
              ) : (
                <>
                  {/* Default Grouped Bars: Pemasukan side-by-side with Pengeluaran */}
                  <Bar
                    dataKey="pemasukan"
                    name="Pemasukan"
                    fill="#0f766e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    cursor="pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-income-${entry.periodMonth}`}
                        fill="#0f766e"
                        opacity={entry.isActive ? 1 : 0.82}
                        stroke={entry.isActive ? '#042f2e' : 'transparent'}
                        strokeWidth={entry.isActive ? 1.5 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    cursor="pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-expense-${entry.periodMonth}`}
                        fill="#e11d48"
                        opacity={entry.isActive ? 1 : 0.82}
                        stroke={entry.isActive ? '#881337' : 'transparent'}
                        strokeWidth={entry.isActive ? 1.5 : 0}
                      />
                    ))}
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Month Selector Pills to quick select active period month */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 font-medium text-[11px]">
          Pilih bulan aktif untuk dasbor:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {cashflowSummary.points.map((p) => {
            const isSelected = p.periodMonth === activePeriodMonth;
            return (
              <button
                key={p.periodMonth}
                type="button"
                onClick={() => onChangePeriodMonth?.(p.periodMonth)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b2273] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.shortName} '{String(p.year).slice(-2)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
