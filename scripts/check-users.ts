import { prisma } from '@/lib/db/prisma';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log('登録されているユーザー:');
    console.table(users);
  } catch (error: any) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
