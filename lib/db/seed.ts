import { stripe } from '../payments/stripe';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/session';

async function seed() {
  try {
    // 既存のデータをクリア
    await prisma.activityLog.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();

    // テストユーザーを作成
    const passwordHash = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        role: 'owner',
      },
    });

    // テストチームを作成
    const team = await prisma.team.create({
      data: {
        name: 'Test Team',
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    console.log('Seed data created successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
