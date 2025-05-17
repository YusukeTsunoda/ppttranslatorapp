import { PrismaClient } from '@prisma/client';

// グローバル変数の型定義
declare global {
   
  var prisma: PrismaClient | undefined;
  var prismaInstances: Record<string, PrismaClient> | undefined;
}

// サーバーレス環境向けに最適化されたPrismaクライアントオプション
const getClientOptions = () => {
  const isVercel = process.env.VERCEL === '1';
  
  return {
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    // ライブラリモードで実行する
    engineType: 'library',
  };
};

// シングルトンパターンの実装強化とパフォーマンスオプション
export const createPrismaClient = (options: any = {}) => {
  // 実行環境とオプションの設定
  const clientOptions = {
    ...getClientOptions(),
    ...options,
  };
  
  const client = new PrismaClient(clientOptions);

  // 必要な場合のみコネクション
  if (process.env.NODE_ENV !== 'test') {
    client.$connect().catch(e => {
      console.error('Prisma connection error:', e);
    });
  }

  return client;
};

// モデル特化クライアント - 遅延初期化パターン
const createLazyPrismaInstance = (domain: string): (() => PrismaClient) => {
  let instance: PrismaClient | undefined = undefined;
  
  return () => {
    if (!instance) {
      // 最初の呼び出し時にのみインスタンスを作成
      instance = createPrismaClient();
    }
    return instance;
  };
};

// 遅延ロードされるドメイン特化型クライアント
const getLazyUserPrisma = createLazyPrismaInstance('user');
const getLazyFilePrisma = createLazyPrismaInstance('file');
const getLazyTranslationPrisma = createLazyPrismaInstance('translation');
const getLazyActivityPrisma = createLazyPrismaInstance('activity');

// クライアントを必要なときだけ初期化
export const userPrisma = () => getLazyUserPrisma();
export const filePrisma = () => getLazyFilePrisma();
export const translationPrisma = () => getLazyTranslationPrisma();
export const activityPrisma = () => getLazyActivityPrisma();

// メインのPrismaクライアントインスタンス - 遅延初期化
let globalPrisma: PrismaClient | undefined;
export const prisma = (): PrismaClient => {
  if (!globalPrisma) {
    globalPrisma = global.prisma || createPrismaClient();
    // 開発環境ではグローバル参照を維持（HMRのため）
    if (process.env.NODE_ENV !== 'production') {
      global.prisma = globalPrisma;
    }
  }
  return globalPrisma;
};

export default (): PrismaClient => prisma();

// バンドルサイズを最小化するためのヘルパー
// 必要な最小限のモデルのみをロードするためのプロキシ
export const getPrismaForModel = (modelName: string): PrismaClient => {
  switch (modelName) {
    case 'user':
    case 'User':
    case 'Session':
    case 'Account':
      return userPrisma();
    case 'File':
    case 'Slide':
    case 'Text':
      return filePrisma();
    case 'Translation':
    case 'TranslationHistory':
      return translationPrisma();
    case 'ActivityLog':
    case 'UsageStatistics':
    case 'ApiKey':
    case 'BatchJob':
      return activityPrisma();
    default:
      return prisma();
  }
};
