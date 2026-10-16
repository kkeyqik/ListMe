import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const amenities = await prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ amenities });
  } catch (error: any) {
    console.error('[amenities] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
