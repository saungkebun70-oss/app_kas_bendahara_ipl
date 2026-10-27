import type {
  AdminSettings,
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

export const api = {
  async getState(): Promise<DatabaseState> {
    const res = await fetch('/api/state');
    return handleJson<DatabaseState>(res);
  },

  async getHealth(): Promise<{
    status: string;
    database: string;
    totalResidents: number;
    totalTransactions: number;
    timestamp: string;
    uptimeSeconds: number;
    latencyMs: number;
  }> {
    const t0 = performance.now();
    const res = await fetch('/api/health');
    const latencyMs = Math.round(performance.now() - t0);
    const data = await handleJson<{
      status: string;
      database: string;
      totalResidents: number;
      totalTransactions: number;
      timestamp: string;
      uptimeSeconds: number;
    }>(res);
    return { ...data, latencyMs };
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
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async payBatchIuran(payload: BatchIuranPayload): Promise<DatabaseState> {
    const res = await fetch('/api/transactions/batch-iuran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async deleteTransaction(id: string): Promise<DatabaseState> {
    const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleJson<DatabaseState>(res);
  },

  async updateResident(id: string, updates: Partial<ResidentUnit>): Promise<DatabaseState> {
    const res = await fetch(`/api/residents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleJson<DatabaseState>(res);
  },

  async sendWhatsAppSingle(payload: {
    unitId: string;
    periodMonth: string;
    arrearsMonths: string[];
    totalBilled: number;
    message: string;
  }): Promise<DatabaseState> {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
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
    const res = await fetch('/api/whatsapp/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<{ state: DatabaseState; sentCount: number }>(res);
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
    const res = await fetch('/api/whatsapp/auto-remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? { force: true }),
    });
    return handleJson<{
      state: DatabaseState;
      sentCount: number;
      eligibleCount: number;
      dueDay: number;
      period: string;
      message: string;
    }>(res);
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
    const res = await fetch('/api/whatsapp/auto-status');
    return handleJson(res);
  },

  async updateSettings(settings: AdminSettings): Promise<DatabaseState> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleJson<DatabaseState>(res);
  },

  async updateArrearsPublication(payload: {
    publishArrearsToResidents?: boolean;
    toggleUnitId?: string;
  }): Promise<DatabaseState> {
    const res = await fetch('/api/settings/arrears-publication', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async createAnnouncement(
    payload: Omit<CommunityActivityAnnouncement, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async toggleAnnouncementPublish(id: string, published?: boolean): Promise<DatabaseState> {
    const res = await fetch(`/api/announcements/${encodeURIComponent(id)}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    return handleJson<DatabaseState>(res);
  },

  async deleteAnnouncement(id: string): Promise<DatabaseState> {
    const res = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleJson<DatabaseState>(res);
  },

  async createSecurityReport(
    payload: Omit<SecurityGuardReport, 'id' | 'createdAt'>
  ): Promise<DatabaseState> {
    const res = await fetch('/api/security-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async toggleSecurityReportPublish(id: string, published?: boolean): Promise<DatabaseState> {
    const res = await fetch(`/api/security-reports/${encodeURIComponent(id)}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    return handleJson<DatabaseState>(res);
  },

  async deleteSecurityReport(id: string): Promise<DatabaseState> {
    const res = await fetch(`/api/security-reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleJson<DatabaseState>(res);
  },

  async createSecurityOfficer(
    payload: Omit<import('../types/finance').SecurityOfficer, 'id' | 'joinedDate'>
  ): Promise<DatabaseState> {
    const res = await fetch('/api/security-officers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async updateSecurityOfficer(
    id: string,
    updates: Partial<import('../types/finance').SecurityOfficer>
  ): Promise<DatabaseState> {
    const res = await fetch(`/api/security-officers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleJson<DatabaseState>(res);
  },

  async deleteSecurityOfficer(id: string): Promise<DatabaseState> {
    const res = await fetch(`/api/security-officers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleJson<DatabaseState>(res);
  },

  async suggestCategory(
    description: string,
    mode?: 'income' | 'expense'
  ): Promise<SuggestCategoryResponse> {
    const res = await fetch('/api/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, mode }),
    });
    return handleJson<SuggestCategoryResponse>(res);
  },

  async submitPaymentConfirmation(
    payload: Omit<PaymentConfirmation, 'id' | 'status' | 'submittedAt' | 'verifiedAt' | 'verifiedBy' | 'rejectionReason' | 'resultingTransactionId' | 'resultingReceiptNumber'>
  ): Promise<DatabaseState> {
    const res = await fetch('/api/payment-confirmations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async approvePaymentConfirmation(id: string, verifiedBy?: string): Promise<DatabaseState> {
    const res = await fetch(`/api/payment-confirmations/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedBy }),
    });
    return handleJson<DatabaseState>(res);
  },

  async rejectPaymentConfirmation(id: string, reason: string, verifiedBy?: string): Promise<DatabaseState> {
    const res = await fetch(`/api/payment-confirmations/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, verifiedBy }),
    });
    return handleJson<DatabaseState>(res);
  },

  async deletePaymentConfirmation(id: string): Promise<DatabaseState> {
    const res = await fetch(`/api/payment-confirmations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleJson<DatabaseState>(res);
  },

  async updateReportPublication(payload: {
    type: 'monthly' | 'quarterly';
    id: string;
    published?: boolean;
  }): Promise<DatabaseState> {
    const res = await fetch('/api/settings/reports-publication', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleJson<DatabaseState>(res);
  },

  async resetDatabase(): Promise<DatabaseState> {
    const res = await fetch('/api/reset', {
      method: 'POST',
    });
    return handleJson<DatabaseState>(res);
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

