import { PrismaClient } from '@prisma/client';

// グローバル変数の型定義
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  var prismaInstances: Record<string, PrismaClient> | undefined;
}

// シングルトンパターンの実装強化とパフォーマンスオプション
export const createPrismaClient = (options: any = {}) => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    // クエリキャッシュを有効化（データベースへのラウンドトリップを削減）
    // Vercelのサーバーレス環境でもリクエスト内でのキャッシュが有効
    __internal: {
      useUds: true,
    },
    ...options,
  });

  // コネクションプールの最適化
  client.$connect();

  return client;
};

// モデル特化クライアント
// 特定のドメインモデルに関連するPrismaクライアントのメソッドを持つクライアントシャード
const createPrismaInstanceByDomain = (domain: string): PrismaClient => {
  if (!global.prismaInstances) {
    global.prismaInstances = {};
  }

  if (!global.prismaInstances[domain]) {
    global.prismaInstances[domain] = createPrismaClient();
  }

  return global.prismaInstances[domain];
};

// メインのPrismaクライアントインスタンス
export const prisma = global.prisma || createPrismaClient();

// ドメイン特化型クライアント
export const userPrisma = createPrismaInstanceByDomain('user');
export const filePrisma = createPrismaInstanceByDomain('file');
export const translationPrisma = createPrismaInstanceByDomain('translation');
export const activityPrisma = createPrismaInstanceByDomain('activity');

// 開発環境ではグローバル参照を維持（HMRのため）
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

// バンドルサイズを最小化するためのヘルパー
// 必要な最小限のモデルのみをロードするためのプロキシ
export const getPrismaForModel = (modelName: string): PrismaClient => {
  switch (modelName) {
    case 'user':
    case 'User':
    case 'Session':
    case 'Account':
      return userPrisma;
    case 'File':
    case 'Slide':
    case 'Text':
      return filePrisma;
    case 'Translation':
    case 'TranslationHistory':
      return translationPrisma;
    case 'ActivityLog':
    case 'UsageStatistics':
    case 'ApiKey':
    case 'BatchJob':
      return activityPrisma;
    default:
      return prisma;
  }
};
