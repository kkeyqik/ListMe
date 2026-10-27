import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { logAdminActivity } from '@/lib/activity-logger';
import { hasAdminAccess } from '@/lib/admin-permissions';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsObj, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('[settings] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid settings body' }, { status: 400 });
    }

    if (Object.keys(body).length > 100) {
      return NextResponse.json({ message: 'Too many settings in one request' }, { status: 400 });
    }
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string' || key.length > 100 || value.length > 10000) {
        return NextResponse.json({ message: `Invalid value for setting "${key.slice(0, 100)}"` }, { status: 400 });
      }
    }

    // Site settings (contact phone, brand, analytics, ...) are Super Admin
    // only. An ADMIN with the 'seo' permission may change seo_* keys only.
    if (!hasAdminAccess(requesterProfile, 'super')) {
      const keys = Object.keys(body);
      const seoOnly = keys.length > 0 && keys.every((k) => k.startsWith('seo_'));
      if (!seoOnly || !hasAdminAccess(requesterProfile, 'seo')) {
        return NextResponse.json(
          { message: 'Forbidden: only a Super Admin can change these settings' },
          { status: 403 }
        );
      }
    }

    // Update settings in database
    const updates = Object.entries(body as Record<string, string>).map(([key, value]) => {
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    });

    // All keys or none: a failure part-way must not leave a half-saved settings form.
    await prisma.$transaction(updates);

    // Log the admin activity
    const changedKeys = Object.keys(body).join(', ');
    const adminName = requesterProfile.name || 'Admin';
    await logAdminActivity({
      adminId: userId,
      action: `${adminName} updated system settings [${changedKeys}]`,
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'SYSTEM',
      metadata: { changedKeys: Object.keys(body) },
    });

    // Fetch and return the updated settings
    const settings = await prisma.systemSetting.findMany();
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsObj);
  } catch (error: any) {
    console.error('[settings] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
