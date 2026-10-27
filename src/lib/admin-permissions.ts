/**
 * Admin module permissions, shared by the server (API routes, proxy) and the
 * client (sidebar, admin layout) so both always agree.
 *
 * Permissions are stored per admin in Profile.roleMetadata as
 * `{ permissions: { listings, users, interests, seo } }` (written by the
 * Role Manager). SUPER_ADMIN always has every module. Pure module: no
 * server-only imports, safe to use from client components.
 */

export type AdminModule = 'listings' | 'users' | 'interests' | 'seo';

/** Pseudo-module for pages and APIs that only a SUPER_ADMIN may use. */
export type AdminAccess = AdminModule | 'super';

export const ADMIN_MODULES: readonly AdminModule[] = ['listings', 'users', 'interests', 'seo'];

interface AdminLike {
  role?: string | null;
  roleMetadata?: unknown;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

/** Reads roleMetadata.permissions defensively (it is free-form JSON). */
export function getAdminPermissions(roleMetadata: unknown): Partial<Record<AdminModule, boolean>> {
  if (!roleMetadata || typeof roleMetadata !== 'object') return {};
  const perms = (roleMetadata as { permissions?: unknown }).permissions;
  if (!perms || typeof perms !== 'object') return {};
  const result: Partial<Record<AdminModule, boolean>> = {};
  for (const key of ADMIN_MODULES) {
    if ((perms as Record<string, unknown>)[key] === true) result[key] = true;
  }
  return result;
}

/**
 * True when the profile may use the given module. Interest tracking has
 * always been visible to admins with the listings permission as well, so
 * that mapping is kept.
 */
export function hasAdminAccess(profile: AdminLike | null | undefined, access: AdminAccess): boolean {
  if (!profile || !isAdminRole(profile.role)) return false;
  if (isSuperAdminRole(profile.role)) return true;
  if (access === 'super') return false;
  const perms = getAdminPermissions(profile.roleMetadata);
  if (access === 'interests') return Boolean(perms.interests || perms.listings);
  return Boolean(perms[access]);
}

/**
 * Which access an /admin page needs. The overview (/admin) is open to every
 * admin; unknown sub-pages default to super-admin only.
 */
export function requiredAccessForAdminPath(pathname: string): AdminAccess | null {
  const section = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  switch (section) {
    case '':
      return null;
    case 'listings':
    case 'pincodes':
      return 'listings';
    case 'users':
      return 'users';
    case 'interests':
      return 'interests';
    case 'seo':
      return 'seo';
    default:
      // roles, activity, settings and anything new
      return 'super';
  }
}
