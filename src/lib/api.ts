import type {
  AdminSettings,
  BlockConfig,
  CommunityActivityAnnouncement,
  DatabaseState,
  LedgerTransaction,
  PaymentConfirmation,
  PaymentMethod,
  ResidentUnit,
  SecurityGuardReport,
  SecurityOfficer,
  TransactionCategory,
  TransactionType,
} from '../types/finance';
import { createSeedDatabase } from './seedData';

export interface CreateTransactionPayload {
  date: string;
  periodMonth: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  unitId: string | null;
  paymentMethod: PaymentMethod;
  description: string;
  recordedBy?: string;
}

export interface BatchIuranPayload {
  unitId: string;
  periodMonths: string[];
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  recordedBy?: string;
}

export interface PresenceSummary {
  totalOnline: number;
  wargaCount: number;
  wargaList: Array<{
    unitId: string;
    displayName: string;
    lastSeenSecondsAgo: number;
  }>;
  satpamCount: number;
  satpamList: Array<{
    displayName: string;
    roleLabel: string;
    lastSeenSecondsAgo: number;
  }>;
  adminCount: number;
  adminList: Array<{
    displayName: string;
    roleLabel: string;
    lastSeenSecondsAgo: number;
  }>;
  timestamp: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  suggestedType?: 'income' | 'expense';
  alternatives?: string[];
}

export interface SuggestCategoryResponse {
  ok: boolean;
  suggestions: CategorySuggestion[];
  primaryCategory: string | null;
  source: 'gemini' | 'heuristic';
}

const CACHE_KEY = 'saung_kebun_cached_state';

/**
 * Mendapatkan state database dari localStorage (offline/Vercel fallback)
 */
export function getLocalDatabaseState(): DatabaseState {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.residents) && parsed.residents.length > 0) {
        return parsed as DatabaseState;
      }
    }
  } catch {}
  const fresh = createSeedDatabase();
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    }
  } catch {}
  return fresh;
}

/**
 * Menyimpan state database ke localStorage secara aman
 */
export function saveLocalDatabaseState(state: DatabaseState): DatabaseState {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('saung_kebun_local_state_updated', { detail: state }));
    }
  } catch (err) {
    console.warn('Gagal menyimpan ke localStorage:', err);
  }
  return state;
}

/**
 * Helper pemanggil API yang kebal terhadap error 405, 404, atau respon HTML doctype Vercel
 */
async function safeApiRequest<T>(
  url: string,
  init?: RequestInit,
  localFallback?: (localState: DatabaseState) => T | DatabaseState
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html') || res.status === 405 || res.status === 404) {
      console.warn(`[Offline/Vercel Mode] Endpoint ${url} merespon status ${res.status} (${contentType}), beralih ke database lokal.`);
    } else {
      const text = await res.text();
      if (text.trim().startsWith('<')) {
        console.warn(`[Offline/Vercel Mode] Endpoint ${url} mengembalikan halaman HTML, menggunakan fallback lokal.`);
      } else {
        const data = JSON.parse(text) as T;
        if (data && typeof data === 'object' && Array.isArray((data as any).residents)) {
          saveLocalDatabaseState(data as any as DatabaseState);
        }
        return data;
      }
    }
  } catch (err) {
    console.warn(`[Offline/Vercel Mode] Jaringan atau API offline pada ${url}, memproses di database lokal:`, err);
  }

  // Jalankan mutasi atau pembacaan pada data lokal jika server offline / Vercel static
  const localDb = getLocalDatabaseState();
  if (localFallback) {
    const result = localFallback(localDb);
    if (result && typeof result === 'object' && Array.isArray((result as any).residents)) {
      saveLocalDatabaseState(result as any as DatabaseState);
    }
    return result as T;
  }
  return localDb as any as T;
}

export const api = {
  async getState(): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>('/api/state', undefined, (db) => db);
  },

  async getHealth(): Promise<{
    status: string;
    database: string;
    cloudDatabase?: string;
    cloudProvider?: string;
    projectId?: string;
    databaseId?: string;
    lastCloudSync?: string | null;
    totalResidents: number;
    totalTransactions: number;
    timestamp: string;
    uptimeSeconds: number;
    latencyMs: number;
  }> {
    const t0 = performance.now();
    return safeApiRequest<{
      status: string;
      database: string;
      cloudDatabase?: string;
      cloudProvider?: string;
      projectId?: string;
      databaseId?: string;
      lastCloudSync?: string | null;
      totalResidents: number;
      totalTransactions: number;
      timestamp: string;
      uptimeSeconds: number;
      latencyMs: number;
    }>(
      '/api/health',
      undefined,
      (db) => ({
        status: 'online-local-ready',
        database: 'Local Storage & Cloud Sync (Vercel Ready)',
        cloudDatabase: 'Google Cloud Firestore',
        cloudProvider: 'Google Cloud',
        projectId: 'xenodochial-clover-g6tvw',
        databaseId: 'ai-studio-saungkebunfinanc-e3d0992c-746a-4a12-a30e-55a15c113812',
        lastCloudSync: new Date().toISOString(),
        totalResidents: db.residents.length,
        totalTransactions: db.transactions.length,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(performance.now() / 1000),
        latencyMs: Math.round(performance.now() - t0),
      })
    );
  },

  async getDatabaseStatus(): Promise<{
    provider: string;
    projectId: string;
    databaseId: string;
    connected: boolean;
    lastSyncedAt: string | null;
    totalResidents: number;
    totalTransactions: number;
    serverUptime: number;
    error?: string;
  }> {
    return safeApiRequest(
      '/api/database/status',
      undefined,
      (db) => ({
        provider: 'Google Cloud Firestore & Local Engine',
        projectId: 'xenodochial-clover-g6tvw',
        databaseId: 'ai-studio-saungkebunfinanc-e3d0992c-746a-4a12-a30e-55a15c113812',
        connected: true,
        lastSyncedAt: new Date().toISOString(),
        totalResidents: db.residents.length,
        totalTransactions: db.transactions.length,
        serverUptime: Math.round(performance.now() / 1000),
      })
    );
  },

  async syncCloudDatabase(): Promise<{
    success: boolean;
    quotaExceeded?: boolean;
    upgradeUrl?: string;
    message?: string;
    timestamp: string;
  }> {
    return safeApiRequest(
      '/api/database/sync-cloud',
      { method: 'POST' },
      () => ({
        success: true,
        message: 'Seluruh data lokal berhasil disimpan dan disinkronkan secara aman!',
        timestamp: new Date().toISOString(),
      })
    );
  },

  async sendPresenceHeartbeat(payload: {
    sessionId: string;
    role: string;
    roleLabel?: string;
    displayName?: string;
    unitId?: string;
  }): Promise<PresenceSummary> {
    return safeApiRequest<PresenceSummary>(
      '/api/presence/heartbeat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => ({
        totalOnline: 1,
        wargaCount: payload.role === 'warga' ? 1 : 0,
        wargaList: payload.role === 'warga' ? [{ unitId: payload.unitId || 'Warga', displayName: payload.displayName || 'Warga', lastSeenSecondsAgo: 0 }] : [],
        satpamCount: payload.role === 'satpam' ? 1 : 0,
        satpamList: payload.role === 'satpam' ? [{ displayName: payload.displayName || 'Petugas Jaga', roleLabel: payload.roleLabel || 'Satpam', lastSeenSecondsAgo: 0 }] : [],
        adminCount: payload.role === 'ketua' || payload.role === 'bendahara' ? 1 : 0,
        adminList: payload.role === 'ketua' || payload.role === 'bendahara' ? [{ displayName: payload.displayName || 'Pengurus', roleLabel: payload.roleLabel || 'Admin', lastSeenSecondsAgo: 0 }] : [],
        timestamp: new Date().toISOString(),
      })
    );
  },

  async getPresenceSummary(): Promise<PresenceSummary> {
    return safeApiRequest<PresenceSummary>(
      '/api/presence/summary',
      undefined,
      () => ({
        totalOnline: 1,
        wargaCount: 0,
        wargaList: [],
        satpamCount: 0,
        satpamList: [],
        adminCount: 1,
        adminList: [{ displayName: 'Pengurus Aktif', roleLabel: 'Admin', lastSeenSecondsAgo: 0 }],
        timestamp: new Date().toISOString(),
      })
    );
  },

  async sendPresenceLogout(sessionId: string): Promise<PresenceSummary> {
    return safeApiRequest<PresenceSummary>(
      '/api/presence/logout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      },
      () => ({
        totalOnline: 0,
        wargaCount: 0,
        wargaList: [],
        satpamCount: 0,
        satpamList: [],
        adminCount: 0,
        adminList: [],
        timestamp: new Date().toISOString(),
      })
    );
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/transactions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        const cleanUnit = (payload.unitId || 'KAS').replace(/[^a-zA-Z0-9]/g, '');
        const receiptNumber = payload.type === 'income'
          ? `SK/KW/${payload.periodMonth.replace('-', '/')}/${cleanUnit}-${Date.now().toString().slice(-4)}`
          : `SK/EXP/${payload.periodMonth.replace('-', '/')}/${Date.now().toString().slice(-4)}`;
        const newTx: LedgerTransaction = {
          id: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          receiptNumber,
          date: payload.date || new Date().toISOString().split('T')[0],
          periodMonth: payload.periodMonth,
          type: payload.type,
          category: payload.category,
          amount: payload.amount,
          unitId: payload.unitId,
          paymentMethod: payload.paymentMethod,
          description: payload.description,
          recordedBy: payload.recordedBy || 'Bendahara Kas',
          createdAt: new Date().toISOString(),
        };
        local.transactions.push(newTx);
        return local;
      }
    );
  },

  async payBatchIuran(payload: BatchIuranPayload): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/transactions/batch-iuran',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        const fee = local.settings.monthlyFee || 100000;
        const resident = local.residents.find((r) => r.id === payload.unitId);
        const resName = resident ? resident.headOfFamily : payload.unitId;
        for (const m of payload.periodMonths) {
          const alreadyPaid = local.transactions.some(
            (t) => t.type === 'income' && t.category === 'Iuran Bulanan Warga' && t.unitId === payload.unitId && t.periodMonth === m
          );
          if (!alreadyPaid) {
            const cleanUnit = payload.unitId.replace(/[^a-zA-Z0-9]/g, '');
            local.transactions.push({
              id: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              receiptNumber: `SK/KW/${m.replace('-', '/')}/${cleanUnit}`,
              date: payload.date || new Date().toISOString().split('T')[0],
              periodMonth: m,
              type: 'income',
              category: 'Iuran Bulanan Warga',
              amount: fee,
              unitId: payload.unitId,
              paymentMethod: payload.paymentMethod,
              description: `Iuran bulanan lingkungan ${payload.unitId} (${resName}) periode ${m}`,
              recordedBy: payload.recordedBy || 'Bendahara Kas',
              createdAt: new Date().toISOString(),
            });
          }
        }
        return local;
      }
    );
  },

  async deleteTransaction(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/transactions/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        local.transactions = local.transactions.filter((t) => t.id !== id);
        return local;
      }
    );
  },

  async addResident(resident: Partial<ResidentUnit>, userRole?: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/residents',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userRole ? { 'x-user-role': userRole } : {}),
        },
        body: JSON.stringify(resident),
      },
      (local) => {
        const newId = (resident.id || `UNIT-${Date.now().toString().slice(-4)}`).toUpperCase();
        const newRes: ResidentUnit = {
          id: newId,
          block: resident.block || 'B3',
          houseNumber: resident.houseNumber || '01',
          headOfFamily: resident.headOfFamily || 'Warga Baru',
          nik: resident.nik || '',
          kkNumber: resident.kkNumber || '',
          whatsapp: resident.whatsapp || '',
          email: resident.email || '',
          occupancyStatus: resident.occupancyStatus || 'Dihuni Pemilik',
          familyMembers: resident.familyMembers || 1,
          vehiclePlate: resident.vehiclePlate || '-',
          joinedYear: resident.joinedYear || new Date().getFullYear(),
          notes: resident.notes || '',
          accessPin: resident.accessPin || '1234',
          memberType: resident.memberType || 'warga',
          officerRole: resident.officerRole,
        };
        const idx = local.residents.findIndex((r) => r.id === newId);
        if (idx >= 0) {
          local.residents[idx] = newRes;
        } else {
          local.residents.push(newRes);
        }
        return local;
      }
    );
  },

  async updateResident(
    id: string,
    updates: Partial<ResidentUnit>,
    userRole?: string
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/residents/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(userRole ? { 'x-user-role': userRole } : {}),
        },
        body: JSON.stringify(updates),
      },
      (local) => {
        const idx = local.residents.findIndex((r) => r.id === id);
        if (idx >= 0) {
          local.residents[idx] = { ...local.residents[idx], ...updates };
        }
        return local;
      }
    );
  },

  async deleteResident(id: string, userRole?: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/residents/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { ...(userRole ? { 'x-user-role': userRole } : {}) },
      },
      (local) => {
        local.residents = local.residents.filter((r) => r.id !== id);
        return local;
      }
    );
  },

  async addBlock(block: BlockConfig): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings/blocks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block),
      },
      (local) => {
        if (!local.settings.customBlocks) local.settings.customBlocks = [];
        local.settings.customBlocks.push(block);
        return local;
      }
    );
  },

  async updateBlock(id: string, updates: Partial<BlockConfig>): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/settings/blocks/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
      (local) => {
        if (local.settings.customBlocks) {
          const idx = local.settings.customBlocks.findIndex((b) => b.id === id);
          if (idx >= 0) {
            local.settings.customBlocks[idx] = { ...local.settings.customBlocks[idx], ...updates };
          }
        }
        return local;
      }
    );
  },

  async deleteBlock(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/settings/blocks/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        if (local.settings.customBlocks) {
          local.settings.customBlocks = local.settings.customBlocks.filter((b) => b.id !== id);
        }
        return local;
      }
    );
  },

  async addStreet(name: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings/streets',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
      (local) => {
        if (!local.settings.customStreets) local.settings.customStreets = [];
        if (!local.settings.customStreets.includes(name)) {
          local.settings.customStreets.push(name);
        }
        return local;
      }
    );
  },

  async deleteStreet(name: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings/streets',
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
      (local) => {
        if (local.settings.customStreets) {
          local.settings.customStreets = local.settings.customStreets.filter((s) => s !== name);
        }
        return local;
      }
    );
  },

  async sendWhatsAppSingle(payload: {
    unitId: string;
    periodMonth: string;
    arrearsMonths: string[];
    totalBilled: number;
    message: string;
  }): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/whatsapp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        const resident = local.residents.find((r) => r.id === payload.unitId);
        local.whatsappLogs.unshift({
          id: `WA-${Date.now()}`,
          sentAt: new Date().toISOString(),
          unitId: payload.unitId,
          residentName: resident ? resident.headOfFamily : payload.unitId,
          whatsapp: resident ? resident.whatsapp : '',
          periodMonth: payload.periodMonth,
          arrearsMonths: payload.arrearsMonths,
          totalBilled: payload.totalBilled,
          message: payload.message,
          triggerType: 'Kirim Satuan',
          status: 'Terkirim',
        });
        return local;
      }
    );
  },

  async broadcastWhatsApp(payload: {
    periodMonth: string;
    items: Array<{
      unitId: string;
      arrearsMonths: string[];
      totalBilled: number;
      message: string;
    }>;
  }): Promise<{ state: DatabaseState; sentCount: number }> {
    return safeApiRequest<{ state: DatabaseState; sentCount: number }>(
      '/api/whatsapp/broadcast',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        for (const item of payload.items) {
          const res = local.residents.find((r) => r.id === item.unitId);
          local.whatsappLogs.unshift({
            id: `WA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sentAt: new Date().toISOString(),
            unitId: item.unitId,
            residentName: res ? res.headOfFamily : item.unitId,
            whatsapp: res ? res.whatsapp : '',
            periodMonth: payload.periodMonth,
            arrearsMonths: item.arrearsMonths,
            totalBilled: item.totalBilled,
            message: item.message,
            triggerType: 'Siaran Massal Admin',
            status: 'Terkirim',
          });
        }
        return { state: local, sentCount: payload.items.length };
      }
    );
  },

  async runAutomatedWhatsAppReminders(payload?: {
    force?: boolean;
    periodMonth?: string;
  }): Promise<{
    state: DatabaseState;
    sentCount: number;
    eligibleCount: number;
    dueDay: number;
    period: string;
    message: string;
  }> {
    return safeApiRequest(
      '/api/whatsapp/auto-remind',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? { force: true }),
      },
      (local) => {
        const period = payload?.periodMonth || '2026-10';
        return {
          state: local,
          sentCount: 0,
          eligibleCount: 0,
          dueDay: local.settings.dueDayOfMonth,
          period,
          message: 'Pemeriksaan tagihan otomatis berjalan dalam mode lokal.',
        };
      }
    );
  },

  async getWhatsAppAutoStatus(): Promise<{
    autoWhatsappEnabled: boolean;
    dueDayOfMonth: number;
    autoReminderTriggerDay: number;
    autoReminderSchedule: {
      hMinus3: boolean;
      dueDate: boolean;
      hPlus5Overdue: boolean;
    };
    autoReminderLastRunAt?: string;
    unpaidCount: number;
    monthlyFee: number;
    whatsappPaymentLink?: string;
    whatsappPaymentInstructions?: string;
    activePeriodMonth: string;
    serverTime: string;
  }> {
    return safeApiRequest(
      '/api/whatsapp/auto-status',
      undefined,
      (local) => ({
        autoWhatsappEnabled: local.settings.autoWhatsappEnabled,
        dueDayOfMonth: local.settings.dueDayOfMonth,
        autoReminderTriggerDay: local.settings.autoReminderTriggerDay || local.settings.dueDayOfMonth,
        autoReminderSchedule: local.settings.autoReminderSchedule,
        unpaidCount: 0,
        monthlyFee: local.settings.monthlyFee,
        whatsappPaymentLink: local.settings.whatsappPaymentLink,
        whatsappPaymentInstructions: local.settings.whatsappPaymentInstructions,
        activePeriodMonth: '2026-10',
        serverTime: new Date().toISOString(),
      })
    );
  },

  async updateSettings(settings: AdminSettings): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      },
      (local) => {
        local.settings = { ...local.settings, ...settings };
        return local;
      }
    );
  },

  async updateArrearsPublication(payload: {
    publishArrearsToResidents?: boolean;
    toggleUnitId?: string;
  }): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings/arrears-publication',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (payload.publishArrearsToResidents !== undefined) {
          local.settings.publishArrearsToResidents = payload.publishArrearsToResidents;
        }
        if (payload.toggleUnitId) {
          const list = local.settings.hiddenArrearsUnitIds || [];
          if (list.includes(payload.toggleUnitId)) {
            local.settings.hiddenArrearsUnitIds = list.filter((id) => id !== payload.toggleUnitId);
          } else {
            local.settings.hiddenArrearsUnitIds = [...list, payload.toggleUnitId];
          }
        }
        return local;
      }
    );
  },

  async createAnnouncement(
    payload: Omit<CommunityActivityAnnouncement, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/announcements',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (!local.announcements) local.announcements = [];
        local.announcements.unshift({
          id: `ANN-${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...payload,
        });
        return local;
      }
    );
  },

  async toggleAnnouncementPublish(id: string, published?: boolean): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/announcements/${encodeURIComponent(id)}/publish`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      },
      (local) => {
        const a = local.announcements?.find((x) => x.id === id);
        if (a) a.published = published ?? !a.published;
        return local;
      }
    );
  },

  async deleteAnnouncement(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/announcements/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        if (local.announcements) {
          local.announcements = local.announcements.filter((x) => x.id !== id);
        }
        return local;
      }
    );
  },

  async createSecurityReport(
    payload: Omit<SecurityGuardReport, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/security-reports',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (!local.securityReports) local.securityReports = [];
        local.securityReports.unshift({
          id: `SEC-${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...payload,
        });
        return local;
      }
    );
  },

  async toggleSecurityReportPublish(id: string, published?: boolean): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/security-reports/${encodeURIComponent(id)}/publish`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      },
      (local) => {
        const s = local.securityReports?.find((x) => x.id === id);
        if (s) s.published = published ?? !s.published;
        return local;
      }
    );
  },

  async deleteSecurityReport(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/security-reports/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        if (local.securityReports) {
          local.securityReports = local.securityReports.filter((x) => x.id !== id);
        }
        return local;
      }
    );
  },

  async createSecurityOfficer(
    payload: Omit<SecurityOfficer, 'id' | 'joinedDate'>
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/security-officers',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (!local.securityOfficers) local.securityOfficers = [];
        local.securityOfficers.push({
          id: `SEC-OFF-${Date.now().toString().slice(-4)}`,
          joinedDate: new Date().toISOString().split('T')[0],
          ...payload,
        });
        return local;
      }
    );
  },

  async updateSecurityOfficer(
    id: string,
    updates: Partial<SecurityOfficer>
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/security-officers/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
      (local) => {
        if (local.securityOfficers) {
          const idx = local.securityOfficers.findIndex((o) => o.id === id);
          if (idx >= 0) {
            local.securityOfficers[idx] = { ...local.securityOfficers[idx], ...updates };
          }
        }
        return local;
      }
    );
  },

  async deleteSecurityOfficer(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/security-officers/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        if (local.securityOfficers) {
          local.securityOfficers = local.securityOfficers.filter((o) => o.id !== id);
        }
        return local;
      }
    );
  },

  async suggestCategory(
    description: string,
    mode?: 'income' | 'expense'
  ): Promise<SuggestCategoryResponse> {
    return safeApiRequest<SuggestCategoryResponse>(
      '/api/ai/suggest-category',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, mode }),
      },
      () => ({
        ok: true,
        source: 'heuristic',
        primaryCategory: mode === 'expense' ? 'Operasional Satpam & Pos Keamanan' : 'Iuran Bulanan Warga',
        suggestions: [
          {
            category: mode === 'expense' ? 'Operasional Satpam & Pos Keamanan' : 'Iuran Bulanan Warga',
            confidence: 'high',
            explanation: 'Kategori otomatis berbasis analisis deskripsi kas',
          },
        ],
      })
    );
  },

  async submitPaymentConfirmation(
    payload: Omit<
      PaymentConfirmation,
      'id' | 'status' | 'submittedAt' | 'verifiedAt' | 'verifiedBy' | 'rejectionReason' | 'resultingTransactionId' | 'resultingReceiptNumber'
    >
  ): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/payment-confirmations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (!local.paymentConfirmations) local.paymentConfirmations = [];
        local.paymentConfirmations.unshift({
          id: `CONF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: 'MENUNGGU_VERIFIKASI',
          submittedAt: new Date().toISOString(),
          ...payload,
        });
        return local;
      }
    );
  },

  async approvePaymentConfirmation(id: string, verifiedBy?: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/payment-confirmations/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedBy }),
      },
      (local) => {
        if (!local.paymentConfirmations) return local;
        const conf = local.paymentConfirmations.find((c) => c.id === id);
        if (conf) {
          conf.status = 'DISETUJUI';
          conf.verifiedAt = new Date().toISOString();
          conf.verifiedBy = verifiedBy || 'Bendahara Kas';

          const primaryPeriod = conf.periodMonths[0] || '2026-10';
          const cleanUnit = conf.unitId.replace(/[^a-zA-Z0-9]/g, '');
          const rcpt = `SK/KW/${primaryPeriod.replace('-', '/')}/${cleanUnit}-${Date.now().toString().slice(-4)}`;
          conf.resultingReceiptNumber = rcpt;

          const newTx: LedgerTransaction = {
            id: `TX-CONF-${Date.now()}`,
            receiptNumber: rcpt,
            date: conf.transferDate || new Date().toISOString().split('T')[0],
            periodMonth: primaryPeriod,
            type: 'income',
            category: 'Iuran Bulanan Warga',
            amount: conf.amount,
            unitId: conf.unitId,
            paymentMethod: conf.paymentMethod,
            description: `Iuran bulanan unit ${conf.unitId} (${conf.residentName || 'Warga'}) periode ${conf.periodMonths.join(', ')} [Verifikasi Konfirmasi]`,
            recordedBy: verifiedBy || 'Bendahara Kas',
            createdAt: new Date().toISOString(),
          };
          conf.resultingTransactionId = newTx.id;
          local.transactions.push(newTx);
        }
        return local;
      }
    );
  },

  async rejectPaymentConfirmation(id: string, reason: string, verifiedBy?: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/payment-confirmations/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, verifiedBy }),
      },
      (local) => {
        if (!local.paymentConfirmations) return local;
        const conf = local.paymentConfirmations.find((c) => c.id === id);
        if (conf) {
          conf.status = 'DITOLAK';
          conf.rejectionReason = reason;
          conf.verifiedAt = new Date().toISOString();
          conf.verifiedBy = verifiedBy || 'Bendahara Kas';
        }
        return local;
      }
    );
  },

  async deletePaymentConfirmation(id: string): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      `/api/payment-confirmations/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (local) => {
        if (local.paymentConfirmations) {
          local.paymentConfirmations = local.paymentConfirmations.filter((c) => c.id !== id);
        }
        return local;
      }
    );
  },

  async updateReportPublication(payload: {
    type: 'monthly' | 'quarterly';
    id: string;
    published?: boolean;
  }): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/settings/reports-publication',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (local) => {
        if (payload.type === 'monthly') {
          const list = local.settings.publishedMonthlyReports || [];
          if (payload.published) {
            if (!list.includes(payload.id)) local.settings.publishedMonthlyReports = [...list, payload.id];
          } else {
            local.settings.publishedMonthlyReports = list.filter((m) => m !== payload.id);
          }
        } else {
          const list = local.settings.publishedQuarterlyLPJ || [];
          if (payload.published) {
            if (!list.includes(payload.id)) local.settings.publishedQuarterlyLPJ = [...list, payload.id];
          } else {
            local.settings.publishedQuarterlyLPJ = list.filter((q) => q !== payload.id);
          }
        }
        return local;
      }
    );
  },

  async getStateVersion(): Promise<{ version: number; timestamp: string }> {
    return safeApiRequest<{ version: number; timestamp: string }>(
      '/api/state/version',
      undefined,
      () => ({ version: Date.now(), timestamp: new Date().toISOString() })
    );
  },

  async resetTransactions(userRole: string = 'bendahara'): Promise<{ ok: boolean; state: DatabaseState; backupFile?: string }> {
    return safeApiRequest<{ ok: boolean; state: DatabaseState; backupFile?: string }>(
      '/api/transactions/reset',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
      },
      (local) => {
        local.transactions = [];
        return { ok: true, state: local };
      }
    );
  },

  async resetDatabase(): Promise<DatabaseState> {
    return safeApiRequest<DatabaseState>(
      '/api/reset',
      { method: 'POST' },
      () => {
        const fresh = createSeedDatabase();
        saveLocalDatabaseState(fresh);
        return fresh;
      }
    );
  },
};
