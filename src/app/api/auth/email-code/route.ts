import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rate-limiter';
import { validateEmail, validateName } from '@/lib/validation';
import { isPlaceholderEmail } from '@/lib/server-auth';
import { safeRedirectPath } from '@/lib/safe-redirect';

const PER_EMAIL_LIMIT = 5;
const PER_IP_LIMIT = 20;
const HOUR = 60 * 60 * 1000;

type Purpose = 'login' | 'signup' | 'recovery';

const SENT_MESSAGE: Record<Purpose, string> = {
  login: "If this email has a ListMe account, we've sent a 6-digit code and a sign-in link.",
  signup: "We've sent a 6-digit code and a link to confirm your email.",
  recovery: "If this email has a ListMe account, we've sent a 6-digit code and a reset link.",
};

/**
 * POST /api/auth/email-code  { email, purpose, name?, redirect? }
 *
 * Sends a sign-in, sign-up or password-reset email through Supabase.
 * Runs on the server so it can be rate limited per email and per IP, and so
 * the reply never reveals whether an account exists.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const purpose: Purpose = body.purpose === 'signup' || body.purpose === 'recovery' ? body.purpose : 'login';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ message: emailCheck.error }, { status: 400 });
    }

    let name: string | undefined;
    if (purpose === 'signup') {
      const nameCheck = validateName(body.name);
      if (!nameCheck.valid) {
        return NextResponse.json({ message: nameCheck.error }, { status: 400 });
      }
      name = nameCheck.sanitized;
    }

    const ipLimit = await rateLimit(`email-code:ip:${getClientIp(request)}`, PER_IP_LIMIT, HOUR);
    const emailLimit = await rateLimit(`email-code:email:${email}`, PER_EMAIL_LIMIT, HOUR);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const blocking = !ipLimit.allowed ? ipLimit : emailLimit;
      return NextResponse.json(
        { message: 'Too many codes requested. Please wait a while and try again.' },
        { status: 429, headers: getRateLimitHeaders(blocking, !ipLimit.allowed ? PER_IP_LIMIT : PER_EMAIL_LIMIT) }
      );
    }

    if (isPlaceholderEmail(email)) {
      return NextResponse.json({ success: true, message: SENT_MESSAGE[purpose] });
    }

    const origin = request.nextUrl.origin;
    const redirect = safeRedirectPath(body.redirect);
    const supabase = await createClient();

    const { error } =
      purpose === 'recovery'
        ? await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/callback?redirect=${encodeURIComponent('/reset-password')}`,
          })
        : await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: purpose === 'signup',
              emailRedirectTo: `${origin}/callback?redirect=${encodeURIComponent(redirect)}`,
              ...(name ? { data: { name } } : {}),
            },
          });

    if (error) {
      // Supabase's own throttles (one email per address per minute, hourly
      // email cap) are worth telling the user about; everything else, such as
      // "no account with this email", gets the same reply as success.
      if (error.status === 429) {
        return NextResponse.json(
          { message: 'Please wait a minute before asking for another code.' },
          { status: 429 }
        );
      }
      console.warn(`[email-code] ${purpose} send not completed:`, error.status, error.message);
    }

    return NextResponse.json({ success: true, message: SENT_MESSAGE[purpose] });
  } catch (error) {
    console.error('[email-code] Error:', error);
    return NextResponse.json({ message: 'Could not send the email. Please try again.' }, { status: 500 });
  }
}
