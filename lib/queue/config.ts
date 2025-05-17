import { ConnectionOptions } from 'bullmq';

// Redisの接続設定
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// キュー名の定義
export const QUEUE_NAMES = {
  BATCH_TRANSLATION: 'batch-translation',
  FILE_PROCESSING: 'file-processing',
  TRANSLATION: 'translation',
};

// ジョブ処理の設定
export const JOB_SETTINGS = {
  // リトライ設定
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5秒
  },
  // タイムアウト設定（30分）
  timeout: 30 * 60 * 1000,
  // ジョブの有効期限（7日間）
  removeOnComplete: {
    age: 7 * 24 * 60 * 60 * 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60 * 1000,
  },
};
