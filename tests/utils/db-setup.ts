import { prisma } from '@/lib/db';

/**
 * テストデータベースの初期化
 * 全てのテーブルのデータを削除します
 */
export async function clearDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

/**
 * テストデータベースのマイグレーション実行
 */
export async function runMigrations() {
  try {
    await prisma.$executeRaw`SELECT 1`;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * テストデータベースのセットアップ
 * Jest のグローバルセットアップで使用します
 */
export async function setupTestDatabase() {
  try {
    await runMigrations();
    await clearDatabase();
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

/**
 * テストデータベースのクリーンアップ
 * 各テストの後に実行します
 */
export async function cleanupTestDatabase() {
  try {
    await clearDatabase();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Test database cleanup failed:', error);
    throw error;
  }
} 