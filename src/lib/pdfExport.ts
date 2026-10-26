import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatabaseState, LedgerTransaction, ResidentUnit } from '../types/finance';
import {
  calculateMonthlyReport,
  calculateQuarterlyLPJ,
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
} from './finance';

function getLastAutoTableY(doc: jsPDF, fallbackY: number): number {
  const anyDoc = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return anyDoc.lastAutoTable?.finalY ?? fallbackY;
}

function drawOfficialHeader(doc: jsPDF, state: DatabaseState, reportTitle: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageWidth, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(state.settings.housingName.toUpperCase(), 14, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  const leftAddress = `${state.settings.rtRwLabel} — ${state.settings.housingAddress}`;
  const wrappedAddress = doc.splitTextToSize(leftAddress, 102);
  doc.text(wrappedAddress, 14, 19.5);

  const bankY = 19.5 + wrappedAddress.length * 4;
  const wrappedBank = doc.splitTextToSize(`Rekening Kas: ${state.settings.bankAccountInfo}`, 102);
  doc.text(wrappedBank, 14, bankY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 83, 45);
  doc.text(reportTitle, pageWidth - 14, 14.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  const wrappedSub = doc.splitTextToSize(subtitle, 76);
  doc.text(wrappedSub, pageWidth - 14, 19.5, { align: 'right' });
  const printDateY = 19.5 + wrappedSub.length * 4;
  doc.text(
    `Dicetak: ${formatShortDate(new Date().toISOString().slice(0, 10))}`,
    pageWidth - 14,
    printDateY,
    { align: 'right' }
  );

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 32.5, pageWidth - 14, 32.5);
}

export function downloadMonthlyReportPDF(state: DatabaseState, periodMonth: string): string {
  const report = calculateMonthlyReport(state, periodMonth);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawOfficialHeader(
    doc,
    state,
    'LAPORAN KEUANGAN BULANAN RINCI',
    `Periode: ${report.periodLabel} (${report.paidCount}/55 Rumah Lunas)`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RINGKASAN POSISI SALDO & REALISASI BULANAN', 14, 39.5);

  autoTable(doc, {
    startY: 42.5,
    margin: { left: 14, right: 14 },
    head: [['Komponen Keuangan', 'Keterangan', 'Nominal (Rp)']],
    body: [
      ['Saldo Awal Bulan', `Saldo kas per 1 ${report.periodLabel}`, formatRupiah(report.openingBalance)],
      [
        'Pemasukan Iuran Warga',
        `${report.paidCount} dari 55 rumah lunas (@ ${formatRupiah(state.settings.monthlyFee)})`,
        formatRupiah(report.iuranIncome),
      ],
      ['Pemasukan Non-Iuran', 'Donasi, sewa saung, kartu akses & lainnya', formatRupiah(report.otherIncome)],
      ['Total Pemasukan Bulan Ini', 'Akumulasi seluruh kas masuk', formatRupiah(report.totalIncome)],
      ['Total Pengeluaran Operasional', 'Keamanan, kebersihan, PJU, taman & fasum', formatRupiah(report.totalExpense)],
      ['Surplus / (Defisit) Bulan Ini', 'Selisih pemasukan dikurangi pengeluaran', formatRupiah(report.netSurplus)],
      ['SALDO AKHIR BULAN', `Posisi kas akhir ${report.periodLabel}`, formatRupiah(report.closingBalance)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 82 },
      2: { halign: 'right', fontStyle: 'bold' },
    },
  });

  let nextY = getLastAutoTableY(doc, 98) + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. REKAPITULASI PER KATEGORI PEMASUKAN & PENGELUARAN', 14, nextY);

  const catRows: string[][] = [
    ...report.incomeByCategory.map((c) => [
      'Pemasukan',
      c.category,
      `${c.count} transaksi`,
      `${c.percentage}%`,
      formatRupiah(c.amount),
    ]),
    ...report.expenseByCategory.map((c) => [
      'Pengeluaran',
      c.category,
      `${c.count} transaksi`,
      `${c.percentage}%`,
      formatRupiah(c.amount),
    ]),
  ];

  autoTable(doc, {
    startY: nextY + 3,
    margin: { left: 14, right: 14 },
    head: [['Jenis', 'Kategori Akun Kas', 'Frekuensi', 'Porsi', 'Jumlah (Rp)']],
    body: catRows.length > 0 ? catRows : [['-', 'Belum ada transaksi pada periode ini', '0', '0%', 'Rp 0']],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  nextY = getLastAutoTableY(doc, nextY + 45) + 7;
  if (nextY > 240) {
    doc.addPage();
    nextY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. RINCIAN BUKU KAS KRONOLOGIS (${report.ledgerEntries.length} TRANSAKSI)`, 14, nextY);

  const ledgerBody = report.ledgerEntries.map((item, idx) => [
    String(idx + 1),
    formatShortDate(item.date),
    item.receiptNumber,
    item.category,
    item.description,
    item.type === 'income' ? formatRupiah(item.amount) : '-',
    item.type === 'expense' ? formatRupiah(item.amount) : '-',
    formatRupiah(item.runningBalance),
  ]);

  autoTable(doc, {
    startY: nextY + 3,
    margin: { left: 14, right: 14 },
    head: [['No', 'Tanggal', 'No. Bukti', 'Kategori', 'Uraian Transaksi', 'Masuk', 'Keluar', 'Saldo']],
    body:
      ledgerBody.length > 0
        ? ledgerBody
        : [['-', '-', '-', '-', 'Tidak ada mutasi kas pada bulan ini', '-', '-', formatRupiah(report.openingBalance)]],
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 1.6, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 19 },
      2: { cellWidth: 29.5 },
      3: { cellWidth: 27 },
      4: { cellWidth: 40.5 },
      5: { cellWidth: 19, halign: 'right' },
      6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.addPage();
  drawOfficialHeader(
    doc,
    state,
    'LAMPIRAN STATUS IURAN 55 UNIT RUMAH',
    `Periode: ${report.periodLabel} · Lunas: ${report.paidCount} Unit · Belum: ${report.unpaidCount} Unit`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. DAFTAR PEMBAYARAN IURAN BULANAN 55 WARGA PERUMAHAN SAUNG KEBUN', 14, 39.5);

  const unitRows = report.unitStatuses.map((u, idx) => [
    String(idx + 1),
    u.resident.id,
    u.resident.headOfFamily,
    u.resident.streetName,
    u.paid && u.transaction ? formatShortDate(u.transaction.date) : '-',
    u.paid && u.transaction ? u.transaction.paymentMethod : '-',
    u.paid ? formatRupiah(u.transaction?.amount ?? state.settings.monthlyFee) : 'Rp 0',
    u.paid ? 'LUNAS' : 'BELUM BAYAR',
  ]);

  autoTable(doc, {
    startY: 42.5,
    margin: { left: 14, right: 14 },
    head: [['No', 'Unit', 'Nama Kepala Keluarga', 'Alamat Jalan', 'Tgl Bayar', 'Metode', 'Nominal', 'Status']],
    body: unitRows,
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 14, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 34 },
      4: { cellWidth: 21 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 19, fontStyle: 'bold' },
    },
  });

  let sigY = getLastAutoTableY(doc, 220) + 12;
  if (sigY > 250) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Mengetahui & Mengesahkan,', 14, sigY);
  doc.text(`Karawang, ${formatShortDate(new Date().toISOString().slice(0, 10))}`, pageWidth - 65, sigY);

  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Paguyuban Warga', 14, sigY + 5);
  doc.text('Bendahara Pengurus', pageWidth - 65, sigY + 5);

  doc.line(14, sigY + 24, 68, sigY + 24);
  doc.line(pageWidth - 65, sigY + 24, pageWidth - 14, sigY + 24);

  doc.text(state.settings.chairpersonName, 14, sigY + 28.5);
  doc.text(state.settings.treasurerName, pageWidth - 65, sigY + 28.5);

  const fileName = `Laporan-Bulanan-Saung-Kebun-${periodMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

export function downloadQuarterlyLPJPDF(
  state: DatabaseState,
  year: number,
  quarter: 1 | 2 | 3 | 4
): string {
  const lpj = calculateQuarterlyLPJ(state, year, quarter);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawOfficialHeader(
    doc,
    state,
    'LAPORAN PERTANGGUNGJAWABAN (LPJ) 3 BULAN',
    `${lpj.title}`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. REKAPITULASI KEUANGAN TRIWULAN (3 BULAN OTOMATIS)', 14, 39.5);

  autoTable(doc, {
    startY: 42.5,
    margin: { left: 14, right: 14 },
    head: [['Pos Pertanggungjawaban Kas', 'Uraian', 'Nominal (Rp)']],
    body: [
      ['Saldo Awal Triwulan', `Saldo pindahan awal periode ${lpj.shortRange}`, formatRupiah(lpj.openingBalance)],
      ['Total Iuran Warga (3 Bulan)', 'Akumulasi pembayaran iuran Rp 100.000/bulan', formatRupiah(lpj.totalIuranIncome)],
      ['Total Pemasukan Non-Iuran', 'Donasi, sewa fasilitas saung, stiker & lainnya', formatRupiah(lpj.totalOtherIncome)],
      ['Total Pemasukan Triwulan', `Total kas masuk selama 3 bulan (${lpj.totalTransactionsCount} mutasi)`, formatRupiah(lpj.totalIncome)],
      ['Total Pengeluaran Triwulan', 'Seluruh belanja operasional & pemeliharaan lingkungan', formatRupiah(lpj.totalExpense)],
      ['Surplus / (Defisit) Triwulan', 'Selisih bersih arus kas 3 bulan', formatRupiah(lpj.netSurplus)],
      ['SALDO AKHIR TRIWULAN', `Saldo kas akhir periode ${lpj.shortRange}`, formatRupiah(lpj.closingBalance)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 56 },
      2: { halign: 'right', fontStyle: 'bold' },
    },
  });

  let nextY = getLastAutoTableY(doc, 98) + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. RINCIAN ARUS KAS PER BULAN DALAM TRIWULAN', 14, nextY);

  autoTable(doc, {
    startY: nextY + 3,
    margin: { left: 14, right: 14 },
    head: [['Bulan', 'Rumah Lunas', 'Iuran Warga', 'Non-Iuran', 'Total Masuk', 'Total Keluar', 'Surplus', 'Saldo Akhir']],
    body: lpj.monthsBreakdown.map((m) => [
      m.monthLabel,
      `${m.paidUnitsCount}/55 unit`,
      formatRupiah(m.iuranIncome),
      formatRupiah(m.otherIncome),
      formatRupiah(m.totalIncome),
      formatRupiah(m.totalExpense),
      formatRupiah(m.surplus),
      formatRupiah(m.closingBalance),
    ]),
    theme: 'striped',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  nextY = getLastAutoTableY(doc, nextY + 38) + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. REALISASI IURAN WARGA PER BLOK SELAMA 3 BULAN', 14, nextY);

  autoTable(doc, {
    startY: nextY + 3,
    margin: { left: 14, right: 14 },
    head: [['Blok', 'Jalan', 'Jumlah Unit', 'Target 3 Bln', 'Realisasi Masuk', 'Tunggakan', 'Capaian']],
    body: lpj.blockRealization.map((b) => [
      `Blok ${b.block}`,
      b.streetName,
      `${b.unitsCount} Rumah`,
      formatRupiah(b.targetAmount),
      formatRupiah(b.realizedAmount),
      formatRupiah(b.arrearsAmount),
      `${b.realizationPercent}%`,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  nextY = getLastAutoTableY(doc, nextY + 42) + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('4. RINCIAN KATEGORI PEMASUKAN & PENGELUARAN 3 BULAN', 14, nextY);

  const catBody = [
    ...lpj.incomeByCategory.map((c) => ['Pemasukan', c.category, `${c.count}x`, `${c.percentage}%`, formatRupiah(c.amount)]),
    ...lpj.expenseByCategory.map((c) => ['Pengeluaran', c.category, `${c.count}x`, `${c.percentage}%`, formatRupiah(c.amount)]),
  ];

  autoTable(doc, {
    startY: nextY + 3,
    margin: { left: 14, right: 14 },
    head: [['Arus Kas', 'Kategori Akun', 'Frekuensi', 'Proporsi', 'Total 3 Bulan']],
    body: catBody.length > 0 ? catBody : [['-', 'Belum ada realisasi transaksi', '0x', '0%', 'Rp 0']],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  let sigY = getLastAutoTableY(doc, 225) + 10;
  if (sigY > 248) {
    doc.addPage();
    sigY = 24;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('LEMBAR PENGESAHAN PENGURUS PAGUYUBAN PERUMAHAN SAUNG KEBUN', 14, sigY);

  const colW = (pageWidth - 28) / 4;
  const roles = [
    { role: 'Ketua Paguyuban', name: state.settings.chairpersonName },
    { role: 'Bendahara', name: state.settings.treasurerName },
    { role: 'Sekretaris', name: state.settings.secretaryName },
    { role: 'Pengawas Warga', name: state.settings.supervisorName },
  ];

  doc.setFontSize(8);
  roles.forEach((officer, idx) => {
    const x = 14 + idx * colW;
    doc.setFont('helvetica', 'normal');
    doc.text(officer.role, x, sigY + 6);
    doc.line(x, sigY + 23, x + colW - 6, sigY + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(officer.name, x, sigY + 27);
  });

  const fileName = `LPJ-3Bulan-Q${quarter}-${year}-Saung-Kebun.pdf`;
  doc.save(fileName);
  return fileName;
}

export function buildUnitReceiptPDFDoc(
  state: DatabaseState,
  resident: ResidentUnit,
  transaction: LedgerTransaction
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageWidth, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('BUKTI PEMBAYARAN IURAN WARGA (KWITANSI RESMI)', 12, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${state.settings.housingName} · ${state.settings.rtRwLabel}`, 12, 20.5);
  doc.text(`No. Kwitansi: ${transaction.receiptNumber}`, pageWidth - 12, 15, { align: 'right' });
  doc.text(`Tanggal Bayar: ${formatShortDate(transaction.date)}`, pageWidth - 12, 20.5, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(12, 24, pageWidth - 12, 24);

  autoTable(doc, {
    startY: 28,
    margin: { left: 12, right: 12 },
    body: [
      ['Unit Rumah / Blok', `${resident.id} (${resident.streetName})`],
      ['Telah Terima Dari', `${resident.headOfFamily}`],
      ['Periode Iuran', formatMonthLabel(transaction.periodMonth)],
      ['Kategori Pembayaran', transaction.category],
      ['Metode Pembayaran', transaction.paymentMethod],
      ['Uraian', transaction.description],
      ['JUMLAH DITERIMA', `${formatRupiah(transaction.amount)} (STATUS: LUNAS)`],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52, fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' },
    },
  });

  const finalY = getLastAutoTableY(doc, 95) + 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Catatan:', 12, finalY);
  doc.setFont('helvetica', 'italic');
  const recordedByText = transaction.recordedBy
    ? transaction.recordedBy
        .replace(/Ratna\s*Sari\s*Dewi,?\s*S\.E\./gi, state.settings.treasurerName || 'Andriansyah')
        .replace(/H\.\s*Hendra\s*Wijaya,?\s*S\.T\./gi, state.settings.chairpersonName || 'Erlangga')
    : `Admin — Bendahara Pengurus (${state.settings.treasurerName || 'Andriansyah'})`;
  doc.text('• Bukti kwitansi resmi yang sah dari ketua pengurus saung kebun', 12, finalY + 4);
  doc.text(`• Dicatat oleh: ${recordedByText}`, 12, finalY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bendahara Perumahan Saung Kebun,', pageWidth - 68, finalY);
  doc.line(pageWidth - 68, finalY + 16, pageWidth - 12, finalY + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(state.settings.treasurerName, pageWidth - 68, finalY + 20);

  return doc;
}

export function downloadUnitReceiptPDF(
  state: DatabaseState,
  resident: ResidentUnit,
  transaction: LedgerTransaction
): string {
  const doc = buildUnitReceiptPDFDoc(state, resident, transaction);
  const fileName = `Kwitansi-${resident.id}-${transaction.periodMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

export function getUnitReceiptPDFDataUri(
  state: DatabaseState,
  resident: ResidentUnit,
  transaction: LedgerTransaction
): string {
  const doc = buildUnitReceiptPDFDoc(state, resident, transaction);
  return doc.output('datauristring');
}

