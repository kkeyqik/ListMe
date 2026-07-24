import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Role, UserStatus } from '@prisma/client';
import { logAdminActivity } from '@/lib/activity-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role, phoneVerified, status } = body;

    // Validate and build update payload
    const updateData: any = {};

    if (role !== undefined) {
      if (!Object.values(Role).includes(role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role as Role;
    }

    if (phoneVerified !== undefined) {
      if (typeof phoneVerified !== 'boolean') {
        return NextResponse.json({ message: 'phoneVerified must be a boolean' }, { status: 400 });
      }
      updateData.phoneVerified = phoneVerified;
    }

    if (status !== undefined) {
      if (!Object.values(UserStatus).includes(status)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status as UserStatus;
    }

    // Update target user profile
    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: updateData,
    });

    // Log the admin activity
    const adminName = requesterProfile.name || 'Admin';
    const finalRole = updatedProfile.role;
    const finalStatus = updatedProfile.status;
    const actionText = `${adminName} updated User ${id} role to ${finalRole} status to ${finalStatus}`;

    await logAdminActivity({
      adminId: user.id,
      action: actionText,
      entityType: 'USER_PROFILE',
      entityId: id,
      metadata: {
        role: finalRole,
        status: finalStatus,
        phoneVerified: updatedProfile.phoneVerified,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error: any) {
    console.error('[admin/users PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
