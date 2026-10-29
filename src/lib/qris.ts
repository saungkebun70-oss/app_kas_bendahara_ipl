import type { DatabaseState, ResidentUnit } from '../types/finance.ts';
import { formatMonthLabel, formatRupiah, isUnitExemptFromIuran } from './finance.ts';

export interface ResidentQRISPaymentInfo {
  unitId: string;
  residentName: string;
  unpaidMonths: string[];
  unpaidLabels: string[];
  outstandingAmount: number;
  formattedAmount: string;
  nmid: string;
  merchantName: string;
  qrisImageUrl: string;
  qrisFileName: string;
}
const DEFAULT_EVALUATION_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10'];
const ALL_SEMESTER_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

export const DEFAULT_QRIS_SVG_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="320" height="400">
  <rect width="320" height="400" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="0" y="0" width="320" height="68" rx="16" fill="#0b2273"/>
  <rect x="0" y="48" width="320" height="20" fill="#0b2273"/>
  <text x="24" y="34" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="20">QRIS</text>
  <text x="24" y="53" fill="#5eead4" font-family="sans-serif" font-weight="700" font-size="10">QR Code Standar Pembayaran Nasional</text>
  <rect x="246" y="18" width="52" height="30" rx="6" fill="#1547b8" stroke="#38d3c3" stroke-width="1.5"/>
  <text x="272" y="38" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="13">GPN</text>
  <text x="160" y="96" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="800" font-size="15">KAS PERUMAHAN SAUNG KEBUN</text>
  <text x="160" y="114" text-anchor="middle" fill="#475569" font-family="monospace" font-weight="700" font-size="11">NMID: ID1026000550070</text>
  <rect x="55" y="128" width="210" height="210" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="70" y="143" width="48" height="48" fill="none" stroke="#0b2273" stroke-width="7"/>
  <rect x="84" y="157" width="20" height="20" fill="#0b2273"/>
  <rect x="202" y="143" width="48" height="48" fill="none" stroke="#0b2273" stroke-width="7"/>
  <rect x="216" y="157" width="20" height="20" fill="#0b2273"/>
  <rect x="70" y="275" width="48" height="48" fill="none" stroke="#0b2273" stroke-width="7"/>
  <rect x="84" y="289" width="20" height="20" fill="#0b2273"/>
  <g fill="#0b2273">
    <rect x="132" y="143" width="10" height="10"/><rect x="152" y="143" width="10" height="10"/><rect x="172" y="143" width="10" height="10"/>
    <rect x="142" y="155" width="10" height="10"/><rect x="162" y="155" width="20" height="10"/>
    <rect x="132" y="167" width="20" height="10"/><rect x="162" y="167" width="10" height="10"/><rect x="182" y="167" width="10" height="10"/>
    <rect x="132" y="182" width="10" height="20"/><rect x="152" y="182" width="20" height="10"/><rect x="182" y="182" width="10" height="20"/>
    <rect x="70" y="205" width="20" height="10"/><rect x="100" y="205" width="20" height="10"/><rect x="132" y="205" width="20" height="20"/><rect x="165" y="205" width="15" height="10"/><rect x="195" y="205" width="25" height="10"/><rect x="230" y="205" width="20" height="10"/>
    <rect x="70" y="225" width="10" height="20"/><rect x="92" y="225" width="18" height="12"/><rect x="122" y="228" width="15" height="12"/><rect x="182" y="225" width="18" height="18"/><rect x="212" y="225" width="12" height="22"/><rect x="236" y="225" width="14" height="14"/>
    <rect x="70" y="252" width="28" height="10"/><rect x="110" y="252" width="22" height="12"/><rect x="146" y="248" width="28" height="14"/><rect x="186" y="252" width="22" height="12"/><rect x="220" y="252" width="30" height="10"/>
    <rect x="132" y="275" width="14" height="14"/><rect x="156" y="275" width="24" height="12"/><rect x="192" y="275" width="18" height="18"/><rect x="222" y="275" width="28" height="12"/>
    <rect x="132" y="298" width="24" height="10"/><rect x="168" y="298" width="14" height="24"/><rect x="194" y="298" width="28" height="12"/><rect x="232" y="298" width="18" height="24"/>
    <rect x="132" y="314" width="24" height="10"/><rect x="194" y="314" width="28" height="10"/>
  </g>
  <text x="160" y="362" text-anchor="middle" fill="#1547b8" font-family="sans-serif" font-weight="700" font-size="11">Iuran Bulanan Warga Rp 100.000 / Rumah</text>
  <text x="160" y="380" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="10">BCA · Mandiri · BRI · BNI · GoPay · OVO · DANA · ShopeePay</text>
</svg>`;

export const DEFAULT_QRIS_IMAGE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  DEFAULT_QRIS_SVG_MARKUP
)}`;

export interface QRISUploadValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_QRIS_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const MAX_QRIS_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateQRISUploadFile(file: {
  name: string;
  type: string;
  size: number;
}): QRISUploadValidationResult {
  if (!file || !file.name.trim()) {
    return { valid: false, error: 'Pilih file gambar QRIS terlebih dahulu.' };
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.svg');

  if (!ALLOWED_QRIS_MIME_TYPES.has(file.type) && !hasAllowedExtension) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Unggah file gambar QRIS berformat PNG, JPG, WEBP, atau SVG.',
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'File QRIS yang dipilih kosong atau tidak valid.' };
  }

  if (file.size > MAX_QRIS_FILE_BYTES) {
    return {
      valid: false,
      error: 'Ukuran file QRIS maksimal 5 MB agar dapat disimpan dengan cepat.',
    };
  }

  return { valid: true };
}

export function getUnitUnpaidMonths(
  state: DatabaseState,
  unitId: string,
  upToPeriodMonth = '2026-10'
): string[] {
  if (isUnitExemptFromIuran(unitId)) {
    return [];
  }

  const paidMonths = new Set<string>();
  for (const t of state.transactions) {
    if (t.unitId === unitId && t.type === 'income' && t.category === 'Iuran Bulanan Warga') {
      paidMonths.add(t.periodMonth);
    }
  }

  const targetMonths = DEFAULT_EVALUATION_MONTHS.filter((m) => m <= upToPeriodMonth);
  const unpaidInActiveRange = targetMonths.filter((m) => !paidMonths.has(m));

  if (unpaidInActiveRange.length > 0) {
    return unpaidInActiveRange;
  }

  const nextUnpaid = ALL_SEMESTER_MONTHS.find((m) => !paidMonths.has(m));
  return nextUnpaid ? [nextUnpaid] : [];
}

export function getResidentQRISPaymentInfo(
  state: DatabaseState,
  resident: ResidentUnit,
  overrideMonths?: string[]
): ResidentQRISPaymentInfo {
  const unpaidMonths =
    overrideMonths && overrideMonths.length > 0
      ? [...overrideMonths].sort()
      : getUnitUnpaidMonths(state, resident.id, '2026-10');

  const outstandingAmount = unpaidMonths.length * state.settings.monthlyFee;
  const unpaidLabels = unpaidMonths.map(formatMonthLabel);

  return {
    unitId: resident.id,
    residentName: resident.headOfFamily,
    unpaidMonths,
    unpaidLabels,
    outstandingAmount,
    formattedAmount: formatRupiah(outstandingAmount),
    nmid: state.settings.qrisNmid?.trim() || 'ID1026000550070',
    merchantName:
      state.settings.qrisMerchantName?.trim() || state.settings.housingName.toUpperCase(),
    qrisImageUrl: state.settings.qrisImageUrl || DEFAULT_QRIS_IMAGE_DATA_URL,
    qrisFileName: state.settings.qrisFileName || 'QRIS-Standar-Saung-Kebun.svg',
  };
}
