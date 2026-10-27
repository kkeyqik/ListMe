const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed UUID. Prisma throws (500) on a malformed id for a @db.Uuid column. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Phone-OTP sign-ups get a stand-in address (phone_<digits>@listme.com) that nobody reads.
 * Never show it to another user as a way to reach someone.
 */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && /^phone_\d+@listme\.com$/i.test(email);
}
