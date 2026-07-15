import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const identifier = searchParams.get('identifier')?.trim();

    if (!identifier) {
      return NextResponse.json({ registered: false, message: 'Identifier is required' }, { status: 400 });
    }

    if (identifier.includes('@')) {
      // Check email
      const profile = await prisma.profile.findFirst({
        where: {
          email: {
            equals: identifier,
            mode: 'insensitive',
          },
        },
      });
      return NextResponse.json({ registered: !!profile, userId: profile?.id || null });
    } else {
      // Check phone number
      const cleanPhone = identifier.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return NextResponse.json({ registered: false, message: 'Invalid phone number' }, { status: 400 });
      }
      const localNum = cleanPhone.slice(-10);
      
      const profile = await prisma.profile.findFirst({
        where: {
          OR: [
            { phone: `+91${localNum}` },
            { phone: `+1${localNum}` },
            { phone: localNum },
          ],
        },
      });
      return NextResponse.json({ registered: !!profile, userId: profile?.id || null });
    }
  } catch (error: any) {
    return NextResponse.json(
      { registered: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
