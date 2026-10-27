import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if variables are configured
export const isFirebaseConfigured = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const initFirebase = () => {
  if (!isFirebaseConfigured) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
};

export const getFirebaseAuth = () => {
  const app = initFirebase();
  return app ? getAuth(app) : null;
};

/**
 * Ends the browser's Firebase session. The app only uses Firebase to prove a
 * phone number once (the ID token is exchanged for a ListMe session), so the
 * Firebase user must not linger in browser storage where its refresh token
 * could mint new ID tokens after the person has logged out.
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return;
    // The persisted user is restored asynchronously on page load.
    await auth.authStateReady();
    if (auth.currentUser) {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
  } catch (err) {
    console.warn('[firebase] signOut failed:', err);
  }
};
