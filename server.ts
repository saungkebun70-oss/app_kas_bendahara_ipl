import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createSeedDatabase,
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_BLOCKS,
  DEFAULT_PAYMENT_CONFIRMATIONS,
  DEFAULT_SECURITY_OFFICERS,
  DEFAULT_SECURITY_REPORTS,
  DEFAULT_STREETS,
} from './src/lib/seedData.ts';
import { ACTIVITY_PHOTOS, SECURITY_PHOTOS } from './src/lib/documentationPhotos.ts';
import type {
  AdminSettings,
  BlockCode,
  BlockConfig,
  CommunityActivityAnnouncement,
  DatabaseState,
  LedgerTransaction,
  PaymentConfirmation,
  ResidentUnit,
  SecurityGuardReport,
  SecurityOfficer,
  WhatsAppNotificationLog,
} from './src/types/finance.ts';
import {
  syncStateToCloud,
  loadStateFromCloud,
  checkCloudConnection,
} from './src/lib/cloudStorage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'saung-kebun-db.json');
const TMP_DB_FILE = path.join('/tmp', 'saung-kebun-db.json');

function loadDatabase(): DatabaseState {
  try {
    const candidateFile = fs.existsSync(TMP_DB_FILE) ? TMP_DB_FILE : DB_FILE;
    if (fs.existsSync(candidateFile)) {
      const raw = fs.readFileSync(candidateFile, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (Array.isArray(parsed.residents) && parsed.residents.length > 0) {
        parsed.settings = {
          ...DEFAULT_ADMIN_SETTINGS,
          ...parsed.settings,
          qrisImageUrl: parsed.settings?.qrisImageUrl || DEFAULT_ADMIN_SETTINGS.qrisImageUrl,
          qrisFileName: parsed.settings?.qrisFileName || DEFAULT_ADMIN_SETTINGS.qrisFileName,
          qrisMerchantName:
            parsed.settings?.qrisMerchantName || DEFAULT_ADMIN_SETTINGS.qrisMerchantName,
          qrisNmid: parsed.settings?.qrisNmid || DEFAULT_ADMIN_SETTINGS.qrisNmid,
          publishArrearsToResidents:
            parsed.settings?.publishArrearsToResidents ??
            DEFAULT_ADMIN_SETTINGS.publishArrearsToResidents,
          hiddenArrearsUnitIds: Array.isArray(parsed.settings?.hiddenArrearsUnitIds)
            ? parsed.settings.hiddenArrearsUnitIds
            : [],
          publishedMonthlyReports: Array.isArray(parsed.settings?.publishedMonthlyReports)
            ? parsed.settings.publishedMonthlyReports
            : DEFAULT_ADMIN_SETTINGS.publishedMonthlyReports,
          publishedQuarterlyLPJ: Array.isArray(parsed.settings?.publishedQuarterlyLPJ)
            ? parsed.settings.publishedQuarterlyLPJ
            : DEFAULT_ADMIN_SETTINGS.publishedQuarterlyLPJ,
          customBlocks:
            Array.isArray(parsed.settings?.customBlocks) && parsed.settings.customBlocks.length > 0
              ? parsed.settings.customBlocks
              : [...DEFAULT_BLOCKS],
          customStreets:
            Array.isArray(parsed.settings?.customStreets) && parsed.settings.customStreets.length > 0
              ? parsed.settings.customStreets
              : [...DEFAULT_STREETS],
        };
        // Ensure all B1-B9 blocks exist in customBlocks if not already
        const existingBlockIds = new Set((parsed.settings.customBlocks || []).map((b) => b.id.toUpperCase()));
        for (const defBlock of DEFAULT_BLOCKS) {
          if (!existingBlockIds.has(defBlock.id.toUpperCase())) {
            parsed.settings.customBlocks?.push({ ...defBlock });
          }
        }
        // Migrate old street names to Gang Duren / Gang Anggur
        if (Array.isArray(parsed.residents)) {
          parsed.residents = parsed.residents.map((r: ResidentUnit) => {
            let nextStreet = r.streetName || '';
            if (
              nextStreet.startsWith('Jl. Saung Melati') ||
              nextStreet.includes('Melati') ||
              nextStreet.includes('Cendana')
            ) {
              nextStreet = 'Gang Duren';
            } else if (
              nextStreet.startsWith('Jl. Kebun') ||
              nextStreet.includes('Mawar') ||
              nextStreet.includes('Kenanga') ||
              nextStreet.includes('Asri')
            ) {
              nextStreet = 'Gang Anggur';
            }
            return {
              ...r,
              streetName: nextStreet || (r.block.startsWith('B') ? 'Gang Anggur' : 'Gang Duren'),
            };
          });
        }
        if (parsed.settings.chairpersonName) {
          parsed.settings.chairpersonName = parsed.settings.chairpersonName.trim();
          if (parsed.settings.chairpersonName.includes('Hendra Wijaya')) {
            parsed.settings.chairpersonName = 'Erlangga';
          }
        }
        if (!Array.isArray(parsed.announcements)) {
          parsed.announcements = DEFAULT_ANNOUNCEMENTS.map((a) => ({ ...a }));
        } else {
          parsed.announcements = parsed.announcements.map((a) => {
            if (!a.photos || !Array.isArray(a.photos) || a.photos.length === 0) {
              const match = DEFAULT_ANNOUNCEMENTS.find((def) => def.id === a.id);
              if (match && match.photos && match.photos.length > 0) {
                return { ...a, photos: [...match.photos] };
              }
              return { ...a, photos: [ACTIVITY_PHOTOS.drainase, ACTIVITY_PHOTOS.taman] };
            }
            return a;
          });
        }
        if (!Array.isArray(parsed.securityReports)) {
          parsed.securityReports = DEFAULT_SECURITY_REPORTS.map((s) => ({ ...s }));
        } else {
          parsed.securityReports = parsed.securityReports.map((s) => {
            if (!s.photos || !Array.isArray(s.photos) || s.photos.length === 0) {
              const match = DEFAULT_SECURITY_REPORTS.find((def) => def.id === s.id);
              if (match && match.photos && match.photos.length > 0) {
                return { ...s, photos: [...match.photos] };
              }
              return { ...s, photos: [SECURITY_PHOTOS.patroliMalam, SECURITY_PHOTOS.cctvMonitor, SECURITY_PHOTOS.rondaBlok] };
            }
            return s;
          });
        }
        if (!Array.isArray(parsed.securityOfficers)) {
          parsed.securityOfficers = DEFAULT_SECURITY_OFFICERS.map((o) => ({ ...o }));
        }
        if (!Array.isArray(parsed.paymentConfirmations) || parsed.paymentConfirmations.length === 0) {
          parsed.paymentConfirmations = DEFAULT_PAYMENT_CONFIRMATIONS.map((c: PaymentConfirmation) => ({ ...c }));
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading existing DB, seeding fresh state:', err);
  }
  const seeded = createSeedDatabase();
  saveDatabase(seeded);
  return seeded;
}

function saveDatabase(state: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch {
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err2) {
      console.error('Failed writing DB to /tmp fallback:', err2);
    }
  }

  // Asynchronously sync mutations to Google Cloud Firestore online
  syncStateToCloud(state).catch((cloudErr) => {
    console.warn('[CloudDB] Asynchronous cloud sync notice:', cloudErr);
  });
}

let dbState: DatabaseState = loadDatabase();

// Connect to Google Cloud Firestore automatically on startup
(async () => {
  try {
    const cloudState = await loadStateFromCloud();
    if (cloudState && Array.isArray(cloudState.residents) && cloudState.residents.length > 0) {
      dbState = cloudState;
      console.log('[CloudDB] State loaded from online Google Cloud Firestore.');
    } else {
      console.log('[CloudDB] Seeding state to online Google Cloud Firestore...');
      await syncStateToCloud(dbState);
    }
  } catch (err) {
    console.warn('[CloudDB] Auto-connection warning:', err);
  }
})();

function buildReceiptNumber(
  type: 'income' | 'expense',
  periodMonth: string,
  unitId: string | null,
  seq: number
): string {
  const [year, month] = periodMonth.split('-');
  if (unitId && type === 'income') {
    return `SK/KW/${year}/${month}/${unitId.replace('-', '')}`;
  }
  const prefix = type === 'income' ? 'IN' : 'OUT';
  return `SK/${prefix}/${year}/${month}/${String(seq).padStart(3, '0')}`;
}

export const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/state', (_req, res) => {
    res.json(dbState);
  });

  app.get('/api/database/status', async (_req, res) => {
    const status = await checkCloudConnection();
    res.json({
      ...status,
      totalResidents: dbState.residents.length,
      totalTransactions: dbState.transactions.length,
      serverUptime: Math.floor(process.uptime()),
    });
  });

  app.post('/api/database/sync-cloud', async (_req, res) => {
    const success = await syncStateToCloud(dbState);
    res.json({ success, timestamp: new Date().toISOString() });
  });

  app.get('/api/health', async (_req, res) => {
    try {
      const isDbPresent = fs.existsSync(DB_FILE);
      const cloudStatus = await checkCloudConnection();
      res.json({
        status: 'ok',
        database: isDbPresent ? 'connected' : 'memory_only',
        cloudDatabase: cloudStatus.connected ? 'connected' : 'syncing',
        cloudProvider: 'Google Cloud Firestore',
        projectId: cloudStatus.projectId,
        databaseId: cloudStatus.databaseId,
        lastCloudSync: cloudStatus.lastSyncedAt,
        totalResidents: dbState.residents.length,
        totalTransactions: dbState.transactions.length,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
      });
    } catch (err: unknown) {
      res.status(500).json({
        status: 'error',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Unknown database error',
      });
    }
  });

  // Real-time Multi-User Presence Tracker
  interface ActivePresenceSession {
    sessionId: string;
    role: string;
    roleLabel: string;
    displayName: string;
    unitId?: string;
    lastSeen: number;
  }

  const activeSessions = new Map<string, ActivePresenceSession>();

  function cleanupStaleSessions(): void {
    const cutoff = Date.now() - 45000;
    for (const [id, sess] of activeSessions.entries()) {
      if (sess.lastSeen < cutoff) {
        activeSessions.delete(id);
      }
    }
  }

  function getPresenceSummary() {
    cleanupStaleSessions();
    const now = Date.now();
    const sessions = Array.from(activeSessions.values());

    const wargaList = sessions
      .filter((s) => s.role === 'warga')
      .map((s) => ({
        unitId: s.unitId || '-',
        displayName: s.displayName,
        lastSeenSecondsAgo: Math.max(0, Math.round((now - s.lastSeen) / 1000)),
      }));

    const satpamList = sessions
      .filter((s) => s.role === 'satpam')
      .map((s) => ({
        displayName: s.displayName,
        roleLabel: s.roleLabel,
        lastSeenSecondsAgo: Math.max(0, Math.round((now - s.lastSeen) / 1000)),
      }));

    const adminList = sessions
      .filter((s) => s.role === 'admin' || s.role === 'ketua' || s.role === 'bendahara')
      .map((s) => ({
        displayName: s.displayName,
        roleLabel: s.roleLabel,
        lastSeenSecondsAgo: Math.max(0, Math.round((now - s.lastSeen) / 1000)),
      }));

    return {
      totalOnline: sessions.length,
      wargaCount: wargaList.length,
      wargaList,
      satpamCount: satpamList.length,
      satpamList,
      adminCount: adminList.length,
      adminList,
      timestamp: new Date().toISOString(),
    };
  }

  app.post('/api/presence/heartbeat', (req, res) => {
    const { sessionId, role, roleLabel, displayName, unitId } = req.body as {
      sessionId?: string;
      role?: string;
      roleLabel?: string;
      displayName?: string;
      unitId?: string;
    };

    if (!sessionId || !role) {
      res.status(400).json({ error: 'sessionId and role are required' });
      return;
    }

    activeSessions.set(sessionId, {
      sessionId,
      role,
      roleLabel: roleLabel || role,
      displayName: displayName || 'Pengguna',
      unitId,
      lastSeen: Date.now(),
    });

    res.json(getPresenceSummary());
  });

  app.get('/api/presence/summary', (_req, res) => {
    res.json(getPresenceSummary());
  });

  app.post('/api/presence/logout', (req, res) => {
    const { sessionId } = req.body as { sessionId?: string };
    if (sessionId) {
      activeSessions.delete(sessionId);
    }
    res.json(getPresenceSummary());
  });

  app.post('/api/transactions', (req, res) => {
    const {
      date,
      periodMonth,
      type,
      category,
      amount,
      unitId,
      paymentMethod,
      description,
      recordedBy,
    } = req.body as Partial<LedgerTransaction>;

    if (!date || !periodMonth || !type || !category || !paymentMethod) {
      res.status(400).json({ error: 'Mohon lengkapi tanggal, periode bulan, kategori, dan metode pembayaran.' });
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Nominal transaksi harus lebih besar dari Rp 0.' });
      return;
    }

    if (category === 'Iuran Bulanan Warga') {
      if (!unitId) {
        res.status(400).json({ error: 'Pilih unit rumah warga untuk pembayaran iuran bulanan.' });
        return;
      }
      const duplicate = dbState.transactions.find(
        (t) =>
          t.type === 'income' &&
          t.category === 'Iuran Bulanan Warga' &&
          t.unitId === unitId &&
          t.periodMonth === periodMonth
      );
      if (duplicate) {
        res.status(409).json({
          error: `Unit ${unitId} sudah tercatat LUNAS pada periode ${periodMonth} (${duplicate.receiptNumber}).`,
        });
        return;
      }
    }

    const trimmedDesc = (description ?? '').trim();
    if (!trimmedDesc) {
      res.status(400).json({ error: 'Uraian atau keterangan transaksi wajib diisi.' });
      return;
    }

    const nextSeq = dbState.transactions.length + 1;
    const newTrx: LedgerTransaction = {
      id: `TRX-${Date.now()}-${nextSeq}`,
      receiptNumber: buildReceiptNumber(type, periodMonth, unitId ?? null, nextSeq),
      date,
      periodMonth,
      type,
      category,
      amount: Math.round(numericAmount),
      unitId: unitId ?? null,
      paymentMethod,
      description: trimmedDesc,
      recordedBy: recordedBy?.trim() || dbState.settings.treasurerName,
      createdAt: new Date().toISOString(),
    };

    dbState = {
      ...dbState,
      transactions: [...dbState.transactions, ...newTrx ? [newTrx] : []],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.post('/api/transactions/batch-iuran', (req, res) => {
    const { unitId, periodMonths, date, paymentMethod, notes, recordedBy } = req.body as {
      unitId?: string;
      periodMonths?: string[];
      date?: string;
      paymentMethod?: LedgerTransaction['paymentMethod'];
      notes?: string;
      recordedBy?: string;
    };

    if (!unitId || !Array.isArray(periodMonths) || periodMonths.length === 0 || !date || !paymentMethod) {
      res.status(400).json({ error: 'Pilih unit rumah dan minimal 1 periode bulan iuran.' });
      return;
    }

    const resident = dbState.residents.find((r) => r.id === unitId);
    if (!resident) {
      res.status(404).json({ error: 'Unit rumah tidak ditemukan di database.' });
      return;
    }

    const added: LedgerTransaction[] = [];
    for (const pm of periodMonths) {
      const alreadyPaid = dbState.transactions.some(
        (t) =>
          t.type === 'income' &&
          t.category === 'Iuran Bulanan Warga' &&
          t.unitId === unitId &&
          t.periodMonth === pm
      );
      if (alreadyPaid) continue;

      const seq = dbState.transactions.length + added.length + 1;
      added.push({
        id: `TRX-${Date.now()}-${seq}`,
        receiptNumber: buildReceiptNumber('income', pm, unitId, seq),
        date,
        periodMonth: pm,
        type: 'income',
        category: 'Iuran Bulanan Warga',
        amount: dbState.settings.monthlyFee,
        unitId,
        paymentMethod,
        description: notes?.trim()
          ? `${notes.trim()} (${unitId} - ${pm})`
          : `Iuran bulanan lingkungan ${unitId} (${resident.headOfFamily}) periode ${pm}`,
        recordedBy: recordedBy?.trim() || dbState.settings.treasurerName,
        createdAt: new Date().toISOString(),
      });
    }

    if (added.length === 0) {
      res.status(409).json({ error: 'Seluruh periode bulan yang dipilih sudah berstatus lunas.' });
      return;
    }

    dbState = {
      ...dbState,
      transactions: [...dbState.transactions, ...added],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const exists = dbState.transactions.some((t) => t.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Data transaksi tidak ditemukan.' });
      return;
    }
    dbState = {
      ...dbState,
      transactions: dbState.transactions.filter((t) => t.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/residents', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    if (userRole && userRole !== 'bendahara') {
      res.status(403).json({
        error: 'Otorisasi ditolak. Penambahan data warga baru hanya dapat dilakukan oleh akun Bendahara.',
      });
      return;
    }

    const raw = req.body as Partial<ResidentUnit>;
    const block = (raw.block || 'A').toUpperCase() as BlockCode;
    const houseNumber = String(raw.houseNumber || '').trim();
    if (!houseNumber) {
      res.status(400).json({ error: 'Nomor rumah wajib diisi.' });
      return;
    }
    const id = raw.id ? raw.id.trim().toUpperCase() : `${block}-${houseNumber.padStart(2, '0')}`;

    if (dbState.residents.some((r) => r.id.toLowerCase() === id.toLowerCase())) {
      res.status(400).json({ error: `Unit ${id} sudah terdaftar dalam sistem.` });
      return;
    }
    if (!raw.headOfFamily || raw.headOfFamily.trim().length < 2) {
      res.status(400).json({ error: 'Nama kepala keluarga minimal 2 karakter.' });
      return;
    }
    if (!raw.whatsapp || raw.whatsapp.replace(/\D/g, '').length < 9) {
      res.status(400).json({ error: 'Nomor WhatsApp warga harus valid (minimal 9 digit).' });
      return;
    }

    const blockList = dbState.settings.customBlocks || DEFAULT_BLOCKS;
    const blockMatch = blockList.find((b) => b.id.toUpperCase() === block.toUpperCase());
    const defaultGang = blockMatch?.defaultStreet || (block.toUpperCase().startsWith('B') ? 'Gang Anggur' : 'Gang Duren');

    const cleanWaDigits = raw.whatsapp.replace(/\D/g, '');
    const defaultPin = raw.accessPin?.trim() || cleanWaDigits.slice(-4) || '1234';

    const newResident: ResidentUnit = {
      id,
      block,
      houseNumber,
      streetName: raw.streetName?.trim() || defaultGang,
      headOfFamily: raw.headOfFamily.trim(),
      nik: raw.nik?.trim() || `320101${cleanWaDigits.slice(-6).padStart(6, '0')}0001`,
      kkNumber: raw.kkNumber?.trim() || `320101${cleanWaDigits.slice(-6).padStart(6, '0')}0002`,
      whatsapp: raw.whatsapp.trim(),
      email: raw.email?.trim() || '',
      occupancyStatus: raw.occupancyStatus || 'Dihuni Pemilik',
      familyMembers: Number(raw.familyMembers) || 1,
      vehiclePlate: raw.vehiclePlate?.trim() || '-',
      joinedYear: Number(raw.joinedYear) || 2026,
      notes: raw.notes?.trim() || '',
      accessPin: defaultPin,
    };

    const nextResidents = [...dbState.residents, newResident];
    nextResidents.sort((a, b) => {
      if (a.block !== b.block) {
        return a.block.localeCompare(b.block, undefined, { numeric: true, sensitivity: 'base' });
      }
      const nA = Number(a.houseNumber.replace(/\D/g, '')) || 0;
      const nB = Number(b.houseNumber.replace(/\D/g, '')) || 0;
      return nA - nB || a.id.localeCompare(b.id);
    });

    dbState = {
      ...dbState,
      residents: nextResidents,
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.put('/api/residents/:id', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    if (userRole && userRole !== 'bendahara') {
      res.status(403).json({
        error: 'Otorisasi ditolak. Pengubahan profil data warga hanya dapat dilakukan oleh akun Bendahara.',
      });
      return;
    }

    const { id } = req.params;
    const updates = req.body as Partial<ResidentUnit>;
    const idx = dbState.residents.findIndex((r) => r.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Unit warga tidak ditemukan.' });
      return;
    }

    if (updates.headOfFamily !== undefined && updates.headOfFamily.trim().length < 2) {
      res.status(400).json({ error: 'Nama kepala keluarga tidak boleh kosong.' });
      return;
    }
    if (updates.whatsapp !== undefined && updates.whatsapp.replace(/\D/g, '').length < 9) {
      res.status(400).json({ error: 'Nomor WhatsApp warga harus valid (minimal 9 digit).' });
      return;
    }

    const updatedResident: ResidentUnit = {
      ...dbState.residents[idx],
      ...updates,
      id: dbState.residents[idx].id,
      block: updates.block || dbState.residents[idx].block,
      houseNumber: updates.houseNumber || dbState.residents[idx].houseNumber,
    };

    const nextResidents = [...dbState.residents];
    nextResidents[idx] = updatedResident;
    dbState = {
      ...dbState,
      residents: nextResidents,
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/residents/:id', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    if (userRole && userRole !== 'bendahara') {
      res.status(403).json({
        error: 'Otorisasi ditolak. Penghapusan data warga hanya dapat dilakukan oleh akun Bendahara.',
      });
      return;
    }

    const { id } = req.params;
    if (id === 'A-01' || id === 'A-09') {
      res.status(400).json({ error: 'Unit Pengurus Lingkungan (Ketua/Bendahara) tidak dapat dihapus.' });
      return;
    }
    const idx = dbState.residents.findIndex((r) => r.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Unit warga tidak ditemukan.' });
      return;
    }

    dbState = {
      ...dbState,
      residents: dbState.residents.filter((r) => r.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  // --- Blok & Gang / Jalan Management Endpoints ---
  app.post('/api/settings/blocks', (req, res) => {
    const { id, name, defaultStreet } = req.body as Partial<BlockConfig>;
    if (!id || !name) {
      res.status(400).json({ error: 'Kode Blok dan Nama Blok wajib diisi.' });
      return;
    }
    const cleanId = id.trim().toUpperCase();
    const cleanName = name.trim();
    const currentBlocks: BlockConfig[] = dbState.settings.customBlocks || [...DEFAULT_BLOCKS];

    if (currentBlocks.some((b) => b.id.toUpperCase() === cleanId)) {
      res.status(400).json({ error: `Blok ${cleanId} sudah terdaftar dalam sistem.` });
      return;
    }

    const newBlock: BlockConfig = {
      id: cleanId,
      name: cleanName,
      defaultStreet: defaultStreet?.trim() || 'Gang Duren',
    };

    const nextBlocks = [...currentBlocks, newBlock];
    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        customBlocks: nextBlocks,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.put('/api/settings/blocks/:id', (req, res) => {
    const { id } = req.params;
    const { name, defaultStreet } = req.body as Partial<BlockConfig>;
    const currentBlocks: BlockConfig[] = dbState.settings.customBlocks || [...DEFAULT_BLOCKS];
    const idx = currentBlocks.findIndex((b) => b.id.toUpperCase() === id.toUpperCase());
    if (idx === -1) {
      res.status(404).json({ error: `Blok ${id} tidak ditemukan.` });
      return;
    }

    const updated: BlockConfig = {
      ...currentBlocks[idx],
      ...(name ? { name: name.trim() } : {}),
      ...(defaultStreet ? { defaultStreet: defaultStreet.trim() } : {}),
    };

    const nextBlocks = [...currentBlocks];
    nextBlocks[idx] = updated;

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        customBlocks: nextBlocks,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/settings/blocks/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = id.trim().toUpperCase();

    // Check if any resident units currently belong to this block
    const residentCount = dbState.residents.filter(
      (r) => r.block.toUpperCase() === cleanId || r.id.startsWith(`${cleanId}-`)
    ).length;

    if (residentCount > 0) {
      res.status(400).json({
        error: `Blok ${cleanId} tidak dapat dihapus karena masih digunakan oleh ${residentCount} warga terdaftar. Pindahkan atau hapus data warga pada blok ini terlebih dahulu.`,
      });
      return;
    }

    if (cleanId === 'A') {
      res.status(400).json({ error: 'Blok A adalah blok utama pengurus dan tidak dapat dihapus.' });
      return;
    }

    const currentBlocks: BlockConfig[] = dbState.settings.customBlocks || [...DEFAULT_BLOCKS];
    const nextBlocks = currentBlocks.filter((b) => b.id.toUpperCase() !== cleanId);

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        customBlocks: nextBlocks,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/settings/streets', (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nama Gang / Jalan wajib diisi.' });
      return;
    }
    const cleanName = name.trim();
    const currentStreets = dbState.settings.customStreets || [...DEFAULT_STREETS];
    if (currentStreets.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
      res.json(dbState);
      return;
    }

    const nextStreets = [...currentStreets, cleanName];
    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        customStreets: nextStreets,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/settings/streets', (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: 'Nama Gang wajib disertakan.' });
      return;
    }
    const currentStreets = dbState.settings.customStreets || [...DEFAULT_STREETS];
    const nextStreets = currentStreets.filter((s) => s.toLowerCase() !== name.toLowerCase());

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        customStreets: nextStreets,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/whatsapp/send', (req, res) => {
    const { unitId, periodMonth, arrearsMonths, totalBilled, message } = req.body as {
      unitId?: string;
      periodMonth?: string;
      arrearsMonths?: string[];
      totalBilled?: number;
      message?: string;
    };

    const resident = dbState.residents.find((r) => r.id === unitId);
    if (!resident || !periodMonth || !message) {
      res.status(400).json({ error: 'Data penerima atau pesan WhatsApp tidak lengkap.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newLog: WhatsAppNotificationLog = {
      id: `WA-${Date.now()}`,
      sentAt: nowIso,
      unitId: resident.id,
      residentName: resident.headOfFamily,
      whatsapp: resident.whatsapp,
      periodMonth,
      arrearsMonths: arrearsMonths ?? [periodMonth],
      totalBilled: Number(totalBilled) || dbState.settings.monthlyFee,
      message,
      triggerType: 'Kirim Satuan',
      status: 'Terkirim',
    };

    dbState = {
      ...dbState,
      residents: dbState.residents.map((r) =>
        r.id === resident.id ? { ...r, lastRemindedAt: nowIso } : r
      ),
      whatsappLogs: [newLog, ...dbState.whatsappLogs],
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/whatsapp/broadcast', (req, res) => {
    const { periodMonth, items } = req.body as {
      periodMonth?: string;
      items?: Array<{
        unitId: string;
        arrearsMonths: string[];
        totalBilled: number;
        message: string;
      }>;
    };

    if (!periodMonth || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Tidak ada daftar warga belum membayar untuk dikirimkan notifikasi.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const remindedIds = new Set<string>();
    const logsToAdd: WhatsAppNotificationLog[] = [];

    items.forEach((item, index) => {
      const resident = dbState.residents.find((r) => r.id === item.unitId);
      if (!resident) return;
      remindedIds.add(resident.id);
      logsToAdd.push({
        id: `WA-${Date.now()}-${index + 1}`,
        sentAt: nowIso,
        unitId: resident.id,
        residentName: resident.headOfFamily,
        whatsapp: resident.whatsapp,
        periodMonth,
        arrearsMonths: item.arrearsMonths,
        totalBilled: item.totalBilled,
        message: item.message,
        triggerType: 'Siaran Massal Admin',
        status: 'Terkirim',
      });
    });

    dbState = {
      ...dbState,
      residents: dbState.residents.map((r) =>
        remindedIds.has(r.id) ? { ...r, lastRemindedAt: nowIso } : r
      ),
      whatsappLogs: [...logsToAdd, ...dbState.whatsappLogs],
    };
    saveDatabase(dbState);
    res.json({ state: dbState, sentCount: logsToAdd.length });
  });

  // Automated WhatsApp Reminder System
  function checkAndRunAutomatedReminders(
    force = false,
    targetPeriod?: string
  ): {
    sentCount: number;
    logs: WhatsAppNotificationLog[];
    eligibleCount: number;
    dueDay: number;
    period: string;
    message: string;
  } {
    const settings = dbState.settings;
    if (!settings.autoWhatsappEnabled && !force) {
      return {
        sentCount: 0,
        logs: [],
        eligibleCount: 0,
        dueDay: settings.dueDayOfMonth || 10,
        period: targetPeriod || '2026-10',
        message: 'Otomasi WhatsApp dinonaktifkan dalam Pengaturan Admin.',
      };
    }

    const now = new Date();
    const currentDay = now.getDate();
    const period = targetPeriod || '2026-10';
    const dueDay = settings.dueDayOfMonth || 10;
    const triggerDay = settings.autoReminderTriggerDay || dueDay;

    if (!force) {
      const isExactDue = currentDay === dueDay;
      const isTriggerDay = currentDay === triggerDay;
      const isHMinus3 =
        settings.autoReminderSchedule?.hMinus3 &&
        currentDay === Math.max(1, dueDay - 3);
      const isHPlus5 =
        settings.autoReminderSchedule?.hPlus5Overdue &&
        currentDay === dueDay + 5;
      const isPastDue = currentDay >= dueDay;

      const isEligibleDate =
        isExactDue || isTriggerDay || isHMinus3 || isHPlus5 || isPastDue;
      if (!isEligibleDate) {
        return {
          sentCount: 0,
          logs: [],
          eligibleCount: 0,
          dueDay,
          period,
          message: `Hari ini (tanggal ${currentDay}) belum mencapai jadwal penagihan (jatuh tempo tanggal ${dueDay}).`,
        };
      }
    }

    const paidUnits = new Set<string>();
    for (const t of dbState.transactions) {
      if (
        t.type === 'income' &&
        t.category === 'Iuran Bulanan Warga' &&
        t.unitId &&
        t.periodMonth === period
      ) {
        paidUnits.add(t.unitId);
      }
    }

    const unpaidResidents = dbState.residents.filter((r) => !paidUnits.has(r.id));
    if (unpaidResidents.length === 0) {
      return {
        sentCount: 0,
        logs: [],
        eligibleCount: 0,
        dueDay,
        period,
        message: `Seluruh 55 unit warga sudah lunas untuk periode ${period}.`,
      };
    }

    const todayStr = now.toISOString().split('T')[0];
    const nowIso = now.toISOString();
    const logsToAdd: WhatsAppNotificationLog[] = [];
    const remindedIds = new Set<string>();

    const linkBayar =
      settings.whatsappPaymentLink ||
      'https://ais-pre-jvxodjqg27n6kf6g4ukblc-547004294471.asia-east1.run.app/#warga';
    const instruksiBayar =
      settings.whatsappPaymentInstructions ||
      `1. Transfer Bank BCA: ${settings.bankAccountInfo}\n2. Atau Scan QRIS via link Portal Warga di bawah\n3. Unggah bukti transfer melalui Portal Warga agar diverifikasi`;
    const feeNominal = settings.monthlyFee || 100000;
    const formattedFee = `Rp ${feeNominal.toLocaleString('id-ID')}`;

    for (const resident of unpaidResidents) {
      if (!force && resident.lastRemindedAt && resident.lastRemindedAt.startsWith(todayStr)) {
        continue;
      }

      const template =
        settings.whatsappTemplate ||
        'Assalamualaikum Bapak/Ibu *{nama}* (Unit *{unit}*), tagihan iuran bulanan periode *{periode}* sebesar *{nominal}* telah jatuh tempo (tanggal {jatuh_tempo}).\n\n*Cara Pembayaran:*\n{instruksi_bayar}\n\n*Link Portal Warga:*\n{link_bayar}';

      const message = template
        .replace(/\{nama\}/g, resident.headOfFamily)
        .replace(/\{unit\}/g, resident.id)
        .replace(/\{alamat\}/g, resident.streetName)
        .replace(/\{periode\}/g, period === '2026-10' ? 'Oktober 2026' : period)
        .replace(/\{nominal\}/g, formattedFee)
        .replace(/\{jatuh_tempo\}/g, String(dueDay))
        .replace(/\{rekening\}/g, settings.bankAccountInfo)
        .replace(/\{link_bayar\}/g, linkBayar)
        .replace(/\{instruksi_bayar\}/g, instruksiBayar);

      logsToAdd.push({
        id: `WA-AUTO-${Date.now()}-${logsToAdd.length + 1}`,
        sentAt: nowIso,
        unitId: resident.id,
        residentName: resident.headOfFamily,
        whatsapp: resident.whatsapp,
        periodMonth: period,
        arrearsMonths: [period],
        totalBilled: feeNominal,
        message,
        triggerType: 'Otomatis Terjadwal',
        status: 'Terkirim',
      });
      remindedIds.add(resident.id);
    }

    if (logsToAdd.length > 0) {
      dbState = {
        ...dbState,
        residents: dbState.residents.map((r) =>
          remindedIds.has(r.id) ? { ...r, lastRemindedAt: nowIso } : r
        ),
        whatsappLogs: [...logsToAdd, ...dbState.whatsappLogs],
        settings: {
          ...dbState.settings,
          autoReminderLastRunAt: nowIso,
        },
      };
      saveDatabase(dbState);
    }

    return {
      sentCount: logsToAdd.length,
      logs: logsToAdd,
      eligibleCount: unpaidResidents.length,
      dueDay,
      period,
      message:
        logsToAdd.length > 0
          ? `Otomasi berhasil mengirimkan ${logsToAdd.length} pesan pengingat WhatsApp ke warga belum bayar.`
          : 'Semua warga yang belum membayar sudah diingatkan hari ini.',
    };
  }

  // Automatic background reminder runner (checks every 30 minutes)
  setInterval(() => {
    try {
      checkAndRunAutomatedReminders(false);
    } catch (err) {
      console.error('Background automated WhatsApp error:', err);
    }
  }, 30 * 60 * 1000);

  app.post('/api/whatsapp/auto-remind', (req, res) => {
    const { force, periodMonth } = req.body as {
      force?: boolean;
      periodMonth?: string;
    };
    const result = checkAndRunAutomatedReminders(force ?? true, periodMonth);
    res.json({
      state: dbState,
      ...result,
    });
  });

  app.get('/api/whatsapp/auto-status', (_req, res) => {
    const period = '2026-10';
    const paidUnits = new Set<string>();
    for (const t of dbState.transactions) {
      if (
        t.type === 'income' &&
        t.category === 'Iuran Bulanan Warga' &&
        t.unitId &&
        t.periodMonth === period
      ) {
        paidUnits.add(t.unitId);
      }
    }
    const unpaidCount = dbState.residents.filter((r) => !paidUnits.has(r.id)).length;

    res.json({
      autoWhatsappEnabled: dbState.settings.autoWhatsappEnabled,
      dueDayOfMonth: dbState.settings.dueDayOfMonth,
      autoReminderTriggerDay:
        dbState.settings.autoReminderTriggerDay ?? dbState.settings.dueDayOfMonth,
      autoReminderSchedule: dbState.settings.autoReminderSchedule,
      autoReminderLastRunAt: dbState.settings.autoReminderLastRunAt,
      unpaidCount,
      monthlyFee: dbState.settings.monthlyFee,
      whatsappPaymentLink: dbState.settings.whatsappPaymentLink,
      whatsappPaymentInstructions: dbState.settings.whatsappPaymentInstructions,
      activePeriodMonth: period,
      serverTime: new Date().toISOString(),
    });
  });

  app.put('/api/settings', (req, res) => {
    const incoming = req.body as Partial<AdminSettings>;
    const monthlyFee = Number(incoming.monthlyFee);
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
      res.status(400).json({ error: 'Nominal iuran bulanan wajib lebih dari Rp 0.' });
      return;
    }

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        ...incoming,
        monthlyFee: Math.round(monthlyFee),
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.patch('/api/settings/arrears-publication', (req, res) => {
    const { publishArrearsToResidents, toggleUnitId } = req.body as {
      publishArrearsToResidents?: boolean;
      toggleUnitId?: string;
    };

    let nextPublishAll = dbState.settings.publishArrearsToResidents ?? true;
    if (typeof publishArrearsToResidents === 'boolean') {
      nextPublishAll = publishArrearsToResidents;
    }

    let nextHidden = [...(dbState.settings.hiddenArrearsUnitIds ?? [])];
    if (toggleUnitId) {
      if (nextHidden.includes(toggleUnitId)) {
        nextHidden = nextHidden.filter((id) => id !== toggleUnitId);
      } else {
        nextHidden.push(toggleUnitId);
      }
    }

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        publishArrearsToResidents: nextPublishAll,
        hiddenArrearsUnitIds: nextHidden,
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/announcements', (req, res) => {
    const { title, category, eventDate, location, content, authorName, published, photos } =
      req.body as Partial<CommunityActivityAnnouncement>;

    if (!title?.trim() || !content?.trim() || !eventDate) {
      res.status(400).json({
        error: 'Judul kegiatan/pengumuman, tanggal, dan isi informasi wajib diisi.',
      });
      return;
    }

    const cleanedPhotos = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];

    const newItem: CommunityActivityAnnouncement = {
      id: `ANN-${Date.now()}`,
      title: title.trim(),
      category: category || 'Kegiatan Warga',
      eventDate,
      location: location?.trim() || 'Lingkungan Perumahan Saung Kebun',
      content: content.trim(),
      authorName: authorName?.trim() || dbState.settings.chairpersonName,
      published: published !== false,
      createdAt: new Date().toISOString(),
      photos: cleanedPhotos,
    };

    dbState = {
      ...dbState,
      announcements: [newItem, ...(dbState.announcements ?? [])],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.patch('/api/announcements/:id/publish', (req, res) => {
    const { id } = req.params;
    const { published } = req.body as { published?: boolean };
    const list = dbState.announcements ?? [];
    const exists = list.some((a) => a.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Data informasi kegiatan tidak ditemukan.' });
      return;
    }

    dbState = {
      ...dbState,
      announcements: list.map((item) =>
        item.id === id
          ? { ...item, published: typeof published === 'boolean' ? published : !item.published }
          : item
      ),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/announcements/:id', (req, res) => {
    const { id } = req.params;
    dbState = {
      ...dbState,
      announcements: (dbState.announcements ?? []).filter((a) => a.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/security-reports', (req, res) => {
    const {
      guardName,
      shift,
      reportDate,
      patrolArea,
      situationStatus,
      title,
      summary,
      published,
      photos,
    } = req.body as Partial<SecurityGuardReport>;

    if (!guardName?.trim() || !title?.trim() || !summary?.trim() || !reportDate) {
      res.status(400).json({
        error: 'Nama petugas satpam jaga, judul laporan, tanggal, dan rincian keamanan wajib diisi.',
      });
      return;
    }

    const cleanedPhotos = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];

    const newReport: SecurityGuardReport = {
      id: `SEC-${Date.now()}`,
      guardName: guardName.trim(),
      shift: shift || 'Shift Malam (19.00 - 07.00 WIB)',
      reportDate,
      patrolArea: patrolArea?.trim() || 'Pos Gerbang Utama & Blok A–D',
      situationStatus: situationStatus || 'Aman Terkendali',
      title: title.trim(),
      summary: summary.trim(),
      published: published !== false,
      createdAt: new Date().toISOString(),
      photos: cleanedPhotos,
    };

    dbState = {
      ...dbState,
      securityReports: [newReport, ...(dbState.securityReports ?? [])],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.patch('/api/security-reports/:id/publish', (req, res) => {
    const { id } = req.params;
    const { published } = req.body as { published?: boolean };
    const list = dbState.securityReports ?? [];
    const exists = list.some((s) => s.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Laporan keamanan tidak ditemukan.' });
      return;
    }

    dbState = {
      ...dbState,
      securityReports: list.map((item) =>
        item.id === id
          ? { ...item, published: typeof published === 'boolean' ? published : !item.published }
          : item
      ),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/security-reports/:id', (req, res) => {
    const { id } = req.params;
    dbState = {
      ...dbState,
      securityReports: (dbState.securityReports ?? []).filter((s) => s.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/security-officers', (req, res) => {
    const { name, badgeNumber, rankOrRole, phone, assignedShift, pin, status, notes } =
      req.body as Partial<SecurityOfficer>;

    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ error: 'Nama lengkap dan nomor kontak petugas keamanan wajib diisi.' });
      return;
    }

    const nextSeq = (dbState.securityOfficers?.length ?? 0) + 1;
    const newOfficer: SecurityOfficer = {
      id: `SEC-OFF-${Date.now()}-${nextSeq}`,
      badgeNumber: badgeNumber?.trim() || `KTA-SK-${String(nextSeq).padStart(3, '0')}`,
      name: name.trim(),
      rankOrRole: rankOrRole?.trim() || 'Petugas Jaga Pos',
      phone: phone.trim(),
      assignedShift: assignedShift || 'Shift Malam (19.00 - 07.00 WIB)',
      pin: pin?.trim() || 'satpam123',
      status: status || 'Aktif',
      joinedDate: new Date().toISOString().slice(0, 10),
      notes: notes?.trim() || 'Anggota Satuan Pengamanan resmi Saung Kebun',
    };

    dbState = {
      ...dbState,
      securityOfficers: [...(dbState.securityOfficers ?? []), newOfficer],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.put('/api/security-officers/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<SecurityOfficer>;
    const list = dbState.securityOfficers ?? [];
    const idx = list.findIndex((o) => o.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data anggota pengamanan tidak ditemukan.' });
      return;
    }

    const updatedOfficer: SecurityOfficer = {
      ...list[idx],
      ...updates,
      id: list[idx].id,
    };

    const nextList = [...list];
    nextList[idx] = updatedOfficer;

    dbState = {
      ...dbState,
      securityOfficers: nextList,
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/security-officers/:id', (req, res) => {
    const { id } = req.params;
    dbState = {
      ...dbState,
      securityOfficers: (dbState.securityOfficers ?? []).filter((o) => o.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  // --- Payment Confirmations & Verification by Admin ---
  app.post('/api/payment-confirmations', (req, res) => {
    const {
      unitId,
      periodMonths,
      amount,
      paymentMethod,
      transferDate,
      senderBank,
      senderAccountName,
      notes,
      proofImageUrl,
      proofFileName,
    } = req.body as Partial<PaymentConfirmation>;

    if (!unitId || !Array.isArray(periodMonths) || periodMonths.length === 0 || !amount || !paymentMethod || !transferDate) {
      res.status(400).json({ error: 'Mohon lengkapi unit rumah, periode bulan iuran, nominal, metode pembayaran, dan tanggal transfer.' });
      return;
    }

    if (!proofImageUrl || typeof proofImageUrl !== 'string' || proofImageUrl.length < 50) {
      res.status(400).json({ error: 'Bukti transfer atau foto struk transaksi wajib diunggah.' });
      return;
    }

    const resident = dbState.residents.find((r) => r.id === unitId);
    if (!resident) {
      res.status(404).json({ error: 'Data unit warga tidak ditemukan.' });
      return;
    }

    const nextId = `CONF-${Date.now()}`;
    const newConfirmation: PaymentConfirmation = {
      id: nextId,
      unitId,
      residentName: resident.headOfFamily,
      whatsapp: resident.whatsapp,
      periodMonths,
      amount: Math.round(Number(amount)),
      paymentMethod,
      transferDate,
      senderBank: senderBank?.trim() || 'Bank Transfer',
      senderAccountName: senderAccountName?.trim() || resident.headOfFamily,
      notes: notes?.trim() || '',
      proofImageUrl,
      proofFileName: proofFileName?.trim() || 'bukti-transfer.png',
      status: 'MENUNGGU_VERIFIKASI',
      submittedAt: new Date().toISOString(),
    };

    dbState = {
      ...dbState,
      paymentConfirmations: [newConfirmation, ...(dbState.paymentConfirmations ?? [])],
    };
    saveDatabase(dbState);
    res.status(201).json(dbState);
  });

  app.post('/api/payment-confirmations/:id/approve', (req, res) => {
    const { id } = req.params;
    const { verifiedBy } = req.body as { verifiedBy?: string };
    const list = dbState.paymentConfirmations ?? [];
    const conf = list.find((c) => c.id === id);

    if (!conf) {
      res.status(404).json({ error: 'Data konfirmasi pembayaran tidak ditemukan.' });
      return;
    }

    if (conf.status === 'DISETUJUI') {
      res.status(400).json({ error: 'Konfirmasi pembayaran ini sudah diverifikasi sebelumnya.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const verifier = verifiedBy?.trim() || dbState.settings.treasurerName;

    // Create ledger transaction(s) for the period months
    const addedTransactions: LedgerTransaction[] = [];
    for (const pm of conf.periodMonths) {
      const alreadyPaid = dbState.transactions.some(
        (t) =>
          t.type === 'income' &&
          t.category === 'Iuran Bulanan Warga' &&
          t.unitId === conf.unitId &&
          t.periodMonth === pm
      );
      if (alreadyPaid) continue;

      const seq = dbState.transactions.length + addedTransactions.length + 1;
      const receiptNo = buildReceiptNumber('income', pm, conf.unitId, seq);
      addedTransactions.push({
        id: `TRX-${Date.now()}-${seq}`,
        receiptNumber: receiptNo,
        date: conf.transferDate || nowIso.slice(0, 10),
        periodMonth: pm,
        type: 'income',
        category: 'Iuran Bulanan Warga',
        amount: Math.round(conf.amount / conf.periodMonths.length),
        unitId: conf.unitId,
        paymentMethod: conf.paymentMethod,
        description: `Iuran bulanan lingkungan ${conf.unitId} (${conf.residentName}) periode ${pm} [Verifikasi Konfirmasi Warga]`,
        recordedBy: verifier,
        createdAt: nowIso,
      });
    }

    const firstTx = addedTransactions[0];
    const updatedConfirmations = list.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'DISETUJUI' as const,
            verifiedAt: nowIso,
            verifiedBy: verifier,
            resultingTransactionId: firstTx?.id || c.resultingTransactionId,
            resultingReceiptNumber: firstTx?.receiptNumber || c.resultingReceiptNumber,
          }
        : c
    );

    dbState = {
      ...dbState,
      transactions: [...dbState.transactions, ...addedTransactions],
      paymentConfirmations: updatedConfirmations,
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.post('/api/payment-confirmations/:id/reject', (req, res) => {
    const { id } = req.params;
    const { reason, verifiedBy } = req.body as { reason?: string; verifiedBy?: string };
    const list = dbState.paymentConfirmations ?? [];
    const conf = list.find((c) => c.id === id);

    if (!conf) {
      res.status(404).json({ error: 'Data konfirmasi pembayaran tidak ditemukan.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const verifier = verifiedBy?.trim() || dbState.settings.treasurerName;

    const updatedConfirmations = list.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'DITOLAK' as const,
            rejectionReason: reason?.trim() || 'Bukti transfer tidak valid atau belum masuk rekening kas.',
            verifiedAt: nowIso,
            verifiedBy: verifier,
          }
        : c
    );

    dbState = {
      ...dbState,
      paymentConfirmations: updatedConfirmations,
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  app.delete('/api/payment-confirmations/:id', (req, res) => {
    const { id } = req.params;
    dbState = {
      ...dbState,
      paymentConfirmations: (dbState.paymentConfirmations ?? []).filter((c) => c.id !== id),
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  // --- Report Publication Toggles (Monthly & Quarterly LPJ) ---
  app.patch('/api/settings/reports-publication', (req, res) => {
    const { type, id, published } = req.body as {
      type?: 'monthly' | 'quarterly';
      id?: string;
      published?: boolean;
    };

    if (!type || !id) {
      res.status(400).json({ error: 'Parameter type (monthly/quarterly) dan id periode/triwulan wajib diisi.' });
      return;
    }

    const currentMonthly = new Set(dbState.settings.publishedMonthlyReports ?? ['2026-07', '2026-08', '2026-09', '2026-10']);
    const currentQuarterly = new Set(dbState.settings.publishedQuarterlyLPJ ?? ['2026-Q3']);

    if (type === 'monthly') {
      const isCurrentlyPublished = currentMonthly.has(id);
      const shouldPublish = typeof published === 'boolean' ? published : !isCurrentlyPublished;
      if (shouldPublish) {
        currentMonthly.add(id);
      } else {
        currentMonthly.delete(id);
      }
    } else if (type === 'quarterly') {
      const isCurrentlyPublished = currentQuarterly.has(id);
      const shouldPublish = typeof published === 'boolean' ? published : !isCurrentlyPublished;
      if (shouldPublish) {
        currentQuarterly.add(id);
      } else {
        currentQuarterly.delete(id);
      }
    }

    dbState = {
      ...dbState,
      settings: {
        ...dbState.settings,
        publishedMonthlyReports: Array.from(currentMonthly),
        publishedQuarterlyLPJ: Array.from(currentQuarterly),
      },
    };
    saveDatabase(dbState);
    res.json(dbState);
  });

  // AI-Powered Category Helper
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (geminiClient) return geminiClient;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return geminiClient;
  }

  function heuristicSuggestCategory(
    description: string,
    mode?: 'income' | 'expense'
  ): {
    primaryCategory: string;
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
    suggestedType: 'income' | 'expense';
    alternatives: string[];
  } {
    const d = description.toLowerCase();

    // 1. Kebersihan & Sampah
    if (
      d.includes('sampah') ||
      d.includes('kebersihan') ||
      d.includes('sapu') ||
      d.includes('truk sampah') ||
      d.includes('retribusi sampah') ||
      d.includes('pembuangan') ||
      d.includes('limbah') ||
      d.includes('kantong sampah')
    ) {
      return {
        primaryCategory: 'Kebersihan & Sampah',
        confidence: 'high',
        explanation: 'Uraian menyebutkan pengelolaan kebersihan, retribusi, atau sampah pemukiman.',
        suggestedType: 'expense',
        alternatives: ['Perawatan Taman & Saung'],
      };
    }

    // 2. Keamanan & Satpam
    if (
      d.includes('satpam') ||
      d.includes('keamanan') ||
      d.includes('security') ||
      d.includes('danru') ||
      d.includes('patroli') ||
      d.includes('jaga pos') ||
      d.includes('pos ronda') ||
      d.includes('honor satpam') ||
      d.includes('senter') ||
      d.includes('rompi') ||
      d.includes('borgol')
    ) {
      return {
        primaryCategory: 'Keamanan & Satpam',
        confidence: 'high',
        explanation: 'Uraian berkaitan dengan pos jaga, personel satuan pengamanan, atau ronda malam.',
        suggestedType: 'expense',
        alternatives: ['Perbaikan Fasilitas Umum'],
      };
    }

    // 3. Listrik PJU & Air
    if (
      d.includes('listrik') ||
      d.includes('pju') ||
      d.includes('pln') ||
      d.includes('token') ||
      d.includes('air') ||
      d.includes('pdam') ||
      d.includes('pompa air') ||
      d.includes('lampu jalan')
    ) {
      return {
        primaryCategory: 'Listrik PJU & Air',
        confidence: 'high',
        explanation: 'Uraian mencakup tagihan utilitas penerangan jalan umum (PJU) atau pompa air warga.',
        suggestedType: 'expense',
        alternatives: ['Perbaikan Fasilitas Umum'],
      };
    }

    // 4. Perawatan Taman & Saung
    if (
      d.includes('taman') ||
      d.includes('rumput') ||
      d.includes('pohon') ||
      d.includes('pupuk') ||
      d.includes('bibit') ||
      d.includes('tanaman') ||
      d.includes('pemangkasan') ||
      d.includes('pot bunga') ||
      d.includes('mesin rumput') ||
      d.includes('pendopo')
    ) {
      return {
        primaryCategory: 'Perawatan Taman & Saung',
        confidence: 'high',
        explanation: 'Uraian berhubungan dengan pemeliharaan taman hijau, pemotongan rumput, atau saung warga.',
        suggestedType: 'expense',
        alternatives: ['Kebersihan & Sampah', 'Perbaikan Fasilitas Umum'],
      };
    }

    // 5. Kartu Akses & Stiker Warga (specific gate access tokens before general gate repairs)
    if (d.includes('stiker') || d.includes('akses') || d.includes('rfid') || (d.includes('kartu') && !d.includes('kuning'))) {
      return {
        primaryCategory: 'Kartu Akses & Stiker',
        confidence: 'high',
        explanation: 'Uraian pengadaan atau penggantian stiker kendaraan dan kartu akses gerbang warga.',
        suggestedType: 'income',
        alternatives: ['Administrasi & Kas RT'],
      };
    }

    // 6. Perbaikan Fasilitas Umum
    if (
      d.includes('perbaikan') ||
      d.includes('rusak') ||
      d.includes('servis') ||
      d.includes('gerbang') ||
      d.includes('portal') ||
      d.includes('cctv') ||
      d.includes('paving') ||
      d.includes('jalan') ||
      d.includes('semen') ||
      d.includes('pipa') ||
      d.includes('bocor') ||
      d.includes('cat') ||
      d.includes('las') ||
      d.includes('aspal') ||
      d.includes('fasilitas') ||
      d.includes('drainase') ||
      d.includes('gorong')
    ) {
      return {
        primaryCategory: 'Perbaikan Fasilitas Umum',
        confidence: 'high',
        explanation: 'Uraian terkait renovasi, perbaikan fisik sarana lingkungan, gerbang, atau CCTV.',
        suggestedType: 'expense',
        alternatives: ['Perawatan Taman & Saung'],
      };
    }

    // 6. Administrasi & Kas RT
    if (
      d.includes('atk') ||
      d.includes('kertas') ||
      d.includes('materai') ||
      d.includes('buku kas') ||
      d.includes('cetak') ||
      d.includes('rapat') ||
      d.includes('konsumsi') ||
      d.includes('snack') ||
      d.includes('stempel') ||
      d.includes('administrasi') ||
      d.includes('fotokopi')
    ) {
      return {
        primaryCategory: 'Administrasi & Kas RT',
        confidence: 'high',
        explanation: 'Uraian terkait pengadaan ATK, cetak pembukuan kas, atau konsumsi musyawarah warga.',
        suggestedType: 'expense',
        alternatives: ['Pemasukan Lainnya'],
      };
    }

    // 7. Income: Sewa Saung
    if (d.includes('sewa') || d.includes('aula') || d.includes('pemakaian saung') || d.includes('acara nikah')) {
      return {
        primaryCategory: 'Sewa Saung Warga',
        confidence: 'high',
        explanation: 'Uraian mencatat kontribusi atau retribusi pemakaian saung/pendopo perumahan.',
        suggestedType: 'income',
        alternatives: ['Donasi & Sumbangan'],
      };
    }

    // 8. Income: Donasi & Sumbangan
    if (d.includes('donasi') || d.includes('sumbangan') || d.includes('infaq') || d.includes('sukarela') || d.includes('sedekah')) {
      return {
        primaryCategory: 'Donasi & Sumbangan',
        confidence: 'high',
        explanation: 'Uraian merupakan donasi atau sumbangan sukarela bagi kas perumahan.',
        suggestedType: 'income',
        alternatives: ['Pemasukan Lainnya'],
      };
    }


    // Default Fallbacks
    if (mode === 'income') {
      return {
        primaryCategory: 'Pemasukan Lainnya',
        confidence: 'low',
        explanation: 'Kategori penerimaan umum kas paguyuban.',
        suggestedType: 'income',
        alternatives: ['Donasi & Sumbangan', 'Sewa Saung Warga'],
      };
    }

    return {
      primaryCategory: 'Perbaikan Fasilitas Umum',
      confidence: 'medium',
      explanation: 'Disarankan sebagai pemeliharaan sarana prasarana lingkungan.',
      suggestedType: 'expense',
      alternatives: ['Perawatan Taman & Saung', 'Administrasi & Kas RT'],
    };
  }

  app.post('/api/ai/suggest-category', async (req, res) => {
    try {
      const { description, mode } = req.body as { description?: string; mode?: 'income' | 'expense' };
      const descText = (description || '').trim();

      if (!descText) {
        res.json({
          ok: true,
          suggestions: [],
          primaryCategory: null,
          source: 'heuristic',
        });
        return;
      }

      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = `Anda adalah asisten AI bendahara keuangan Perumahan Saung Kebun.
Tugas Anda menganalisis uraian/keterangan transaksi berikut dan merekomendasikan kategori transaksi yang paling tepat:
Uraian: "${descText}"
Mode saat ini: ${mode || 'belum ditentukan'}

Kategori Pengeluaran yang tersedia:
- "Keamanan & Satpam"
- "Kebersihan & Sampah"
- "Listrik PJU & Air"
- "Perawatan Taman & Saung"
- "Perbaikan Fasilitas Umum"
- "Administrasi & Kas RT"

Kategori Pemasukan yang tersedia:
- "Iuran Bulanan Warga"
- "Sewa Saung Warga"
- "Donasi & Sumbangan"
- "Kartu Akses & Stiker"
- "Pemasukan Lainnya"

Kembalikan kategori utama yang paling sesuai dengan uraian transaksi tersebut, beserta tingkat keyakinan (high/medium/low), penjelasan singkat dalam bahasa Indonesia, dan 1-2 alternatif kategori lain.`;

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout (3s)')), 3000)
          );

          const response = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    primaryCategory: { type: Type.STRING },
                    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                    explanation: { type: Type.STRING },
                    suggestedType: { type: Type.STRING, enum: ['income', 'expense'] },
                    alternatives: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['primaryCategory', 'confidence', 'explanation', 'suggestedType'],
                },
              },
            }),
            timeoutPromise,
          ]);

          const rawText = response.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.primaryCategory) {
              res.json({
                ok: true,
                primaryCategory: parsed.primaryCategory,
                suggestions: [
                  {
                    category: parsed.primaryCategory,
                    confidence: parsed.confidence || 'high',
                    explanation: parsed.explanation || 'Disarankan oleh AI Gemini',
                    suggestedType: parsed.suggestedType || (mode || 'expense'),
                    alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
                  },
                ],
                source: 'gemini',
              });
              return;
            }
          }
        } catch (geminiErr) {
          console.warn('Gemini category suggestion failed, using heuristic:', geminiErr);
        }
      }

      // Fast, deterministic heuristic analyzer
      const result = heuristicSuggestCategory(descText, mode);
      res.json({
        ok: true,
        primaryCategory: result.primaryCategory,
        suggestions: [result],
        source: 'heuristic',
      });
    } catch (err) {
      console.error('Error in /api/ai/suggest-category:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghasilkan saran kategori' });
    }
  });

  app.post('/api/reset', (_req, res) => {
    dbState = createSeedDatabase();
    saveDatabase(dbState);
    res.json(dbState);
  });

export async function startServer() {
  // In AI Studio preview environment, nginx listens on 8080 and proxies to port 3000.
  // The Node dev server must always listen on port 3000.
  let targetPort = 3000;
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    targetPort = Number(process.argv[portArgIdx + 1]) || 3000;
  } else if (process.env.PORT && process.env.PORT !== '8080') {
    targetPort = Number(process.env.PORT) || 3000;
  }
  const PORT = targetPort;
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : true,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (typeof (vite as any).ssrFixStacktrace === 'function') {
          (vite as any).ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
  });
}

export default app;

if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
  startServer().catch((err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}
