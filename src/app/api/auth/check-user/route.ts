import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`check-user:${ip}`, 10, 60 * 1000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { registered: false, message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 10) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('identifier')?.trim();

    if (!identifier) {
      return NextResponse.json({ registered: false, message: 'Identifier is required' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      // Check email
      let profile = await prisma.profile.findFirst({
        where: {
          email: {
            equals: identifier,
            mode: 'insensitive',
          },
        },
      });

      // Self-heal: If user exists in Supabase Auth but lacks Prisma profile, create it to prevent registration deadlock
      if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const suAdmin = createAdminClient();
          const { data: suData } = await suAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
          const matchingSuUser = suData?.users?.find(
            (u) => u.email?.toLowerCase() === identifier.toLowerCase()
          );

          if (matchingSuUser) {
            profile = await prisma.profile.create({
              data: {
                id: matchingSuUser.id,
                email: matchingSuUser.email!,
                name: (matchingSuUser.user_metadata?.name as string) || matchingSuUser.email?.split('@')[0] || 'User',
                phone: matchingSuUser.phone || (matchingSuUser.user_metadata?.phone as string) || null,
                role: (matchingSuUser.app_metadata?.role as any) || 'USER',
                status: 'ACTIVE',
                phoneVerified: !!matchingSuUser.phone_confirmed_at,
              },
            });
          }
        } catch (suErr) {
          console.warn('[check-user] Supabase self-heal email lookup failed:', suErr);
        }
      }

      // Only return registration status — do NOT leak userId
      return NextResponse.json({ registered: !!profile });
    } else {
      // Check phone number
      const cleanPhone = identifier.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return NextResponse.json({ registered: false, message: 'Invalid phone number' }, { status: 400 });
      }
      const localNum = cleanPhone.slice(-10);
      
      let profile = await prisma.profile.findFirst({
        where: {
          OR: [
            { phone: `+91${localNum}` },
            { phone: localNum },
          ],
        },
      });

      // Self-heal: If user exists in Supabase Auth by phone, create profile
      if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const suAdmin = createAdminClient();
          const { data: suData } = await suAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
          const matchingSuUser = suData?.users?.find(
            (u) => u.phone?.endsWith(localNum) || (u.user_metadata?.phone as string)?.endsWith(localNum)
          );

          if (matchingSuUser) {
            profile = await prisma.profile.create({
              data: {
                id: matchingSuUser.id,
                email: matchingSuUser.email || `phone_${localNum}@listme.com`,
                name: (matchingSuUser.user_metadata?.name as string) || 'User',
                phone: `+91${localNum}`,
                role: (matchingSuUser.app_metadata?.role as any) || 'USER',
                status: 'ACTIVE',
                phoneVerified: !!matchingSuUser.phone_confirmed_at,
              },
            });
          }
        } catch (suErr) {
          console.warn('[check-user] Supabase self-heal phone lookup failed:', suErr);
        }
      }

      // Only return registration status — do NOT leak userId
      return NextResponse.json({ registered: !!profile });
    }
  } catch (error: any) {
    console.error('[check-user] Error:', error);
    return NextResponse.json(
      { registered: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
