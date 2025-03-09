import { prisma } from '@/lib/db';

async function listUsers() {
  try {
    // @ts-ignore - Prismaの型定義と実際のプロパティの間に不一致があるため
    const users = await prisma.user.findMany({
      select: {
        name: true,
        email: true, // ユーザーアドレスとして email を取得
      },
    });
    console.table(users);
  } catch (error) {
    console.error('ユーザー一覧の取得に失敗しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers(); 