import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { Role, UserStatus } from '@prisma/client';
import { logAdminActivity } from '@/lib/activity-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
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
      adminId: userId,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requesterId = await getAuthenticatedUserId();
    if (!requesterId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: requesterId },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get the target user to check permissions
    const targetProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!targetProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Role-based deletion logic
    if (requesterProfile.role === 'ADMIN' && targetProfile.role !== 'USER') {
      return NextResponse.json({ message: 'Admins can only delete regular users' }, { status: 403 });
    }

    if (requesterProfile.role === 'SUPER_ADMIN' && targetProfile.role === 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Cannot delete a Super Admin' }, { status: 403 });
    }

    // First delete from Supabase Auth
    // We dynamically import the admin client to avoid issues if not configured correctly
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();
    
    // Attempt to delete from Auth (might fail if it's a mock user in dev, so we catch)
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        console.warn('Failed to delete from Auth, continuing DB deletion:', authError.message);
      }
    } catch (authErr) {
      console.warn('Exception deleting from Auth:', authErr);
    }

    // Delete from Database
    // Prisma will cascade delete all listings, interests, shortlists, saved searches, etc.
    // UserActivityLog does not have a hard foreign key so it stays intact.
    await prisma.profile.delete({
      where: { id },
    });

    // Log the admin activity
    const adminName = requesterProfile.name || 'Admin';
    const actionText = `${adminName} deleted user ${targetProfile.name || id} (${targetProfile.role})`;
    
    await logAdminActivity({
      adminId: requesterId,
      action: actionText,
      entityType: 'USER_PROFILE',
      entityId: id,
      metadata: { deletedUserRole: targetProfile.role },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('[admin/users DELETE] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

