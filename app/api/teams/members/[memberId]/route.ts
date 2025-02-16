import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    const { memberId } = params;
    if (!memberId) {
      return new NextResponse('メンバーIDは必須です', { status: 400 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        team: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!teamMember) {
      return new NextResponse('チームが見つかりません', { status: 404 });
    }

    if (teamMember.role !== 'ADMIN') {
      return new NextResponse('権限がありません', { status: 403 });
    }

    const memberToDelete = teamMember.team.members.find(
      (member) => member.id === memberId
    );

    if (!memberToDelete) {
      return new NextResponse('メンバーが見つかりません', { status: 404 });
    }

    if (memberToDelete.userId === session.user.id) {
      return new NextResponse('自分自身を削除することはできません', { status: 400 });
    }

    await prisma.teamMember.delete({
      where: {
        id: memberId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('メンバー削除エラー:', error);
    return new NextResponse('メンバーの削除に失敗しました', { status: 500 });
  }
} 