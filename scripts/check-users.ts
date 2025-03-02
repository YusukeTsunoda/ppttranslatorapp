import { prisma } from '@/lib/prisma';

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
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