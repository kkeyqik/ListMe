/**
 * Client helper: records an admin CSV export in the admin activity log
 * (POST /api/admin/exports) before the file is generated in the browser.
 * Returns false when the server refuses (e.g. missing permission), in which
 * case the caller should not download anything.
 */
export type AdminExportType = 'USERS' | 'ADMINS' | 'ACTIVITY_LOGS' | 'LISTINGS' | 'PINCODES';

export async function recordAdminExport(
  exportType: AdminExportType,
  rowCount: number,
  filters?: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportType, rowCount, filters: filters || {} }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
