import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { isPlaceholderEmail, sanitizeInput, validatePhone } from '@/lib/validation';
import { hasVerifiedMfaCookie, toPublicProfile } from '@/lib/admin-mfa';

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
    // Reading another user's profile is an admin power: needs two-step verification too.
    const isAdmin =
      (requesterProfile?.role === 'ADMIN' || requesterProfile?.role === 'SUPER_ADMIN') &&
      !isSelf &&
      (await hasVerifiedMfaCookie(userId));

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    let profile = await prisma.profile.findUnique({
      where: { id },
    });
    
    if (!profile && isSelf) {
      // Auto-create the profile only for a live Supabase Auth user with this id.
      // A leftover signed cookie for a deleted account must not bring it back.
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.id === userId) {
        const metaName = sanitizeInput(String(user.user_metadata?.name || user.user_metadata?.full_name || '')).slice(0, 100) || 'User';
        const authEmail = user.email ? user.email.toLowerCase() : null;
        // Only a phone Supabase itself confirmed counts; user_metadata is user-editable.
        const confirmedPhone = user.phone && user.phone_confirmed_at ? validatePhone(user.phone) : null;
        const phone = confirmedPhone?.valid ? confirmedPhone.normalized : null;

        // Never take an email or phone that another profile already holds.
        const [emailOwner, phoneOwner] = await Promise.all([
          authEmail
            ? prisma.profile.findFirst({ where: { email: { equals: authEmail, mode: 'insensitive' } }, select: { id: true } })
            : null,
          phone ? prisma.profile.findUnique({ where: { phone }, select: { id: true } }) : null,
        ]);
        const email = emailOwner ? null : authEmail;

        // All new auto-created profiles start as USER.
        // Admin roles must be assigned manually via the admin panel.
        profile = await prisma.profile.create({
          data: {
            id: userId,
            name: metaName,
            email,
            phone: phoneOwner ? null : phone,
            phoneVerified: Boolean(phone && !phoneOwner),
            role: 'USER',
            city: typeof user.user_metadata?.city === 'string' ? sanitizeInput(user.user_metadata.city).slice(0, 100) : null,
          },
        });

        if (email && !isPlaceholderEmail(email)) {
          const { sendEmail } = await import('@/lib/email');
          try {
            await sendEmail({
              to: email,
              subject: `Welcome to ${process.env.SMTP_FROM?.split('<')[0]?.trim() || 'ListMe'}!`,
              text: `Hi ${metaName},\n\nWelcome to ListMe! Your account has been successfully created.\n\nNow you can explore properties, list yours for free, and connect directly with verified owners with no middlemen and no brokerage fees.\n\nHappy searching,\nThe ListMe Team`,
              metadata: { type: 'WELCOME_EMAIL', trigger: 'OAUTH_AUTO_CREATE' },
            });
          } catch (emailErr) {
            console.error('Failed to send welcome email upon OAuth signup:', emailErr);
          }
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile: toPublicProfile(profile) });
  } catch (error: any) {
    console.error('[users/id GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
