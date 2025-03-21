import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    // 簡単なクエリを実行してみる
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful:', result);
    return true;
  } catch (error: any) {
    console.error('Database connection failed:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

export { testConnection };
