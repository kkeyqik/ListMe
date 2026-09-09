import { NextRequest, NextResponse } from 'next/server';
import { lookupPinCode } from '@/lib/pincode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  try {
    const { pincode } = await params;
    const cleanPin = (pincode || '').replace(/\D/g, '');

    if (cleanPin.length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit Indian PIN code' },
        { status: 400 }
      );
    }

    const result = await lookupPinCode(cleanPin);

    if (!result) {
      return NextResponse.json(
        { success: false, message: `No location found for PIN code ${cleanPin}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[API locations/pincode] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while resolving PIN code' },
      { status: 500 }
    );
  }
}
