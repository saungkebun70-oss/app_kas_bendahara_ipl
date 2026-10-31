export type BlockCode = string;

export interface BlockConfig {
  id: string; // e.g. "A", "B1", "B2", "B3", ..., "B9"
  name: string; // e.g. "Blok A", "Blok B1"
  defaultStreet?: string; // e.g. "Gang Duren", "Gang Anggur"
}

export type OccupancyStatus = 'Dihuni Pemilik' | 'Dikontrakkan' | 'Kosong Terawat';

export type PaymentMethod =
  | 'Transfer Bank'
  | 'QRIS'
  | 'Tunai'
  | 'Transfer BCA Kas'
  | 'QRIS Saung Kebun'
  | 'Transfer Mandiri'
  | 'Tunai Bendahara';

export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'Iuran Bulanan Warga'
  | 'Donasi & Sumbangan'
  | 'Sewa Saung Warga'
  | 'Kartu Akses & Stiker'
  | 'Pemasukan Lainnya';

export type ExpenseCategory =
  | 'Keamanan & Satpam'
  | 'Kebersihan & Sampah'
  | 'Listrik PJU & Air'
  | 'Perawatan Taman & Saung'
  | 'Perbaikan Fasilitas Umum'
  | 'Administrasi & Kas RT';

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface ResidentUnit {
  id: string;
  block: BlockCode;
  houseNumber: string;
  streetName: string;
  headOfFamily: string;
  nik: string;
  kkNumber: string;
  whatsapp: string;
  email: string;
  occupancyStatus: OccupancyStatus;
  familyMembers: number;
  vehiclePlate: string;
  joinedYear: number;
  notes: string;
  lastRemindedAt?: string;
  accessPin?: string;
}

export interface LedgerTransaction {
  id: string;
  receiptNumber: string;
  date: string; // YYYY-MM-DD
  periodMonth: string; // YYYY-MM
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  unitId: string | null;
  paymentMethod: PaymentMethod;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface WhatsAppNotificationLog {
  id: string;
  sentAt: string;
  unitId: string;
  residentName: string;
  whatsapp: string;
  periodMonth: string;
  arrearsMonths: string[];
  totalBilled: number;
  message: string;
  triggerType: 'Otomatis Terjadwal' | 'Siaran Massal Admin' | 'Kirim Satuan';
  status: 'Terkirim';
}

export interface AdminSettings {
  housingName: string;
  housingAddress: string;
  rtRwLabel: string;
  monthlyFee: number;
  dueDayOfMonth: number;
  openingBalance2026: number;
  chairpersonName: string;
  treasurerName: string;
  secretaryName: string;
  supervisorName: string;
  bankAccountInfo: string;
  whatsappGatewayLabel: string;
  autoWhatsappEnabled: boolean;
  autoReminderSchedule: {
    hMinus3: boolean;
    dueDate: boolean;
    hPlus5Overdue: boolean;
  };
  whatsappTemplate: string;
  whatsappPaymentLink?: string;
  whatsappPaymentInstructions?: string;
  autoReminderTriggerDay?: number;
  autoReminderLastRunAt?: string;
  qrisImageUrl?: string;
  qrisFileName?: string;
  qrisMerchantName?: string;
  qrisNmid?: string;
  qrisUpdatedAt?: string;
  publishArrearsToResidents?: boolean;
  hiddenArrearsUnitIds?: string[];
  publishedMonthlyReports?: string[]; // e.g. ["2026-07", "2026-08", "2026-09", "2026-10"]
  publishedQuarterlyLPJ?: string[]; // e.g. ["2026-Q3", "2026-Q4"]
  appLogoUrl?: string;
  appLogoFileName?: string;
  customBlocks?: BlockConfig[];
  customStreets?: string[];
}

export type AnnouncementCategory =
  | 'Kegiatan Warga'
  | 'Pengumuman Pengurus'
  | 'Kerja Bakti & Lingkungan'
  | 'Rapat Warga';

export interface CommunityActivityAnnouncement {
  id: string;
  title: string;
  category: AnnouncementCategory;
  eventDate: string; // YYYY-MM-DD
  location: string;
  content: string;
  authorName: string;
  published: boolean;
  createdAt: string;
}

export type SecurityShiftLabel =
  | 'Shift Pagi (07.00 - 19.00 WIB)'
  | 'Shift Malam (19.00 - 07.00 WIB)';

export type SecuritySituationStatus =
  | 'Aman Terkendali'
  | 'Waspada Lingkungan'
  | 'Perhatian Khusus';

export interface SecurityGuardReport {
  id: string;
  guardName: string;
  shift: SecurityShiftLabel;
  reportDate: string; // YYYY-MM-DD
  patrolArea: string;
  situationStatus: SecuritySituationStatus;
  title: string;
  summary: string;
  published: boolean;
  createdAt: string;
}

export type SecurityOfficerStatus = 'Aktif' | 'Cuti' | 'Nonaktif';

export interface SecurityOfficer {
  id: string;
  badgeNumber: string;
  name: string;
  rankOrRole: string;
  phone: string;
  assignedShift: SecurityShiftLabel;
  pin: string;
  status: SecurityOfficerStatus;
  joinedDate: string; // YYYY-MM-DD
  notes: string;
}

export type PaymentConfirmationStatus =
  | 'MENUNGGU_VERIFIKASI'
  | 'DISETUJUI'
  | 'DITOLAK';

export interface PaymentConfirmation {
  id: string;
  unitId: string;
  residentName: string;
  whatsapp: string;
  periodMonths: string[]; // e.g. ["2026-10"]
  amount: number;
  paymentMethod: PaymentMethod;
  transferDate: string; // YYYY-MM-DD
  senderBank: string;
  senderAccountName: string;
  notes?: string;
  proofImageUrl: string;
  proofFileName?: string;
  status: PaymentConfirmationStatus;
  submittedAt: string; // ISO
  verifiedAt?: string; // ISO
  verifiedBy?: string;
  rejectionReason?: string;
  resultingTransactionId?: string;
  resultingReceiptNumber?: string;
}

export interface DatabaseState {
  residents: ResidentUnit[];
  transactions: LedgerTransaction[];
  whatsappLogs: WhatsAppNotificationLog[];
  settings: AdminSettings;
  announcements?: CommunityActivityAnnouncement[];
  securityReports?: SecurityGuardReport[];
  securityOfficers?: SecurityOfficer[];
  paymentConfirmations?: PaymentConfirmation[];
}

