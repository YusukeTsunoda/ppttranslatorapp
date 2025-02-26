import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return new NextResponse('チーム名は必須です', { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('チーム作成エラー:', error);
    return new NextResponse('チームの作成に失敗しました', { status: 500 });
  }
} 