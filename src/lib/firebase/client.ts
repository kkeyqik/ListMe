import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, type Auth, type ConfirmationResult, type RecaptchaVerifier } from 'firebase/auth';

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

// Local dev with mock auth on: skip reCAPTCHA so the Firebase test numbers
// (e.g. 7777777777 / 123456) can be used by automated browsers, which Google
// always answers with an image puzzle. Only fictional test numbers work in
// this mode, and it can never switch on in a production build.
const disableAppVerificationForTesting =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

export const getFirebaseAuth = () => {
  const app = initFirebase();
  if (!app) return null;
  const auth = getAuth(app);
  if (disableAppVerificationForTesting) auth.settings.appVerificationDisabledForTesting = true;
  return auth;
};

const OTP_SEND_TIMEOUT_MS = 90_000;

/**
 * signInWithPhoneNumber, but it gives up instead of hanging. When reCAPTCHA
 * escalates to an image puzzle and the person closes it, Firebase's promise
 * never settles and the Send OTP button spins forever. On failure the widget
 * is reset so the next attempt gets a fresh token.
 */
export const sendPhoneOtp = async (
  auth: Auth,
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Verification timed out. Please try again.') as Error & { code: string };
      err.code = 'auth/timeout';
      reject(err);
    }, OTP_SEND_TIMEOUT_MS);
  });
  try {
    return await Promise.race([signInWithPhoneNumber(auth, phoneNumber, verifier), timeout]);
  } catch (err) {
    try {
      const widgetId = await verifier.render();
      (window as unknown as { grecaptcha?: { reset: (id: number) => void } }).grecaptcha?.reset(widgetId);
    } catch {
      // verifier already cleared
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
