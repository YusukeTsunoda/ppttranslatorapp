import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'この機能は現在利用できません' },
    { status: 501 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'この機能は現在利用できません' },
    { status: 501 }
  );
} 