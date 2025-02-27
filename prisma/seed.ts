import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  try {
    // テストユーザーの作成
    const testUser = await prisma.users.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: uuidv4(),
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: await hash('password123', 10),
        updatedAt: new Date(),
        role: 'user',
      },
    });

    console.log('Created test user:', testUser);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 