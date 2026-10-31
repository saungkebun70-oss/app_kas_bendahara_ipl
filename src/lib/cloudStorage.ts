import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { DatabaseState, ResidentUnit, LedgerTransaction, CommunityActivityAnnouncement, SecurityGuardReport, PaymentConfirmation } from '../types/finance.ts';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const cloudDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface CloudDbStatus {
  provider: 'Google Cloud Firestore';
  projectId: string;
  databaseId: string;
  connected: boolean;
  lastSyncedAt: string | null;
  error?: string;
}

let lastCloudSync: string | null = null;
let isConnected = false;

export async function checkCloudConnection(): Promise<CloudDbStatus> {
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
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      provider: 'Google Cloud Firestore',
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      connected: false,
      lastSyncedAt: lastCloudSync,
      error: msg,
    };
  }
}

/**
 * Persists the entire database state to Google Cloud Firestore online.
 */
export async function syncStateToCloud(state: DatabaseState): Promise<boolean> {
  try {
    // 1. Save global snapshot in appState/latest
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
      // Store complete structured state for atomic backup & recovery
      serializedState: JSON.stringify(state),
    }, { merge: true });

    // 2. Also save settings document for direct access
    const settingsRef = doc(cloudDb, 'settings', 'global');
    await setDoc(settingsRef, {
      ...state.settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. Sync residents collection in batches
    if (state.residents && state.residents.length > 0) {
      const batch = writeBatch(cloudDb);
      for (const res of state.residents) {
        if (res.id) {
          const resRef = doc(cloudDb, 'residents', res.id);
          batch.set(resRef, {
            ...res,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }
      await batch.commit();
    }

    lastCloudSync = new Date().toISOString();
    isConnected = true;
    console.log(`[CloudDB] Successfully synchronized database state to Google Cloud Firestore at ${lastCloudSync}`);
    return true;
  } catch (err) {
    console.error('[CloudDB] Failed synchronizing state to Google Cloud Firestore:', err);
    return false;
  }
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
          console.log(`[CloudDB] Successfully restored state from Google Cloud Firestore (Last saved: ${data.updatedAt || 'unknown'})`);
          lastCloudSync = data.updatedAt || new Date().toISOString();
          isConnected = true;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[CloudDB] Could not load state from Google Cloud Firestore on startup, falling back to local storage:', err);
  }
  return null;
}
