import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // テストユーザーの作成
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: await hash('password123', 10),
      },
    });

    console.log('Created test user:', testUser);

    // テストチームの作成
    const testTeam = await prisma.team.create({
      data: {
        name: 'Test Team',
        members: {
          create: {
            user: {
              connect: {
                id: testUser.id,
              },
            },
            role: 'OWNER',
          },
        },
      },
    });

    console.log('Created test team:', testTeam);

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