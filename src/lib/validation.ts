/**
 * Input validation & sanitisation utilities.
 *
 * All helpers are pure functions with zero external dependencies.
 * Phone validation targets Indian numbers (10 digits → +91XXXXXXXXXX).
 */

// ---------------------------------------------------------------------------
// Regexes
// ---------------------------------------------------------------------------

/** Matches a bare 10-digit Indian mobile number (after stripping prefixes). */
const PHONE_DIGITS_RE = /^\d{10}$/;

/**
 * RFC-5322-ish email regex.  Intentionally simplified — covers the vast
 * majority of real-world addresses without getting into RFC edge-cases.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Matches any HTML/XML tag. */
const HTML_TAG_RE = /<[^>]*>/g;

// ---------------------------------------------------------------------------
// sanitizeInput
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and trim whitespace from arbitrary input.
 */
export function sanitizeInput(input: string): string {
  return input.replace(HTML_TAG_RE, '').trim();
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/**
 * Normalise a phone string to its bare 10-digit form by stripping the
 * country code, leading zero, spaces, dashes, and parentheses.
 */
function extractDigits(phone: string): string {
  // Remove all non-digit characters.
  let digits = phone.replace(/\D/g, '');

  // Strip leading country code: 91 (India).
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Strip a leading zero (trunk prefix).
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Validate an Indian phone number.
 *
 * Accepts formats like `9876543210`, `+91 98765 43210`, `091-9876543210`, etc.
 * Returns the normalised `+91XXXXXXXXXX` form on success.
 */
export function validatePhone(phone: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, normalized: '', error: 'Phone number is required' };
  }

  const digits = extractDigits(phone.trim());

  if (!PHONE_DIGITS_RE.test(digits)) {
    return {
      valid: false,
      normalized: '',
      error: 'Phone number must be 10 digits',
    };
  }

  return { valid: true, normalized: `+91${digits}` };
}

/**
 * Normalise a phone string to `+91XXXXXXXXXX` format.
 *
 * If the input is not a valid 10-digit number the original value is returned
 * as-is (callers should validate separately when strictness is required).
 */
export function normalizePhone(phone: string): string {
  const digits = extractDigits(phone.trim());
  if (PHONE_DIGITS_RE.test(digits)) {
    return `+91${digits}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

/**
 * Validate an email address against a simplified RFC-5322 regex.
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Name
// ---------------------------------------------------------------------------

/**
 * Validate and sanitise a display name.
 *
 * Rules:
 *  - Must be between 2 and 100 characters (after sanitisation).
 *  - HTML tags are stripped automatically.
 */
export function validateName(name: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Name is required' };
  }

  const sanitized = sanitizeInput(name);

  if (sanitized.length < 2) {
    return {
      valid: false,
      sanitized,
      error: 'Name must be at least 2 characters',
    };
  }

  if (sanitized.length > 100) {
    return {
      valid: false,
      sanitized,
      error: 'Name must be at most 100 characters',
    };
  }

  return { valid: true, sanitized };
}
