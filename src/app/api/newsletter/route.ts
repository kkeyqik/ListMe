import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/lib/activity-logger';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Record subscription in UserActivityLog
    await logUserActivity({
      request,
      action: 'NEWSLETTER_SUBSCRIBE',
      metadata: {
        email: trimmedEmail,
        subscribedAt: new Date().toISOString(),
        source: 'footer_form',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
    });
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while subscribing' },
      { status: 500 }
    );
  }
}
