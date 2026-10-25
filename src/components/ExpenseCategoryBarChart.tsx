import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Filter,
  HelpCircle,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LedgerTransaction } from '../types/finance';
import {
  EXPENSE_CATEGORIES,
  formatMonthLabel,
  formatRupiah,
} from '../lib/finance';

interface ExpenseCategoryBarChartProps {
  transactions: LedgerTransaction[];
  activePeriodMonth: string;
  onChangePeriodMonth?: (pm: string) => void;
  onNavigateToTransactions?: () => void;
}

export interface CategoryComparisonData {
  category: string;
  currentAmount: number;
  historicalAverage: number;
  historicalTotal: number;
  differenceAmount: number;
  differencePercent: number;
  currentTxCount: number;
  historicalMonthsCount: number;
}

export function formatCompactRupiah(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    const jt = amount / 1_000_000;
    return `${jt.toLocaleString('id-ID', { minimumFractionDigits: jt % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })} Jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    const rb = amount / 1_000;
    return `${rb.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Rb`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export const ExpenseCategoryBarChart: React.FC<ExpenseCategoryBarChartProps> = ({
  transactions,
  activePeriodMonth,
  onChangePeriodMonth,
  onNavigateToTransactions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [chartMode, setChartMode] = useState<'grouped' | 'deviation'>('grouped');
  const [sortBy, setSortBy] = useState<'amount' | 'diff' | 'name'>('amount');
  const [hoveredData, setHoveredData] = useState<CategoryComparisonData | null>(null);

  // 1. Gather all expense transactions and available historical periods
  const { comparisonData, monthsWithExpenses, totalCurrentExpenses, totalHistoricalAverage } =
    useMemo(() => {
      const expenseTxs = transactions.filter((t) => t.type === 'expense');

      // Unique months that have recorded expenses in the database
      const recordedMonths = Array.from(new Set(expenseTxs.map((t) => t.periodMonth))).sort();
      const distinctMonths = recordedMonths.length > 0 ? recordedMonths : [activePeriodMonth];
      const monthsCount = distinctMonths.length;

      // Unique set of all categories seen in database + standard predefined categories
      const allCategoryKeys = Array.from(
        new Set([...EXPENSE_CATEGORIES, ...expenseTxs.map((t) => t.category)])
      );

      const items: CategoryComparisonData[] = allCategoryKeys.map((cat) => {
        // Current month
        const currentTxs = expenseTxs.filter(
          (t) => t.category === cat && t.periodMonth === activePeriodMonth
        );
        const currentAmount = currentTxs.reduce((sum, t) => sum + t.amount, 0);

        // Historical all months
        const catAllTxs = expenseTxs.filter((t) => t.category === cat);
        const historicalTotal = catAllTxs.reduce((sum, t) => sum + t.amount, 0);
        const historicalAverage = Math.round(historicalTotal / monthsCount);

        const differenceAmount = currentAmount - historicalAverage;
        const differencePercent =
          historicalAverage > 0
            ? Math.round((differenceAmount / historicalAverage) * 100)
            : currentAmount > 0
            ? 100
            : 0;

        return {
          category: cat,
          currentAmount,
          historicalAverage,
          historicalTotal,
          differenceAmount,
          differencePercent,
          currentTxCount: currentTxs.length,
          historicalMonthsCount: monthsCount,
        };
      });

      // Filter out categories that have neither current nor historical expense to keep chart focused
      const activeItems = items.filter(
        (it) => it.currentAmount > 0 || it.historicalAverage > 0
      );

      // Sort
      const sorted = [...activeItems].sort((a, b) => {
        if (sortBy === 'amount') return b.currentAmount - a.currentAmount;
        if (sortBy === 'diff') return Math.abs(b.differenceAmount) - Math.abs(a.differenceAmount);
        return a.category.localeCompare(b.category);
      });

      const totalCurrent = sorted.reduce((sum, it) => sum + it.currentAmount, 0);
      const totalHistAvg = sorted.reduce((sum, it) => sum + it.historicalAverage, 0);

      return {
        comparisonData: sorted,
        monthsWithExpenses: distinctMonths,
        totalCurrentExpenses: totalCurrent,
        totalHistoricalAverage: totalHistAvg,
      };
    }, [transactions, activePeriodMonth, sortBy]);

  // Overall variance calculation
  const totalDifference = totalCurrentExpenses - totalHistoricalAverage;
  const totalDiffPercent =
    totalHistoricalAverage > 0
      ? Math.round((totalDifference / totalHistoricalAverage) * 100)
      : 0;

  // 2. D3 Chart Rendering with ResizeObserver
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (comparisonData.length === 0) {
      svg
        .append('text')
        .attr('x', 200)
        .attr('y', 100)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '13px')
        .text('Belum ada data pengeluaran untuk periode ini');
      return;
    }

    const containerWidth = containerRef.current.clientWidth || 700;
    const height = 340;
    const margin = { top: 32, right: 30, bottom: 78, left: 75 };
    const width = Math.max(380, containerWidth - margin.left - margin.right);

    svg.attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define subtle gradients & drop shadows
    const defs = svg.append('defs');

    // Blue gradient for active month
    const blueGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-blue')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    blueGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1d4ed8');
    blueGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1547b8');

    // Teal gradient for historical average
    const tealGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-teal')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    tealGradient.append('stop').attr('offset', '0%').attr('stop-color', '#14b8a6');
    tealGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0f766e');

    // Rose gradient for over-budget deviation
    const roseGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-rose')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    roseGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    roseGradient.append('stop').attr('offset', '100%').attr('stop-color', '#be123c');

    // Emerald gradient for savings deviation
    const emeraldGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-emerald')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    emeraldGradient.append('stop').attr('offset', '0%').attr('stop-color', '#34d399');
    emeraldGradient.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    const innerHeight = height - margin.top - margin.bottom;

    if (chartMode === 'grouped') {
      // ---------------- GROUPED BAR CHART ----------------
      const categories = comparisonData.map((d) => d.category);

      const x0 = d3
        .scaleBand()
        .domain(categories)
        .range([0, width])
        .padding(0.24);

      const x1 = d3
        .scaleBand()
        .domain(['current', 'average'])
        .range([0, x0.bandwidth()])
        .padding(0.12);

      const maxVal = d3.max(comparisonData, (d) =>
        Math.max(d.currentAmount, d.historicalAverage)
      ) || 1000000;

      const y = d3
        .scaleLinear()
        .domain([0, maxVal * 1.18])
        .range([innerHeight, 0])
        .nice();

      // Horizontal subtle grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-width)
            .tickFormat(() => '')
        )
        .call((grid) => grid.select('.domain').remove())
        .call((grid) =>
          grid
            .selectAll('.tick line')
            .attr('stroke', '#e2e8f0')
            .attr('stroke-dasharray', '3 3')
            .attr('stroke-opacity', 0.8)
        );

      // Category groups
      const categoryGroups = g
        .selectAll('.cat-group')
        .data(comparisonData)
        .enter()
        .append('g')
        .attr('class', 'cat-group')
        .attr('transform', (d) => `translate(${x0(d.category)},0)`);

      // 1. Current Month Bar (Blue)
      categoryGroups
        .append('rect')
        .attr('class', 'bar-current')
        .attr('x', x1('current') || 0)
        .attr('width', x1.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('fill', 'url(#d3-bar-blue)')
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d) => {
          setHoveredData(d);
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 0.85);
        })
        .on('mouseleave', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 1);
        })
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => y(d.currentAmount))
        .attr('height', (d) => Math.max(3, innerHeight - y(d.currentAmount)));

      // 2. Historical Average Bar (Teal)
      categoryGroups
        .append('rect')
        .attr('class', 'bar-average')
        .attr('x', x1('average') || 0)
        .attr('width', x1.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('fill', 'url(#d3-bar-teal)')
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d) => {
          setHoveredData(d);
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 0.85);
        })
        .on('mouseleave', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 1);
        })
        .transition()
        .duration(650)
        .delay(100)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => y(d.historicalAverage))
        .attr('height', (d) => Math.max(3, innerHeight - y(d.historicalAverage)));

      // Value label on top of highest bar in group
      categoryGroups
        .append('text')
        .attr('x', x0.bandwidth() / 2)
        .attr('y', (d) => Math.min(y(d.currentAmount), y(d.historicalAverage)) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '600')
        .attr('fill', (d) => (d.differenceAmount > 0 ? '#b91c1c' : '#047857'))
        .text((d) => {
          if (d.differencePercent === 0) return '=';
          return `${d.differencePercent > 0 ? '+' : ''}${d.differencePercent}%`;
        });

      // X Axis
      const xAxis = d3.axisBottom(x0);
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .call((axis) => axis.select('.domain').attr('stroke', '#cbd5e1'))
        .selectAll('.tick text')
        .attr('transform', 'rotate(-18)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.6em')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#334155');

      // Y Axis
      const yAxis = d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((d) => formatCompactRupiah(d.valueOf() as number));

      g.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call((axis) => axis.select('.domain').remove())
        .selectAll('.tick text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('fill', '#64748b');
    } else {
      // ---------------- DEVIATION / VARIANCE CHART ----------------
      const categories = comparisonData.map((d) => d.category);

      const x = d3
        .scaleBand()
        .domain(categories)
        .range([0, width])
        .padding(0.32);

      const maxDiff = d3.max(comparisonData, (d) => Math.abs(d.differenceAmount)) || 500000;
      const y = d3
        .scaleLinear()
        .domain([-maxDiff * 1.25, maxDiff * 1.25])
        .range([innerHeight, 0])
        .nice();

      const zeroY = y(0);

      // Zero baseline line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', zeroY)
        .attr('y2', zeroY)
        .attr('stroke', '#475569')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2 2');

      // Deviation bars
      g.selectAll('.bar-deviation')
        .data(comparisonData)
        .enter()
        .append('rect')
        .attr('class', 'bar-deviation')
        .attr('x', (d) => x(d.category) || 0)
        .attr('width', x.bandwidth())
        .attr('y', zeroY)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', (d) => (d.differenceAmount >= 0 ? 'url(#d3-bar-rose)' : 'url(#d3-bar-emerald)'))
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d) => {
          setHoveredData(d);
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 0.85);
        })
        .on('mouseleave', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGRectElement).attr('opacity', 1);
        })
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => (d.differenceAmount >= 0 ? y(d.differenceAmount) : zeroY))
        .attr('height', (d) => Math.max(3, Math.abs(y(d.differenceAmount) - zeroY)));

      // Labels on bars
      g.selectAll('.text-deviation')
        .data(comparisonData)
        .enter()
        .append('text')
        .attr('x', (d) => (x(d.category) || 0) + x.bandwidth() / 2)
        .attr('y', (d) =>
          d.differenceAmount >= 0 ? y(d.differenceAmount) - 6 : y(d.differenceAmount) + 14
        )
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '700')
        .attr('fill', (d) => (d.differenceAmount >= 0 ? '#b91c1c' : '#047857'))
        .text((d) => `${d.differenceAmount > 0 ? '+' : ''}${formatCompactRupiah(d.differenceAmount)}`);

      // X Axis
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .call((axis) => axis.select('.domain').attr('stroke', '#cbd5e1'))
        .selectAll('.tick text')
        .attr('transform', 'rotate(-18)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.6em')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#334155');

      // Y Axis
      g.append('g')
        .attr('class', 'y-axis')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickFormat((d) => formatCompactRupiah(d.valueOf() as number))
        )
        .call((axis) => axis.select('.domain').remove())
        .selectAll('.tick text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('fill', '#64748b');
    }
  }, [comparisonData, chartMode]);

  return (
    <section
      aria-label="Visualisasi Kategori Pengeluaran D3 vs Rata-rata Historis"
      data-testid="d3-expense-chart-section"
      className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-5"
    >
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1547b8] to-[#0ea5e9] text-white shadow-xs">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                Analisis Kategori Pengeluaran vs Rata-rata Historis (D3 Visualizer)
              </h2>
              <span className="rounded-full bg-[#eef2f8] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#1547b8]">
                {comparisonData.length} Kategori Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan realisasi beban bulanan{' '}
              <strong className="text-slate-700">{formatMonthLabel(activePeriodMonth)}</strong> terhadap
              rata-rata pengeluaran historis ({monthsWithExpenses.length} periode pencatatan kas).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher: Grouped vs Deviation */}
          <div
            role="group"
            aria-label="Pilih mode visualisasi grafik D3"
            className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs"
          >
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white text-[#1547b8] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berdampingan
            </button>
            <button
              type="button"
              onClick={() => setChartMode('deviation')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                chartMode === 'deviation'
                  ? 'bg-white text-[#1547b8] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selisih / Deviasi (+/-)
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Urutkan kategori pengeluaran"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#1547b8] focus:outline-none cursor-pointer"
            >
              <option value="amount">Beban Terbesar</option>
              <option value="diff">Selisih Terbesar</option>
              <option value="name">Nama Kategori (A-Z)</option>
            </select>
          </div>

          {/* Month Selector Sync */}
          {onChangePeriodMonth && (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label="Pilih bulan untuk analisis pengeluaran"
                value={activePeriodMonth}
                onChange={(e) => onChangePeriodMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-[#1547b8] focus:border-[#1547b8] focus:outline-none cursor-pointer"
              >
                {monthsWithExpenses.map((pm) => (
                  <option key={pm} value={pm}>
                    {formatMonthLabel(pm)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Top 4 KPI Metric Strips for Quick Insights */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Active Month Total Expense */}
        <div className="rounded-xl border border-blue-200/80 bg-[#f8faff] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1547b8]">
            Pengeluaran {formatMonthLabel(activePeriodMonth).split(' ')[0]}
          </span>
          <p
            data-testid="d3-current-expense-total"
            className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums"
          >
            {formatRupiah(totalCurrentExpenses)}
          </p>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
            Dari {comparisonData.reduce((acc, c) => acc + c.currentTxCount, 0)} nota transaksi
          </span>
        </div>

        {/* KPI 2: Historical Monthly Average */}
        <div className="rounded-xl border border-teal-200/80 bg-[#f0fdfa]/70 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">
            Rata-rata Historis ({monthsWithExpenses.length} Bln)
          </span>
          <p
            data-testid="d3-historical-avg-total"
            className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#0f766e] tabular-nums"
          >
            {formatRupiah(totalHistoricalAverage)}
          </p>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
            Tolok ukur per bulan kas perumahan
          </span>
        </div>

        {/* KPI 3: Total Variance / Deviation */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Deviasi vs Rata-rata
            </span>
            {totalDifference > 0 ? (
              <TrendingUp className="h-4 w-4 text-rose-600" />
            ) : totalDifference < 0 ? (
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <p
            data-testid="d3-variance-total"
            className={`mt-1 font-mono text-lg sm:text-xl font-extrabold tabular-nums ${
              totalDifference > 0 ? 'text-rose-600' : totalDifference < 0 ? 'text-emerald-600' : 'text-slate-800'
            }`}
          >
            {totalDifference > 0 ? `+${formatRupiah(totalDifference)}` : formatRupiah(totalDifference)}
          </p>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
            {totalDifference > 0
              ? `Beban naik ${totalDiffPercent}% di atas rata-rata`
              : totalDifference < 0
              ? `Hemat ${Math.abs(totalDiffPercent)}% di bawah rata-rata`
              : 'Tepat sesuai rata-rata historis'}
          </span>
        </div>

        {/* KPI 4: Highest Cost Category */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Kategori Terbesar
          </span>
          <p className="mt-1 truncate font-display text-sm sm:text-base font-bold text-slate-900">
            {comparisonData[0]?.category || '-'}
          </p>
          <span className="mt-0.5 block font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
            {formatRupiah(comparisonData[0]?.currentAmount || 0)} (
            {totalCurrentExpenses > 0
              ? Math.round(((comparisonData[0]?.currentAmount || 0) / totalCurrentExpenses) * 100)
              : 0}
            % beban)
          </span>
        </div>
      </div>

      {/* D3 Visualizer Chart Viewport */}
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl bg-slate-50/60 p-2 border border-slate-100">
        <svg
          ref={svgRef}
          className="w-full h-[340px] select-none"
          role="img"
          aria-label="Grafik batang interaktif D3 perbandingan kategori pengeluaran"
        />

        {/* Interactive Hover Card Overlay */}
        {hoveredData && (
          <div
            ref={tooltipRef}
            className="absolute top-4 right-4 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-lg backdrop-blur-xs text-xs space-y-2 pointer-events-none"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <strong className="font-bold text-slate-900 truncate">
                {hoveredData.category}
              </strong>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                  hoveredData.differenceAmount > 0
                    ? 'bg-rose-50 text-rose-700'
                    : hoveredData.differenceAmount < 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {hoveredData.differencePercent > 0 ? '+' : ''}
                {hoveredData.differencePercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Bulan Ini:</span>
                <span className="font-mono font-bold text-[#1547b8]">
                  {formatRupiah(hoveredData.currentAmount)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {hoveredData.currentTxCount} transaksi
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Rata-rata:</span>
                <span className="font-mono font-bold text-[#0f766e]">
                  {formatRupiah(hoveredData.historicalAverage)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {hoveredData.historicalMonthsCount} bulan pencatatan
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
              {hoveredData.differenceAmount > 0 ? (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Lebih tinggi {formatRupiah(hoveredData.differenceAmount)} dibanding rata-rata
                </span>
              ) : hoveredData.differenceAmount < 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" /> Hemat {formatRupiah(Math.abs(hoveredData.differenceAmount))} dibanding rata-rata
                </span>
              ) : (
                <span className="text-slate-600">Sesuai dengan rata-rata historis bulanan</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Legend & Explanatory Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#1547b8]" />
            <span className="font-medium text-slate-700">
              Pengeluaran Bulan {formatMonthLabel(activePeriodMonth)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#0f766e]" />
            <span className="font-medium text-slate-700">
              Rata-rata Historis ({monthsWithExpenses.length} Bulan: {monthsWithExpenses.map((m) => formatMonthLabel(m).split(' ')[0]).join(', ')})
            </span>
          </span>
          {chartMode === 'deviation' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-rose-500" />
              <span className="font-medium text-slate-700">Di Atas Rata-rata</span>
            </span>
          )}
        </div>

        {onNavigateToTransactions && (
          <button
            type="button"
            onClick={onNavigateToTransactions}
            className="text-xs font-bold text-[#1547b8] hover:underline cursor-pointer text-left sm:text-right"
          >
            Lihat Rincian Buku Pengeluaran Kas →
          </button>
        )}
      </div>
    </section>
  );
};
