import type {
  BlockCode,
  CommunityActivityAnnouncement,
  DatabaseState,
  ExpenseCategory,
  IncomeCategory,
  LedgerTransaction,
  ResidentUnit,
  SecurityGuardReport,
} from '../types/finance.ts';

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Iuran Bulanan Warga',
  'Donasi & Sumbangan',
  'Sewa Saung Warga',
  'Kartu Akses & Stiker',
  'Pemasukan Lainnya',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Keamanan & Satpam',
  'Kebersihan & Sampah',
  'Listrik PJU & Air',
  'Perawatan Taman & Saung',
  'Perbaikan Fasilitas Umum',
  'Administrasi & Kas RT',
];

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatMonthLabel(periodMonth: string): string {
  const [yearStr, monthStr] = periodMonth.split('-');
  const monthIdx = Number(monthStr) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] ?? periodMonth;
  return `${monthName} ${yearStr}`;
}

export function formatShortDate(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  const monthName = INDONESIAN_MONTHS[Number(month) - 1]?.slice(0, 3) ?? month;
  return `${day} ${monthName} ${year}`;
}

export function getMonthsForQuarter(year: number, quarter: 1 | 2 | 3 | 4): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => {
    const m = String(startMonth + offset).padStart(2, '0');
    return `${year}-${m}`;
  });
}

export function getQuarterInfo(year: number, quarter: 1 | 2 | 3 | 4) {
  const roman = ['I', 'II', 'III', 'IV'][quarter - 1];
  const months = getMonthsForQuarter(year, quarter);
  const firstLabel = INDONESIAN_MONTHS[(quarter - 1) * 3];
  const lastLabel = INDONESIAN_MONTHS[(quarter - 1) * 3 + 2];
  return {
    year,
    quarter,
    roman,
    months,
    title: `LPJ Triwulan ${roman} (${firstLabel} – ${lastLabel} ${year})`,
    shortRange: `${firstLabel} – ${lastLabel} ${year}`,
  };
}

export function getQuarterFromPeriod(periodMonth: string): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const [yStr, mStr] = periodMonth.split('-');
  const year = Number(yStr) || 2026;
  const m = Number(mStr) || 1;
  const quarter = (Math.ceil(m / 3) as 1 | 2 | 3 | 4) || 1;
  return { year, quarter };
}

export function normalizePhoneToWa(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('62')) {
    return digits;
  }
  return `62${digits}`;
}

export function maskNik(nik: string, reveal = false): string {
  if (reveal || nik.length < 10) return nik;
  return `${nik.slice(0, 6)}••••••${nik.slice(-4)}`;
}

export function sortTransactionsChronologically(transactions: LedgerTransaction[]): LedgerTransaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });
}

export interface BlockSummary {
  block: BlockCode;
  streetName: string;
  totalUnits: number;
  paidUnits: number;
  unpaidUnits: number;
  collectedAmount: number;
  targetAmount: number;
}

export interface MonthlyCashFlowSummary {
  monthIndex: number; // 0..11
  monthCode: string; // "01".."12"
  periodMonth: string; // "2026-01"
  monthName: string; // "Januari"
  shortMonthName: string; // "Jan"
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
  hasData: boolean;
  cumulativeIncome: number;
  cumulativeExpense: number;
  cumulativeNet: number;
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

export function getYearlyMonthlyTrend(
  transactions: LedgerTransaction[],
  year: number = 2026
): {
  months: MonthlyCashFlowSummary[];
  yearTotalIncome: number;
  yearTotalExpense: number;
  yearNetBalance: number;
  yearTotalTransactions: number;
  monthlyAverageIncome: number;
  monthlyAverageExpense: number;
  highestIncomeMonth: MonthlyCashFlowSummary | null;
  highestExpenseMonth: MonthlyCashFlowSummary | null;
} {
  let cumulativeIncome = 0;
  let cumulativeExpense = 0;
  let cumulativeNet = 0;

  const months: MonthlyCashFlowSummary[] = INDONESIAN_MONTHS.map((name, idx) => {
    const monthNum = idx + 1;
    const monthCode = String(monthNum).padStart(2, '0');
    const periodMonth = `${year}-${monthCode}`;

    const monthTxs = transactions.filter((t) => t.periodMonth === periodMonth);

    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const t of monthTxs) {
      if (t.type === 'income') {
        income += t.amount;
        incomeCount++;
      } else {
        expense += t.amount;
        expenseCount++;
      }
    }

    const net = income - expense;
    cumulativeIncome += income;
    cumulativeExpense += expense;
    cumulativeNet += net;

    return {
      monthIndex: idx,
      monthCode,
      periodMonth,
      monthName: name,
      shortMonthName: name.slice(0, 3),
      income,
      expense,
      net,
      incomeCount,
      expenseCount,
      totalCount: monthTxs.length,
      hasData: monthTxs.length > 0,
      cumulativeIncome,
      cumulativeExpense,
      cumulativeNet,
    };
  });

  const yearTotalIncome = cumulativeIncome;
  const yearTotalExpense = cumulativeExpense;
  const yearNetBalance = cumulativeNet;
  const yearTotalTransactions = months.reduce((s, m) => s + m.totalCount, 0);

  const monthsWithData = months.filter((m) => m.hasData);
  const divisor = monthsWithData.length > 0 ? monthsWithData.length : 1;
  const monthlyAverageIncome = Math.round(yearTotalIncome / divisor);
  const monthlyAverageExpense = Math.round(yearTotalExpense / divisor);

  let highestIncomeMonth: MonthlyCashFlowSummary | null = null;
  let highestExpenseMonth: MonthlyCashFlowSummary | null = null;
  for (const m of monthsWithData) {
    if (!highestIncomeMonth || m.income > highestIncomeMonth.income) {
      highestIncomeMonth = m;
    }
    if (!highestExpenseMonth || m.expense > highestExpenseMonth.expense) {
      highestExpenseMonth = m;
    }
  }

  return {
    months,
    yearTotalIncome,
    yearTotalExpense,
    yearNetBalance,
    yearTotalTransactions,
    monthlyAverageIncome,
    monthlyAverageExpense,
    highestIncomeMonth,
    highestExpenseMonth,
  };
}

export interface SixMonthCashFlowPoint {
  periodMonth: string; // e.g. "2026-05"
  monthName: string; // "Mei"
  shortName: string; // "Mei"
  year: number; // 2026
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
}

export interface SixMonthCashFlowSummary {
  referenceMonth: string;
  points: SixMonthCashFlowPoint[];
  totalIncome: number;
  totalExpense: number;
  netSurplus: number;
  averageIncome: number;
  averageExpense: number;
  highestIncomePoint: SixMonthCashFlowPoint;
  highestExpensePoint: SixMonthCashFlowPoint;
}

export function getLast6MonthsCashFlow(
  transactions: LedgerTransaction[],
  referencePeriodMonth: string = '2026-10'
): SixMonthCashFlowSummary {
  const [refYearStr, refMonthStr] = referencePeriodMonth.split('-');
  const refYear = Number(refYearStr) || 2026;
  const refMonth = Number(refMonthStr) || 10;

  const points: SixMonthCashFlowPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    let year = refYear;
    let month = refMonth - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    const monthCode = String(month).padStart(2, '0');
    const periodMonth = `${year}-${monthCode}`;
    const monthName = INDONESIAN_MONTHS[month - 1] ?? monthCode;
    const shortName = monthName.slice(0, 3);

    const monthTxs = transactions.filter((t) => t.periodMonth === periodMonth);
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const t of monthTxs) {
      if (t.type === 'income') {
        income += t.amount;
        incomeCount++;
      } else {
        expense += t.amount;
        expenseCount++;
      }
    }

    points.push({
      periodMonth,
      monthName,
      shortName,
      year,
      income,
      expense,
      net: income - expense,
      incomeCount,
      expenseCount,
      totalCount: incomeCount + expenseCount,
    });
  }

  const totalIncome = points.reduce((acc, p) => acc + p.income, 0);
  const totalExpense = points.reduce((acc, p) => acc + p.expense, 0);
  const netSurplus = totalIncome - totalExpense;
  const averageIncome = Math.round(totalIncome / 6);
  const averageExpense = Math.round(totalExpense / 6);

  const highestIncomePoint = points.reduce(
    (max, p) => (p.income > max.income ? p : max),
    points[0]
  );
  const highestExpensePoint = points.reduce(
    (max, p) => (p.expense > max.expense ? p : max),
    points[0]
  );

  return {
    referenceMonth: referencePeriodMonth,
    points,
    totalIncome,
    totalExpense,
    netSurplus,
    averageIncome,
    averageExpense,
    highestIncomePoint,
    highestExpensePoint,
  };
}


export const EXEMPT_OFFICER_UNIT_IDS = ['B1-01', 'B1-09', 'A-01', 'A-09'] as const;

export function isUnitExemptFromIuran(unitId: string): boolean {
  return unitId === 'B1-01' || unitId === 'B1-09' || unitId === 'A-01' || unitId === 'A-09';
}

export function getUnitExemptionInfo(unitId: string): { isExempt: boolean; roleLabel?: string; roleTitle?: string } {
  if (unitId === 'B1-01' || unitId === 'A-01') return { isExempt: true, roleLabel: 'Ketua (Bebas Iuran)', roleTitle: 'Ketua' };
  if (unitId === 'B1-09' || unitId === 'A-09') return { isExempt: true, roleLabel: 'Bendahara (Bebas Iuran)', roleTitle: 'Bendahara' };
  return { isExempt: false };
}

export interface RealtimeFinancialSummary {
  currentBalance: number;
  openingBalance2026: number;
  totalAllTimeIncome: number;
  totalAllTimeExpense: number;
  activePeriodMonth: string;
  monthOpeningBalance: number;
  monthIncome: number;
  monthIuranIncome: number;
  monthOtherIncome: number;
  monthExpense: number;
  monthNetSurplus: number;
  monthClosingBalance: number;
  totalUnits: number;
  exemptUnitsCount: number;
  billableUnitsCount: number;
  paidUnitsCount: number;
  unpaidUnitsCount: number;
  targetIuranRevenue: number;
  collectionRatePercent: number;
  totalRevenueAchievementPercent: number;
  unpaidPotentialAmount: number;
  blockBreakdown: BlockSummary[];
}

export function calculateRealtimeSummary(
  state: DatabaseState,
  activePeriodMonth: string
): RealtimeFinancialSummary {
  const { residents, transactions, settings } = state;
  let totalAllTimeIncome = 0;
  let totalAllTimeExpense = 0;

  let priorDelta = 0;
  let monthIncome = 0;
  let monthIuranIncome = 0;
  let monthOtherIncome = 0;
  let monthExpense = 0;

  const paidUnitSet = new Set<string>();

  for (const trx of transactions) {
    if (trx.type === 'income') {
      totalAllTimeIncome += trx.amount;
    } else {
      totalAllTimeExpense += trx.amount;
    }

    if (trx.periodMonth < activePeriodMonth) {
      priorDelta += trx.type === 'income' ? trx.amount : -trx.amount;
    } else if (trx.periodMonth === activePeriodMonth) {
      if (trx.type === 'income') {
        monthIncome += trx.amount;
        if (trx.category === 'Iuran Bulanan Warga' && trx.unitId) {
          monthIuranIncome += trx.amount;
          paidUnitSet.add(trx.unitId);
        } else {
          monthOtherIncome += trx.amount;
        }
      } else {
        monthExpense += trx.amount;
      }
    }
  }

  const currentBalance = settings.openingBalance2026 + totalAllTimeIncome - totalAllTimeExpense;
  const monthOpeningBalance = settings.openingBalance2026 + priorDelta;
  const monthNetSurplus = monthIncome - monthExpense;
  const monthClosingBalance = monthOpeningBalance + monthNetSurplus;

  const totalUnits = residents.length;
  const exemptResidents = residents.filter((r) => isUnitExemptFromIuran(r.id));
  const exemptUnitsCount = exemptResidents.length;
  const billableResidents = residents.filter((r) => !isUnitExemptFromIuran(r.id));
  const billableUnitsCount = billableResidents.length;

  const paidUnitsCount = billableResidents.filter((r) => paidUnitSet.has(r.id)).length;
  const unpaidUnitsCount = billableUnitsCount - paidUnitsCount;
  const targetIuranRevenue = billableUnitsCount * settings.monthlyFee;
  const collectionRatePercent =
    billableUnitsCount > 0 ? Math.round((paidUnitsCount / billableUnitsCount) * 100) : 0;
  const totalRevenueAchievementPercent =
    targetIuranRevenue > 0 ? Math.round((monthIncome / targetIuranRevenue) * 100) : 0;
  const unpaidPotentialAmount = unpaidUnitsCount * settings.monthlyFee;

  const rawBlocks = settings?.customBlocks?.map((b) => b.id) || Array.from(new Set(residents.map((r) => r.block)));
  const blocks: BlockCode[] = rawBlocks.length > 0 ? rawBlocks : ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'];
  const blockBreakdown: BlockSummary[] = blocks.map((block) => {
    const unitsInBlock = residents.filter((r) => r.block === block);
    const billableInBlock = unitsInBlock.filter((r) => !isUnitExemptFromIuran(r.id));
    const paidInBlock = billableInBlock.filter((r) => paidUnitSet.has(r.id)).length;
    const unpaidInBlock = billableInBlock.length - paidInBlock;
    return {
      block,
      streetName: unitsInBlock[0]?.streetName ?? `Blok ${block}`,
      totalUnits: unitsInBlock.length,
      paidUnits: paidInBlock,
      unpaidUnits: unpaidInBlock,
      collectedAmount: paidInBlock * settings.monthlyFee,
      targetAmount: billableInBlock.length * settings.monthlyFee,
    };
  });


  return {
    currentBalance,
    openingBalance2026: settings.openingBalance2026,
    totalAllTimeIncome,
    totalAllTimeExpense,
    activePeriodMonth,
    monthOpeningBalance,
    monthIncome,
    monthIuranIncome,
    monthOtherIncome,
    monthExpense,
    monthNetSurplus,
    monthClosingBalance,
    totalUnits,
    exemptUnitsCount,
    billableUnitsCount,
    paidUnitsCount,
    unpaidUnitsCount,
    targetIuranRevenue,
    collectionRatePercent,
    totalRevenueAchievementPercent,
    unpaidPotentialAmount,
    blockBreakdown,
  };
}

export interface UnitMonthCell {
  periodMonth: string;
  monthShort: string;
  paid: boolean;
  transaction: LedgerTransaction | null;
}

export function getUnitTransactions(
  transactions: LedgerTransaction[],
  unitId: string
): LedgerTransaction[] {
  return sortTransactionsChronologically(transactions.filter((t) => t.unitId === unitId)).reverse();
}

export function getUnitMonthsMatrix(
  transactions: LedgerTransaction[],
  unitId: string,
  months: string[]
): UnitMonthCell[] {
  const unitIuranMap = new Map<string, LedgerTransaction>();
  for (const t of transactions) {
    if (t.unitId === unitId && t.type === 'income' && t.category === 'Iuran Bulanan Warga') {
      unitIuranMap.set(t.periodMonth, t);
    }
  }

  return months.map((pm) => {
    const mIdx = Number(pm.split('-')[1]) - 1;
    const trx = unitIuranMap.get(pm) ?? null;
    return {
      periodMonth: pm,
      monthShort: INDONESIAN_MONTHS[mIdx]?.slice(0, 3) ?? pm,
      paid: Boolean(trx),
      transaction: trx,
    };
  });
}

export interface LedgerEntryWithBalance extends LedgerTransaction {
  runningBalance: number;
}

export interface CategoryAggregate {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlyDetailedReport {
  periodMonth: string;
  periodLabel: string;
  openingBalance: number;
  totalIncome: number;
  iuranIncome: number;
  otherIncome: number;
  totalExpense: number;
  netSurplus: number;
  closingBalance: number;
  incomeByCategory: CategoryAggregate[];
  expenseByCategory: CategoryAggregate[];
  ledgerEntries: LedgerEntryWithBalance[];
  unitStatuses: Array<{
    resident: ResidentUnit;
    isExempt: boolean;
    paid: boolean;
    transaction: LedgerTransaction | null;
  }>;
  paidCount: number;
  unpaidCount: number;
  exemptCount: number;
  totalUnits: number;
  billableUnitsCount: number;
  exemptUnitsCount: number;
  targetIuranRevenue: number;
}

export function calculateMonthlyReport(
  state: DatabaseState,
  periodMonth: string
): MonthlyDetailedReport {
  const { residents, transactions, settings } = state;

  let openingBalance = settings.openingBalance2026;
  for (const t of transactions) {
    if (t.periodMonth < periodMonth) {
      openingBalance += t.type === 'income' ? t.amount : -t.amount;
    }
  }

  const monthTrx = sortTransactionsChronologically(
    transactions.filter((t) => t.periodMonth === periodMonth)
  );

  let running = openingBalance;
  let totalIncome = 0;
  let iuranIncome = 0;
  let otherIncome = 0;
  let totalExpense = 0;

  const incomeCatMap = new Map<string, { amount: number; count: number }>();
  const expenseCatMap = new Map<string, { amount: number; count: number }>();
  const unitPaidTrx = new Map<string, LedgerTransaction>();

  const ledgerEntries: LedgerEntryWithBalance[] = monthTrx.map((t) => {
    if (t.type === 'income') {
      running += t.amount;
      totalIncome += t.amount;
      if (t.category === 'Iuran Bulanan Warga' && t.unitId) {
        iuranIncome += t.amount;
        unitPaidTrx.set(t.unitId, t);
      } else {
        otherIncome += t.amount;
      }
      const prev = incomeCatMap.get(t.category) ?? { amount: 0, count: 0 };
      incomeCatMap.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 });
    } else {
      running -= t.amount;
      totalExpense += t.amount;
      const prev = expenseCatMap.get(t.category) ?? { amount: 0, count: 0 };
      expenseCatMap.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 });
    }
    return {
      ...t,
      runningBalance: running,
    };
  });

  const incomeByCategory: CategoryAggregate[] = INCOME_CATEGORIES.map((cat) => {
    const entry = incomeCatMap.get(cat) ?? { amount: 0, count: 0 };
    return {
      category: cat,
      amount: entry.amount,
      count: entry.count,
      percentage: totalIncome > 0 ? Math.round((entry.amount / totalIncome) * 100) : 0,
    };
  }).filter((c) => c.amount > 0);

  const expenseByCategory: CategoryAggregate[] = EXPENSE_CATEGORIES.map((cat) => {
    const entry = expenseCatMap.get(cat) ?? { amount: 0, count: 0 };
    return {
      category: cat,
      amount: entry.amount,
      count: entry.count,
      percentage: totalExpense > 0 ? Math.round((entry.amount / totalExpense) * 100) : 0,
    };
  }).filter((c) => c.amount > 0);

  const unitStatuses = residents.map((resident) => {
    const isExempt = isUnitExemptFromIuran(resident.id);
    const trx = unitPaidTrx.get(resident.id) ?? null;
    return {
      resident,
      isExempt,
      paid: isExempt || Boolean(trx),
      transaction: trx,
    };
  });

  const paidCount = unitStatuses.filter((u) => !u.isExempt && u.paid).length;
  const unpaidCount = unitStatuses.filter((u) => !u.isExempt && !u.paid).length;
  const exemptCount = unitStatuses.filter((u) => u.isExempt).length;
  const totalUnits = residents.length;
  const billableUnitsCount = totalUnits - exemptCount;
  const targetIuranRevenue = billableUnitsCount * (settings?.monthlyFee ?? 100000);

  return {
    periodMonth,
    periodLabel: formatMonthLabel(periodMonth),
    openingBalance,
    totalIncome,
    iuranIncome,
    otherIncome,
    totalExpense,
    netSurplus: totalIncome - totalExpense,
    closingBalance: openingBalance + totalIncome - totalExpense,
    incomeByCategory,
    expenseByCategory,
    ledgerEntries,
    unitStatuses,
    paidCount,
    unpaidCount,
    exemptCount,
    totalUnits,
    billableUnitsCount,
    exemptUnitsCount: exemptCount,
    targetIuranRevenue,
  };
}


export interface QuarterlyMonthRow {
  periodMonth: string;
  monthLabel: string;
  paidUnitsCount: number;
  iuranIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpense: number;
  surplus: number;
  closingBalance: number;
}

export interface QuarterlyLPJReport {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  title: string;
  shortRange: string;
  months: string[];
  openingBalance: number;
  totalIncome: number;
  totalIuranIncome: number;
  totalOtherIncome: number;
  totalExpense: number;
  netSurplus: number;
  closingBalance: number;
  monthsBreakdown: QuarterlyMonthRow[];
  incomeByCategory: CategoryAggregate[];
  expenseByCategory: CategoryAggregate[];
  blockRealization: Array<{
    block: BlockCode;
    streetName: string;
    unitsCount: number;
    expectedPaymentsCount: number;
    actualPaymentsCount: number;
    targetAmount: number;
    realizedAmount: number;
    arrearsAmount: number;
    realizationPercent: number;
  }>;
  totalTransactionsCount: number;
  transactions: LedgerTransaction[];
  incomeTransactions: LedgerTransaction[];
  expenseTransactions: LedgerTransaction[];
}

export function calculateQuarterlyLPJ(
  state: DatabaseState,
  year: number,
  quarter: 1 | 2 | 3 | 4
): QuarterlyLPJReport {
  const info = getQuarterInfo(year, quarter);
  const firstMonth = info.months[0];
  const monthSet = new Set(info.months);

  let openingBalance = state.settings.openingBalance2026;
  for (const t of state.transactions) {
    if (t.periodMonth < firstMonth) {
      openingBalance += t.type === 'income' ? t.amount : -t.amount;
    }
  }

  let running = openingBalance;
  const monthsBreakdown: QuarterlyMonthRow[] = info.months.map((pm) => {
    const mReport = calculateMonthlyReport(state, pm);
    running += mReport.netSurplus;
    return {
      periodMonth: pm,
      monthLabel: mReport.periodLabel,
      paidUnitsCount: mReport.paidCount,
      iuranIncome: mReport.iuranIncome,
      otherIncome: mReport.otherIncome,
      totalIncome: mReport.totalIncome,
      totalExpense: mReport.totalExpense,
      surplus: mReport.netSurplus,
      closingBalance: running,
    };
  });

  const quarterTrx = sortTransactionsChronologically(
    state.transactions.filter((t) => monthSet.has(t.periodMonth))
  );
  const incomeTransactions = quarterTrx.filter((t) => t.type === 'income');
  const expenseTransactions = quarterTrx.filter((t) => t.type === 'expense');
  let totalIncome = 0;
  let totalIuranIncome = 0;
  let totalOtherIncome = 0;
  let totalExpense = 0;

  const incMap = new Map<string, { amount: number; count: number }>();
  const expMap = new Map<string, { amount: number; count: number }>();
  const paidCountByUnit = new Map<string, number>();

  for (const t of quarterTrx) {
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (t.category === 'Iuran Bulanan Warga' && t.unitId) {
        totalIuranIncome += t.amount;
        paidCountByUnit.set(t.unitId, (paidCountByUnit.get(t.unitId) ?? 0) + 1);
      } else {
        totalOtherIncome += t.amount;
      }
      const prev = incMap.get(t.category) ?? { amount: 0, count: 0 };
      incMap.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 });
    } else {
      totalExpense += t.amount;
      const prev = expMap.get(t.category) ?? { amount: 0, count: 0 };
      expMap.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 });
    }
  }

  const incomeByCategory: CategoryAggregate[] = INCOME_CATEGORIES.map((cat) => {
    const item = incMap.get(cat) ?? { amount: 0, count: 0 };
    return {
      category: cat,
      amount: item.amount,
      count: item.count,
      percentage: totalIncome > 0 ? Math.round((item.amount / totalIncome) * 100) : 0,
    };
  }).filter((c) => c.amount > 0);

  const expenseByCategory: CategoryAggregate[] = EXPENSE_CATEGORIES.map((cat) => {
    const item = expMap.get(cat) ?? { amount: 0, count: 0 };
    return {
      category: cat,
      amount: item.amount,
      count: item.count,
      percentage: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
    };
  }).filter((c) => c.amount > 0);

  const rawBlocks = state.settings?.customBlocks?.map((b) => b.id) || Array.from(new Set(state.residents.map((r) => r.block)));
  const blocks: BlockCode[] = rawBlocks.length > 0 ? rawBlocks : ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'];
  const blockRealization = blocks.map((block) => {
    const units = state.residents.filter((r) => r.block === block);
    const billableUnits = units.filter((r) => !isUnitExemptFromIuran(r.id));
    const expectedPaymentsCount = billableUnits.length * 3;
    const actualPaymentsCount = billableUnits.reduce(
      (sum, u) => sum + (paidCountByUnit.get(u.id) ?? 0),
      0
    );
    const targetAmount = expectedPaymentsCount * state.settings.monthlyFee;
    const realizedAmount = actualPaymentsCount * state.settings.monthlyFee;
    const arrearsAmount = Math.max(0, targetAmount - realizedAmount);
    const realizationPercent =
      targetAmount > 0 ? Math.round((realizedAmount / targetAmount) * 100) : 0;

    return {
      block,
      streetName: units[0]?.streetName ?? `Blok ${block}`,
      unitsCount: units.length,
      expectedPaymentsCount,
      actualPaymentsCount,
      targetAmount,
      realizedAmount,
      arrearsAmount,
      realizationPercent,
    };
  });


  const netSurplus = totalIncome - totalExpense;
  const closingBalance = openingBalance + netSurplus;

  return {
    year,
    quarter,
    title: info.title,
    shortRange: info.shortRange,
    months: info.months,
    openingBalance,
    totalIncome,
    totalIuranIncome,
    totalOtherIncome,
    totalExpense,
    netSurplus,
    closingBalance,
    monthsBreakdown,
    incomeByCategory,
    expenseByCategory,
    blockRealization,
    totalTransactionsCount: quarterTrx.length,
    transactions: quarterTrx,
    incomeTransactions,
    expenseTransactions,
  };
}

export interface UnpaidResidentBillingItem {
  resident: ResidentUnit;
  unpaidMonths: string[];
  unpaidLabels: string[];
  totalArrears: number;
  normalizedWaPhone: string;
  formattedMessage: string;
  waWebUrl: string;
}

export function formatWhatsAppReminderMessage(
  template: string,
  params: {
    nama: string;
    unit: string;
    alamat: string;
    periode: string;
    nominal: string;
    jatuhTempo: number;
    rekening: string;
    linkBayar?: string;
    instruksiBayar?: string;
  }
): string {
  const link = params.linkBayar || 'https://ais-pre-jvxodjqg27n6kf6g4ukblc-547004294471.asia-east1.run.app/#warga';
  const instruksi =
    params.instruksiBayar ||
    `1. Transfer Bank BCA: ${params.rekening}\n2. Atau Scan QRIS via link Portal Warga\n3. Unggah bukti pembayaran melalui link Portal Warga`;

  return template
    .replace(/\{nama\}/g, params.nama)
    .replace(/\{unit\}/g, params.unit)
    .replace(/\{alamat\}/g, params.alamat)
    .replace(/\{periode\}/g, params.periode)
    .replace(/\{nominal\}/g, params.nominal)
    .replace(/\{jatuh_tempo\}/g, String(params.jatuhTempo))
    .replace(/\{rekening\}/g, params.rekening)
    .replace(/\{link_bayar\}/g, link)
    .replace(/\{instruksi_bayar\}/g, instruksi);
}

export function getUnpaidResidentsForBilling(
  state: DatabaseState,
  targetPeriodMonth: string
): UnpaidResidentBillingItem[] {
  const { residents, transactions, settings } = state;

  const candidateMonths: string[] = [];
  const [targetY, targetM] = targetPeriodMonth.split('-').map(Number);
  const startYear = 2026;
  const startMonth = 7;

  let y = startYear;
  let m = startMonth;
  while (y < targetY || (y === targetY && m <= targetM)) {
    candidateMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  if (candidateMonths.length === 0) {
    candidateMonths.push(targetPeriodMonth);
  }

  const paidLookup = new Set<string>();
  for (const t of transactions) {
    if (t.type === 'income' && t.category === 'Iuran Bulanan Warga' && t.unitId) {
      paidLookup.add(`${t.unitId}::${t.periodMonth}`);
    }
  }

  const results: UnpaidResidentBillingItem[] = [];

  for (const resident of residents) {
    if (isUnitExemptFromIuran(resident.id)) {
      continue;
    }

    if (paidLookup.has(`${resident.id}::${targetPeriodMonth}`)) {
      continue;
    }

    const unpaidMonths = candidateMonths.filter(
      (pm) => !paidLookup.has(`${resident.id}::${pm}`)
    );
    const unpaidLabels = unpaidMonths.map(formatMonthLabel);
    const totalArrears = unpaidMonths.length * settings.monthlyFee;
    const normalizedWaPhone = normalizePhoneToWa(resident.whatsapp);

    const formattedMessage = formatWhatsAppReminderMessage(settings.whatsappTemplate, {
      nama: resident.headOfFamily,
      unit: resident.id,
      alamat: resident.streetName,
      periode: unpaidLabels.join(', '),
      nominal: formatRupiah(totalArrears),
      jatuhTempo: settings.dueDayOfMonth,
      rekening: settings.bankAccountInfo,
      linkBayar: settings.whatsappPaymentLink,
      instruksiBayar: settings.whatsappPaymentInstructions,
    });

    const waWebUrl = `https://wa.me/${normalizedWaPhone}?text=${encodeURIComponent(
      formattedMessage
    )}`;

    results.push({
      resident,
      unpaidMonths,
      unpaidLabels,
      totalArrears,
      normalizedWaPhone,
      formattedMessage,
      waWebUrl,
    });
  }

  return results;
}

export function getPublishedArrearsForWargaPortal(
  state: DatabaseState,
  targetPeriodMonth: string
): {
  isPublishedByAdmin: boolean;
  publishedItems: UnpaidResidentBillingItem[];
  totalUnpaidUnits: number;
} {
  const allUnpaid = getUnpaidResidentsForBilling(state, targetPeriodMonth);
  const isPublishedByAdmin = state.settings.publishArrearsToResidents !== false;
  if (!isPublishedByAdmin) {
    return {
      isPublishedByAdmin: false,
      publishedItems: [],
      totalUnpaidUnits: allUnpaid.length,
    };
  }

  const hiddenSet = new Set(state.settings.hiddenArrearsUnitIds ?? []);
  const publishedItems = allUnpaid.filter((item) => !hiddenSet.has(item.resident.id));

  return {
    isPublishedByAdmin: true,
    publishedItems,
    totalUnpaidUnits: allUnpaid.length,
  };
}

export function getPublishedAnnouncements(
  state: DatabaseState
): CommunityActivityAnnouncement[] {
  const list = state.announcements ?? [];
  return list
    .filter((item) => item.published)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

export function getPublishedSecurityReports(
  state: DatabaseState
): SecurityGuardReport[] {
  const list = state.securityReports ?? [];
  return list
    .filter((item) => item.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export { getUnitUnpaidMonths } from './qris.ts';

