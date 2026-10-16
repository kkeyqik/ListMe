import crypto from 'crypto';
import { requireSecret } from '@/lib/mock-auth';

/**
 * Generates a secure, deterministic password for a verified phone number.
 * Uses the private SUPABASE_SERVICE_ROLE_KEY (server-only) as the HMAC key.
 */
export function getSecurePassword(phone: string): string {
  const secret = requireSecret('SUPABASE_SERVICE_ROLE_KEY', 'default-jwt-secret-key-for-development');
  return crypto.createHmac('sha256', secret).update(phone).digest('hex');
}
