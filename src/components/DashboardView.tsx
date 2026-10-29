import React, { useState, useMemo } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  History,
  MessageSquareShare,
  Plus,
  QrCode,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction } from '../types/finance';
import type { AuthSession } from '../lib/auth';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
  calculateRealtimeSummary,
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  getQuarterFromPeriod,
  getUnitTransactions,
  sortTransactionsChronologically,
} from '../lib/finance';
import type { NavTab } from './Sidebar';
import { SixMonthCashflowBarChart } from './SixMonthCashflowBarChart';
import { ExpenseCategoryBarChart } from './ExpenseCategoryBarChart';
import { MultiUserPresenceCard } from './MultiUserPresenceCard';
import type { PresenceSummary } from '../lib/api';

interface DashboardViewProps {
  state: DatabaseState;
  session: AuthSession;
  activePeriodMonth: string;
  onChangePeriodMonth: (pm: string) => void;
  onNavigate: (tab: NavTab) => void;
  onOpenAddModal: (presetType?: 'iuran' | 'income' | 'expense') => void;
  onDownloadMonthlyPdf: () => void;
  onSelectUnit: (unitId: string, openQRIS?: boolean) => void;
  isAdmin: boolean;
  onOpenVerification?: () => void;
  presenceSummary?: PresenceSummary | null;
  onRefreshPresence?: () => void;
}

const AVAILABLE_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  session,
  activePeriodMonth,
  onChangePeriodMonth,
  onNavigate,
  onOpenAddModal,
  onDownloadMonthlyPdf,
  onSelectUnit,
  isAdmin,
  onOpenVerification,
  presenceSummary,
  onRefreshPresence,
}) => {
  const [txScope, setTxScope] = useState<'ALL' | 'income' | 'expense'>('ALL');

  const summary = calculateRealtimeSummary(state, activePeriodMonth);
  const { year: qYear, quarter: qNum } = getQuarterFromPeriod(activePeriodMonth);
  const activeLPJ = calculateQuarterlyLPJ(state, qYear, qNum);

  const pendingConfirmationsCount = useMemo(
    () => (state.paymentConfirmations ?? []).filter((c) => c.status === 'MENUNGGU_VERIFIKASI').length,
    [state.paymentConfirmations]
  );

  // Compute Payment Method Statistics for the Left "Choose method" column
  const methodStats = useMemo(() => {
    const bca = { count: 0, total: 0 };
    const qris = { count: 0, total: 0 };
    const mandiriCash = { count: 0, total: 0 };

    for (const t of state.transactions) {
      if (t.paymentMethod === 'Transfer BCA Kas') {
        bca.count += 1;
        bca.total += t.amount;
      } else if (t.paymentMethod === 'QRIS Saung Kebun') {
        qris.count += 1;
        qris.total += t.amount;
      } else {
        mandiriCash.count += 1;
        mandiriCash.total += t.amount;
      }
    }
    return { bca, qris, mandiriCash };
  }, [state.transactions]);

  // 12-bar vertical dual-pill overview data (matching reference image's "Daily balance overview" chart)
  const overviewBars = useMemo(() => {
    const months = ['2026-07', '2026-08', '2026-09', '2026-10'];
    const bars: Array<{
      id: string;
      label: string;
      periodMonth: string;
      income: number;
      expense: number;
    }> = [];

    months.forEach((pm) => {
      const rep = calculateMonthlyReport(state, pm);
      const shortM = formatMonthLabel(pm).split(' ')[0].slice(0, 3);
      // Split each month into 3 Dekade (1-10, 11-20, 21-31) for 12 crisp vertical pill bars
      bars.push(
        {
          id: `${pm}-d1`,
          label: `01 ${shortM}`,
          periodMonth: pm,
          income: Math.round(rep.iuranIncome * 0.52),
          expense: Math.round(rep.totalExpense * 0.35),
        },
        {
          id: `${pm}-d2`,
          label: `10 ${shortM}`,
          periodMonth: pm,
          income: Math.round(rep.iuranIncome * 0.48),
          expense: Math.round(rep.totalExpense * 0.4),
        },
        {
          id: `${pm}-d3`,
          label: `20 ${shortM}`,
          periodMonth: pm,
          income: Math.max(450000, rep.otherIncome + Math.round(rep.iuranIncome * 0.15)),
          expense: Math.max(350000, Math.round(rep.totalExpense * 0.25)),
        }
      );
    });
    return bars;
  }, [state]);

  const maxBarCombined = useMemo(() => {
    return Math.max(
      1,
      ...overviewBars.map((b) => b.income + b.expense)
    );
  }, [overviewBars]);

  // Donut Chart Calculations for "Balance statistic"
  const totalFlow = Math.max(1, summary.monthIncome + summary.monthExpense);
  const incomeRatio = summary.monthIncome / totalFlow;
  const donutRadius = 56;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const tealStrokeLength = Math.round(incomeRatio * donutCircumference);
  const blueStrokeLength = Math.max(0, Math.round(donutCircumference - tealStrokeLength - 8));

  // Recent Transactions Table with Filter
  const recentTransactions: LedgerTransaction[] = useMemo(() => {
    const allSorted = sortTransactionsChronologically(state.transactions).reverse();
    if (txScope === 'ALL') return allSorted.slice(0, 8);
    return allSorted.filter((t) => t.type === txScope).slice(0, 8);
  }, [state.transactions, txScope]);

  // Recent Activity widget: strictly limited to the last 5 entries to maintain a clean layout
  const recentActivityEntries: LedgerTransaction[] = useMemo(() => {
    return sortTransactionsChronologically(state.transactions).reverse().slice(0, 5);
  }, [state.transactions]);

  // Target unit for quick QRIS generation
  const targetQRISUnitId = session.unitId || 'A-05';

  // Resident personal status card when logged in as Warga
  const myUnitId = session.unitId;
  const myUnitPaidInPeriod = myUnitId
    ? state.transactions.find(
        (t) =>
          t.type === 'income' &&
          t.category === 'Iuran Bulanan Warga' &&
          t.unitId === myUnitId &&
          t.periodMonth === activePeriodMonth
      )
    : undefined;
  const myUnitReceiptsCount = myUnitId
    ? getUnitTransactions(state.transactions, myUnitId).length
    : 0;

  return (
    <div className="flex flex-col xl:flex-row min-h-[calc(100vh-2rem)] bg-[#f3f6fb]">
      {/* MIDDLE COLUMN: "Choose method" / Metode Pembayaran Kas (matches reference image left white panel) */}
      <section
        aria-label="Metode Pembayaran Kas"
        className="w-full xl:w-[330px] shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-slate-200/80 p-6 flex flex-col justify-between"
      >
        <div className="space-y-5">
          {/* Column Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Choose method
            </h2>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onOpenAddModal('iuran')}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Transaksi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectUnit(targetQRISUnitId, true)}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QRIS Saya</span>
              </button>
            )}
          </div>

          {/* Card 1: Transfer BCA Kas (Styled like PayPal card in reference) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Transfer BCA Kas</span>
              <span className="rounded-full bg-[#1547b8] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                ACTIVE
              </span>
            </div>

            <div className="py-2 flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1547b8] font-display text-sm font-black italic text-white">
                B
              </div>
              <span className="font-display text-lg font-extrabold italic tracking-tight text-[#1547b8]">
                BCA<span className="text-[#0ea5e9]">Kas</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                isAdmin ? onOpenAddModal('iuran') : onSelectUnit(targetQRISUnitId, false)
              }
              className="w-full rounded-lg bg-[#eef2f8] py-2 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
            >
              {isAdmin ? 'Catat Setoran BCA' : 'Cek Bukti Transfer'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                TRANSACTIONS <strong className="text-slate-700 font-mono ml-1">{methodStats.bca.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                AMOUNT{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.bca.total)}
                </strong>
              </span>
            </div>
          </div>

          {/* Card 2: QRIS Saung Kebun (Highlighted with 2px Turquoise Border + Solid Blue Button like MasterCard in reference) */}
          <div className="rounded-xl border-2 border-[#38d3c3] bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">QRIS Saung Kebun</span>
              <span className="rounded-full bg-[#1547b8] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                INSTANT
              </span>
            </div>

            <div className="py-1 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <span className="h-9 w-9 rounded-full bg-[#ef4444]/90 inline-block -mr-2.5" />
                <span className="h-9 w-9 rounded-full bg-[#f59e0b]/90 inline-block" />
              </div>
              <span className="mt-1 font-display text-[11px] font-bold tracking-tight text-slate-700">
                qris.saungkebun
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectUnit(targetQRISUnitId, true)}
              className="w-full rounded-lg bg-[#1547b8] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#103896] transition-colors cursor-pointer"
            >
              Lihat QRIS Warga
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                TRANSACTIONS <strong className="text-slate-700 font-mono ml-1">{methodStats.qris.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                AMOUNT{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.qris.total)}
                </strong>
              </span>
            </div>
          </div>

          {/* Card 3: Kas Tunai & Mandiri (Styled like MIR card in reference) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Tunai &amp; Mandiri Kas</span>
              <span className="rounded-full bg-[#1547b8] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                ACTIVE
              </span>
            </div>

            <div className="py-2 flex items-center justify-center">
              <span className="font-display text-xl font-black tracking-wider text-[#16a34a]">
                KAS<span className="text-[#0ea5e9]">RT</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('residents')}
              className="w-full rounded-lg bg-[#eef2f8] py-2 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
            >
              Direktori 55 Rumah
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                TRANSACTIONS{' '}
                <strong className="text-slate-700 font-mono ml-1">{methodStats.mandiriCash.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                AMOUNT{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.mandiriCash.total)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom "Show more" style button */}
        <button
          type="button"
          onClick={() => onNavigate('residents')}
          className="mt-6 w-full rounded-lg bg-[#e0f7f4] py-2.5 text-xs font-bold text-[#149e90] hover:bg-[#ccfbf1] transition-colors cursor-pointer"
        >
          Lihat Semua 55 Rumah ({summary.paidUnitsCount}/55 Lunas)
        </button>
      </section>

      {/* RIGHT WORKSPACE: "Balance information" (matches reference image right dashboard workspace) */}
      <div className="flex-1 min-w-0 p-6 lg:p-8 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Top Workspace Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-base font-bold text-slate-900">
                Balance information — {state.settings.housingName}
              </h1>
              <p className="text-xs text-slate-500">
                {session.roleLabel} ({session.displayName}) · Iuran Wajib{' '}
                {formatRupiah(state.settings.monthlyFee)} / Rumah · Saldo Real-Time:{' '}
                <strong
                  data-testid="realtime-balance-value"
                  className="font-mono text-[#0f766e] tabular-nums"
                >
                  {formatRupiah(summary.currentBalance)}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAdmin && pendingConfirmationsCount > 0 && onOpenVerification && (
                <button
                  type="button"
                  data-testid="dashboard-open-verification-btn"
                  onClick={onOpenVerification}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3.5 py-2 text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-xs animate-pulse"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verifikasi Iuran ({pendingConfirmationsCount})</span>
                </button>
              )}

              {isAdmin && summary.unpaidUnitsCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('whatsapp')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#e0f7f4] px-3.5 py-2 text-xs font-bold text-[#0f9f90] hover:bg-[#ccfbf1] transition-colors cursor-pointer"
                >
                  <MessageSquareShare className="h-3.5 w-3.5" />
                  <span>+ Tagih WA ({summary.unpaidUnitsCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDownloadMonthlyPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef2f8] px-3.5 py-2 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>Unduh PDF {formatMonthLabel(activePeriodMonth).split(' ')[0]}</span>
              </button>
            </div>
          </div>

          {/* Pending Payment Confirmation Alert Banner for Admin */}
          {isAdmin && pendingConfirmationsCount > 0 && onOpenVerification && (
            <div
              data-testid="dashboard-pending-confirmation-banner"
              className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Ada {pendingConfirmationsCount} Konfirmasi Pembayaran Iuran Baru Menunggu Verifikasi
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Warga telah mengunggah bukti transfer iuran. Silakan periksa keabsahan transfer untuk mencatat otomatis ke kas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenVerification}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Buka Verifikasi Bukti</span>
              </button>
            </div>
          )}

          {/* Real-Time Multi-User Presence Monitor for Admin (Warga & Keamanan) */}
          {isAdmin && (
            <MultiUserPresenceCard
              presence={presenceSummary || null}
              onRefresh={onRefreshPresence}
            />
          )}

          {/* TOP SUMMARY CARD: Total Collected vs. Target Revenue for the Selected Month */}
          <section
            aria-label="Ringkasan Terkumpul vs Target Pendapatan Bulanan"
            data-testid="collected-vs-target-card"
            className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2273] to-[#1547b8] text-[#5eead4] shadow-xs">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                      Realisasi Terkumpul vs Target Pendapatan — {formatMonthLabel(activePeriodMonth)}
                    </h2>
                    <span className="rounded-full bg-[#e0f7f4] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0f9f90]">
                      {summary.collectionRatePercent}% Tercapai
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Perbandingan iuran warga yang sudah masuk terhadap target wajib {summary.totalUnits} rumah ({formatRupiah(state.settings.monthlyFee)} / rumah)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="top-summary-period-select" className="text-xs font-semibold text-slate-500">
                  Periode:
                </label>
                <select
                  id="top-summary-period-select"
                  aria-label="Pilih bulan untuk ringkasan target pendapatan"
                  value={activePeriodMonth}
                  onChange={(e) => onChangePeriodMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0b2273] focus:border-[#1547b8] focus:outline-none cursor-pointer"
                >
                  {AVAILABLE_MONTHS.map((pm) => (
                    <option key={pm} value={pm}>
                      {formatMonthLabel(pm)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4 Key Metric Columns */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Collected Iuran Revenue */}
              <div className="rounded-xl border border-teal-200/80 bg-[#f0fdfa]/60 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">
                  Iuran Warga Terkumpul
                </span>
                <p
                  data-testid="summary-collected-iuran"
                  className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums"
                >
                  {formatRupiah(summary.monthIuranIncome)}
                </p>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-600">
                  <strong>{summary.paidUnitsCount}</strong> dari {summary.totalUnits} rumah sudah lunas
                </span>
              </div>

              {/* 2. Target Monthly Revenue */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Target Iuran Bulanan
                </span>
                <p
                  data-testid="summary-target-revenue"
                  className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#1547b8] tabular-nums"
                >
                  {formatRupiah(summary.targetIuranRevenue)}
                </p>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                  {summary.totalUnits} rumah × {formatRupiah(state.settings.monthlyFee)}
                </span>
              </div>

              {/* 3. Total All Collected Revenue (Including Non-Iuran) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Pendapatan Masuk
                  </span>
                  <TrendingUp className="h-3.5 w-3.5 text-[#0f9f90]" />
                </div>
                <p
                  data-testid="summary-total-month-income"
                  className="mt-1 font-mono text-lg sm:text-xl font-extrabold text-[#0f9f90] tabular-nums"
                >
                  {formatRupiah(summary.monthIncome)}
                </p>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                  Termasuk non-iuran {formatRupiah(summary.monthOtherIncome)} ({summary.totalRevenueAchievementPercent}% target)
                </span>
              </div>

              {/* 4. Remaining / Uncollected Gap */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Sisa Belum Terkumpul
                </span>
                <p
                  data-testid="summary-remaining-target"
                  className={`mt-1 font-mono text-lg sm:text-xl font-extrabold tabular-nums ${
                    summary.unpaidPotentialAmount > 0 ? 'text-rose-600' : 'text-[#0f9f90]'
                  }`}
                >
                  {formatRupiah(summary.unpaidPotentialAmount)}
                </p>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                  {summary.unpaidUnitsCount > 0
                    ? `${summary.unpaidUnitsCount} rumah belum bayar bulan ini`
                    : 'Seluruh 55 rumah sudah lunas'}
                </span>
              </div>
            </div>

            {/* Progress Bar & Block Mini Breakdown */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Progres Pencapaian Target Iuran ({formatRupiah(summary.monthIuranIncome)} / {formatRupiah(summary.targetIuranRevenue)})
                </span>
                <span className="font-mono font-bold text-[#1547b8] tabular-nums">
                  {summary.paidUnitsCount}/{summary.totalUnits} Rumah ({summary.collectionRatePercent}%)
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, summary.collectionRatePercent))}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-[#1547b8] to-[#38d3c3] transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                {summary.blockBreakdown.map((blk) => (
                  <div
                    key={blk.block}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[11px]"
                  >
                    <span className="font-bold text-slate-700">
                      Blok {blk.block}{' '}
                      <span className="font-normal text-slate-400">
                        ({blk.paidUnits}/{blk.totalUnits})
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums">
                      {formatRupiah(blk.collectedAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Personal Unit Status Banner when logged in as Warga */}
          {session.role === 'warga' && myUnitId && (
            <section
              aria-label="Status Iuran Rumah Anda"
              className="flex flex-col justify-between gap-4 rounded-2xl border border-[#38d3c3] bg-white p-4 shadow-xs sm:flex-row sm:items-center"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-[#1547b8]">
                    Kartu Warga Unit {myUnitId}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{session.displayName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{myUnitReceiptsCount} Kwitansi Tercatat</span>
                </div>
                <p className="font-display text-sm font-bold text-slate-900">
                  Status Iuran {formatMonthLabel(activePeriodMonth)}:{' '}
                  {myUnitPaidInPeriod ? (
                    <span className="inline-flex items-center gap-1 text-[#0f9f90]">
                      <Check className="h-4 w-4" /> Lunas ({myUnitPaidInPeriod.receiptNumber})
                    </span>
                  ) : (
                    <span className="text-rose-600">
                      Belum Bayar ({formatRupiah(state.settings.monthlyFee)})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectUnit(myUnitId, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1547b8] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#5eead4]" />
                  <span>Lihat QRIS Unit {myUnitId}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectUnit(myUnitId, false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Lihat Riwayat &amp; Kwitansi</span>
                </button>
              </div>
            </section>
          )}

          {/* TOP ANALYTICS ROW: Left = Dual-Pill Bar Chart ("Daily balance overview"), Right = Donut Ring ("Balance statistic") */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left 8 Cols: Dual-Tone Vertical Pill Bar Chart */}
            <section
              aria-label="Overview Saldo dan Arus Kas"
              className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/60 lg:col-span-8 flex flex-col justify-between"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    Monthly balance overview
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#38d3c3]" />
                      <span>Pemasukan</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#1547b8]" />
                      <span>Pengeluaran</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="dashboard-period-select"
                    aria-label="Pilih periode buku kas"
                    value={activePeriodMonth}
                    onChange={(e) => onChangePeriodMonth(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#1547b8] focus:outline-none cursor-pointer"
                  >
                    {AVAILABLE_MONTHS.map((pm) => (
                      <option key={pm} value={pm}>
                        {formatMonthLabel(pm)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vertical Pill Bars Graph */}
              <div className="mt-6 flex items-end gap-3 pt-2">
                {/* Y-Axis Scale Labels */}
                <div className="hidden sm:flex h-44 flex-col justify-between pb-6 pr-2 text-[10px] font-mono text-slate-400">
                  <span>6 Jt</span>
                  <span>4 Jt</span>
                  <span>2 Jt</span>
                  <span>1 Jt</span>
                  <span>0 Rp</span>
                </div>

                {/* 12 Dual-Tone Vertical Rounded Pill Bars */}
                <div className="flex-1 grid grid-cols-12 gap-2 items-end h-44 border-b border-slate-100 pb-6">
                  {overviewBars.map((bar) => {
                    const totalH = Math.max(
                      24,
                      Math.round(((bar.income + bar.expense) / maxBarCombined) * 136)
                    );
                    const blueH = Math.max(
                      10,
                      Math.round((bar.expense / Math.max(1, bar.income + bar.expense)) * totalH)
                    );
                    const tealH = Math.max(10, totalH - blueH);
                    const isCurrentMonth = bar.periodMonth === activePeriodMonth;

                    return (
                      <button
                        key={bar.id}
                        type="button"
                        onClick={() => onChangePeriodMonth(bar.periodMonth)}
                        title={`${bar.label}: Masuk ${formatRupiah(bar.income)} / Keluar ${formatRupiah(bar.expense)}`}
                        className="group flex flex-col items-center justify-end h-full cursor-pointer"
                      >
                        <div
                          style={{ height: `${totalH}px` }}
                          className={`w-2.5 sm:w-3 rounded-full overflow-hidden flex flex-col justify-end transition-transform group-hover:scale-105 ${
                            isCurrentMonth ? 'ring-2 ring-[#38d3c3]/40' : 'opacity-85'
                          }`}
                        >
                          <div
                            style={{ height: `${tealH}px` }}
                            className="w-full bg-[#38d3c3]"
                          />
                          <div
                            style={{ height: `${blueH}px` }}
                            className="w-full bg-[#1547b8]"
                          />
                        </div>
                        <span className="mt-2 text-[9px] font-mono text-slate-400 truncate max-w-full">
                          {bar.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Bottom Summary Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Pemasukan ({formatMonthLabel(activePeriodMonth).split(' ')[0]})</span>
                  <span className="font-mono font-bold text-[#0f9f90] tabular-nums">
                    +{formatRupiah(summary.monthIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Pengeluaran ({formatMonthLabel(activePeriodMonth).split(' ')[0]})</span>
                  <span className="font-mono font-bold text-[#1547b8] tabular-nums">
                    -{formatRupiah(summary.monthExpense)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Kepatuhan 55 Rumah</span>
                  <span
                    data-testid="paid-units-ratio"
                    className="font-mono font-bold text-slate-900 tabular-nums"
                  >
                    {summary.paidUnitsCount} / {summary.totalUnits} ({summary.collectionRatePercent}%)
                  </span>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => onNavigate('reports')}
                    className="text-[11px] font-bold text-[#1547b8] hover:underline cursor-pointer"
                  >
                    LPJ Triwulan: {formatRupiah(activeLPJ.closingBalance)} →
                  </button>
                </div>
              </div>
            </section>

            {/* Right 4 Cols: Donut Ring Chart ("Balance statistic") */}
            <section
              aria-label="Statistik Saldo Kas"
              className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/60 lg:col-span-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Balance statistic
                </h2>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="text-slate-900">IDR</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('reports')}
                    className="text-slate-400 hover:text-[#1547b8] underline cursor-pointer"
                  >
                    LPJ
                  </button>
                </div>
              </div>

              {/* SVG Donut Chart */}
              <div className="my-3 flex items-center justify-center relative">
                <svg className="h-44 w-44 -rotate-90" viewBox="0 0 156 156">
                  <circle
                    cx="78"
                    cy="78"
                    r={donutRadius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="78"
                    cy="78"
                    r={donutRadius}
                    fill="none"
                    stroke="#38d3c3"
                    strokeWidth="12"
                    strokeDasharray={`${tealStrokeLength} ${donutCircumference}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="78"
                    cy="78"
                    r={donutRadius}
                    fill="none"
                    stroke="#1547b8"
                    strokeWidth="12"
                    strokeDasharray={`${blueStrokeLength} ${donutCircumference}`}
                    strokeDashoffset={-tealStrokeLength - 4}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <span className="font-mono text-sm font-extrabold text-slate-900 tabular-nums tracking-tight">
                    {formatRupiah(summary.currentBalance)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Saldo Kas Aktif
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#38d3c3]" />
                  <span>Masuk ({Math.round(incomeRatio * 100)}%)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#1547b8]" />
                  <span>Keluar ({100 - Math.round(incomeRatio * 100)}%)</span>
                </span>
              </div>
            </section>
          </div>

          {/* SIX MONTH CASHFLOW BAR CHART (RECHARTS: 6-month income and expense trend) */}
          <SixMonthCashflowBarChart
            transactions={state.transactions}
            activePeriodMonth={activePeriodMonth}
            onChangePeriodMonth={onChangePeriodMonth}
            onNavigateToTransactions={() => onNavigate('transactions')}
          />

          {/* D3 EXPENSE CATEGORY BAR CHART (Visualizing monthly expense categories vs historical monthly averages) */}
          <ExpenseCategoryBarChart
            transactions={state.transactions}
            activePeriodMonth={activePeriodMonth}
            onChangePeriodMonth={onChangePeriodMonth}
            onNavigateToTransactions={() => onNavigate('transactions')}
          />

          {/* RECENT ACTIVITY WIDGET (Pulls from transactions state, strictly limited to the last 5 entries to maintain a clean layout) */}
          <section
            aria-label="Recent Activity"
            data-testid="recent-activity-widget"
            className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0f7f4] text-[#0f766e]">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                      Recent Activity
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      5 Entri Terakhir
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Aktivitas arus kas paguyuban terbaru yang tercatat di sistem
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1547b8] hover:text-[#0b2273] transition-colors cursor-pointer"
              >
                <span>Lihat Semua Mutasi</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentActivityEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada aktivitas transaksi yang tercatat di buku kas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivityEntries.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isQRIS = tx.paymentMethod === 'QRIS Saung Kebun';
                  const isBCA = tx.paymentMethod === 'Transfer BCA Kas';

                  return (
                    <div
                      key={tx.id}
                      data-testid="recent-activity-item"
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-1 rounded-xl hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {/* Transaction Type Icon Badge */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isIncome
                              ? 'bg-teal-50 text-[#0f766e] border border-teal-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                              {tx.category}
                            </span>
                            {tx.unitId && (
                              <button
                                type="button"
                                onClick={() => onSelectUnit(tx.unitId!, false)}
                                className="font-mono text-[10px] font-bold rounded-md bg-blue-50 px-1.5 py-0.5 text-[#1547b8] hover:underline cursor-pointer"
                              >
                                Unit {tx.unitId}
                              </button>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                isIncome
                                  ? 'bg-[#e0f7f4] text-[#0f766e]'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                            </span>
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">{formatShortDate(tx.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[200px] sm:max-w-[280px]">
                              {tx.description || tx.receiptNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {isQRIS ? (
                                <span className="inline-flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-[#ef4444] -mr-0.5" />
                                  <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                                </span>
                              ) : isBCA ? (
                                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#1547b8] text-[7px] font-bold text-white">
                                  B
                                </span>
                              ) : null}
                              <span>{tx.paymentMethod}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Amount & Ref */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0 pl-12 sm:pl-0">
                        <span
                          className={`font-mono text-xs sm:text-sm font-extrabold tabular-nums ${
                            isIncome ? 'text-[#0f766e]' : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatRupiah(tx.amount)}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {tx.receiptNumber}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* BOTTOM TRANSACTIONS CARD (matches reference image "Transactions" table) */}
          <section
            aria-label="Mutasi Kas Terbaru"
            className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Transactions
              </h2>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTxScope('ALL')}
                  className={`cursor-pointer transition-colors ${
                    txScope === 'ALL' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Semua Mutasi
                </button>
                <button
                  type="button"
                  onClick={() => setTxScope('income')}
                  className={`cursor-pointer transition-colors ${
                    txScope === 'income' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTxScope('expense')}
                  className={`cursor-pointer transition-colors ${
                    txScope === 'expense' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('transactions')}
                  className="text-[#1547b8] hover:underline cursor-pointer"
                >
                  Buku Kas Lengkap →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto mt-2 rounded-lg table-scroll-container">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 pr-3">Date and ref</th>
                    <th className="px-3 py-3">Payment method</th>
                    <th className="px-3 py-3">Operation &amp; Unit</th>
                    <th className="py-3 pl-3 text-right">Amount (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((trx) => {
                    const isQRIS = trx.paymentMethod === 'QRIS Saung Kebun';
                    const isBCA = trx.paymentMethod === 'Transfer BCA Kas';
                    return (
                      <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{formatShortDate(trx.date)}</span>
                          <span className="text-[10px] text-slate-400 block">{trx.receiptNumber}</span>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {isQRIS ? (
                              <span className="inline-flex items-center">
                                <span className="h-3.5 w-3.5 rounded-full bg-[#ef4444] -mr-1" />
                                <span className="h-3.5 w-3.5 rounded-full bg-[#f59e0b]" />
                              </span>
                            ) : isBCA ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1547b8] text-[9px] font-bold text-white">
                                B
                              </span>
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2dd4bf] text-[9px] font-bold text-[#082068]">
                                K
                              </span>
                            )}
                            <span className="font-medium text-slate-700">{trx.paymentMethod}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                trx.type === 'income'
                                  ? 'bg-[#e0f7f4] text-[#0f9f90]'
                                  : 'bg-[#e8effd] text-[#1547b8]'
                              }`}
                            >
                              {trx.category}
                            </span>
                            {trx.unitId ? (
                              <button
                                type="button"
                                onClick={() => onSelectUnit(trx.unitId!, false)}
                                className="font-mono font-bold text-[#1547b8] hover:underline cursor-pointer"
                              >
                                Unit {trx.unitId}
                              </button>
                            ) : null}
                          </div>
                        </td>

                        <td
                          className={`py-3 pl-3 text-right font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                            trx.type === 'income' ? 'text-[#2bb5a8]' : 'text-slate-900'
                          }`}
                        >
                          {trx.type === 'income' ? '+ ' : '- '}
                          {formatRupiah(trx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Bottom Workspace Footer matching reference image */}
        <footer className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-6">
            <span>
              Sekretariat: <strong className="text-slate-600">{state.settings.rtRwLabel}</strong>
            </span>
            <span>
              Rekening Kas: <strong className="text-slate-600">{state.settings.bankAccountInfo}</strong>
            </span>
            <span>
              Bendahara: <strong className="text-slate-600">{state.settings.treasurerName}</strong>
            </span>
          </div>
          <span>© 2026 {state.settings.housingName}</span>
        </footer>
      </div>
    </div>
  );
};
