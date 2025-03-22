import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // セッションからユーザーIDを取得
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false, role: null }, { status: 401 });
    }
    
    // ユーザーロールを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    
    if (!user) {
      return NextResponse.json({ isAdmin: false, role: null }, { status: 404 });
    }
    
    // 管理者かどうかをチェック
    const isAdmin = user.role === 'ADMIN';
    
    return NextResponse.json({ isAdmin, role: user.role });
  } catch (error) {
    console.error('ユーザーロール取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザーロールの取得に失敗しました' },
      { status: 500 }
    );
  }
}
