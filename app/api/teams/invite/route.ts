import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    const { email } = await request.json();
    if (!email?.trim()) {
      return new NextResponse('メールアドレスは必須です', { status: 400 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return new NextResponse('チームが見つかりません', { status: 404 });
    }

    if (teamMember.role !== 'ADMIN') {
      return new NextResponse('権限がありません', { status: 403 });
    }

    const invitedUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!invitedUser) {
      return new NextResponse('ユーザーが見つかりません', { status: 404 });
    }

    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamMember.teamId,
        userId: invitedUser.id,
      },
    });

    if (existingMember) {
      return new NextResponse('すでにチームのメンバーです', { status: 400 });
    }

    const newMember = await prisma.teamMember.create({
      data: {
        teamId: teamMember.teamId,
        userId: invitedUser.id,
        role: 'MEMBER',
      },
    });

    return NextResponse.json({ member: newMember });
  } catch (error) {
    console.error('メンバー招待エラー:', error);
    return new NextResponse('メンバーの招待に失敗しました', { status: 500 });
  }
} 