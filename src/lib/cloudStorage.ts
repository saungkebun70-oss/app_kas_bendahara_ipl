import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { DatabaseState } from '../types/finance.ts';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const cloudDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

export interface CloudDbStatus {
  provider: 'Google Cloud Firestore';
  projectId: string;
  databaseId: string;
  connected: boolean;
  lastSyncedAt: string | null;
  quotaExceeded: boolean;
  upgradeUrl: string;
  message?: string;
  error?: string;
}

let lastCloudSync: string | null = null;
let isConnected = false;
let isQuotaExceeded = false;
let quotaExceededDetectedAt: number | null = null;
const QUOTA_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown before re-testing cloud writes

let debounceTimer: NodeJS.Timeout | null = null;
let pendingStateToSync: DatabaseState | null = null;

function checkQuotaCooldown(): boolean {
  if (isQuotaExceeded && quotaExceededDetectedAt) {
    if (Date.now() - quotaExceededDetectedAt < QUOTA_COOLDOWN_MS) {
      return true;
    }
    // Cooldown elapsed, allow retry
    isQuotaExceeded = false;
  }
  return isQuotaExceeded;
}

function handleQuotaError(err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Quota exceeded') ||
    (err as any)?.code === 'resource-exhausted'
  ) {
    isQuotaExceeded = true;
    quotaExceededDetectedAt = Date.now();
    console.warn(
      '[CloudDB] Kuota tulis harian gratis Firestore (Spark Free Tier) telah tercapai untuk hari ini. Sinkronisasi cloud dijeda sementara. Seluruh data tetap tersimpan aman di database lokal.'
    );
  }
}

export async function checkCloudConnection(): Promise<CloudDbStatus> {
  const quotaBlocked = checkQuotaCooldown();
  try {
    const metaRef = doc(cloudDb, 'appState', 'latest');
    await getDoc(metaRef);
    isConnected = true;
    return {
      provider: 'Google Cloud Firestore',
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      connected: true,
      lastSyncedAt: lastCloudSync,
      quotaExceeded: quotaBlocked,
      upgradeUrl: UPGRADE_URL,
      message: quotaBlocked
        ? 'Batas kuota tulis harian gratis Firestore tercapai (reset otomatis besok hari). Data aplikasi tetap tersimpan normal di server lokal.'
        : 'Terhubung online otomatis',
    };
  } catch (err) {
    handleQuotaError(err);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      provider: 'Google Cloud Firestore',
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      connected: false,
      lastSyncedAt: lastCloudSync,
      quotaExceeded: isQuotaExceeded,
      upgradeUrl: UPGRADE_URL,
      error: msg,
      message: isQuotaExceeded
        ? 'Batas kuota harian gratis Firestore tercapai. Data lokal tetap aman.'
        : msg,
    };
  }
}

/**
 * Persists the latest database snapshot to Google Cloud Firestore online with quota safety & single-doc efficiency.
 */
export async function syncStateToCloud(state: DatabaseState): Promise<boolean> {
  if (checkQuotaCooldown()) {
    return false;
  }

  try {
    // Save single consolidated snapshot to avoid burning multiple write units per save
    const stateDocRef = doc(cloudDb, 'appState', 'latest');
    await setDoc(stateDocRef, {
      updatedAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
      settings: state.settings,
      residentsCount: state.residents?.length ?? 0,
      transactionsCount: state.transactions?.length ?? 0,
      announcementsCount: state.announcements?.length ?? 0,
      securityReportsCount: state.securityReports?.length ?? 0,
      paymentConfirmationsCount: state.paymentConfirmations?.length ?? 0,
      serializedState: JSON.stringify(state),
    }, { merge: true });

    lastCloudSync = new Date().toISOString();
    isConnected = true;
    isQuotaExceeded = false;
    quotaExceededDetectedAt = null;
    return true;
  } catch (err) {
    handleQuotaError(err);
    return false;
  }
}

/**
 * Debounced cloud synchronization to batch rapid local database updates into at most 1 write every 15 seconds.
 */
export function scheduleDebouncedCloudSync(state: DatabaseState): void {
  if (checkQuotaCooldown()) {
    return;
  }

  pendingStateToSync = state;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (pendingStateToSync) {
      const stateToSave = pendingStateToSync;
      pendingStateToSync = null;
      syncStateToCloud(stateToSave).catch((err) => {
        handleQuotaError(err);
      });
    }
  }, 15000);
}

/**
 * Loads the latest state from Google Cloud Firestore if available.
 */
export async function loadStateFromCloud(): Promise<DatabaseState | null> {
  try {
    const stateDocRef = doc(cloudDb, 'appState', 'latest');
    const snap = await getDoc(stateDocRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.serializedState === 'string' && data.serializedState.length > 0) {
        const parsed = JSON.parse(data.serializedState) as DatabaseState;
        if (Array.isArray(parsed.residents) && parsed.residents.length > 0) {
          lastCloudSync = data.updatedAt || new Date().toISOString();
          isConnected = true;
          return parsed;
        }
      }
    }
  } catch (err) {
    handleQuotaError(err);
  }
  return null;
}
