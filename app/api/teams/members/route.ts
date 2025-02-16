import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return new NextResponse('チームが見つかりません', { status: 404 });
    }

    const members = teamMember.team.members.map((member) => ({
      id: member.id,
      email: member.user.email,
      role: member.role,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('メンバー一覧取得エラー:', error);
    return new NextResponse('メンバー一覧の取得に失敗しました', { status: 500 });
  }
} 