import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { getSecurePassword } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Fetch all profiles in the database
    const users = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            listings: true,
            interests: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('[admin/users GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is admin
    const requesterProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!requesterProfile || (requesterProfile.role !== 'ADMIN' && requesterProfile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { name, phone, email, role, status } = await request.json();

    if (!name || !phone || !email || !role) {
      return NextResponse.json({ message: 'Name, phone, email, and role are required' }, { status: 400 });
    }

    // Format phone to match (+91 prefix for India)
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // Check if phone or email already registered
    const existingPhone = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
    });

    if (existingPhone) {
      return NextResponse.json({ message: 'This phone number is already registered' }, { status: 400 });
    }

    const existingEmail = await prisma.profile.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json({ message: 'This email address is already registered' }, { status: 400 });
    }

    const isPlaceholder = 
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || 
      !process.env.SUPABASE_SERVICE_ROLE_KEY;

    let suUserId: string | null = null;

    if (isPlaceholder) {
      // Deterministic mock user ID
      suUserId = 'd9e87fb4-9c02-4217-ba5d-' + phone.replace(/\D/g, '').padEnd(12, '0').slice(-12);
    } else {
      const securePassword = getSecurePassword(formattedPhone);
      const supabaseAdmin = createAdminClient();

      try {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: formattedPhone,
          email: email,
          password: securePassword,
          phone_confirm: true,
          user_metadata: { name, email },
        });

        if (createError) {
          throw createError;
        }

        if (createData?.user) {
          suUserId = createData.user.id;
        }
      } catch (err: any) {
        console.error('Supabase admin create user error:', err);
        return NextResponse.json(
          { message: err.message || 'Failed to create user in auth system' },
          { status: 500 }
        );
      }
    }

    if (!suUserId) {
      return NextResponse.json({ message: 'User resolution failed' }, { status: 500 });
    }

    // Create profile in Prisma
    const createdProfile = await prisma.profile.create({
      data: {
        id: suUserId,
        name,
        phone: formattedPhone,
        email,
        role: role as any,
        status: (status as any) || 'ACTIVE',
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      message: 'User created successfully',
      profile: createdProfile,
    });
  } catch (error: any) {
    console.error('Create admin user error:', error);
    console.error('[admin/users POST] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
