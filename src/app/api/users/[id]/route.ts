import { NextRequest, NextResponse } from 'next/server';
import { ensureProfile, getAuthenticatedUserId, getSessionUser } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const requesterProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isSelf = userId === id;
    const isAdmin = requesterProfile?.role === 'ADMIN' || requesterProfile?.role === 'SUPER_ADMIN';

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    let profile = await prisma.profile.findUnique({
      where: { id },
    });
    
    if (!profile && isSelf) {
      const sessionUser = await getSessionUser();
      if (sessionUser?.id === userId) profile = await ensureProfile(sessionUser);
    }

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('[users/id GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
