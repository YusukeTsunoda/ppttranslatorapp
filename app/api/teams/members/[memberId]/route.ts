import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  return NextResponse.json(
    { error: 'この機能は現在利用できません' },
    { status: 501 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  return NextResponse.json(
    { error: 'この機能は現在利用できません' },
    { status: 501 }
  );
} 