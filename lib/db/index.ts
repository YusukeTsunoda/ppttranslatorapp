import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// 開発環境でのホットリロード時の重複インスタンス化を防ぐ
const prisma = global.prisma || new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// クエリログのイベントリスナーを設定
prisma.$on<any>('query', (e: Prisma.QueryEvent) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', e.duration + 'ms');
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };
export * from '@prisma/client'; 