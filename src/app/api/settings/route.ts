import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { logAdminActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsObj);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid settings body' }, { status: 400 });
    }

    // Update settings in database
    const updates = Object.entries(body).map(([key, value]) => {
      if (typeof value !== 'string') {
        throw new Error(`Setting value for key "${key}" must be a string`);
      }
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    });

    await Promise.all(updates);

    // Log the admin activity
    const changedKeys = Object.keys(body).join(', ');
    const adminName = requesterProfile.name || 'Admin';
    await logAdminActivity({
      adminId: user.id,
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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
