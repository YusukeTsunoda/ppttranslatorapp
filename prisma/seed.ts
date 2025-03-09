import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // テストユーザーの作成
  console.log('Creating test user...');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: '0ac6c6be-d1e7-4b5b-ba6b-a0b648fdbffa',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password_would_go_here',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`Created test user with id: ${testUser.id}`);
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 