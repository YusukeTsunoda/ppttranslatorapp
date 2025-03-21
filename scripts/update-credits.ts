import { prisma } from '../lib/db/prisma';

async function updateCredits() {
  try {
    // 全ユーザーのクレジットを初期値15に設定
    const result = await prisma.$executeRaw`
      UPDATE "User" SET credits = 15 WHERE credits = 0 OR credits IS NULL
    `;

    console.log(`${result}人のユーザーのクレジットを更新しました`);

    // 更新後のユーザー一覧を表示
    const users = await prisma.user.findMany({
      select: { id: true, email: true, credits: true },
    });

    console.log('ユーザー一覧:');
    console.table(users);
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCredits()
  .then(() => console.log('完了'))
  .catch(console.error);
