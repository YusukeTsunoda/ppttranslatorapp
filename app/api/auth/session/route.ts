export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sessionCookie = cookies().get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null });
    }

    const sessionData = await verifyToken(sessionCookie.value);
    if (!sessionData?.user?.id) {
      return NextResponse.json({ user: null });
    }

    if (new Date(sessionData.expires) < new Date()) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: sessionData.user.id
      }
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json({ user: null });
  }
} 