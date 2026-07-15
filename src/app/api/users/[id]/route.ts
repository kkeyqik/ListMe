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

      if (metaEmail) {
        const { sendEmail } = await import('@/lib/email');
        try {
          await sendEmail({
            to: metaEmail,
            subject: `Welcome to ${process.env.SMTP_FROM?.split('<')[0]?.trim() || 'ListMe'}!`,
            text: `Hi ${metaName},\n\nWelcome to ListMe! Your account has been successfully created.\n\nNow you can explore properties, list yours for free, and connect directly with verified owners with no middlemen and no brokerage fees.\n\nHappy searching,\nThe ListMe Team`,
            metadata: { type: 'WELCOME_EMAIL', trigger: 'OAUTH_AUTO_CREATE' },
          });
        } catch (emailErr) {
          console.error('Failed to send welcome email upon OAuth signup:', emailErr);
        }
      }
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
