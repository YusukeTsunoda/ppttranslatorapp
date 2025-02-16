import { stripe } from '../payments/stripe';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

async function main() {
  try {
    // 既存のデータを削除
    await prisma.activityLog.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
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

    // テストチームを作成
    const team = await prisma.team.create({
      data: {
        name: 'Test Team',
      },
    });

    // チームメンバーを作成
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: 'owner',
      },
    });

    // チーム情報を取得して確認
    const createdTeam = await prisma.team.findUnique({
      where: { id: team.id },
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
