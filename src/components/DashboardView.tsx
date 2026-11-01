import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileDown,
  Filter,
  History,
  Layers,
  MessageSquareShare,
  Phone,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { DatabaseState, LedgerTransaction, ResidentUnit } from '../types/finance';
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
  getUnpaidResidentsForBilling,
  isUnitExemptFromIuran,
  sortTransactionsChronologically,
  type UnpaidResidentBillingItem,
} from '../lib/finance';
import type { NavTab } from './Sidebar';
import { SixMonthCashflowBarChart } from './SixMonthCashflowBarChart';
import { ExpenseCategoryBarChart } from './ExpenseCategoryBarChart';
import { MultiUserPresenceCard } from './MultiUserPresenceCard';
import { StrukturPengurusTable } from './StrukturPengurusTable';
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
  // Mobile segment tab: 'ringkasan' | 'grafik' | 'mutasi'
  const [mobileTab, setMobileTab] = useState<'ringkasan' | 'grafik' | 'mutasi'>('ringkasan');
  // Overdue units status filter: 'OVERDUE_MULTI' | 'ALL' | 'UNPAID' | 'PAID'
  const [unitStatusFilter, setUnitStatusFilter] = useState<'OVERDUE_MULTI' | 'ALL' | 'UNPAID' | 'PAID'>('OVERDUE_MULTI');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [isMultiArrearsExpanded, setIsMultiArrearsExpanded] = useState(true);
  const [pengurusModalOpen, setPengurusModalOpen] = useState(false);

  const summary = calculateRealtimeSummary(state, activePeriodMonth);
  const { year: qYear, quarter: qNum } = getQuarterFromPeriod(activePeriodMonth);
  const activeLPJ = calculateQuarterlyLPJ(state, qYear, qNum);

  const pendingConfirmationsCount = useMemo(
    () => (state.paymentConfirmations ?? []).filter((c) => c.status === 'MENUNGGU_VERIFIKASI').length,
    [state.paymentConfirmations]
  );

  // Compute unpaid billing list up to and including the active period
  const unpaidBillingList = useMemo(
    () => getUnpaidResidentsForBilling(state, activePeriodMonth),
    [state, activePeriodMonth]
  );

  // Filter units with arrears > 1 month (unpaidMonths.length > 1)
  const multiMonthArrearsUnits = useMemo(
    () => unpaidBillingList.filter((item) => item.unpaidMonths.length > 1),
    [unpaidBillingList]
  );

  // Map of unitId -> UnpaidResidentBillingItem for fast lookup
  const multiMonthArrearsMap = useMemo(() => {
    const map = new Map<string, UnpaidResidentBillingItem>();
    for (const item of multiMonthArrearsUnits) {
      map.set(item.resident.id, item);
    }
    return map;
  }, [multiMonthArrearsUnits]);

  // Map of all unpaid items for unit lookup
  const billingByUnitId = useMemo(() => {
    const map = new Map<string, UnpaidResidentBillingItem>();
    for (const item of unpaidBillingList) {
      map.set(item.resident.id, item);
    }
    return map;
  }, [unpaidBillingList]);

  // Total amount overdue by multi-month arrears
  const totalMultiMonthArrearsAmount = useMemo(
    () => multiMonthArrearsUnits.reduce((acc, curr) => acc + curr.totalArrears, 0),
    [multiMonthArrearsUnits]
  );

  // Filtered residents for the 55-unit visual status grid
  const filteredGridUnits = useMemo(() => {
    const q = unitSearchQuery.trim().toLowerCase();
    return state.residents.filter((res) => {
      const isExempt = isUnitExemptFromIuran(res.id);
      const isOverdueMulti = multiMonthArrearsMap.has(res.id);
      const isUnpaid = billingByUnitId.has(res.id);

      if (unitStatusFilter === 'OVERDUE_MULTI' && !isOverdueMulti) return false;
      if (unitStatusFilter === 'UNPAID' && (isExempt || !isUnpaid)) return false;
      if (unitStatusFilter === 'PAID' && (isExempt || isUnpaid)) return false;

      if (!q) return true;
      return (
        res.id.toLowerCase().includes(q) ||
        res.headOfFamily.toLowerCase().includes(q) ||
        res.block.toLowerCase().includes(q)
      );
    });
  }, [state.residents, unitStatusFilter, unitSearchQuery, multiMonthArrearsMap, billingByUnitId]);

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
    <div className="flex flex-col xl:flex-row min-h-[calc(100vh-2rem)] bg-[#f3f6fb] pb-24 xl:pb-6">
      {/* ========================================================================= */}
      {/* DESKTOP LEFT COLUMN: "Choose method" / Metode Pembayaran Kas             */}
      {/* Hidden on mobile summary/chart tabs to eliminate visual overload         */}
      {/* Displayed on mobile when 'mutasi' tab is active, or full side on desktop */}
      {/* ========================================================================= */}
      <section
        aria-label="Metode Pembayaran Kas"
        className={`${
          mobileTab === 'mutasi' ? 'flex' : 'hidden'
        } xl:flex order-2 xl:order-1 w-full xl:w-[320px] shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-slate-200/80 p-4 sm:p-6 flex-col justify-between space-y-6`}
      >
        <div className="space-y-4">
          {/* Column Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Metode Kas Lingkungan
              </h2>
              <p className="text-[11px] text-slate-400">Pilihan kanal setor &amp; iuran</p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onOpenAddModal('iuran')}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer min-h-[38px]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Catat</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectUnit(targetQRISUnitId, true)}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer min-h-[38px]"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QRIS Saya</span>
              </button>
            )}
          </div>

          {/* Card 1: Transfer BCA Kas */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Transfer BCA Kas</span>
              <span className="rounded-full bg-[#1547b8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                ACTIVE
              </span>
            </div>

            <div className="py-1 flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1547b8] font-display text-sm font-black italic text-white">
                B
              </div>
              <span className="font-display text-base font-extrabold italic tracking-tight text-[#1547b8]">
                BCA<span className="text-[#0ea5e9]">Kas</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                isAdmin ? onOpenAddModal('iuran') : onSelectUnit(targetQRISUnitId, false)
              }
              className="w-full rounded-lg bg-[#eef2f8] py-2 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer min-h-[40px]"
            >
              {isAdmin ? 'Catat Setoran BCA' : 'Cek Bukti Transfer'}
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                MUTASI <strong className="text-slate-700 font-mono ml-1">{methodStats.bca.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                TOTAL{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.bca.total)}
                </strong>
              </span>
            </div>
          </div>

          {/* Card 2: QRIS Saung Kebun */}
          <div className="rounded-xl border-2 border-[#38d3c3] bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">QRIS Saung Kebun</span>
              <span className="rounded-full bg-[#1547b8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                INSTANT
              </span>
            </div>

            <div className="py-1 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <span className="h-8 w-8 rounded-full bg-[#ef4444]/90 inline-block -mr-2" />
                <span className="h-8 w-8 rounded-full bg-[#f59e0b]/90 inline-block" />
              </div>
              <span className="mt-1 font-display text-[11px] font-bold tracking-tight text-slate-700">
                qris.saungkebun
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectUnit(targetQRISUnitId, true)}
              className="w-full rounded-lg bg-[#1547b8] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#103896] transition-colors cursor-pointer min-h-[40px]"
            >
              Lihat QRIS Warga
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                MUTASI <strong className="text-slate-700 font-mono ml-1">{methodStats.qris.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                TOTAL{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.qris.total)}
                </strong>
              </span>
            </div>
          </div>

          {/* Card 3: Kas Tunai & Mandiri */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Tunai Kas RT</span>
              <span className="rounded-full bg-[#1547b8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                ACTIVE
              </span>
            </div>

            <div className="py-1 flex items-center justify-center">
              <span className="font-display text-lg font-black tracking-wider text-[#16a34a]">
                KAS<span className="text-[#0ea5e9]">RT</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('residents')}
              className="w-full rounded-lg bg-[#eef2f8] py-2 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer min-h-[40px]"
            >
              Direktori 55 Rumah
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
              <span className="uppercase tracking-wider text-slate-400">
                MUTASI{' '}
                <strong className="text-slate-700 font-mono ml-1">{methodStats.mandiriCash.count}</strong>
              </span>
              <span className="uppercase tracking-wider text-slate-400">
                TOTAL{' '}
                <strong className="text-slate-900 font-mono tabular-nums ml-1">
                  {formatRupiah(methodStats.mandiriCash.total)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom "Show more" button */}
        <button
          type="button"
          onClick={() => onNavigate('residents')}
          className="w-full rounded-lg bg-[#e0f7f4] py-2.5 text-xs font-bold text-[#149e90] hover:bg-[#ccfbf1] transition-colors cursor-pointer min-h-[40px]"
        >
          Lihat Semua 55 Rumah ({summary.paidUnitsCount}/55 Lunas)
        </button>
      </section>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE: "Balance information" & Financial Intelligence           */}
      {/* ========================================================================= */}
      <div className="order-1 xl:order-2 flex-1 min-w-0 p-3 sm:p-5 lg:p-7 flex flex-col justify-between space-y-5">
        <div className="space-y-4 sm:space-y-5">
          {/* Top Workspace Header (Responsive: Mobile clean stack, Desktop executive row) */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="font-display text-sm sm:text-base font-bold text-slate-900">
                  {state.settings.housingName}
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {state.settings.rtRwLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {session.roleLabel} ({session.displayName}) · Iuran Wajib{' '}
                {formatRupiah(state.settings.monthlyFee)} / Rumah
              </p>
              <div className="pt-1 flex items-baseline gap-2">
                <span className="text-xs text-slate-500">Saldo Kas Real-Time:</span>
                <span
                  data-testid="realtime-balance-value"
                  className="font-mono text-xl sm:text-2xl font-black text-[#0f766e] tabular-nums tracking-tight"
                >
                  {formatRupiah(summary.currentBalance)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && pendingConfirmationsCount > 0 && onOpenVerification && (
                <button
                  type="button"
                  data-testid="dashboard-open-verification-btn"
                  onClick={onOpenVerification}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-white px-3.5 py-2.5 text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-xs animate-pulse min-h-[44px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verifikasi Iuran ({pendingConfirmationsCount})</span>
                </button>
              )}

              {isAdmin && summary.unpaidUnitsCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('whatsapp')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#e0f7f4] px-3.5 py-2.5 text-xs font-bold text-[#0f9f90] hover:bg-[#ccfbf1] transition-colors cursor-pointer min-h-[44px]"
                >
                  <MessageSquareShare className="h-4 w-4" />
                  <span>Tagih WA ({summary.unpaidUnitsCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDownloadMonthlyPdf}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef2f8] px-3.5 py-2.5 text-xs font-bold text-[#1547b8] hover:bg-[#e2e8f0] transition-colors cursor-pointer min-h-[44px]"
              >
                <FileDown className="h-4 w-4" />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setPengurusModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-3.5 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer min-h-[44px]"
                title="Buka Bagan & Tabel Struktur Kepengurusan Saung Kebun"
              >
                <Users className="h-4 w-4 text-teal-700" />
                <span>Struktur Pengurus</span>
              </button>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* MOBILE SEGMENTED VIEW SWITCHER: Eliminates vertical overload on phones */}
          {/* ======================================================================= */}
          <div
            data-testid="mobile-segment-tabs"
            className="block xl:hidden rounded-xl bg-slate-200/70 p-1 flex items-center gap-1 text-xs font-bold"
          >
            <button
              type="button"
              onClick={() => setMobileTab('ringkasan')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                mobileTab === 'ringkasan'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4 text-[#1547b8]" />
              <span>Ringkasan</span>
              {multiMonthArrearsUnits.length > 0 && (
                <span className="rounded-full bg-rose-600 text-white text-[9px] px-1.5 py-0.5 font-bold animate-pulse">
                  {multiMonthArrearsUnits.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('grafik')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                mobileTab === 'grafik'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#0f9f90]" />
              <span>Grafik Kas</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('mutasi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all min-h-[44px] cursor-pointer ${
                mobileTab === 'mutasi'
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 text-[#0b2273]" />
              <span>Mutasi &amp; Kas</span>
            </button>
          </div>

          {/* ======================================================================= */}
          {/* MULTI-MONTH ARREARS ALERT BANNER & BADGE NOTIFICATION                   */}
          {/* Prominently highlights units overdue > 1 month for easy monitoring      */}
          {/* ======================================================================= */}
          {multiMonthArrearsUnits.length > 0 && (
            <div
              data-testid="multi-month-arrears-banner"
              className="rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      data-testid="multi-month-arrears-badge"
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-xs"
                    >
                      ⚠️ PERINGATAN: {multiMonthArrearsUnits.length} UNIT MENUNGGAK &gt; 1 BULAN
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                      Total Tunggakan: {formatRupiah(totalMultiMonthArrearsAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-rose-950 font-medium">
                    Terdapat {multiMonthArrearsUnits.length} unit rumah yang menunggak iuran lebih dari 1 bulan. Pantau rincian unit di bawah untuk melakukan penagihan intensif.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileTab('ringkasan');
                    setUnitStatusFilter('OVERDUE_MULTI');
                    setIsMultiArrearsExpanded(true);
                    const el = document.getElementById('overdue-monitoring-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pantau {multiMonthArrearsUnits.length} Unit</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('whatsapp')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <MessageSquareShare className="w-4 h-4 text-emerald-600" />
                    <span>Tagih Massal WA</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer shrink-0 min-h-[44px]"
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

          {/* ======================================================================= */}
          {/* SECTION A: RINGKASAN & TUNGGAKAN                                       */}
          {/* Always shown on desktop; shown on mobile when mobileTab === 'ringkasan' */}
          {/* ======================================================================= */}
          <div className={`${mobileTab === 'ringkasan' ? 'block' : 'hidden'} xl:block space-y-5`}>
            {/* DEDICATED OVERDUE MONITORING WIDGET (> 1 BULAN) */}
            {multiMonthArrearsUnits.length > 0 && (
              <section
                id="overdue-monitoring-section"
                aria-label="Daftar Unit Menunggak Lebih Dari 1 Bulan"
                data-testid="multi-month-arrears-list"
                className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border-2 border-rose-300 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-rose-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                          Unit Menunggak Iuran &gt; 1 Bulan
                        </h2>
                        <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold">
                          {multiMonthArrearsUnits.length} Unit
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Daftar unit yang memiliki akumulasi tunggakan lebih dari 1 periode berjalan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMultiArrearsExpanded(!isMultiArrearsExpanded)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <span>{isMultiArrearsExpanded ? 'Sembunyikan' : 'Tampilkan'}</span>
                      {isMultiArrearsExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isMultiArrearsExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {multiMonthArrearsUnits.map((item) => (
                      <div
                        key={item.resident.id}
                        data-testid="multi-month-arrears-card"
                        className="rounded-xl border-2 border-rose-300 bg-rose-50/50 p-4 space-y-3 hover:border-rose-400 hover:shadow-xs transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded shadow-2xs">
                                  {item.resident.id}
                                </span>
                                <span className="font-bold text-xs text-slate-900 truncate max-w-[130px]">
                                  {item.resident.headOfFamily}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Blok {item.resident.block} · Unit {item.resident.id}
                              </p>
                            </div>

                            <span className="rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black px-2 py-0.5 shrink-0 whitespace-nowrap">
                              ⚠️ {item.unpaidMonths.length} Bln
                            </span>
                          </div>

                          <div className="rounded-lg bg-white/90 border border-rose-200/80 p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 text-[11px]">Total Tunggakan:</span>
                              <span className="font-mono font-extrabold text-rose-600 tabular-nums">
                                {formatRupiah(item.totalArrears)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <span className="font-semibold text-slate-700">Periode: </span>
                              <span>{item.unpaidLabels.join(', ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-rose-200/60">
                          <a
                            href={item.waWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-2 text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[40px]"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" />
                            <span>Tagih WA</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => onSelectUnit(item.resident.id, false)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1547b8] hover:bg-[#103896] text-white py-2 px-2 text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[40px]"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#5eead4]" />
                            <span>Bayar / QRIS</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TOP SUMMARY CARD: Total Collected vs. Target Revenue */}
            <section
              aria-label="Ringkasan Terkumpul vs Target Pendapatan Bulanan"
              data-testid="collected-vs-target-card"
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2273] to-[#1547b8] text-[#5eead4] shadow-xs">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                        Target &amp; Realisasi Iuran — {formatMonthLabel(activePeriodMonth)}
                      </h2>
                      <span className="rounded-full bg-[#e0f7f4] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0f9f90]">
                        {summary.collectionRatePercent}% Tercapai
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {summary.totalUnits} rumah wajib iuran @ {formatRupiah(state.settings.monthlyFee)}
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
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0b2273] focus:border-[#1547b8] focus:outline-none cursor-pointer min-h-[40px]"
                  >
                    {AVAILABLE_MONTHS.map((pm) => (
                      <option key={pm} value={pm}>
                        {formatMonthLabel(pm)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 Key Metric Columns (Responsive: 2x2 on mobile, 4 columns on large screens) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {/* 1. Collected Iuran Revenue */}
                <div className="rounded-xl border border-teal-200/80 bg-[#f0fdfa]/60 p-3 sm:p-3.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">
                    Iuran Terkumpul
                  </span>
                  <p
                    data-testid="summary-collected-iuran"
                    className="mt-1 font-mono text-base sm:text-xl font-extrabold text-slate-900 tabular-nums"
                  >
                    {formatRupiah(summary.monthIuranIncome)}
                  </p>
                  <span className="mt-0.5 block text-[10px] sm:text-[11px] font-medium text-slate-600">
                    <strong>{summary.paidUnitsCount}</strong>/{summary.totalUnits} lunas
                  </span>
                </div>

                {/* 2. Target Monthly Revenue */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Target Iuran
                  </span>
                  <p
                    data-testid="summary-target-revenue"
                    className="mt-1 font-mono text-base sm:text-xl font-extrabold text-[#1547b8] tabular-nums"
                  >
                    {formatRupiah(summary.targetIuranRevenue)}
                  </p>
                  <span className="mt-0.5 block text-[10px] sm:text-[11px] font-medium text-slate-500">
                    {summary.totalUnits} unit rumah
                  </span>
                </div>

                {/* 3. Total All Collected Revenue */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Total Kas Masuk
                    </span>
                    <TrendingUp className="h-3 w-3 text-[#0f9f90]" />
                  </div>
                  <p
                    data-testid="summary-total-month-income"
                    className="mt-1 font-mono text-base sm:text-xl font-extrabold text-[#0f9f90] tabular-nums"
                  >
                    {formatRupiah(summary.monthIncome)}
                  </p>
                  <span className="mt-0.5 block text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                    + Non-iuran {formatRupiah(summary.monthOtherIncome)}
                  </span>
                </div>

                {/* 4. Remaining / Uncollected Gap */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-3.5">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Sisa Belum Masuk
                  </span>
                  <p
                    data-testid="summary-remaining-target"
                    className={`mt-1 font-mono text-base sm:text-xl font-extrabold tabular-nums ${
                      summary.unpaidPotentialAmount > 0 ? 'text-rose-600' : 'text-[#0f9f90]'
                    }`}
                  >
                    {formatRupiah(summary.unpaidPotentialAmount)}
                  </p>
                  <span className="mt-0.5 block text-[10px] sm:text-[11px] font-medium text-slate-500">
                    {summary.unpaidUnitsCount > 0
                      ? `${summary.unpaidUnitsCount} unit belum lunas`
                      : 'Semua unit lunas'}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Mini Breakdown */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Progres Penerimaan ({formatRupiah(summary.monthIuranIncome)} / {formatRupiah(summary.targetIuranRevenue)})
                  </span>
                  <span className="font-mono font-bold text-[#1547b8] tabular-nums">
                    {summary.paidUnitsCount}/{summary.totalUnits} Rumah ({summary.collectionRatePercent}%)
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, summary.collectionRatePercent))}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#1547b8] to-[#38d3c3] transition-all duration-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  {summary.blockBreakdown.map((blk) => (
                    <div
                      key={blk.block}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px]"
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

            {/* INTERACTIVE 55 UNIT MONITORING STATUS GRID WITH ARREARS HIGHLIGHT */}
            <section
              aria-label="Peta Status Iuran 55 Unit Rumah"
              data-testid="dashboard-unit-grid"
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm sm:text-base font-bold text-slate-900">
                      Peta Status Iuran 55 Rumah
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Blok B1 - B10
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Klik nomor unit untuk membuka QRIS atau rincian pembayaran warga
                  </p>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUnitStatusFilter('OVERDUE_MULTI')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer min-h-[36px] ${
                      unitStatusFilter === 'OVERDUE_MULTI'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <span>⚠️ Menunggak &gt; 1 Bln</span>
                    <span className="rounded-full bg-white text-rose-700 px-1.5 py-0.2 text-[10px]">
                      {multiMonthArrearsUnits.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnitStatusFilter('UNPAID')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                      unitStatusFilter === 'UNPAID'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <span>Belum Bayar</span>
                    <span className="rounded-full bg-white text-amber-800 px-1.5 py-0.2 text-[10px]">
                      {summary.unpaidUnitsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnitStatusFilter('PAID')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                      unitStatusFilter === 'PAID'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span>Lunas</span>
                    <span className="rounded-full bg-white text-emerald-800 px-1.5 py-0.2 text-[10px]">
                      {summary.paidUnitsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnitStatusFilter('ALL')}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                      unitStatusFilter === 'ALL'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Semua (55)</span>
                  </button>
                </div>
              </div>

              {/* Grid of Unit Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {filteredGridUnits.map((res) => {
                  const isExempt = isUnitExemptFromIuran(res.id);
                  const isMultiOverdue = multiMonthArrearsMap.has(res.id);
                  const multiItem = multiMonthArrearsMap.get(res.id);
                  const isUnpaid = billingByUnitId.has(res.id);

                  let cardStyle = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
                  let badge = <span className="text-[10px] text-slate-400">Normal</span>;

                  if (isExempt) {
                    cardStyle = 'border-indigo-200 bg-indigo-50/60 text-indigo-900';
                    badge = (
                      <span className="rounded bg-indigo-100 text-indigo-800 px-1 py-0.5 text-[9px] font-bold">
                        Pengurus
                      </span>
                    );
                  } else if (isMultiOverdue && multiItem) {
                    cardStyle =
                      'border-2 border-rose-400 bg-rose-50/90 text-rose-950 ring-1 ring-rose-200 shadow-xs hover:border-rose-500';
                    badge = (
                      <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-black inline-flex items-center gap-0.5">
                        ⚠️ {multiItem.unpaidMonths.length} Bln
                      </span>
                    );
                  } else if (isUnpaid) {
                    cardStyle = 'border-amber-300 bg-amber-50/70 text-amber-900 hover:border-amber-400';
                    badge = (
                      <span className="rounded bg-amber-100 text-amber-800 px-1 py-0.5 text-[9px] font-bold">
                        1 Bln
                      </span>
                    );
                  } else {
                    cardStyle = 'border-teal-200 bg-teal-50/50 text-[#0f766e] hover:border-teal-300';
                    badge = (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#e0f7f4] text-[#0f9f90] px-1 py-0.5 text-[9px] font-bold">
                        <Check className="w-2.5 h-2.5" /> Lunas
                      </span>
                    );
                  }

                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => onSelectUnit(res.id, false)}
                      title={`Unit ${res.id} - ${res.headOfFamily}`}
                      className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[64px] ${cardStyle}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-mono text-xs font-black">{res.id}</span>
                        {badge}
                      </div>
                      <div className="truncate text-[11px] font-semibold text-slate-800">
                        {res.headOfFamily}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredGridUnits.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  Tidak ada unit yang sesuai dengan filter ini.
                </div>
              )}
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1547b8] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#103896] transition-colors cursor-pointer min-h-[40px]"
                  >
                    <QrCode className="h-3.5 w-3.5 text-[#5eead4]" />
                    <span>Lihat QRIS Unit {myUnitId}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectUnit(myUnitId, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer min-h-[40px]"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Lihat Riwayat &amp; Kwitansi</span>
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* ======================================================================= */}
          {/* SECTION B: GRAFIK & ANALISIS ARUS KAS                                  */}
          {/* Always shown on desktop; shown on mobile when mobileTab === 'grafik'    */}
          {/* ======================================================================= */}
          <div className={`${mobileTab === 'grafik' ? 'block' : 'hidden'} xl:block space-y-5`}>
            {/* TOP ANALYTICS ROW: Left = Dual-Pill Bar Chart, Right = Donut Ring */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left 8 Cols: Dual-Tone Vertical Pill Bar Chart */}
              <section
                aria-label="Overview Saldo dan Arus Kas"
                className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/60 lg:col-span-8 flex flex-col justify-between"
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
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#1547b8] focus:outline-none cursor-pointer min-h-[38px]"
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
                  <div className="flex-1 grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-44 border-b border-slate-100 pb-6">
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
                className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/60 lg:col-span-4 flex flex-col justify-between"
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
                  <svg className="h-40 w-40 sm:h-44 sm:w-44 -rotate-90" viewBox="0 0 156 156">
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
                    <span className="font-mono text-sm sm:text-base font-extrabold text-slate-900 tabular-nums tracking-tight">
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

            {/* SIX MONTH CASHFLOW BAR CHART */}
            <SixMonthCashflowBarChart
              transactions={state.transactions}
              activePeriodMonth={activePeriodMonth}
              onChangePeriodMonth={onChangePeriodMonth}
              onNavigateToTransactions={() => onNavigate('transactions')}
            />

            {/* D3 EXPENSE CATEGORY BAR CHART */}
            <ExpenseCategoryBarChart
              transactions={state.transactions}
              activePeriodMonth={activePeriodMonth}
              onChangePeriodMonth={onChangePeriodMonth}
              onNavigateToTransactions={() => onNavigate('transactions')}
            />
          </div>

          {/* ======================================================================= */}
          {/* SECTION C: MUTASI & AKTIVITAS                                          */}
          {/* Always shown on desktop; shown on mobile when mobileTab === 'mutasi'   */}
          {/* ======================================================================= */}
          <div className={`${mobileTab === 'mutasi' ? 'block' : 'hidden'} xl:block space-y-5`}>
            {/* RECENT ACTIVITY WIDGET (Strictly 5 entries) */}
            <section
              aria-label="Recent Activity"
              data-testid="recent-activity-widget"
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/80 space-y-4"
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
                      Aktivitas arus kas lingkungan terbaru yang tercatat di sistem
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
                    const isMultiOverdueUnit = tx.unitId ? multiMonthArrearsMap.has(tx.unitId) : false;
                    const overdueItem = tx.unitId ? multiMonthArrearsMap.get(tx.unitId) : null;

                    return (
                      <div
                        key={tx.id}
                        data-testid="recent-activity-item"
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 px-1 rounded-xl hover:bg-slate-50/70 transition-colors"
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
                              {isMultiOverdueUnit && overdueItem && (
                                <span className="rounded bg-rose-100 border border-rose-300 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 inline-flex items-center gap-0.5">
                                  ⚠️ Tunggakan {overdueItem.unpaidMonths.length} Bln
                                </span>
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

            {/* TRANSACTIONS CARD */}
            <section
              aria-label="Mutasi Kas Terbaru"
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-xs border border-slate-200/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Mutasi Buku Kas
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
                    Buku Lengkap →
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
                      const isMultiOverdueUnit = trx.unitId ? multiMonthArrearsMap.has(trx.unitId) : false;
                      const overdueItem = trx.unitId ? multiMonthArrearsMap.get(trx.unitId) : null;

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
                              {isMultiOverdueUnit && overdueItem && (
                                <span className="rounded bg-rose-100 border border-rose-300 text-rose-700 text-[9px] font-bold px-1.5 py-0.5">
                                  ⚠️ &gt;1 Bln
                                </span>
                              )}
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
        </div>

        {/* Bottom Workspace Footer */}
        <footer className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
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

      {/* Modal Dialog: Struktur Kepengurusan */}
      {pengurusModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="struktur-pengurus-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setPengurusModalOpen(false)}
              className="absolute top-4 right-4 z-20 rounded-xl bg-white/20 hover:bg-white/40 p-2 text-white transition-colors cursor-pointer"
              title="Tutup Tabel Struktur Pengurus"
            >
              <X className="w-5 h-5" />
            </button>

            <StrukturPengurusTable
              committeeMembers={state.settings.committeeMembers}
              housingName={state.settings.housingName}
              rtRwLabel={state.settings.rtRwLabel}
              onSelectUnit={(u) => {
                setPengurusModalOpen(false);
                onSelectUnit(u, false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
