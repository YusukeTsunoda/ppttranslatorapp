import { PrismaClient, Language } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// ESM形式でmain関数をexport
export async function main() {
  console.log('Seeding database...');

  // テストユーザーの作成
  console.log('Creating test user...');
  const userId = uuidv4();
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      credits: 15,
    },
    create: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      credits: 15,
      updatedAt: new Date(),
    },
  });

  console.log(`Created test user with id: ${user.id}`);

  // 翻訳履歴のサンプルデータ
  console.log('Creating translation history...');
  await prisma.translationHistory.createMany({
    data: [
      {
        id: uuidv4(),
        userId: user.id,
        fileName: 'presentation1.pptx',
        pageCount: 15,
        status: '完了',
        creditsUsed: 15,
        sourceLang: Language.ja,
        targetLang: Language.en,
        model: 'claude-3-haiku-20240307',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
      {
        id: uuidv4(),
        userId: user.id,
        fileName: 'meeting.pptx',
        pageCount: 10,
        status: '完了',
        creditsUsed: 10,
        sourceLang: Language.ja,
        targetLang: Language.en,
        model: 'claude-3-haiku-20240307',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10'),
      },
      {
        id: uuidv4(),
        userId: user.id,
        fileName: 'proposal.pptx',
        pageCount: 20,
        status: '完了',
        creditsUsed: 20,
        sourceLang: Language.en,
        targetLang: Language.ja,
        model: 'claude-3-sonnet-20240229',
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-03-15'),
      },
    ],
    skipDuplicates: true,
  });

  // アクティビティログのサンプルデータ
  console.log('Creating activity logs...');
  await prisma.activityLog.createMany({
    data: [
      {
        id: uuidv4(),
        userId: user.id,
        type: 'translation',
        description: 'presentation1.pptxを翻訳しました',
        createdAt: new Date('2024-03-01'),
      },
      {
        id: uuidv4(),
        userId: user.id,
        type: 'login',
        description: 'ログインしました',
        createdAt: new Date('2024-03-05'),
      },
      {
        id: uuidv4(),
        userId: user.id,
        type: 'translation',
        description: 'meeting.pptxを翻訳しました',
        createdAt: new Date('2024-03-10'),
      },
      {
        id: uuidv4(),
        userId: user.id,
        type: 'translation',
        description: 'proposal.pptxを翻訳しました',
        createdAt: new Date('2024-03-15'),
      },
    ],
    skipDuplicates: true,
  });

  // 使用統計のサンプルデータ
  console.log('Creating usage statistics...');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScriptの月は0から始まるため+1
  const currentYear = currentDate.getFullYear();

  await prisma.usageStatistics.upsert({
    where: {
      userId_month_year: {
        userId: user.id,
        month: currentMonth,
        year: currentYear,
      },
    },
    update: {
      tokenCount: 12345,
      apiCalls: 89,
    },
    create: {
      id: uuidv4(),
      userId: user.id,
      tokenCount: 12345,
      apiCalls: 89,
      month: currentMonth,
      year: currentYear,
      updatedAt: new Date(),
    },
  });

  // 管理者ユーザーの作成
  const adminEmail = 'admin@example.com';
  const adminExists = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        id: 'admin-user-id',
        name: '管理者',
        email: adminEmail,
        password: await hash('admin123', 10), // 本番環境では強力なパスワードを使用してください
        role: 'ADMIN',
        credits: 1000,
      },
    });
    console.log('管理者ユーザーを作成しました');
  }

  console.log('シードデータを投入しました');
  console.log('Seeding completed.');
}

// 実行部分
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ここにexport defaultも追加することで、Prismaのシードスクリプトとしても認識されやすくなります
export default main;
