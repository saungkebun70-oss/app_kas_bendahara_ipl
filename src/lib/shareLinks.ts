import type { ResidentUnit, SecurityOfficer } from '../types/finance';

/**
 * Mendapatkan basis URL aplikasi secara cerdas
 * - Jika admin mengisi domain Vercel kustom sendiri (selain placeholder yang belum ada), gunakan domain tersebut.
 * - Secara default menggunakan window.location.origin aktif (sehingga langsung bisa dibuka dan diuji coba tanpa error 404).
 * - Ketika aplikasi dideploy ke Vercel dan dibuka dari domain Vercel, window.location.origin otomatis adalah domain Vercel Anda!
 */
export function getAppBaseUrl(customBaseUrl?: string): string {
  // 1. Jika admin secara eksplisit mengisi custom URL Vercel (bukan placeholder mati saung-kebun.vercel.app)
  if (customBaseUrl && customBaseUrl.trim()) {
    let clean = customBaseUrl.trim().replace(/\/+$/, '');
    clean = clean.replace(/#.*$/, '').replace(/\/+$/, '');
    if (
      !clean.includes('saung-kebun.vercel.app') &&
      clean.length > 8
    ) {
      return clean;
    }
  }

  // 2. Gunakan origin aktif browser saat ini (bekerja langsung di AI Studio preview maupun ketika dibuka di Vercel)
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      if (origin && origin !== 'null' && !origin.startsWith('file:')) {
        return origin;
      }
    }
  } catch {}

  // 3. Fallback preview link yang aktif dan dapat dibuka
  return 'https://ais-pre-jvxodjqg27n6kf6g4ukblc-547004294471.asia-east1.run.app';
}

/**
 * Format nomor WhatsApp ke format internasional 628xxx
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Tautan Portal Warga (Domain Vercel Resmi)
 */
export function getWargaPortalUrl(unitId?: string, customBaseUrl?: string): string {
  const base = getAppBaseUrl(customBaseUrl);
  return `${base}/#warga${unitId ? `?unit=${encodeURIComponent(unitId)}` : ''}`;
}

/**
 * Tautan Portal Pos Keamanan (Domain Vercel Resmi)
 */
export function getKeamananPortalUrl(customBaseUrl?: string): string {
  const base = getAppBaseUrl(customBaseUrl);
  return `${base}/#keamanan`;
}

/**
 * Buat pesan WhatsApp dan link langsung untuk akses Portal Warga
 */
export function generateWargaPortalShare(
  resident: ResidentUnit,
  housingName = 'Saung Kebun',
  rtRwLabel = 'RT 05 / RW 08',
  customBaseUrl?: string
): { url: string; message: string; waLink: string } {
  const portalUrl = getWargaPortalUrl(resident.id, customBaseUrl);
  const pin = resident.accessPin || '1234';

  const message = [
    `*PORTAL WARGA ${housingName.toUpperCase()}*`,
    `_${rtRwLabel}_`,
    ``,
    `Yth. Bpk/Ibu *${resident.headOfFamily}*`,
    `Unit Rumah: *${resident.id}* (Blok ${resident.block})`,
    ``,
    `Berikut adalah tautan resmi Portal Warga untuk memantau iuran kas lingkungan, transparansi keuangan, dan laporan keamanan:`,
    `👉 ${portalUrl}`,
    ``,
    `*Informasi Akses Mandiri:*`,
    `• Nomor Unit: *${resident.id}*`,
    `• PIN Rahasia: *${pin}*`,
    ``,
    `*Fitur Portal Warga:*`,
    `✅ Periksa riwayat & status iuran bulanan`,
    `✅ Pembayaran praktis via QRIS & Transfer BCA Kas`,
    `✅ Konfirmasi transfer & unggah bukti bayar`,
    `✅ Unduh kuitansi digital resmi`,
    `✅ Pantau laporan ronda malam & kontak darurat satpam`,
    ``,
    `_Simpan tautan dan PIN ini dengan baik untuk akses berkala._`,
    `Salam hangat dari Pengurus ${housingName}.`,
  ].join('\n');

  const cleanPhone = formatWhatsAppNumber(resident.whatsapp || '');
  const waLink = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  return {
    url: portalUrl,
    message,
    waLink,
  };
}

/**
 * Buat pesan WhatsApp dan link langsung untuk petugas keamanan / satpam
 */
export function generateSatpamPortalShare(
  officer: SecurityOfficer,
  housingName = 'Saung Kebun'
): { url: string; message: string; waLink: string } {
  const portalUrl = getKeamananPortalUrl();

  const message = [
    `*POS KEAMANAN & SATPAM ${housingName.toUpperCase()}*`,
    ``,
    `Yth. Petugas *${officer.name}*`,
    `Jabatan: *${officer.rankOrRole}* (No. Lencana: ${officer.badgeNumber})`,
    `Jadwal: *${officer.assignedShift}*`,
    ``,
    `Berikut adalah tautan sistem Pos Keamanan & Patroli Lingkungan ${housingName}:`,
    `👉 ${portalUrl}`,
    ``,
    `*Akses Masuk Petugas:*`,
    `• Nama Petugas: *${officer.name}*`,
    `• PIN Petugas: *${officer.pin}*`,
    ``,
    `*Menu Petugas:*`,
    `📝 Buku Tamu Digital & Plat Kendaraan Tamu`,
    `🛡️ Checklist Patroli & Titik Pantau Saung/PJU`,
    `📢 Laporan Situasi & Publikasi Pengumuman Warga`,
    `📞 Kontak Darurat Pengurus & Warga`,
    ``,
    `_Terima kasih atas dedikasi dan kesiagaan menjaga keamanan lingkungan kita._`,
  ].join('\n');

  const cleanPhone = formatWhatsAppNumber(officer.phone || '');
  const waLink = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  return {
    url: portalUrl,
    message,
    waLink,
  };
}
