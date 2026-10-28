import { NextRequest, NextResponse, after } from 'next/server';
import { LISTING_IMAGES_BUCKET, LISTING_DOCUMENTS_BUCKET, LISTING_VIDEOS_BUCKET } from '@/lib/upload-rules';
import { requireAdminModule, countOtherActiveSuperAdmins, getRequestIp } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { Role, UserStatus } from '@prisma/client';
import { logAdminActivity } from '@/lib/activity-logger';

/** Best-effort removal of deleted listings' files from Storage. */
async function removeListingsFiles(listingIds: string[]) {
  let supabase;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    supabase = createAdminClient();
  } catch (err) {
    console.error('[admin/users DELETE] storage cleanup skipped:', err);
    return;
  }
  const folders: Array<[string, string]> = [
    [LISTING_IMAGES_BUCKET, 'images'],
    [LISTING_DOCUMENTS_BUCKET, 'documents'],
    [LISTING_VIDEOS_BUCKET, 'videos'],
  ];
  for (const listingId of listingIds) {
    for (const [bucket, kind] of folders) {
      const prefix = `properties/${listingId}/${kind}`;
      try {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
        if (error) throw error;
        const paths = (data || []).filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
        if (paths.length > 0) {
          const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
          if (removeError) throw removeError;
        }
      } catch (err) {
        console.error(`[admin/users DELETE] storage cleanup failed for ${bucket}/${prefix}:`, err);
      }
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Requires the 'users' module permission (SUPER_ADMIN always passes).
    const gate = await requireAdminModule('users');
    if (!gate.ok) return gate.response;
    const userId = gate.admin.id;
    const requesterProfile = gate.admin;

    // Verify target user exists
    const targetProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!targetProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Privilege escalation protection: Only SUPER_ADMIN can modify an existing SUPER_ADMIN
    if (targetProfile.role === 'SUPER_ADMIN' && requesterProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { message: 'Only a Super Admin can modify another Super Admin user' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, phoneVerified, status } = body;

    // Privilege escalation protection: role changes are Super Admin only, and a
    // regular Admin may only moderate regular users (not other admins).
    const isSuperAdmin = requesterProfile.role === 'SUPER_ADMIN';
    if (role !== undefined && role !== targetProfile.role && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Only a Super Admin can change user roles' },
        { status: 403 }
      );
    }
    if (!isSuperAdmin && targetProfile.role !== 'USER') {
      return NextResponse.json(
        { message: 'Only a Super Admin can modify admin accounts' },
        { status: 403 }
      );
    }
    if (id === userId && (status !== undefined && status !== 'ACTIVE')) {
      return NextResponse.json({ message: 'You cannot suspend your own account' }, { status: 400 });
    }
    if (id === userId && role !== undefined && role !== targetProfile.role) {
      return NextResponse.json({ message: 'You cannot change your own role' }, { status: 400 });
    }

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

    // Never leave the platform without an active super admin.
    const nextRole = updateData.role ?? targetProfile.role;
    const nextStatus = updateData.status ?? targetProfile.status;
    if (
      targetProfile.role === 'SUPER_ADMIN' &&
      targetProfile.status === 'ACTIVE' &&
      (nextRole !== 'SUPER_ADMIN' || nextStatus !== 'ACTIVE') &&
      (await countOtherActiveSuperAdmins(id)) === 0
    ) {
      return NextResponse.json(
        { message: 'This is the last active Super Admin and cannot be demoted or suspended' },
        { status: 400 }
      );
    }

    // Update target user profile
    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            listings: true,
            interests: true,
          },
        },
      },
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
        before: {
          role: targetProfile.role,
          status: targetProfile.status,
          phoneVerified: targetProfile.phoneVerified,
        },
        role: finalRole,
        status: finalStatus,
        phoneVerified: updatedProfile.phoneVerified,
        ip: getRequestIp(request),
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
    const gate = await requireAdminModule('users');
    if (!gate.ok) return gate.response;
    const requesterId = gate.admin.id;
    const requesterProfile = gate.admin;

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

    if (id === requesterId) {
      return NextResponse.json({ message: 'You cannot delete your own account here' }, { status: 400 });
    }

    // Deleting a profile cascades to its admin audit trail, so accounts that
    // have admin history must be demoted or suspended instead of deleted.
    const auditRows = await prisma.adminActivityLog.count({ where: { adminId: id } });
    if (auditRows > 0) {
      return NextResponse.json(
        {
          message:
            'This account has admin audit history. Suspend it or change its role instead of deleting it, so the audit trail is kept.',
        },
        { status: 409 }
      );
    }

    // Safe transactional deletion of all related child records in Prisma
    let listingIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      // 1. Find all listing IDs owned by this user
      const userListings = await tx.listing.findMany({
        where: { ownerId: id },
        select: { id: true },
      });
      listingIds = userListings.map((l) => l.id);

      if (listingIds.length > 0) {
        // Delete listing sub-entities first
        await tx.listingImage.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingVideo.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingDocument.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listingAmenity.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.furnishingItem.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.shortlist.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.interest.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
      }

      // 2. Delete user's own shortlists, interests, saved searches and notifications.
      // (Accounts with admin audit rows are refused above, so none are deleted here.)
      await tx.shortlist.deleteMany({ where: { userId: id } });
      await tx.interest.deleteMany({ where: { userId: id } });
      await tx.savedSearch.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });

      // 3. Delete user profile
      await tx.profile.delete({
        where: { id },
      });
    });

    // Remove the login only after the database rows are gone, so a failed
    // transaction can no longer leave a profile that cannot sign in. A login
    // that cannot be removed is reported back instead of being ignored.
    let authDeleteFailed = false;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabaseAdmin = createAdminClient();
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError && authError.status !== 404) {
        authDeleteFailed = true;
        console.error('[admin/users DELETE] Auth user could not be deleted:', authError.message);
      }
    } catch (authErr) {
      authDeleteFailed = true;
      console.error('[admin/users DELETE] Exception deleting Auth user:', authErr);
    }

    // Listing photos, videos and ownership documents are removed after the
    // response is sent (best effort; failures are logged).
    if (listingIds.length > 0) {
      after(() => removeListingsFiles(listingIds));
    }

    // Log the admin activity
    const adminName = requesterProfile.name || 'Admin';
    const actionText = `${adminName} deleted user ${targetProfile.name || id} (${targetProfile.role})`;
    
    await logAdminActivity({
      adminId: requesterId,
      action: actionText,
      entityType: 'USER_PROFILE',
      entityId: id,
      metadata: {
        deletedUserRole: targetProfile.role,
        deletedListings: listingIds.length,
        authDeleteFailed,
        ip: getRequestIp(request),
      },
    });

    if (authDeleteFailed) {
      return NextResponse.json({
        message:
          'User data was deleted, but their login could not be removed. Remove it in Supabase Auth so the account cannot sign in again.',
        authDeleteFailed: true,
      });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('[admin/users DELETE] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

