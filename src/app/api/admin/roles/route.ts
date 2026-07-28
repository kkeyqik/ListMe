import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is SUPER_ADMIN
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!requesterProfile || requesterProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Only Super Admins can manage roles' }, { status: 403 });
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
      },
    });

    // Also fetch regular users to allow elevating them
    const regularUsers = await prisma.profile.findMany({
      where: {
        role: 'USER',
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({ admins, regularUsers });
  } catch (error: any) {
    console.error('[admin/roles GET] Error:', error);
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

    // Verify requesting user is SUPER_ADMIN
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!requesterProfile || requesterProfile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { targetUserId, role, status, permissions } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ message: 'Target user ID is required' }, { status: 400 });
    }

    // Don't let a super admin demote themselves directly through this endpoint to avoid accidental lockouts
    if (targetUserId === userId && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'You cannot demote yourself' }, { status: 400 });
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: targetUserId },
      data: {
        role: role as any,
        status: status as any,
        roleMetadata: {
          permissions: permissions || {},
        },
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

    return NextResponse.json({
      message: 'Role and permissions updated successfully',
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('[admin/roles PUT] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
