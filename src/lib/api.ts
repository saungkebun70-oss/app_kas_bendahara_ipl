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

