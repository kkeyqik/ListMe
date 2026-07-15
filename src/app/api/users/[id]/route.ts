import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(
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

    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const isSelf = user.id === id;
    const isAdmin = requesterProfile?.role === 'ADMIN' || requesterProfile?.role === 'SUPER_ADMIN';

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    let profile = await prisma.profile.findUnique({
      where: { id },
    });
    
    if (!profile && isSelf) {
      // Auto-create profile using Supabase user details
      const metaName = user.user_metadata?.name || user.user_metadata?.full_name || 'User';
      const metaEmail = user.email || null;
      const metaPhone = user.phone || null;

      // Special check: is this the admin?
      const finalRole = metaPhone === '+917777777777' || metaEmail === 'admin@test.com' ? 'ADMIN' : 'USER';

      profile = await prisma.profile.create({
        data: {
          id: user.id,
          name: metaName,
          email: metaEmail,
          phone: metaPhone,
          phoneVerified: !!metaPhone,
          role: finalRole as any,
        },
      });
    }

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
