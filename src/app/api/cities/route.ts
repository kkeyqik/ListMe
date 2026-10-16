import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      include: {
        localities: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ cities });
  } catch (error: any) {
    console.error('[cities] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
