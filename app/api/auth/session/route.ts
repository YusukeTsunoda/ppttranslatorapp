import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/auth-options';

// 静的レンダリングを無効化
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({ user: session?.user || null });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json({ user: null });
  }
}
