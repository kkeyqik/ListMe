import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { requireAdminModule, countOtherActiveSuperAdmins, getRequestIp } from '@/lib/admin-auth';
import { logAdminActivity } from '@/lib/activity-logger';
import { ADMIN_MODULES, getAdminPermissions, type AdminModule } from '@/lib/admin-permissions';

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminModule('super');
    if (!gate.ok) return gate.response;

    // ?userSearch=<text>: user picker for "Elevate User". Returns at most 20
    // matching regular users instead of shipping every user to the browser.
    const userSearch = new URL(request.url).searchParams.get('userSearch');
    if (userSearch !== null) {
      const term = userSearch.trim().slice(0, 100);
      if (term.length < 2) {
        return NextResponse.json({ regularUsers: [] });
      }
      const regularUsers = await prisma.profile.findMany({
        where: {
          role: 'USER',
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term } },
          ],
        },
        orderBy: { name: 'asc' },
        take: 20,
        select: { id: true, name: true, email: true, phone: true },
      });
      return NextResponse.json({ regularUsers });
    }

    // Fetch all admins and super admins
    const admins = await prisma.profile.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        roleMetadata: true,
        createdAt: true,
      },
    });

    // Regular users are searched on demand (?userSearch=), not listed here.
    return NextResponse.json({ admins, regularUsers: [] });
  } catch (error: unknown) {
    console.error('[admin/roles GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Only a SUPER_ADMIN can change roles, statuses or permissions here.
    const gate = await requireAdminModule('super');
    if (!gate.ok) return gate.response;
    const userId = gate.admin.id;

    const { targetUserId, role, status, permissions } = await request.json();

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ message: 'Target user ID is required' }, { status: 400 });
    }

    if ((role !== undefined && !Object.values(Role).includes(role)) || (status !== undefined && !Object.values(UserStatus).includes(status))) {
      return NextResponse.json({ message: 'Invalid role or status' }, { status: 400 });
    }

    if (permissions !== undefined && (permissions === null || typeof permissions !== 'object' || Array.isArray(permissions))) {
      return NextResponse.json({ message: 'Invalid permissions' }, { status: 400 });
    }

    // No self role/status changes at all, to avoid accidental lockouts
    // (e.g. {role:'SUPER_ADMIN', status:'SUSPENDED'} on yourself).
    if (targetUserId === userId && ((role !== undefined && role !== 'SUPER_ADMIN') || (status !== undefined && status !== 'ACTIVE'))) {
      return NextResponse.json({ message: 'You cannot demote or suspend yourself' }, { status: 400 });
    }

    const target = await prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, role: true, status: true, roleMetadata: true },
    });
    if (!target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Never leave the platform without an active super admin.
    const nextRole = (role as Role | undefined) ?? target.role;
    const nextStatus = (status as UserStatus | undefined) ?? target.status;
    const losesSuper =
      target.role === 'SUPER_ADMIN' &&
      target.status === 'ACTIVE' &&
      (nextRole !== 'SUPER_ADMIN' || nextStatus !== 'ACTIVE');
    if (losesSuper && (await countOtherActiveSuperAdmins(target.id)) === 0) {
      return NextResponse.json(
        { message: 'This is the last active Super Admin and cannot be demoted or suspended' },
        { status: 400 }
      );
    }

    // Merge permissions into existing roleMetadata instead of overwriting it,
    // so a status-only update does not wipe the admin's permissions.
    const existingMeta =
      target.roleMetadata && typeof target.roleMetadata === 'object' && !Array.isArray(target.roleMetadata)
        ? (target.roleMetadata as Record<string, unknown>)
        : {};
    let nextMeta: Record<string, unknown> | undefined;
    if (permissions !== undefined) {
      const cleaned: Partial<Record<AdminModule, boolean>> = {};
      for (const key of ADMIN_MODULES) {
        cleaned[key] = (permissions as Record<string, unknown>)[key] === true;
      }
      nextMeta = { ...existingMeta, permissions: cleaned };
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: targetUserId },
      data: {
        role: role as Role | undefined,
        status: status as UserStatus | undefined,
        ...(nextMeta ? { roleMetadata: nextMeta as Prisma.InputJsonValue } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        roleMetadata: true,
      }
    });

    await logAdminActivity({
      adminId: userId,
      action: `${gate.admin.name || 'Super Admin'} changed ${target.name || targetUserId}: role ${target.role} -> ${updatedProfile.role}, status ${target.status} -> ${updatedProfile.status}`,
      entityType: 'ADMIN_ROLE',
      entityId: targetUserId,
      metadata: {
        before: { role: target.role, status: target.status, permissions: getAdminPermissions(target.roleMetadata) },
        after: { role: updatedProfile.role, status: updatedProfile.status, permissions: getAdminPermissions(updatedProfile.roleMetadata) },
        ip: getRequestIp(request),
      },
    });

    return NextResponse.json({
      message: 'Role and permissions updated successfully',
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    console.error('[admin/roles PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
