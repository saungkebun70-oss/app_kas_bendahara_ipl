// Documentation photos for Perumahan Saung Kebun Activities & Security Reports

// Helper to generate clean SVG Data URIs with modern gradient backgrounds and architectural/community iconography
function createSvgDataUrl(title: string, subtitle: string, tag: string, theme: 'blue' | 'green' | 'amber' | 'teal' | 'indigo') {
  const themes = {
    blue: { bg1: '#0b2273', bg2: '#1d4ed8', badgeBg: '#dbeafe', badgeText: '#1e40af', icon: '#60a5fa' },
    green: { bg1: '#064e3b', bg2: '#047857', badgeBg: '#d1fae5', badgeText: '#065f46', icon: '#34d399' },
    amber: { bg1: '#78350f', bg2: '#b45309', badgeBg: '#fef3c7', badgeText: '#92400e', icon: '#fbbf24' },
    teal: { bg1: '#134e4a', bg2: '#0f766e', badgeBg: '#ccfbf1', badgeText: '#115e59', icon: '#2dd4bf' },
    indigo: { bg1: '#312e81', bg2: '#4338ca', badgeBg: '#e0e7ff', badgeText: '#3730a3', icon: '#818cf8' },
  };
  const t = themes[theme];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${t.bg1}" />
        <stop offset="100%" stop-color="${t.bg2}" />
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.6)" />
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#grad)" />
    <!-- Grid overlay pattern -->
    <g opacity="0.08" stroke="#ffffff" stroke-width="1.5">
      <line x1="0" y1="100" x2="800" y2="100" />
      <line x1="0" y1="200" x2="800" y2="200" />
      <line x1="0" y1="300" x2="800" y2="300" />
      <line x1="0" y1="400" x2="800" y2="400" />
      <line x1="160" y1="0" x2="160" y2="500" />
      <line x1="320" y1="0" x2="320" y2="500" />
      <line x1="480" y1="0" x2="480" y2="500" />
      <line x1="640" y1="0" x2="640" y2="500" />
    </g>
    <!-- Geometric aesthetic elements -->
    <circle cx="700" cy="90" r="140" fill="none" stroke="${t.icon}" stroke-width="1.5" opacity="0.2" />
    <circle cx="700" cy="90" r="90" fill="none" stroke="${t.icon}" stroke-width="1" opacity="0.15" />
    <rect x="50" y="50" width="100" height="6" rx="3" fill="${t.icon}" opacity="0.7" />

    <!-- Center Icon Circle -->
    <circle cx="400" cy="200" r="54" fill="rgba(255,255,255,0.12)" stroke="${t.icon}" stroke-width="2" />
    <path d="M375 190 H425 M400 165 V215 M380 225 L420 225" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />

    <rect width="800" height="500" fill="url(#overlay)" />

    <!-- Text content banner -->
    <g transform="translate(50, 360)">
      <rect x="0" y="-30" width="140" height="26" rx="13" fill="${t.badgeBg}" />
      <text x="70" y="-13" fill="${t.badgeText}" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${tag}</text>
      <text x="0" y="24" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="bold">${title}</text>
      <text x="0" y="56" fill="rgba(255,255,255,0.8)" font-family="system-ui, sans-serif" font-size="14">${subtitle}</text>
    </g>
    <!-- Watermark timestamp -->
    <text x="750" y="465" fill="rgba(255,255,255,0.6)" font-family="monospace" font-size="11" text-anchor="end">DOKUMENTASI RESMI · SAUNG KEBUN</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Preset Activity Documentation Photos
export const ACTIVITY_PHOTOS = {
  drainase: createSvgDataUrl(
    'Pembersihan Saluran Drainase',
    'Jalur Utama Gang Duren & Gang Anggur · Pukul 07.30 WIB',
    'KERJA BAKTI',
    'teal'
  ),
  taman: createSvgDataUrl(
    'Penataan Taman & Rumput Pendopo',
    'Area Fasum Pendopo Utama Saung Kebun · Pukul 09.00 WIB',
    'LINGKUNGAN',
    'green'
  ),
  rapatLPJ: createSvgDataUrl(
    'Rapat Evaluasi Kas & Sosialisasi LPJ',
    'Penyampaian Buku Kas Triwulan III di Balai Warga',
    'RAPAT WARGA',
    'blue'
  ),
  rapatPJU: createSvgDataUrl(
    'Musyawarah Peremajaan Lampu PJU LED',
    'Diskusi Titik Penerangan Gang Duren & Anggur',
    'PROGRAM KERJA',
    'indigo'
  ),
  foggingJentik: createSvgDataUrl(
    'Pemeriksaan Jentik & Saluran Air',
    'Inspeksi Sanitasi Rumah Warga bersama Puskesmas',
    'KESEHATAN',
    'amber'
  ),
  foggingPengasapan: createSvgDataUrl(
    'Pengasapan Nyamuk DBD (Fogging)',
    'Blok A, B1–B9, C, dan D Bebas Genangan Air',
    'PENCEGAHAN DBD',
    'teal'
  ),
};

// Preset Security Guard Documentation Photos
export const SECURITY_PHOTOS = {
  patroliMalam: createSvgDataUrl(
    'Patroli Malam One Gate System',
    'Pemeriksaan Portal & Pintu Keluar Masuk · Pukul 01.30 WIB',
    'PATROLI JAGA',
    'blue'
  ),
  cctvMonitor: createSvgDataUrl(
    'Pantauan 8 Titik Kamera CCTV Gerbang',
    'Seluruh Sektor Pemukiman Saung Kebun Terpantau Aman',
    'MONITOR CCTV',
    'indigo'
  ),
  penertibanTamu: createSvgDataUrl(
    'Penertiban Kurir & Tamu Non-Stiker',
    'Pencatatan Identitas KTP di Buku Tamu Pos Keamanan',
    'SATPAM POS',
    'teal'
  ),
  rondaBlok: createSvgDataUrl(
    'Keliling Blok B1–B9 & Gang Anggur',
    'Pemeriksaan Kunci Rumah Kosong Terawat & Kendaraan Parkir',
    'RONDA KELILING',
    'green'
  ),
  pemeriksaanPJU: createSvgDataUrl(
    'Pemeriksaan Nyala Lampu PJU & Penerangan',
    'Pintu Gerbang Utama & Pendopo Lingkungan Menyala Terang',
    'FASILITAS UMUM',
    'amber'
  ),
};

export interface PresetPhotoOption {
  label: string;
  category: 'kegiatan' | 'keamanan';
  dataUrl: string;
}

export const PRESET_PHOTO_OPTIONS: PresetPhotoOption[] = [
  { label: 'Kerja Bakti: Drainase Gang Duren', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.drainase },
  { label: 'Kerja Bakti: Penataan Taman Pendopo', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.taman },
  { label: 'Rapat: Presentasi LPJ Triwulan', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.rapatLPJ },
  { label: 'Rapat: Musyawarah Penerangan PJU', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.rapatPJU },
  { label: 'Fogging: Pengasapan Nyamuk DBD', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.foggingPengasapan },
  { label: 'Kesehatan: Pemeriksaan Jentik Air', category: 'kegiatan', dataUrl: ACTIVITY_PHOTOS.foggingJentik },
  { label: 'Satpam: Patroli Malam One Gate System', category: 'keamanan', dataUrl: SECURITY_PHOTOS.patroliMalam },
  { label: 'Satpam: Monitor 8 Titik Kamera CCTV', category: 'keamanan', dataUrl: SECURITY_PHOTOS.cctvMonitor },
  { label: 'Satpam: Penertiban Tamu & Buku Pos', category: 'keamanan', dataUrl: SECURITY_PHOTOS.penertibanTamu },
  { label: 'Satpam: Ronda Keliling Blok B1–B9', category: 'keamanan', dataUrl: SECURITY_PHOTOS.rondaBlok },
  { label: 'Satpam: Pemeriksaan Lampu PJU & Gerbang', category: 'keamanan', dataUrl: SECURITY_PHOTOS.pemeriksaanPJU },
];

/**
 * Convert user uploaded files to Base64 data URLs
 */
export async function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const fileArray = Array.from(files);
  const results: string[] = [];

  for (const file of fileArray) {
    if (!file.type.startsWith('image/')) continue;
    // Limit to 5 MB per photo
    if (file.size > 5 * 1024 * 1024) continue;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    results.push(dataUrl);
  }

  return results;
}
