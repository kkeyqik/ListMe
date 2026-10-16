import { validatePhone } from '@/lib/validation';

/**
 * Verifies a Firebase ID token server-side and returns the phone number that
 * Firebase confirmed via SMS OTP, normalised to `+91XXXXXXXXXX`.
 *
 * Uses the Identity Toolkit `accounts:lookup` endpoint, which rejects tokens
 * that are expired, tampered with, or issued for a different Firebase project.
 * Returns `null` when the token is missing, invalid, or has no phone number.
 */
export async function verifyFirebasePhoneToken(idToken: unknown): Promise<string | null> {
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) {
    return null;
  }

  const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('[verifyFirebasePhoneToken] Firebase API key is not configured');
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      }
    );

    if (!res.ok) return null;

    const data: { users?: Array<{ phoneNumber?: string }> } = await res.json();
    const phoneNumber = data.users?.[0]?.phoneNumber;
    if (!phoneNumber) return null;

    const result = validatePhone(phoneNumber);
    return result.valid ? result.normalized : null;
  } catch (err) {
    console.warn('[verifyFirebasePhoneToken] Lookup failed:', err);
    return null;
  }
}
