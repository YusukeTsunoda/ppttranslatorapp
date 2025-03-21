// tsunotsunoda@gmail.comを管理者に昇格させるスクリプト
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function promoteToAdmin() {
  try {
    const email = 'tsunotsunoda@gmail.com';

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`ユーザー ${email} が見つかりません`);
      return;
    }

    // 管理者に昇格
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`ユーザー ${email} を管理者に昇格しました`);
    console.log('更新されたユーザー情報:', updatedUser);

    // アクティビティログを記録
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: 'admin',
        description: `ユーザー ${email} を管理者に昇格しました (スクリプト経由)`,
        metadata: {
          action: 'promote_to_admin',
          source: 'script',
        },
      },
    });

    console.log('アクティビティログを記録しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

promoteToAdmin();
