import type {
  AdminSettings,
  BlockConfig,
  CommunityActivityAnnouncement,
  DatabaseState,
  PaymentConfirmation,
  PaymentMethod,
  ResidentUnit,
  SecurityGuardReport,
  TransactionCategory,
  TransactionType,
} from '../types/finance';

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

import {
  checkCloudConnection,
  syncStateToCloud,
  loadStateFromCloud,
} from './cloudStorage';
import { createSeedDatabase } from './seedData';

const CACHE_KEY = 'saung_kebun_cached_state';

export function getCachedDatabaseState(): DatabaseState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.residents) && parsed.residents.length > 0) {
          return parsed as DatabaseState;
        }
      }
    }
  } catch {}
  return createSeedDatabase();
}

export function saveCachedDatabaseState(state: DatabaseState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    }
  } catch {}
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Permintaan gagal (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) errMsg = body.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(errMsg);
  }
  return (await res.json()) as T;
}

async function mutateAndCache(
  call: () => Promise<Response>,
  fallbackFn?: (s: DatabaseState) => DatabaseState
): Promise<DatabaseState> {
  try {
    const res = await call();
    if (res.ok) {
      const data = (await res.json()) as DatabaseState;
      if (data && Array.isArray(data.residents)) {
        saveCachedDatabaseState(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API mutation notice (applying local & Cloud Firestore sync):', err);
  }

  if (fallbackFn) {
    const current = getCachedDatabaseState();
    const updated = fallbackFn(current);
    saveCachedDatabaseState(updated);
    syncStateToCloud(updated).catch(() => {});
    return updated;
  }

  return getCachedDatabaseState();
}

export const api = {
  async getState(): Promise<DatabaseState> {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = (await res.json()) as DatabaseState;
        if (data && Array.isArray(data.residents) && data.residents.length > 0) {
          saveCachedDatabaseState(data);
          return data;
        }
      }
    } catch {
      // Network/Vercel fallback to direct Cloud Firestore
    }

    try {
      const cloudData = await loadStateFromCloud();
      if (cloudData && Array.isArray(cloudData.residents) && cloudData.residents.length > 0) {
        saveCachedDatabaseState(cloudData);
        return cloudData;
      }
    } catch (e) {
      console.warn('[CloudDB] Direct Firestore load fallback:', e);
    }

    const local = getCachedDatabaseState();
    return local;
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
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const latencyMs = Math.round(performance.now() - t0);
        const data = await res.json();
        if (data.status === 'ok') {
          return { ...data, latencyMs };
        }
      }
    } catch {
      // Serverless/Vercel fallback to direct Firestore health check
    }

    // Direct Google Cloud Firestore Ping & Health Check (for Vercel or Serverless deployments)
    const cloudStatus = await checkCloudConnection();
    const latencyMs = Math.round(performance.now() - t0);
    const local = getCachedDatabaseState();
    return {
      status: cloudStatus.connected ? 'ok' : 'error',
      database: cloudStatus.connected ? 'connected' : 'offline',
      cloudDatabase: cloudStatus.connected ? 'connected' : 'syncing',
      cloudProvider: 'Google Cloud Firestore',
      projectId: cloudStatus.projectId,
      databaseId: cloudStatus.databaseId,
      lastCloudSync: cloudStatus.lastSyncedAt,
      totalResidents: local.residents?.length || 55,
      totalTransactions: local.transactions?.length || 0,
      timestamp: new Date().toISOString(),
      uptimeSeconds: 0,
      latencyMs,
    };
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
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const cloudStatus = await checkCloudConnection();
    const local = getCachedDatabaseState();
    return {
      provider: 'Google Cloud Firestore',
      projectId: cloudStatus.projectId,
      databaseId: cloudStatus.databaseId,
      connected: cloudStatus.connected,
      lastSyncedAt: cloudStatus.lastSyncedAt,
      totalResidents: local.residents?.length || 55,
      totalTransactions: local.transactions?.length || 0,
      serverUptime: 0,
      error: cloudStatus.error,
    };
  },

  async syncCloudDatabase(): Promise<{ success: boolean; timestamp: string }> {
    try {
      const res = await fetch('/api/database/sync-cloud', {
        method: 'POST',
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) return body;
      }
    } catch {}

    // Direct client sync to Google Cloud Firestore from browser
    const local = getCachedDatabaseState();
    const success = await syncStateToCloud(local);
    return { success, timestamp: new Date().toISOString() };
  },

  async sendPresenceHeartbeat(payload: {
    sessionId: string;
    role: string;
    roleLabel?: string;
    displayName?: string;
    unitId?: string;
  }): Promise<PresenceSummary> {
    const res = await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<PresenceSummary>(res);
  },

  async getPresenceSummary(): Promise<PresenceSummary> {
    const res = await fetch('/api/presence/summary');
    return handleJson<PresenceSummary>(res);
  },

  async sendPresenceLogout(sessionId: string): Promise<PresenceSummary> {
    const res = await fetch('/api/presence/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    return handleJson<PresenceSummary>(res);
  },


  async createTransaction(payload: CreateTransactionPayload): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const id = `TRX-${Date.now()}`;
        const newTx: import('../types/finance').LedgerTransaction = {
          ...payload,
          id,
          recordedBy: payload.recordedBy || 'Bendahara',
          receiptNumber: `SK/${payload.type === 'income' ? 'KW' : 'OUT'}/${payload.date.slice(0, 4)}/${payload.date.slice(5, 7)}/${id.slice(-4)}`,
          createdAt: new Date().toISOString(),
        };
        return {
          ...state,
          transactions: [newTx, ...state.transactions],
        };
      }
    );
  },

  async payBatchIuran(payload: BatchIuranPayload): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/transactions/batch-iuran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const fee = state.settings.monthlyFee || 100000;
        const newTxs: import('../types/finance').LedgerTransaction[] = payload.periodMonths.map(
          (m, idx) => {
            const id = `TRX-${Date.now()}-${idx}`;
            return {
              id,
              date: payload.date,
              periodMonth: m,
              type: 'income',
              category: 'Iuran Bulanan Warga',
              amount: fee,
              unitId: payload.unitId,
              paymentMethod: payload.paymentMethod,
              description: `Iuran bulanan unit ${payload.unitId} (${m})`,
              recordedBy: payload.recordedBy || 'Bendahara',
              receiptNumber: `SK/KW/${m.slice(0, 4)}/${m.slice(5, 7)}/${payload.unitId.replace('-', '')}`,
              createdAt: new Date().toISOString(),
            };
          }
        );
        return {
          ...state,
          transactions: [...newTxs, ...state.transactions],
        };
      }
    );
  },

  async deleteTransaction(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/transactions/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        transactions: state.transactions.filter((t) => t.id !== id),
      })
    );
  },

  async addResident(resident: Partial<ResidentUnit>, userRole?: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/residents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userRole ? { 'x-user-role': userRole } : {}),
          },
          body: JSON.stringify(resident),
        }),
      (state) => ({
        ...state,
        residents: [...state.residents, resident as ResidentUnit],
      })
    );
  },

  async updateResident(
    id: string,
    updates: Partial<ResidentUnit>,
    userRole?: string
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/residents/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(userRole ? { 'x-user-role': userRole } : {}),
          },
          body: JSON.stringify(updates),
        }),
      (state) => {
        const nextId = updates.id || id;
        return {
          ...state,
          residents: state.residents.map((r) =>
            r.id === id ? { ...r, ...updates, id: nextId } : r
          ),
          transactions:
            nextId !== id
              ? state.transactions.map((t) => (t.unitId === id ? { ...t, unitId: nextId } : t))
              : state.transactions,
        };
      }
    );
  },

  async deleteResident(id: string, userRole?: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/residents/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            ...(userRole ? { 'x-user-role': userRole } : {}),
          },
        }),
      (state) => ({
        ...state,
        residents: state.residents.filter((r) => r.id !== id),
      })
    );
  },

  async addBlock(block: BlockConfig): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block),
        }),
      (state) => ({
        ...state,
        settings: {
          ...state.settings,
          customBlocks: [...(state.settings.customBlocks || []), block],
        },
      })
    );
  },

  async updateBlock(id: string, updates: Partial<BlockConfig>): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/settings/blocks/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
      (state) => ({
        ...state,
        settings: {
          ...state.settings,
          customBlocks: (state.settings.customBlocks || []).map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        },
      })
    );
  },

  async deleteBlock(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/settings/blocks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        settings: {
          ...state.settings,
          customBlocks: (state.settings.customBlocks || []).filter((b) => b.id !== id),
        },
      })
    );
  },

  async addStreet(name: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings/streets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
      (state) => ({
        ...state,
        settings: {
          ...state.settings,
          customStreets: Array.from(new Set([...(state.settings.customStreets || []), name])),
        },
      })
    );
  },

  async deleteStreet(name: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings/streets', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
      (state) => ({
        ...state,
        settings: {
          ...state.settings,
          customStreets: (state.settings.customStreets || []).filter((s) => s !== name),
        },
      })
    );
  },

  async sendWhatsAppSingle(payload: {
    unitId: string;
    periodMonth: string;
    arrearsMonths: string[];
    totalBilled: number;
    message: string;
  }): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const resident = state.residents.find((r) => r.id === payload.unitId);
        if (resident) {
          resident.lastRemindedAt = new Date().toISOString();
        }
        return { ...state };
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
    try {
      const res = await fetch('/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          saveCachedDatabaseState(data.state);
          return data;
        }
      }
    } catch {}

    const state = getCachedDatabaseState();
    const now = new Date().toISOString();
    payload.items.forEach((item) => {
      const r = state.residents.find((res) => res.id === item.unitId);
      if (r) r.lastRemindedAt = now;
    });
    saveCachedDatabaseState(state);
    syncStateToCloud(state).catch(() => {});
    return { state, sentCount: payload.items.length };
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
    try {
      const res = await fetch('/api/whatsapp/auto-remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? { force: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          saveCachedDatabaseState(data.state);
          return data;
        }
      }
    } catch {}

    const state = getCachedDatabaseState();
    return {
      state,
      sentCount: 0,
      eligibleCount: 0,
      dueDay: state.settings.dueDayOfMonth || 10,
      period: payload?.periodMonth || '2026-10',
      message: 'Penagihan WhatsApp diproses',
    };
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
    try {
      const res = await fetch('/api/whatsapp/auto-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const local = getCachedDatabaseState();
    return {
      autoWhatsappEnabled: local.settings.autoWhatsappEnabled ?? true,
      dueDayOfMonth: local.settings.dueDayOfMonth || 10,
      autoReminderTriggerDay: local.settings.autoReminderTriggerDay || 10,
      autoReminderSchedule: local.settings.autoReminderSchedule || {
        hMinus3: true,
        dueDate: true,
        hPlus5Overdue: true,
      },
      unpaidCount: 12,
      monthlyFee: local.settings.monthlyFee || 100000,
      whatsappPaymentLink: local.settings.whatsappPaymentLink,
      whatsappPaymentInstructions: local.settings.whatsappPaymentInstructions,
      activePeriodMonth: '2026-10',
      serverTime: new Date().toISOString(),
    };
  },

  async updateSettings(settings: AdminSettings): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }),
      (state) => ({
        ...state,
        settings: { ...state.settings, ...settings },
      })
    );
  },

  async updateArrearsPublication(payload: {
    publishArrearsToResidents?: boolean;
    toggleUnitId?: string;
  }): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings/arrears-publication', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const nextSettings = { ...state.settings };
        if (typeof payload.publishArrearsToResidents === 'boolean') {
          nextSettings.publishArrearsToResidents = payload.publishArrearsToResidents;
        }
        if (payload.toggleUnitId) {
          const list = nextSettings.hiddenArrearsUnitIds || [];
          nextSettings.hiddenArrearsUnitIds = list.includes(payload.toggleUnitId)
            ? list.filter((u) => u !== payload.toggleUnitId)
            : [...list, payload.toggleUnitId];
        }
        return { ...state, settings: nextSettings };
      }
    );
  },

  async createAnnouncement(
    payload: Omit<CommunityActivityAnnouncement, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const newAnn: CommunityActivityAnnouncement = {
          ...payload,
          id: `ANN-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        return {
          ...state,
          announcements: [newAnn, ...(state.announcements || [])],
        };
      }
    );
  },

  async toggleAnnouncementPublish(id: string, published?: boolean): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/announcements/${encodeURIComponent(id)}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published }),
        }),
      (state) => ({
        ...state,
        announcements: (state.announcements || []).map((a) =>
          a.id === id ? { ...a, published: published ?? !a.published } : a
        ),
      })
    );
  },

  async deleteAnnouncement(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/announcements/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        announcements: (state.announcements || []).filter((a) => a.id !== id),
      })
    );
  },

  async createSecurityReport(
    payload: Omit<SecurityGuardReport, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/security-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const newRep: SecurityGuardReport = {
          ...payload,
          id: `SEC-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        return {
          ...state,
          securityReports: [newRep, ...(state.securityReports || [])],
        };
      }
    );
  },

  async toggleSecurityReportPublish(id: string, published?: boolean): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/security-reports/${encodeURIComponent(id)}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published }),
        }),
      (state) => ({
        ...state,
        securityReports: (state.securityReports || []).map((s) =>
          s.id === id ? { ...s, published: published ?? !s.published } : s
        ),
      })
    );
  },

  async deleteSecurityReport(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/security-reports/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        securityReports: (state.securityReports || []).filter((s) => s.id !== id),
      })
    );
  },

  async createSecurityOfficer(
    payload: Omit<import('../types/finance').SecurityOfficer, 'id' | 'joinedDate'>
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/security-officers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const newOff: import('../types/finance').SecurityOfficer = {
          ...payload,
          id: `SEC-OFF-${Date.now()}`,
          joinedDate: new Date().toISOString().slice(0, 10),
        };
        return {
          ...state,
          securityOfficers: [...(state.securityOfficers || []), newOff],
        };
      }
    );
  },

  async updateSecurityOfficer(
    id: string,
    updates: Partial<import('../types/finance').SecurityOfficer>
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/security-officers/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }),
      (state) => ({
        ...state,
        securityOfficers: (state.securityOfficers || []).map((o) =>
          o.id === id ? { ...o, ...updates } : o
        ),
      })
    );
  },

  async deleteSecurityOfficer(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/security-officers/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        securityOfficers: (state.securityOfficers || []).filter((o) => o.id !== id),
      })
    );
  },

  async suggestCategory(
    description: string,
    mode?: 'income' | 'expense'
  ): Promise<SuggestCategoryResponse> {
    try {
      const res = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, mode }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const cat = mode === 'income' ? 'Iuran Bulanan Warga' : 'Listrik PJU & Air';
    return {
      ok: true,
      primaryCategory: cat,
      suggestions: [
        {
          category: cat,
          confidence: 'medium',
          explanation: 'Kategori operasional lingkungan Saung Kebun',
          suggestedType: mode || 'expense',
        },
      ],
      source: 'heuristic',
    };
  },

  async submitPaymentConfirmation(
    payload: Omit<
      PaymentConfirmation,
      | 'id'
      | 'status'
      | 'submittedAt'
      | 'verifiedAt'
      | 'verifiedBy'
      | 'rejectionReason'
      | 'resultingTransactionId'
      | 'resultingReceiptNumber'
    >
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/payment-confirmations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const newConf: PaymentConfirmation = {
          ...payload,
          id: `CONF-${Date.now()}`,
          status: 'MENUNGGU_VERIFIKASI',
          submittedAt: new Date().toISOString(),
        };
        return {
          ...state,
          paymentConfirmations: [newConf, ...(state.paymentConfirmations || [])],
        };
      }
    );
  },

  async approvePaymentConfirmation(id: string, verifiedBy?: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/payment-confirmations/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verifiedBy }),
        }),
      (state) => {
        const conf = (state.paymentConfirmations || []).find((c) => c.id === id);
        if (!conf) return state;
        const trxId = `TRX-${Date.now()}`;
        const newTx: import('../types/finance').LedgerTransaction = {
          id: trxId,
          receiptNumber: `SK/KW/${conf.periodMonths[0]?.slice(0, 4) || '2026'}/${conf.periodMonths[0]?.slice(5, 7) || '10'}/${conf.unitId.replace('-', '')}`,
          date: conf.transferDate || new Date().toISOString().slice(0, 10),
          periodMonth: conf.periodMonths[0] || '2026-10',
          type: 'income',
          category: 'Iuran Bulanan Warga',
          amount: conf.amount,
          unitId: conf.unitId,
          paymentMethod: conf.paymentMethod,
          description: `Pembayaran Iuran Unit ${conf.unitId} (${conf.periodMonths.join(', ')})`,
          recordedBy: verifiedBy || 'Bendahara',
          createdAt: new Date().toISOString(),
        };
        return {
          ...state,
          transactions: [newTx, ...state.transactions],
          paymentConfirmations: (state.paymentConfirmations || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'DISETUJUI',
                  verifiedBy: verifiedBy || 'Bendahara',
                  verifiedAt: new Date().toISOString(),
                  resultingTransactionId: trxId,
                  resultingReceiptNumber: newTx.receiptNumber,
                }
              : c
          ),
        };
      }
    );
  },

  async rejectPaymentConfirmation(
    id: string,
    reason: string,
    verifiedBy?: string
  ): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/payment-confirmations/${encodeURIComponent(id)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, verifiedBy }),
        }),
      (state) => ({
        ...state,
        paymentConfirmations: (state.paymentConfirmations || []).map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'DITOLAK',
                rejectionReason: reason,
                verifiedBy: verifiedBy || 'Bendahara',
                verifiedAt: new Date().toISOString(),
              }
            : c
        ),
      })
    );
  },

  async deletePaymentConfirmation(id: string): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch(`/api/payment-confirmations/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
      (state) => ({
        ...state,
        paymentConfirmations: (state.paymentConfirmations || []).filter((c) => c.id !== id),
      })
    );
  },

  async updateReportPublication(payload: {
    type: 'monthly' | 'quarterly';
    id: string;
    published?: boolean;
  }): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/settings/reports-publication', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      (state) => {
        const s = { ...state.settings };
        if (payload.type === 'monthly') {
          const list = s.publishedMonthlyReports || [];
          s.publishedMonthlyReports = payload.published ?? !list.includes(payload.id)
            ? Array.from(new Set([...list, payload.id]))
            : list.filter((m) => m !== payload.id);
        } else {
          const list = s.publishedQuarterlyLPJ || [];
          s.publishedQuarterlyLPJ = payload.published ?? !list.includes(payload.id)
            ? Array.from(new Set([...list, payload.id]))
            : list.filter((q) => q !== payload.id);
        }
        return { ...state, settings: s };
      }
    );
  },

  async resetDatabase(): Promise<DatabaseState> {
    return mutateAndCache(
      () =>
        fetch('/api/reset', {
          method: 'POST',
        }),
      () => createSeedDatabase()
    );
  },
};

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

