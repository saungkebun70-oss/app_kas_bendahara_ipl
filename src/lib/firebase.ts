import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export { firebaseConfig };

export async function testFirestoreConnection(): Promise<{ success: boolean; error?: unknown }> {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
    return { success: false, error };
  }
}
