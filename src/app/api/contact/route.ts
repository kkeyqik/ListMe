import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { isPlaceholderEmail } from '@/lib/contact-info';

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 5 messages per IP per hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Strip CR/LF so user input can never inject extra mail headers via the subject. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Where contact-form messages go. Env vars win; then the admin "contactEmail"
 * setting (if it isn't a placeholder); then the SMTP mailbox itself.
 * Every message is also stored in email_logs by sendEmail(), so admins can read
 * it from the admin email log even when SMTP is not configured.
 */
async function resolveRecipient(): Promise<string> {
  const fromEnv = [process.env.CONTACT_EMAIL, process.env.ADMIN_EMAIL]
    .map((v) => v?.trim())
    .find((v) => v && EMAIL_RE.test(v));
  if (fromEnv) return fromEnv;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'contactEmail' } });
    const value = setting?.value?.trim();
    if (value && EMAIL_RE.test(value) && !isPlaceholderEmail(value)) return value;
  } catch (err) {
    console.error('[contact] Could not read contactEmail setting:', err);
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  if (smtpUser && EMAIL_RE.test(smtpUser)) return smtpUser;

  // Nothing configured: the message still lands in email_logs (status SIMULATED/FAILED).
  return 'contact-inbox@listme.invalid';
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const limit = rateLimit(`contact:${ip}`, LIMIT, WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Too many messages. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Honeypot: real users never fill this hidden field. Pretend success for bots.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') {
    return NextResponse.json({ success: true });
  }

  const name = typeof raw.name === 'string' ? oneLine(raw.name) : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  const errors: string[] = [];
  if (name.length < 2 || name.length > 100) errors.push('Please enter your name (2-100 characters).');
  if (!EMAIL_RE.test(email) || email.length > 254) errors.push('Please enter a valid email address.');
  if (message.length < 10 || message.length > 5000) errors.push('Please enter a message (10-5000 characters).');
  if (errors.length > 0) {
    return NextResponse.json({ message: errors[0], errors }, { status: 400 });
  }

  const to = await resolveRecipient();
  const subject = `New contact message from ${name}`.slice(0, 150);
  const text = `Name: ${name}\nEmail: ${email}\nIP: ${ip}\n\nMessage:\n${message}`;
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}<br/>`
    + `<strong>Email:</strong> ${escapeHtml(email)}<br/>`
    + `<strong>IP:</strong> ${escapeHtml(ip)}</p>`
    + `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  const result = await sendEmail({
    to,
    subject,
    text,
    html,
    metadata: { type: 'CONTACT_FORM', name, email, ip },
  });

  if (!result.success) {
    return NextResponse.json(
      { message: 'We could not send your message right now. Please try again in a few minutes.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(limit, LIMIT) });
}
