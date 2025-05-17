import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { mockPrisma } from './test-utils';

const prisma = new PrismaClient();

export const setupTestDatabase = async () => {
  try {
    // DockerコンテナのステータスチェックとDB接続テスト
    execSync('docker-compose -f docker-compose.test.yml ps test-db | grep "Up"');
    await prisma.$connect();

    // テストデータベースのリセット
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;

    // マイグレーションの実行
    execSync('npx prisma migrate deploy');

    // テスト用の初期データ投入
    await seedTestData();

  } catch (error) {
    console.error('テストデータベースのセットアップに失敗しました:', error);
    throw error;
  }
};

export const teardownTestDatabase = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('テストデータベースの切断に失敗しました:', error);
    throw error;
  }
};

export const seedTestData = async () => {
  try {
    // テスト用管理者アカウントの作成
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'ADMIN',
      },
    });

    // テスト用一般ユーザーアカウントの作成
    await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      },
    });

  } catch (error) {
    console.error('テストデータの投入に失敗しました:', error);
    throw error;
  }
};

// トランザクションヘルパー
export const withTestTransaction = async (callback: (tx: PrismaClient) => Promise<void>) => {
  try {
    await prisma.$transaction(async (tx) => {
      await callback(tx as unknown as PrismaClient);
    });
  } catch (error) {
    console.error('トランザクションの実行に失敗しました:', error);
    throw error;
  }
}; 