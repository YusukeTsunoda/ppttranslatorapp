import { stripe } from '../payments/stripe';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

async function main() {
  try {
    // 既存のデータを削除
    await prisma.activityLog.deleteMany();
    await prisma.user.deleteMany();

    // テストユーザーを作成
    const hashedPassword = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: hashedPassword,
        role: 'owner',
      },
    });

    console.log('Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
