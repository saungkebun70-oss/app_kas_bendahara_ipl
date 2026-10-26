import type {
  AdminSettings,
  ResidentUnit,
  SecurityOfficer,
  SecurityShiftLabel,
} from '../types/finance';

export type UserRole = 'ketua' | 'bendahara' | 'satpam' | 'warga';

export interface AuthSession {
  role: UserRole;
  isAdmin: boolean;
  isSecurity?: boolean;
  displayName: string;
  roleLabel: string;
  unitId: string | null;
  shiftLabel?: SecurityShiftLabel;
  officerId?: string;
  officerBadge?: string;
  loginAt: string;
}

export interface AdminLoginInput {
  adminRole: 'ketua' | 'bendahara';
  username: string;
  password: string;
}

export interface SatpamLoginInput {
  guardName: string;
  shift: SecurityShiftLabel;
  pin: string;
  officerId?: string;
}

export interface WargaLoginInput {
  unitId: string;
  pin: string;
}

export const ADMIN_CREDENTIALS = {
  ketua: {
    username: 'ketua',
    password: 'ketua123',
    defaultPin: '1122',
  },
  bendahara: {
    username: 'bendahara',
    password: 'bendahara123',
    defaultPin: '3344',
  },
} as const;

export const DEFAULT_SATPAM_PIN = 'satpam123';
export const DEFAULT_WARGA_PIN = '1234';

export function authenticateAdmin(
  input: AdminLoginInput,
  settings: AdminSettings
): { ok: true; session: AuthSession } | { ok: false; error: string } {
  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();

  if (!username || !password) {
    return {
      ok: false,
      error: 'ID Pengurus dan Kata Sandi Otorisasi wajib diisi.',
    };
  }

  if (input.adminRole === 'ketua') {
    const validUser = username === 'ketua' || username === 'hendra';
    const validPass =
      password === ADMIN_CREDENTIALS.ketua.password ||
      password === ADMIN_CREDENTIALS.ketua.defaultPin;

    if (!validUser || !validPass) {
      return {
        ok: false,
        error: 'Kredensial Ketua Paguyuban tidak sesuai. Gunakan ID "ketua" dan sandi "ketua123".',
      };
    }

    return {
      ok: true,
      session: {
        role: 'ketua',
        isAdmin: true,
        displayName: settings.chairpersonName,
        roleLabel: 'Admin — Ketua Paguyuban',
        unitId: 'A-01',
        loginAt: new Date().toISOString(),
      },
    };
  }

  if (input.adminRole === 'bendahara') {
    const validUser = username === 'bendahara' || username === 'andriansyah' || username === 'ratna';
    const validPass =
      password === ADMIN_CREDENTIALS.bendahara.password ||
      password === ADMIN_CREDENTIALS.bendahara.defaultPin;

    if (!validUser || !validPass) {
      return {
        ok: false,
        error:
          'Kredensial Bendahara tidak sesuai. Gunakan ID "bendahara" dan sandi "bendahara123".',
      };
    }

    return {
      ok: true,
      session: {
        role: 'bendahara',
        isAdmin: true,
        displayName: settings.treasurerName,
        roleLabel: 'Admin — Bendahara Pengurus',
        unitId: 'A-09',
        loginAt: new Date().toISOString(),
      },
    };
  }

  return {
    ok: false,
    error: 'Jabatan admin tidak dikenali.',
  };
}

export function authenticateSatpam(
  input: SatpamLoginInput,
  officers?: SecurityOfficer[]
): { ok: true; session: AuthSession } | { ok: false; error: string } {
  const guardName = input.guardName.trim();
  const pin = input.pin.trim().toLowerCase();

  if (!guardName) {
    return {
      ok: false,
      error: 'Nama personel Satuan Pengamanan yang bertugas jaga wajib diisi.',
    };
  }

  // Check against registered officers list if provided
  let matchedOfficer: SecurityOfficer | undefined;
  if (Array.isArray(officers) && officers.length > 0) {
    if (input.officerId) {
      matchedOfficer = officers.find((o) => o.id === input.officerId);
    }
    if (!matchedOfficer) {
      matchedOfficer = officers.find(
        (o) =>
          o.name.toLowerCase() === guardName.toLowerCase() ||
          guardName.toLowerCase().includes(o.name.toLowerCase()) ||
          o.badgeNumber.toLowerCase() === guardName.toLowerCase()
      );
    }

    if (matchedOfficer) {
      if (matchedOfficer.status === 'Nonaktif') {
        return {
          ok: false,
          error: `Akun petugas ${matchedOfficer.name} berstatus Nonaktif. Hubungi Admin Pengurus.`,
        };
      }
      if (matchedOfficer.status === 'Cuti') {
        return {
          ok: false,
          error: `Petugas ${matchedOfficer.name} tercatat sedang dalam masa cuti tugas.`,
        };
      }

      const validOfficerPin =
        pin === matchedOfficer.pin.toLowerCase() ||
        pin === DEFAULT_SATPAM_PIN ||
        pin === '5570';

      if (!validOfficerPin) {
        return {
          ok: false,
          error: `PIN petugas keamanan tidak sesuai untuk ${matchedOfficer.name}. Gunakan PIN "${matchedOfficer.pin}" atau sandi default "${DEFAULT_SATPAM_PIN}".`,
        };
      }

      return {
        ok: true,
        session: {
          role: 'satpam',
          isAdmin: false,
          isSecurity: true,
          displayName: matchedOfficer.name,
          roleLabel: `Satpam Jaga — ${matchedOfficer.rankOrRole}`,
          unitId: null,
          shiftLabel: input.shift || matchedOfficer.assignedShift,
          officerId: matchedOfficer.id,
          officerBadge: matchedOfficer.badgeNumber,
          loginAt: new Date().toISOString(),
        },
      };
    }
  }

  // Fallback generic check
  if (pin !== DEFAULT_SATPAM_PIN && pin !== '5570') {
    return {
      ok: false,
      error: 'Kode otorisasi Pos Satpam tidak sesuai. Gunakan sandi "satpam123" atau PIN "5570".',
    };
  }

  return {
    ok: true,
    session: {
      role: 'satpam',
      isAdmin: false,
      isSecurity: true,
      displayName: guardName,
      roleLabel: `Satpam Jaga (${input.shift.split(' ')[1] || 'Aktif'})`,
      unitId: null,
      shiftLabel: input.shift,
      loginAt: new Date().toISOString(),
    },
  };
}

export function authenticateWarga(
  input: WargaLoginInput,
  residents: ResidentUnit[]
): { ok: true; session: AuthSession } | { ok: false; error: string } {
  const unitId = input.unitId.trim().toUpperCase();
  const pin = input.pin.trim();

  if (!unitId) {
    return {
      ok: false,
      error: 'Pilih nomor unit rumah Anda terlebih dahulu.',
    };
  }

  if (!pin) {
    return {
      ok: false,
      error: 'Masukkan PIN Warga atau 4 digit terakhir nomor WhatsApp terdaftar.',
    };
  }

  const resident = residents.find((r) => r.id.toUpperCase() === unitId);
  if (!resident) {
    return {
      ok: false,
      error: `Unit rumah "${unitId}" tidak terdaftar dalam database 55 rumah Saung Kebun.`,
    };
  }

  const waDigits = resident.whatsapp.replace(/\D/g, '');
  const last4Wa = waDigits.slice(-4);
  const nikLast4 = resident.nik.slice(-4);

  if (pin !== DEFAULT_WARGA_PIN && pin !== last4Wa && pin !== nikLast4) {
    return {
      ok: false,
      error: `PIN Warga tidak sesuai untuk Unit ${resident.id}. Gunakan PIN Warga "${DEFAULT_WARGA_PIN}" atau 4 digit terakhir WhatsApp (${last4Wa}).`,
    };
  }

  return {
    ok: true,
    session: {
      role: 'warga',
      isAdmin: false,
      displayName: resident.headOfFamily,
      roleLabel: `Warga Unit ${resident.id}`,
      unitId: resident.id,
      loginAt: new Date().toISOString(),
    },
  };
}
