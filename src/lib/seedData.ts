import type {
  AdminSettings,
  BlockCode,
  CommunityActivityAnnouncement,
  DatabaseState,
  LedgerTransaction,
  OccupancyStatus,
  PaymentConfirmation,
  PaymentMethod,
  ResidentUnit,
  SecurityGuardReport,
  SecurityOfficer,
  WhatsAppNotificationLog,
} from '../types/finance.ts';
import { DEFAULT_QRIS_IMAGE_DATA_URL } from './qris.ts';

const RESIDENT_NAMES_55: string[] = [
  'Erlangga',
  'Budi Santoso',
  'Dr. Rina Kusumawardhani',
  'Agus Pratama Putra',
  'Dedi Kurniawan',
  'Siti Nurhaliza Rahma',
  'Ir. Bambang Suryono',
  'Fajar Nugroho',
  'Andriansyah',
  'Eko Prasetyo',
  'Lukman Hakim',
  'Wahyu Hidayatullah',
  'Yuniarti Puspitasari',
  'Rizky Ramadhan',
  'Taufik Ismail',
  'Irfan Maulana',
  'Hendra Gunawan',
  'Dewi Sartika Putri',
  'Arif Budiman, M.M.',
  'Surya Darmawan',
  'Nadia Permatasari',
  'Joko Susilo',
  'Fitriani Hasanah',
  'Reza Pahlevi',
  'Antonius Wijaya',
  'Sri Wahyuni',
  'Dimas Anggara',
  'Muhamad Ridwan',
  'Lestari Handayani',
  'Bayu Setiawan',
  'Adi Nugraha',
  'Kartika Chandra',
  'Zulkifli Mansyur',
  'Indah Permata Sari',
  'Heri Susanto',
  'Gita Savitri',
  'Yusuf Mansurudin',
  'Putri Ayu Lestari',
  'Andi Firmansyah',
  'Denny Sumargo Putra',
  'Novi Rahmawati',
  'Candra Wijaya',
  'Samsul Bahri',
  'Maya Estianty Putri',
  'Rama Pradipta',
  'Kurnia Meiga Saputra',
  'Galih Ginanjar',
  'Ayu Tingkir Sari',
  'Bagus Purwanto',
  'Farhan Syahputra',
  'Wulan Guritno Putri',
  'Teguh Karya',
  'Dian Sastrowardoyo',
  'Anwar Sanusi',
  'Melati Kusuma',
];

const STREET_BY_BLOCK: Record<BlockCode, string> = {
  A: 'Jl. Saung Melati',
  B: 'Jl. Kebun Asri',
  C: 'Jl. Saung Cendana',
  D: 'Jl. Kebun Kenanga',
};

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transfer BCA Kas',
  'QRIS Saung Kebun',
  'Transfer Mandiri',
  'Tunai Bendahara',
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  housingName: 'Perumahan Saung Kebun',
  housingAddress: 'Bengle, Majalaya, Karawang, Jawa Barat',
  rtRwLabel: 'Paguyuban Warga RT 004 / RW 009',
  monthlyFee: 100000,
  dueDayOfMonth: 10,
  openingBalance2026: 14250000,
  chairpersonName: 'Erlangga',
  treasurerName: 'Andriansyah',
  secretaryName: 'Irfan Maulana',
  supervisorName: 'Ir. Bambang Suryono',
  bankAccountInfo: 'BCA 7410-8892-10 a.n. Kas Perumahan Saung Kebun (QRIS Tersedia)',
  whatsappGatewayLabel: 'SaungKebun Auto-Reminder Gateway (Aktif)',
  autoWhatsappEnabled: true,
  autoReminderSchedule: {
    hMinus3: true,
    dueDate: true,
    hPlus5Overdue: true,
  },
  whatsappTemplate:
    'Assalamualaikum Bapak/Ibu *{nama}* (Unit *{unit}* - {alamat}), kami dari Pengurus *Perumahan Saung Kebun* mengingatkan tagihan iuran lingkungan periode *{periode}* sebesar *{nominal}* (jatuh tempo setiap tanggal {jatuh_tempo}). Pembayaran dapat ditransfer melalui *{rekening}*. Terima kasih atas partisipasi Bapak/Ibu menjaga kenyamanan lingkungan kita.',
  qrisImageUrl: DEFAULT_QRIS_IMAGE_DATA_URL,
  qrisFileName: 'QRIS-Standar-Saung-Kebun.svg',
  qrisMerchantName: 'KAS PERUMAHAN SAUNG KEBUN',
  qrisNmid: 'ID1026000550070',
  qrisUpdatedAt: '2026-10-01T08:00:00.000Z',
  publishArrearsToResidents: true,
  hiddenArrearsUnitIds: [],
  publishedMonthlyReports: ['2026-07', '2026-08', '2026-09', '2026-10'],
  publishedQuarterlyLPJ: ['2026-Q3'],
};


export const DEFAULT_ANNOUNCEMENTS: CommunityActivityAnnouncement[] = [
  {
    id: 'ANN-2026-001',
    title: 'Kerja Bakti Pembersihan Saluran Drainase & Taman Saung Kebun',
    category: 'Kerja Bakti & Lingkungan',
    eventDate: '2026-10-25',
    location: 'Pendopo Saung Kebun & Seluruh Jalur Blok A–D',
    content:
      'Mengundang seluruh Bapak/Ibu warga 55 rumah Perumahan Saung Kebun untuk hadir dalam kegiatan kerja bakti pembersihan saluran drainase menjelang puncak musim hujan serta penataan tanaman hias di sekitar Pendopo Saung Kebun mulai pukul 07.00 WIB.',
    authorName: 'Erlangga (Ketua Paguyuban)',
    published: true,
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'ANN-2026-002',
    title: 'Rapat Evaluasi Kas & Sosialisasi LPJ Triwulan III 2026',
    category: 'Rapat Paguyuban',
    eventDate: '2026-11-01',
    location: 'Pendopo Utama Perumahan Saung Kebun',
    content:
      'Penyampaian laporan pertanggungjawaban (LPJ) kas lingkungan periode Juli–September 2026 serta pembahasan rencana peremajaan lampu penerangan jalan umum (PJU) LED dan kamera CCTV gerbang.',
    authorName: 'Andriansyah (Bendahara Pengurus)',
    published: true,
    createdAt: '2026-10-22T14:30:00.000Z',
  },
  {
    id: 'ANN-2026-003',
    title: 'Jadwal Fogging Nyamuk DBD & Pemeriksaan Jentik Berkala',
    category: 'Kegiatan Warga',
    eventDate: '2026-11-08',
    location: 'Area Taman & Seluruh Rumah Blok A, B, C, D',
    content:
      'Pengurus bekerja sama dengan Puskesmas Majalaya akan melaksanakan fogging pencegahan DBD pada hari Minggu pagi pukul 08.00 WIB. Mohon warga menutup makanan dan membuka akses taman depan rumah.',
    authorName: 'Erlangga (Ketua Paguyuban)',
    published: true,
    createdAt: '2026-10-23T10:15:00.000Z',
  },
];

export const DEFAULT_SECURITY_REPORTS: SecurityGuardReport[] = [
  {
    id: 'SEC-2026-001',
    guardName: 'Danru Suryadi & Petugas Jaga Herman',
    shift: 'Shift Malam (19.00 - 07.00 WIB)',
    reportDate: '2026-10-24',
    patrolArea: 'Pos Gerbang Utama & Patroli Keliling Blok A–D',
    situationStatus: 'Aman Terkendali',
    title: 'Laporan Patroli Malam & Sistem Satu Pintu (One Gate System)',
    summary:
      'Patroli keliling pukul 23.00, 01.30, dan 04.00 WIB di Jl. Saung Melati (Blok A), Jl. Kebun Asri (Blok B), Jl. Saung Cendana (Blok C), dan Jl. Kebun Kenanga (Blok D) berjalan aman terkendali. Portal akses samping telah dikunci pukul 22.00 WIB dan seluruh 8 titik CCTV pos jaga berfungsi normal.',
    published: true,
    createdAt: '2026-10-24T06:45:00.000Z',
  },
  {
    id: 'SEC-2026-002',
    guardName: 'Petugas Jaga Deden Supriatna & Asep Kurnia',
    shift: 'Shift Pagi (07.00 - 19.00 WIB)',
    reportDate: '2026-10-24',
    patrolArea: 'Pos Jaga Depan & Area Taman Saung Kebun',
    situationStatus: 'Waspada Lingkungan',
    title: 'Penertiban Kurir Ekspedisi & Tamu Non-Stiker Warga',
    summary:
      'Petugas pengamanan yang bertugas jaga memberlakukan wajib titip kartu identitas (KTP/SIM) di Pos Satpam bagi tamu dan ojek/kurir roda empat yang tidak memiliki stiker kendaraan resmi Perumahan Saung Kebun. Warga yang menerima tamu menginap mohon menginformasikan ke Pos Satpam.',
    published: true,
    createdAt: '2026-10-24T13:20:00.000Z',
  },
];

export const DEFAULT_SECURITY_OFFICERS: SecurityOfficer[] = [
  {
    id: 'SEC-OFF-01',
    badgeNumber: 'KTA-SK-001',
    name: 'Suryadi',
    rankOrRole: 'Danru (Komandan Regu)',
    phone: '0812-8410-9901',
    assignedShift: 'Shift Malam (19.00 - 07.00 WIB)',
    pin: 'satpam123',
    status: 'Aktif',
    joinedDate: '2023-01-15',
    notes: 'Penanggung jawab pos jaga utama dan koordinasi patroli malam',
  },
  {
    id: 'SEC-OFF-02',
    badgeNumber: 'KTA-SK-002',
    name: 'Herman',
    rankOrRole: 'Petugas Jaga Gerbang',
    phone: '0813-8410-9902',
    assignedShift: 'Shift Malam (19.00 - 07.00 WIB)',
    pin: 'satpam123',
    status: 'Aktif',
    joinedDate: '2023-06-01',
    notes: 'Pemeriksaan tamu dan portal one-gate-system',
  },
  {
    id: 'SEC-OFF-03',
    badgeNumber: 'KTA-SK-003',
    name: 'Deden Supriatna',
    rankOrRole: 'Petugas Jaga Pagi',
    phone: '0857-8410-9903',
    assignedShift: 'Shift Pagi (07.00 - 19.00 WIB)',
    pin: 'satpam123',
    status: 'Aktif',
    joinedDate: '2022-11-10',
    notes: 'Pengawasan kurir paket dan penerimaan tamu siang',
  },
  {
    id: 'SEC-OFF-04',
    badgeNumber: 'KTA-SK-004',
    name: 'Asep Kurnia',
    rankOrRole: 'Petugas Patroli Lingkungan',
    phone: '0878-8410-9904',
    assignedShift: 'Shift Pagi (07.00 - 19.00 WIB)',
    pin: 'satpam123',
    status: 'Aktif',
    joinedDate: '2024-02-01',
    notes: 'Patroli rutin Blok A, B, C, D dan pengecekan PJU / CCTV',
  },
  {
    id: 'SEC-OFF-05',
    badgeNumber: 'KTA-SK-005',
    name: 'Bambang Sujarwo',
    rankOrRole: 'Petugas Keamanan Cadangan / Ronda',
    phone: '0821-8410-9905',
    assignedShift: 'Shift Malam (19.00 - 07.00 WIB)',
    pin: 'satpam123',
    status: 'Aktif',
    joinedDate: '2024-05-15',
    notes: 'Petugas pengganti libur dan bantuan pengamanan acara warga',
  },
];

const UNPAID_SEPT_2026 = new Set(['A-12', 'B-14', 'C-11']);

const UNPAID_OCT_2026 = new Set([
  'A-05',
  'A-12',
  'A-15',
  'B-04',
  'B-09',
  'B-14',
  'C-03',
  'C-08',
  'C-11',
  'C-15',
  'D-06',
  'D-09',
]);

export const DEFAULT_PAYMENT_CONFIRMATIONS: PaymentConfirmation[] = [
  {
    id: 'CONF-2026-001',
    unitId: 'A-05',
    residentName: 'Agus Pratama Putra',
    whatsapp: '081298765435',
    periodMonths: ['2026-10'],
    amount: 100000,
    paymentMethod: 'Transfer BCA Kas',
    transferDate: '2026-10-24',
    senderBank: 'Bank BCA',
    senderAccountName: 'Agus Pratama Putra',
    notes: 'Iuran bulan Oktober 2026 via m-BCA mohon diverifikasi',
    proofImageUrl: DEFAULT_QRIS_IMAGE_DATA_URL,
    proofFileName: 'bukti-transfer-bca-A05.png',
    status: 'MENUNGGU_VERIFIKASI',
    submittedAt: '2026-10-24T10:15:00.000Z',
  },
  {
    id: 'CONF-2026-002',
    unitId: 'A-01',
    residentName: 'Erlangga',
    whatsapp: '081298765431',
    periodMonths: ['2026-10'],
    amount: 100000,
    paymentMethod: 'Transfer BCA Kas',
    transferDate: '2026-10-05',
    senderBank: 'Bank BCA',
    senderAccountName: 'Erlangga',
    notes: 'Iuran bulan Oktober 2026 unit A-01',
    proofImageUrl: DEFAULT_QRIS_IMAGE_DATA_URL,
    proofFileName: 'struk-transfer-A01.png',
    status: 'DISETUJUI',
    submittedAt: '2026-10-05T08:30:00.000Z',
    verifiedAt: '2026-10-05T09:00:00.000Z',
    verifiedBy: 'Andriansyah (Bendahara)',
    resultingTransactionId: 'TRX-20261005-001',
    resultingReceiptNumber: 'SK/KW/2026/10/A01',
  },
];

export function createSeedDatabase(): DatabaseState {
  const residents: ResidentUnit[] = [];
  const blockCounts: Array<{ block: BlockCode; count: number }> = [
    { block: 'A', count: 15 },
    { block: 'B', count: 15 },
    { block: 'C', count: 15 },
    { block: 'D', count: 10 },
  ];

  let idx = 0;
  for (const { block, count } of blockCounts) {
    for (let num = 1; num <= count; num++) {
      const houseNumber = String(num).padStart(2, '0');
      const unitId = `${block}-${houseNumber}`;
      const fullName = RESIDENT_NAMES_55[idx];
      const phonePrefix = ['0812', '0813', '0857', '0878', '0821'][idx % 5];
      const phoneBody = String(84102200 + idx * 137).slice(0, 8);
      const whatsapp = `${phonePrefix}-${phoneBody.slice(0, 4)}-${phoneBody.slice(4, 8)}`;

      const nikSuffix = String(1001 + idx).padStart(4, '0');
      const nik = `320101${String(11 + (idx % 18)).padStart(2, '0')}068${idx % 9}${nikSuffix}`;
      const kkNumber = `320101040919${String(2001 + idx).padStart(4, '0')}`;

      const emailSlug = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '')
        .slice(0, 20);

      let occupancyStatus: OccupancyStatus = 'Dihuni Pemilik';
      if (idx % 9 === 4) occupancyStatus = 'Dikontrakkan';
      else if (idx === 48) occupancyStatus = 'Kosong Terawat';

      const plateLetters = ['SK', 'KBN', 'BGR', 'TKP', 'SGB'][idx % 5];
      const vehiclePlate = `F ${1120 + idx * 17} ${plateLetters}`;

      let notes = 'Warga tetap aktif paguyuban';
      if (unitId === 'A-01') notes = 'Ketua Paguyuban Warga Saung Kebun';
      else if (unitId === 'A-09') notes = 'Bendahara Paguyuban Saung Kebun';
      else if (unitId === 'B-01') notes = 'Sekretaris Paguyuban Saung Kebun';
      else if (occupancyStatus === 'Dikontrakkan') notes = 'Iuran dibayar oleh penyewa bulanan';
      else if (occupancyStatus === 'Kosong Terawat') notes = 'Rumah singgah akhir pekan, iuran tetap berjalan';

      residents.push({
        id: unitId,
        block,
        houseNumber,
        streetName: STREET_BY_BLOCK[block],
        headOfFamily: fullName,
        nik,
        kkNumber,
        whatsapp,
        email: `${emailSlug}@warga-saungkebun.id`,
        occupancyStatus,
        familyMembers: 2 + (idx % 4),
        vehiclePlate,
        joinedYear: 2019 + (idx % 6),
        notes,
        lastRemindedAt: UNPAID_OCT_2026.has(unitId) ? '2026-10-10T08:30:00.000Z' : undefined,
      });

      idx++;
    }
  }

  const transactions: LedgerTransaction[] = [];
  let trxCounter = 1;

  const pushTrx = (item: Omit<LedgerTransaction, 'id' | 'createdAt'>) => {
    const id = `TRX-${String(trxCounter).padStart(4, '0')}`;
    trxCounter++;
    transactions.push({
      ...item,
      id,
      createdAt: `${item.date}T09:00:00.000Z`,
    });
  };

  const seedMonthlyIuran = (periodMonth: string, skipSet: Set<string>) => {
    const [year, month] = periodMonth.split('-');
    residents.forEach((res, i) => {
      if (skipSet.has(res.id)) return;
      const payDay = String(1 + (i % 10)).padStart(2, '0');
      const method = PAYMENT_METHODS[i % PAYMENT_METHODS.length];
      pushTrx({
        receiptNumber: `SK/KW/${year}/${month}/${res.id.replace('-', '')}`,
        date: `${periodMonth}-${payDay}`,
        periodMonth,
        type: 'income',
        category: 'Iuran Bulanan Warga',
        amount: 100000,
        unitId: res.id,
        paymentMethod: method,
        description: `Iuran bulanan lingkungan ${res.id} (${res.headOfFamily}) periode ${periodMonth}`,
        recordedBy: 'Andriansyah',
      });
    });
  };

  // --- JULI 2026 ---
  seedMonthlyIuran('2026-07', new Set());
  pushTrx({
    receiptNumber: 'SK/IN/2026/07/01',
    date: '2026-07-14',
    periodMonth: '2026-07',
    type: 'income',
    category: 'Sewa Saung Warga',
    amount: 350000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Kontribusi pemakaian Pendopo Saung Kebun untuk acara keluarga Blok B',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/07/01',
    date: '2026-07-05',
    periodMonth: '2026-07',
    type: 'expense',
    category: 'Listrik PJU & Air',
    amount: 645000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Token listrik PJU gerbang utama, pos jaga, dan pompa air taman Saung Kebun',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/07/02',
    date: '2026-07-18',
    periodMonth: '2026-07',
    type: 'expense',
    category: 'Perawatan Taman & Saung',
    amount: 480000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Pemangkasan pohon peneduh, pupuk tanaman kebun warga, dan solar mesin rumput',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/07/03',
    date: '2026-07-25',
    periodMonth: '2026-07',
    type: 'expense',
    category: 'Kebersihan & Sampah',
    amount: 1150000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Retribusi pengangkutan sampah 55 rumah (2x seminggu) & kantong pilah',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/07/04',
    date: '2026-07-28',
    periodMonth: '2026-07',
    type: 'expense',
    category: 'Keamanan & Satpam',
    amount: 2400000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Honorarium petugas keamanan shift siang & malam (2 personel) Juli 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/07/05',
    date: '2026-07-30',
    periodMonth: '2026-07',
    type: 'expense',
    category: 'Administrasi & Kas RT',
    amount: 150000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Cetak buku kas, kwitansi cadangan, dan konsumsi rapat pengurus bulanan',
    recordedBy: 'Andriansyah',
  });

  // --- AGUSTUS 2026 ---
  seedMonthlyIuran('2026-08', new Set());
  pushTrx({
    receiptNumber: 'SK/IN/2026/08/01',
    date: '2026-08-12',
    periodMonth: '2026-08',
    type: 'income',
    category: 'Donasi & Sumbangan',
    amount: 750000,
    unitId: null,
    paymentMethod: 'QRIS Saung Kebun',
    description: 'Donasi sukarela warga untuk semarak kebersihan & pengecatan gapura Saung Kebun',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/08/01',
    date: '2026-08-06',
    periodMonth: '2026-08',
    type: 'expense',
    category: 'Listrik PJU & Air',
    amount: 660000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Pembayaran listrik PJU jalan lingkungan Blok A–D dan pos satpam',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/08/02',
    date: '2026-08-15',
    periodMonth: '2026-08',
    type: 'expense',
    category: 'Perbaikan Fasilitas Umum',
    amount: 690000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Pengecatan kanstin jalan utama, portal Blok C, dan penggantian 4 lampu LED PJU',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/08/03',
    date: '2026-08-25',
    periodMonth: '2026-08',
    type: 'expense',
    category: 'Kebersihan & Sampah',
    amount: 1150000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Biaya operasional kebersihan lingkungan & armada pengangkut sampah Agustus',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/08/04',
    date: '2026-08-28',
    periodMonth: '2026-08',
    type: 'expense',
    category: 'Keamanan & Satpam',
    amount: 2400000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Honorarium petugas keamanan lingkungan Saung Kebun Agustus 2026',
    recordedBy: 'Andriansyah',
  });

  // --- SEPTEMBER 2026 ---
  seedMonthlyIuran('2026-09', UNPAID_SEPT_2026);
  pushTrx({
    receiptNumber: 'SK/IN/2026/09/01',
    date: '2026-09-16',
    periodMonth: '2026-09',
    type: 'income',
    category: 'Kartu Akses & Stiker',
    amount: 300000,
    unitId: null,
    paymentMethod: 'QRIS Saung Kebun',
    description: 'Penerbitan 6 stiker kendaraan tambahan warga Perumahan Saung Kebun',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/09/01',
    date: '2026-09-05',
    periodMonth: '2026-09',
    type: 'expense',
    category: 'Listrik PJU & Air',
    amount: 655000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Tagihan listrik penerangan jalan umum (PJU) & air taman saung September 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/09/02',
    date: '2026-09-19',
    periodMonth: '2026-09',
    type: 'expense',
    category: 'Perawatan Taman & Saung',
    amount: 520000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Perawatan gazebo saung kebun, pembersihan saluran drainase menjelang musim hujan',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/09/03',
    date: '2026-09-25',
    periodMonth: '2026-09',
    type: 'expense',
    category: 'Kebersihan & Sampah',
    amount: 1150000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Operasional pengangkutan sampah rumah tangga 55 unit September 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/09/04',
    date: '2026-09-28',
    periodMonth: '2026-09',
    type: 'expense',
    category: 'Keamanan & Satpam',
    amount: 2400000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Honorarium petugas keamanan lingkungan Saung Kebun September 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/09/05',
    date: '2026-09-30',
    periodMonth: '2026-09',
    type: 'expense',
    category: 'Administrasi & Kas RT',
    amount: 175000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Penyusunan dan penggandaan dokumen LPJ Triwulan III untuk arsip pengurus',
    recordedBy: 'Andriansyah',
  });

  // --- OKTOBER 2026 ---
  seedMonthlyIuran('2026-10', UNPAID_OCT_2026);
  pushTrx({
    receiptNumber: 'SK/IN/2026/10/01',
    date: '2026-10-11',
    periodMonth: '2026-10',
    type: 'income',
    category: 'Sewa Saung Warga',
    amount: 400000,
    unitId: null,
    paymentMethod: 'QRIS Saung Kebun',
    description: 'Sewa fasilitas Saung Kebun untuk arisan gabungan & pengajian warga',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/10/01',
    date: '2026-10-05',
    periodMonth: '2026-10',
    type: 'expense',
    category: 'Listrik PJU & Air',
    amount: 675000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Pembayaran listrik PJU Blok A–D dan pompa sumur taman Oktober 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/10/02',
    date: '2026-10-14',
    periodMonth: '2026-10',
    type: 'expense',
    category: 'Perbaikan Fasilitas Umum',
    amount: 420000,
    unitId: null,
    paymentMethod: 'Tunai Bendahara',
    description: 'Perbaikan engsel portal otomatis gerbang depan & servis CCTV pos satpam',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/10/03',
    date: '2026-10-20',
    periodMonth: '2026-10',
    type: 'expense',
    category: 'Kebersihan & Sampah',
    amount: 1150000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Retribusi kebersihan & armada sampah lingkungan Oktober 2026',
    recordedBy: 'Andriansyah',
  });
  pushTrx({
    receiptNumber: 'SK/OUT/2026/10/04',
    date: '2026-10-22',
    periodMonth: '2026-10',
    type: 'expense',
    category: 'Keamanan & Satpam',
    amount: 2400000,
    unitId: null,
    paymentMethod: 'Transfer BCA Kas',
    description: 'Honorarium petugas keamanan lingkungan Saung Kebun Oktober 2026',
    recordedBy: 'Andriansyah',
  });

  const whatsappLogs: WhatsAppNotificationLog[] = [
    {
      id: 'WA-202610-001',
      sentAt: '2026-10-10T08:30:00.000Z',
      unitId: 'A-12',
      residentName: 'Wahyu Hidayatullah',
      whatsapp: '0813-8410-3707',
      periodMonth: '2026-10',
      arrearsMonths: ['2026-09', '2026-10'],
      totalBilled: 200000,
      message:
        'Assalamualaikum Bapak/Ibu *Wahyu Hidayatullah* (Unit *A-12* - Jl. Saung Melati), kami dari Pengurus *Perumahan Saung Kebun* mengingatkan tagihan iuran lingkungan periode *September 2026, Oktober 2026* sebesar *Rp 200.000* (jatuh tempo setiap tanggal 10).',
      triggerType: 'Otomatis Terjadwal',
      status: 'Terkirim',
    },
    {
      id: 'WA-202610-002',
      sentAt: '2026-10-10T08:30:05.000Z',
      unitId: 'B-04',
      residentName: 'Arif Budiman, M.M.',
      whatsapp: '0878-8410-4666',
      periodMonth: '2026-10',
      arrearsMonths: ['2026-10'],
      totalBilled: 100000,
      message:
        'Assalamualaikum Bapak/Ibu *Arif Budiman, M.M.* (Unit *B-04* - Jl. Kebun Asri), kami dari Pengurus *Perumahan Saung Kebun* mengingatkan tagihan iuran lingkungan periode *Oktober 2026* sebesar *Rp 100.000* (jatuh tempo setiap tanggal 10).',
      triggerType: 'Otomatis Terjadwal',
      status: 'Terkirim',
    },
  ];

  return {
    residents,
    transactions,
    whatsappLogs,
    settings: { ...DEFAULT_ADMIN_SETTINGS },
    announcements: DEFAULT_ANNOUNCEMENTS.map((a) => ({ ...a })),
    securityReports: DEFAULT_SECURITY_REPORTS.map((s) => ({ ...s })),
    securityOfficers: DEFAULT_SECURITY_OFFICERS.map((o) => ({ ...o })),
    paymentConfirmations: DEFAULT_PAYMENT_CONFIRMATIONS.map((c) => ({ ...c })),
  };
}

