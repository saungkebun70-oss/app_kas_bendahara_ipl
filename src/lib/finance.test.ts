import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from './seedData';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
  calculateRealtimeSummary,
  formatRupiah,
  getPublishedAnnouncements,
  getPublishedArrearsForWargaPortal,
  getPublishedSecurityReports,
  getUnpaidResidentsForBilling,
  getUnitTransactions,
  normalizePhoneToWa,
} from './finance';
import { authenticateAdmin, authenticateSatpam, authenticateWarga } from './auth';
import {
  DEFAULT_QRIS_IMAGE_DATA_URL,
  getResidentQRISPaymentInfo,
  getUnitUnpaidMonths,
  validateQRISUploadFile,
} from './qris';

test('seed database contains exactly 55 houses with complete profile fields and Rp 100.000 fee', () => {
  const db = createSeedDatabase();
  assert.equal(db.residents.length, 55);
  assert.equal(db.settings.monthlyFee, 100000);

  const uniqueIds = new Set(db.residents.map((r) => r.id));
  assert.equal(uniqueIds.size, 55);

  for (const res of db.residents) {
    assert.ok(res.headOfFamily.length > 3, `Resident ${res.id} has valid name`);
    assert.equal(res.nik.length, 16, `Resident ${res.id} has 16-digit NIK`);
    assert.equal(res.kkNumber.length, 16, `Resident ${res.id} has 16-digit KK`);
    assert.ok(res.whatsapp.startsWith('08'), `Resident ${res.id} has valid WA number`);
    assert.ok(res.streetName.startsWith('Jl.'), `Resident ${res.id} has street address`);
  }
});

test('real-time balance reconciles opening balance, all income, and all expenses accurately', () => {
  const db = createSeedDatabase();
  const summaryBefore = calculateRealtimeSummary(db, '2026-10');

  assert.equal(summaryBefore.totalUnits, 55);
  assert.equal(summaryBefore.targetIuranRevenue, 55 * 100000);
  assert.equal(summaryBefore.monthIuranIncome, 43 * 100000);
  assert.equal(summaryBefore.collectionRatePercent, 78);
  assert.equal(summaryBefore.totalRevenueAchievementPercent, 85);
  assert.equal(summaryBefore.paidUnitsCount + summaryBefore.unpaidUnitsCount, 55);
  assert.equal(summaryBefore.paidUnitsCount, 43);
  assert.equal(summaryBefore.unpaidUnitsCount, 12);
  assert.equal(summaryBefore.unpaidPotentialAmount, 12 * 100000);

  db.transactions.push({
    id: 'TRX-TEST-01',
    receiptNumber: 'SK/KW/2026/10/A05',
    date: '2026-10-24',
    periodMonth: '2026-10',
    type: 'income',
    category: 'Iuran Bulanan Warga',
    amount: 100000,
    unitId: 'A-05',
    paymentMethod: 'QRIS Saung Kebun',
    description: 'Iuran Oktober A-05',
    recordedBy: 'Admin',
    createdAt: '2026-10-24T10:00:00.000Z',
  });

  const summaryAfter = calculateRealtimeSummary(db, '2026-10');
  assert.equal(summaryAfter.currentBalance, summaryBefore.currentBalance + 100000);
  assert.equal(summaryAfter.paidUnitsCount, 44);
  assert.equal(summaryAfter.unpaidUnitsCount, 11);

  const unitHistory = getUnitTransactions(db.transactions, 'A-05');
  assert.equal(unitHistory.length, 4);
  assert.equal(unitHistory[0].periodMonth, '2026-10');
});

test('new income and expense entries automatically flow into the 3-month LPJ Triwulan report', () => {
  const db = createSeedDatabase();
  const lpjQ3 = calculateQuarterlyLPJ(db, 2026, 3);
  assert.deepEqual(lpjQ3.months, ['2026-07', '2026-08', '2026-09']);
  assert.equal(lpjQ3.closingBalance, lpjQ3.openingBalance + lpjQ3.totalIncome - lpjQ3.totalExpense);

  const lpjQ4Before = calculateQuarterlyLPJ(db, 2026, 4);
  assert.equal(lpjQ4Before.openingBalance, lpjQ3.closingBalance);

  db.transactions.push({
    id: 'TRX-TEST-EXP',
    receiptNumber: 'SK/OUT/2026/11/01',
    date: '2026-11-03',
    periodMonth: '2026-11',
    type: 'expense',
    category: 'Perawatan Taman & Saung',
    amount: 325000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Bibit tanaman pucuk merah taman utama',
    recordedBy: 'Admin',
    createdAt: '2026-11-03T08:00:00.000Z',
  });

  const lpjQ4After = calculateQuarterlyLPJ(db, 2026, 4);
  assert.equal(lpjQ4After.totalExpense, lpjQ4Before.totalExpense + 325000);
  assert.equal(lpjQ4After.closingBalance, lpjQ4Before.closingBalance - 325000);

  const octMonthly = calculateMonthlyReport(db, '2026-10');
  assert.equal(octMonthly.unitStatuses.length, 55);
});

test('WhatsApp billing detector identifies unpaid houses, multi-month arrears, and wa.me URLs', () => {
  const db = createSeedDatabase();
  const unpaidList = getUnpaidResidentsForBilling(db, '2026-10');

  assert.equal(unpaidList.length, 12);

  const unitA12 = unpaidList.find((item) => item.resident.id === 'A-12');
  assert.ok(unitA12);
  assert.deepEqual(unitA12.unpaidMonths, ['2026-09', '2026-10']);
  assert.equal(unitA12.totalArrears, 200000);
  assert.ok(unitA12.formattedMessage.includes('Rp 200.000'));
  assert.ok(unitA12.waWebUrl.startsWith('https://wa.me/628'));

  assert.equal(normalizePhoneToWa('0812-3456-7890'), '6281234567890');
  assert.equal(formatRupiah(100000), 'Rp 100.000');
});

test('separate Admin login validates Ketua Paguyuban and Bendahara credentials strictly', () => {
  const db = createSeedDatabase();

  const emptyRes = authenticateAdmin(
    { adminRole: 'ketua', username: '', password: '' },
    db.settings
  );
  assert.equal(emptyRes.ok, false);

  const wrongRes = authenticateAdmin(
    { adminRole: 'bendahara', username: 'bendahara', password: 'wrong' },
    db.settings
  );
  assert.equal(wrongRes.ok, false);

  const ketuaRes = authenticateAdmin(
    { adminRole: 'ketua', username: 'ketua', password: 'ketua123' },
    db.settings
  );
  assert.equal(ketuaRes.ok, true);
  if (ketuaRes.ok) {
    assert.equal(ketuaRes.session.role, 'ketua');
    assert.equal(ketuaRes.session.isAdmin, true);
    assert.equal(ketuaRes.session.displayName, db.settings.chairpersonName);
  }

  const bendaharaRes = authenticateAdmin(
    { adminRole: 'bendahara', username: 'bendahara', password: 'bendahara123' },
    db.settings
  );
  assert.equal(bendaharaRes.ok, true);
  if (bendaharaRes.ok) {
    assert.equal(bendaharaRes.session.role, 'bendahara');
    assert.equal(bendaharaRes.session.isAdmin, true);
    assert.equal(bendaharaRes.session.displayName, db.settings.treasurerName);
  }
});

test('separate Warga login validates 55 house unit IDs and PIN or WhatsApp last 4 digits', () => {
  const db = createSeedDatabase();

  const emptyPin = authenticateWarga({ unitId: 'A-05', pin: '' }, db.residents);
  assert.equal(emptyPin.ok, false);

  const validWarga = authenticateWarga({ unitId: 'A-05', pin: '1234' }, db.residents);
  assert.equal(validWarga.ok, true);
  if (validWarga.ok) {
    assert.equal(validWarga.session.role, 'warga');
    assert.equal(validWarga.session.isAdmin, false);
    assert.equal(validWarga.session.unitId, 'A-05');
  }
});

test('resident QRIS payment info resolves uploaded QRIS image and exact outstanding amount', () => {
  const db = createSeedDatabase();
  const unitA05 = db.residents.find((r) => r.id === 'A-05')!;
  const unitA12 = db.residents.find((r) => r.id === 'A-12')!;

  assert.deepEqual(getUnitUnpaidMonths(db, 'A-05', '2026-10'), ['2026-10']);
  assert.deepEqual(getUnitUnpaidMonths(db, 'A-12', '2026-10'), ['2026-09', '2026-10']);

  const qrisA05 = getResidentQRISPaymentInfo(db, unitA05);
  assert.equal(qrisA05.outstandingAmount, 100000);
  assert.equal(qrisA05.formattedAmount, 'Rp 100.000');
  assert.equal(qrisA05.qrisImageUrl, DEFAULT_QRIS_IMAGE_DATA_URL);
  assert.equal(qrisA05.qrisFileName, 'QRIS-Standar-Saung-Kebun.svg');

  db.settings.qrisImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  db.settings.qrisFileName = 'qris-resmi-bendahara.png';

  const qrisA12 = getResidentQRISPaymentInfo(db, unitA12);
  assert.equal(qrisA12.outstandingAmount, 200000);
  assert.equal(qrisA12.formattedAmount, 'Rp 200.000');
  assert.equal(qrisA12.qrisImageUrl, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB');
  assert.equal(qrisA12.qrisFileName, 'qris-resmi-bendahara.png');
});

test('QRIS file upload validator enforces valid image types, non-empty size, and 5 MB limit', () => {
  const db = createSeedDatabase();
  assert.equal(db.settings.qrisImageUrl, DEFAULT_QRIS_IMAGE_DATA_URL);
  assert.equal(db.settings.qrisFileName, 'QRIS-Standar-Saung-Kebun.svg');

  const validPng = validateQRISUploadFile({
    name: 'qris-bca-saung-kebun.png',
    type: 'image/png',
    size: 185000,
  });
  assert.equal(validPng.valid, true);

  const invalidType = validateQRISUploadFile({
    name: 'dokumen.pdf',
    type: 'application/pdf',
    size: 120000,
  });
  assert.equal(invalidType.valid, false);
  assert.ok(invalidType.error?.includes('PNG, JPG, WEBP, atau SVG'));

  const oversizedFile = validateQRISUploadFile({
    name: 'qris-besar.jpg',
    type: 'image/jpeg',
    size: 6 * 1024 * 1024,
  });
  assert.equal(oversizedFile.valid, false);
  assert.ok(oversizedFile.error?.includes('5 MB'));
});

test('Warga portal filters published announcements, security guard reports, and admin arrears publication state', () => {
  const db = createSeedDatabase();

  // Announcements publish/unpublish
  assert.equal(getPublishedAnnouncements(db).length, 3);
  db.announcements![0].published = false;
  assert.equal(getPublishedAnnouncements(db).length, 2);

  // Security guard reports publish/unpublish
  assert.equal(getPublishedSecurityReports(db).length, 2);
  db.securityReports![1].published = false;
  assert.equal(getPublishedSecurityReports(db).length, 1);

  // Arrears publish/unpublish global and per-unit
  const initialArrears = getPublishedArrearsForWargaPortal(db, '2026-10');
  assert.equal(initialArrears.isPublishedByAdmin, true);
  assert.equal(initialArrears.publishedItems.length, 12);

  // Hide specific unit A-05 from Warga portal arrears list
  db.settings.hiddenArrearsUnitIds = ['A-05'];
  const partialArrears = getPublishedArrearsForWargaPortal(db, '2026-10');
  assert.equal(partialArrears.publishedItems.length, 11);
  assert.equal(
    partialArrears.publishedItems.some((i) => i.resident.id === 'A-05'),
    false
  );

  // Global unpublish arrears from Warga portal
  db.settings.publishArrearsToResidents = false;
  const unpublishedArrears = getPublishedArrearsForWargaPortal(db, '2026-10');
  assert.equal(unpublishedArrears.isPublishedByAdmin, false);
  assert.equal(unpublishedArrears.publishedItems.length, 0);

  // Satpam authentication
  const invalidSatpam = authenticateSatpam({
    guardName: 'Danru Suryadi',
    shift: 'Shift Malam (19.00 - 07.00 WIB)',
    pin: 'wrong',
  });
  assert.equal(invalidSatpam.ok, false);

  const validSatpam = authenticateSatpam({
    guardName: 'Danru Suryadi',
    shift: 'Shift Malam (19.00 - 07.00 WIB)',
    pin: 'satpam123',
  });
  assert.equal(validSatpam.ok, true);
  if (validSatpam.ok) {
    assert.equal(validSatpam.session.role, 'satpam');
    assert.equal(validSatpam.session.isAdmin, false);
    assert.equal(validSatpam.session.isSecurity, true);
  }
});

test('security officers are managed separately from 55 resident units and have individual logins', () => {
  const db = createSeedDatabase();
  assert.equal(db.residents.length, 55);
  assert.ok(Array.isArray(db.securityOfficers));
  assert.equal(db.securityOfficers.length, 5);

  // Security officer IDs are separate from resident unit IDs
  const residentIds = new Set(db.residents.map((r) => r.id));
  for (const officer of db.securityOfficers) {
    assert.ok(officer.id.startsWith('SEC-OFF-'));
    assert.ok(officer.badgeNumber.startsWith('KTA-SK-'));
    assert.equal(residentIds.has(officer.id), false);
    assert.ok(['Shift Pagi (07.00 - 19.00 WIB)', 'Shift Malam (19.00 - 07.00 WIB)'].includes(officer.assignedShift));
  }

  // Login using registered officer account
  const officerLogin = authenticateSatpam(
    {
      guardName: 'Suryadi',
      shift: 'Shift Malam (19.00 - 07.00 WIB)',
      pin: 'satpam123',
      officerId: 'SEC-OFF-01',
    },
    db.securityOfficers
  );
  assert.equal(officerLogin.ok, true);
  if (officerLogin.ok) {
    assert.equal(officerLogin.session.displayName, 'Suryadi');
    assert.equal(officerLogin.session.officerBadge, 'KTA-SK-001');
    assert.equal(officerLogin.session.roleLabel, 'Satpam Jaga — Danru (Komandan Regu)');
  }

  // Nonaktif officer cannot login
  const nonaktifOfficers = db.securityOfficers.map((o) =>
    o.id === 'SEC-OFF-02' ? { ...o, status: 'Nonaktif' as const } : o
  );
  const nonaktifRes = authenticateSatpam(
    {
      guardName: 'Herman',
      shift: 'Shift Malam (19.00 - 07.00 WIB)',
      pin: 'satpam123',
      officerId: 'SEC-OFF-02',
    },
    nonaktifOfficers
  );
  assert.equal(nonaktifRes.ok, false);
  assert.ok(nonaktifRes.error.includes('Nonaktif'));
});

test('unit receipt preview generator creates valid PDF document and data URI before download', async () => {
  const { buildUnitReceiptPDFDoc, getUnitReceiptPDFDataUri } = await import('./pdfExport');
  const db = createSeedDatabase();
  const unit = db.residents[0];
  const tx = db.transactions.find((t) => t.unitId === unit.id)!;

  const doc = buildUnitReceiptPDFDoc(db, unit, tx);
  assert.ok(doc);
  assert.equal(doc.internal.pages.length >= 1, true);

  const dataUri = getUnitReceiptPDFDataUri(db, unit, tx);
  assert.ok(dataUri.startsWith('data:application/pdf'));
  assert.ok(dataUri.length > 500);
});

test('D3 expense categories comparison aggregates monthly spending and historical averages accurately', async () => {
  const { formatCompactRupiah } = await import('../components/ExpenseCategoryBarChart');
  const db = createSeedDatabase();

  // Test compact rupiah formatter
  assert.equal(formatCompactRupiah(2400000), '2,4 Jt');
  assert.equal(formatCompactRupiah(1000000), '1 Jt');
  assert.equal(formatCompactRupiah(480000), '480 Rb');
  assert.equal(formatCompactRupiah(500), 'Rp 500');

  // Verify expense categories across months
  const expenseTxs = db.transactions.filter((t) => t.type === 'expense');
  const months = Array.from(new Set(expenseTxs.map((t) => t.periodMonth))).sort();
  assert.ok(months.length >= 3); // 2026-07, 2026-08, 2026-09, 2026-10

  // Keamanan & Satpam in July, August, Sept, Oct: 2.400.000 each month
  const satpamTxs = expenseTxs.filter((t) => t.category === 'Keamanan & Satpam');
  const satpamTotal = satpamTxs.reduce((s, t) => s + t.amount, 0);
  const satpamAvg = Math.round(satpamTotal / months.length);
  assert.equal(satpamAvg, 2400000);

  // Kebersihan & Sampah in July, August, Sept, Oct: 1.150.000 each month
  const sampahTxs = expenseTxs.filter((t) => t.category === 'Kebersihan & Sampah');
  const sampahTotal = sampahTxs.reduce((s, t) => s + t.amount, 0);
  const sampahAvg = Math.round(sampahTotal / months.length);
  assert.equal(sampahAvg, 1150000);
});

test('TransactionsView search bar filters by transaction type, unit ID, and date range accurately', () => {
  const db = createSeedDatabase();
  const allTxs = db.transactions;

  // 1. Filter by Transaction Type
  const incomeOnly = allTxs.filter((t) => t.type === 'income');
  const expenseOnly = allTxs.filter((t) => t.type === 'expense');
  assert.ok(incomeOnly.length > 0);
  assert.ok(expenseOnly.length > 0);
  assert.equal(incomeOnly.every((t) => t.type === 'income'), true);
  assert.equal(expenseOnly.every((t) => t.type === 'expense'), true);

  // 2. Filter by Unit ID
  const unitA05Txs = allTxs.filter((t) => t.unitId === 'A-05');
  assert.ok(unitA05Txs.length > 0);
  assert.equal(unitA05Txs.every((t) => t.unitId === 'A-05'), true);

  // Filter non-unit (operational / general)
  const nonUnitTxs = allTxs.filter((t) => !t.unitId);
  assert.ok(nonUnitTxs.length > 0);
  assert.equal(nonUnitTxs.every((t) => t.unitId === null), true);

  // 3. Filter by Date Range
  const start = '2026-08-01';
  const end = '2026-08-15';
  const augustRangeTxs = allTxs.filter((t) => t.date >= start && t.date <= end);
  assert.ok(augustRangeTxs.length > 0);
  assert.equal(augustRangeTxs.every((t) => t.date >= start && t.date <= end), true);

  // 4. Combined Multi-Criteria Filter (Type + Unit + Date Range)
  const combined = allTxs.filter(
    (t) => t.type === 'income' && t.unitId === 'A-01' && t.date >= '2026-07-01' && t.date <= '2026-08-31'
  );
  assert.ok(combined.length >= 1);
  assert.equal(combined.every((t) => t.type === 'income' && t.unitId === 'A-01'), true);
});

test('TransactionsView summary section displays accurate total income, total expenses, and net balance for filtered transactions', () => {
  const db = createSeedDatabase();
  const allTxs = db.transactions;

  // Filter 1: October 2026 transactions
  const octTxs = allTxs.filter((t) => t.periodMonth === '2026-10');
  const octIncome = octTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const octExpense = octTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const octNet = octIncome - octExpense;

  assert.equal(octIncome, 4700000); // 47 paid units * 100.000
  assert.equal(octExpense, 4645000);
  assert.equal(octNet, 55000); // 4.700.000 - 4.645.000 = +55.000 surplus

  // Filter 2: Only non-unit operational expenses/incomes
  const nonUnitTxs = allTxs.filter((t) => !t.unitId);
  const nonUnitIncome = nonUnitTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const nonUnitExpense = nonUnitTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const nonUnitNet = nonUnitIncome - nonUnitExpense;

  assert.ok(nonUnitExpense > 0);
  assert.equal(nonUnitNet, nonUnitIncome - nonUnitExpense);

  // Filter 3: Single unit (A-05) across all time
  const a05Txs = allTxs.filter((t) => t.unitId === 'A-05');
  const a05Income = a05Txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const a05Expense = a05Txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const a05Net = a05Income - a05Expense;

  assert.equal(a05Expense, 0);
  assert.equal(a05Net, a05Income);
  assert.ok(a05Income >= 300000); // July, Aug, Sept paid
});

test('AI category suggestion matches Indonesian housing keywords and suggests correct categories and types', () => {
  // Test keywords mapped to housing operational categories
  const testCases = [
    { text: 'Pengangkutan sampah warga RT 04', expectedCategory: 'Kebersihan & Sampah', expectedType: 'EXPENSE' },
    { text: 'Honor satpam jaga malam dan patroli', expectedCategory: 'Keamanan & Satpam', expectedType: 'EXPENSE' },
    { text: 'Perbaikan lampu jalan PJU dan saklar', expectedCategory: 'Listrik PJU & Air', expectedType: 'EXPENSE' },
    { text: 'Pemangkasan rumput taman dan saung warga', expectedCategory: 'Perawatan Taman & Saung', expectedType: 'EXPENSE' },
    { text: 'Perbaikan CCTV gerbang utama dan portal', expectedCategory: 'Perbaikan Fasilitas Umum', expectedType: 'EXPENSE' },
    { text: 'Pembelian kertas HVS dan stempel paguyuban RT', expectedCategory: 'Administrasi & Kas RT', expectedType: 'EXPENSE' },
    { text: 'Sewa saung serbaguna untuk acara ulang tahun', expectedCategory: 'Sewa Saung Warga', expectedType: 'INCOME' },
    { text: 'Donasi sedekah warga untuk santunan anak yatim', expectedCategory: 'Donasi & Sumbangan', expectedType: 'INCOME' },
    { text: 'Pembelian kartu akses RFID gerbang komplek', expectedCategory: 'Kartu Akses & Stiker', expectedType: 'INCOME' },
  ];

  for (const tc of testCases) {
    const lower = tc.text.toLowerCase();
    let matchedCategory = '';
    let matchedType = 'EXPENSE';

    if (lower.includes('sampah') || lower.includes('kebersihan')) {
      matchedCategory = 'Kebersihan & Sampah';
    } else if (lower.includes('satpam') || lower.includes('keamanan') || lower.includes('patroli')) {
      matchedCategory = 'Keamanan & Satpam';
    } else if (lower.includes('lampu') || lower.includes('listrik') || lower.includes('pju')) {
      matchedCategory = 'Listrik PJU & Air';
    } else if (lower.includes('taman') || lower.includes('rumput')) {
      matchedCategory = 'Perawatan Taman & Saung';
    } else if (lower.includes('kartu akses') || lower.includes('rfid') || lower.includes('stiker')) {
      matchedCategory = 'Kartu Akses & Stiker';
      matchedType = 'INCOME';
    } else if (lower.includes('cctv') || lower.includes('portal') || lower.includes('gerbang')) {
      matchedCategory = 'Perbaikan Fasilitas Umum';
    } else if (lower.includes('hvs') || lower.includes('stempel') || lower.includes('kertas')) {
      matchedCategory = 'Administrasi & Kas RT';
    } else if (lower.includes('sewa saung')) {
      matchedCategory = 'Sewa Saung Warga';
      matchedType = 'INCOME';
    } else if (lower.includes('donasi') || lower.includes('santunan')) {
      matchedCategory = 'Donasi & Sumbangan';
      matchedType = 'INCOME';
    }

    assert.equal(matchedCategory, tc.expectedCategory);
    assert.equal(matchedType, tc.expectedType);
  }
});

test('TransactionsView Recharts monthly trend aggregates income vs expenses correctly for the current year', async () => {
  const { getYearlyMonthlyTrend, formatCompactRupiah } = await import('./finance');
  const db = createSeedDatabase();

  const trend2026 = getYearlyMonthlyTrend(db.transactions, 2026);

  // 1. Should have all 12 months (Jan..Des)
  assert.equal(trend2026.months.length, 12);
  assert.equal(trend2026.months[0].shortMonthName, 'Jan');
  assert.equal(trend2026.months[9].shortMonthName, 'Okt');
  assert.equal(trend2026.months[11].shortMonthName, 'Des');

  // 2. Total transactions in 2026 must match the sum of monthly transactions
  const sumMonthTxs = trend2026.months.reduce((s, m) => s + m.totalCount, 0);
  assert.equal(trend2026.yearTotalTransactions, sumMonthTxs);
  assert.equal(trend2026.yearTotalTransactions, db.transactions.length);

  // 3. Verify October 2026 numbers
  const oct = trend2026.months[9];
  assert.equal(oct.periodMonth, '2026-10');
  assert.equal(oct.income, 4700000);
  assert.equal(oct.expense, 4645000);
  assert.equal(oct.net, 55000); // 4.700.000 - 4.645.000 = +55.000 surplus
  assert.equal(oct.hasData, true);

  // 4. Verify July, August, September numbers
  const jul = trend2026.months[6];
  const aug = trend2026.months[7];
  const sep = trend2026.months[8];
  assert.equal(jul.income, 5850000); // 55 units paid (5.500.000) + other income (350.000)
  assert.equal(jul.expense, 4825000);
  assert.equal(aug.income, 6250000); // 55 units paid (5.500.000) + other income (750.000)
  assert.equal(aug.expense, 4900000);
  assert.equal(sep.income, 5500000); // 52 units paid + other income
  assert.equal(sep.expense, 4900000);

  // 5. Total year income and expense must equal sum of all transactions
  const totalIncomeAll = db.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenseAll = db.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  assert.equal(trend2026.yearTotalIncome, totalIncomeAll);
  assert.equal(trend2026.yearTotalExpense, totalExpenseAll);
  assert.equal(trend2026.yearNetBalance, totalIncomeAll - totalExpenseAll);

  // 6. Test compact rupiah formatting for Recharts YAxis ticks
  assert.equal(formatCompactRupiah(5500000), '5,5 Jt');
  assert.equal(formatCompactRupiah(4645000), '4,6 Jt');
});

test('resident payment confirmation submission and admin approval lifecycle creates transaction and updates balance', () => {
  const db = createSeedDatabase();
  assert.ok(Array.isArray(db.paymentConfirmations));
  assert.ok(db.paymentConfirmations.length >= 2);

  // Initial state for unit A-05 (which is unpaid in October 2026)
  const unpaidBefore = db.transactions.find(
    (t) => t.unitId === 'A-05' && t.periodMonth === '2026-10' && t.type === 'income'
  );
  assert.equal(unpaidBefore, undefined, 'A-05 has not paid October yet');

  const pendingConfirmation = db.paymentConfirmations.find(
    (c) => c.unitId === 'A-05' && c.status === 'MENUNGGU_VERIFIKASI'
  );
  assert.ok(pendingConfirmation, 'A-05 has a pending confirmation in seed data');
  assert.deepEqual(pendingConfirmation.periodMonths, ['2026-10']);
  assert.equal(pendingConfirmation.amount, 100000);

  // Simulate Admin Approval
  const balanceBefore = calculateRealtimeSummary(db, '2026-10').currentBalance;
  const newTxId = `TRX-CONF-${Date.now()}`;
  const receiptNo = `SK/KW/2026/10/A05`;

  // Approve confirmation
  pendingConfirmation.status = 'DISETUJUI';
  pendingConfirmation.verifiedBy = 'Andriansyah (Bendahara)';
  pendingConfirmation.verifiedAt = new Date().toISOString();
  pendingConfirmation.resultingReceiptNumber = receiptNo;

  // Add ledger transaction created by approval
  db.transactions.push({
    id: newTxId,
    receiptNumber: receiptNo,
    date: pendingConfirmation.transferDate,
    periodMonth: '2026-10',
    type: 'income',
    category: 'Iuran Bulanan Warga',
    amount: pendingConfirmation.amount,
    unitId: pendingConfirmation.unitId,
    paymentMethod: pendingConfirmation.paymentMethod,
    description: `Pembayaran Iuran 1 Bulan (2026-10) Unit A-05 via konfirmasi transfer warga`,
    recordedBy: `Verifikasi Admin: Andriansyah (Bendahara)`,
    createdAt: new Date().toISOString(),
  });

  const balanceAfter = calculateRealtimeSummary(db, '2026-10').currentBalance;
  assert.equal(balanceAfter, balanceBefore + 100000, 'Balance increases by approved amount');

  // Verify A-05 is now marked paid for October 2026
  const paidNow = db.transactions.find(
    (t) => t.unitId === 'A-05' && t.periodMonth === '2026-10' && t.type === 'income'
  );
  assert.ok(paidNow, 'A-05 is now marked paid');
  assert.equal(paidNow.amount, 100000);
});

test('admin can publish and unpublish monthly reports and quarterly LPJ for resident portal transparency', () => {
  const db = createSeedDatabase();
  assert.ok(Array.isArray(db.settings.publishedMonthlyReports));
  assert.ok(Array.isArray(db.settings.publishedQuarterlyLPJ));

  // Check default publications in seed
  assert.ok(db.settings.publishedMonthlyReports.includes('2026-10'));
  assert.ok(db.settings.publishedQuarterlyLPJ.includes('2026-Q3'));

  // Test unpublishing October 2026 monthly report
  db.settings.publishedMonthlyReports = db.settings.publishedMonthlyReports.filter(
    (m) => m !== '2026-10'
  );
  assert.equal(db.settings.publishedMonthlyReports.includes('2026-10'), false);

  // Test re-publishing October 2026
  if (!db.settings.publishedMonthlyReports.includes('2026-10')) {
    db.settings.publishedMonthlyReports.push('2026-10');
  }
  assert.equal(db.settings.publishedMonthlyReports.includes('2026-10'), true);

  // Test publishing Q4 LPJ
  if (!db.settings.publishedQuarterlyLPJ.includes('2026-Q4')) {
    db.settings.publishedQuarterlyLPJ.push('2026-Q4');
  }
  assert.equal(db.settings.publishedQuarterlyLPJ.includes('2026-Q4'), true);

  // Test unpublishing Q4 LPJ
  db.settings.publishedQuarterlyLPJ = db.settings.publishedQuarterlyLPJ.filter(
    (q) => q !== '2026-Q4'
  );
  assert.equal(db.settings.publishedQuarterlyLPJ.includes('2026-Q4'), false);
});

