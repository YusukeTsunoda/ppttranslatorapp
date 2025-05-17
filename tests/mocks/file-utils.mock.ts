// tests/mocks/file-utils.mock.ts
// file-utils.tsのモック実装

import { join } from 'path';

// ファイル設定の一元管理
export const FILE_CONFIG = {
  tempDir: 'tmp/users',
  publicDir: 'uploads',
  processingDir: 'tmp/processing',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.pptx'],
  cleanupThresholdHours: 24,
  retentionPeriod: 24 * 60 * 60 * 1000, // 24時間
  maxRetries: 3,
  retryDelay: 1000, // 1秒
};

// ファイルの状態を表す列挙型
export enum FileState {
  UPLOADED, // アップロード直後
  PROCESSING, // 処理中
  READY, // 処理完了、利用可能
  ARCHIVED, // アーカイブ済み
}

// ファイルタイプの定義
export type FileType = 'original' | 'translated';

// リトライオプションの型定義
export interface RetryOptions {
  maxRetries: number;
  delay: number;
  onError?: (error: Error, attempt: number) => void;
}

// ディレクトリパスの型定義
export interface DirectoryPaths {
  uploadDir: string;
  slidesDir: string;
}

// ファイルパス管理クラス
export class FilePathManager {
  getTempPath = jest.fn().mockImplementation((userId: string, fileId: string, type: FileType = 'original') => {
    return join('tmp/users', userId, 'uploads', `${fileId}_${type}.pptx`);
  });

  getPublicPath = jest.fn().mockImplementation((userId: string, fileId: string, type: FileType = 'translated') => {
    return join('uploads', userId, `${fileId}_${type}.pptx`);
  });

  getProcessingPath = jest.fn().mockImplementation((userId: string, fileId: string) => {
    return join('tmp/processing', userId, fileId);
  });

  getSlidesPath = jest.fn().mockImplementation((userId: string, fileId: string) => {
    return join('tmp/users', userId, fileId, 'slides');
  });

  getAbsolutePath = jest.fn().mockImplementation((path: string) => {
    if (path.startsWith('/')) return path;
    return join('/mock/root', path);
  });

  ensurePath = jest.fn().mockResolvedValue(undefined);

  findActualFilePath = jest.fn().mockImplementation((userId: string, fileId: string, type: FileType) => {
    if (type === 'original') {
      return Promise.resolve(join('tmp/users', userId, 'uploads', `${fileId}_original.pptx`));
    } else {
      return Promise.resolve(join('tmp/users', userId, 'uploads', `${fileId}_translated.pptx`));
    }
  });

  moveFile = jest.fn().mockResolvedValue(undefined);

  ensurePublicDirectory = jest.fn().mockResolvedValue(undefined);

  moveToPublic = jest.fn().mockResolvedValue('uploads/test-user/test-file.pptx');
}

// ファイルID生成関数
export const generateFileId = jest.fn().mockReturnValue('mock-file-id');

// ユーザーディレクトリ作成関数
export const createUserDirectories = jest.fn().mockResolvedValue({
  uploadDir: '/mock/root/tmp/users/test-user/uploads',
  slidesDir: '/mock/root/tmp/users/test-user/test-file/slides',
});

// 古いファイルのクリーンアップ関数
export const cleanupOldFiles = jest.fn().mockResolvedValue(undefined);

// リトライ機能付きの関数実行
export const withRetry = jest.fn().mockImplementation(async (fn: () => Promise<any>, options = {}) => {
  const { maxRetries = 3, delay = 100, onError } = options;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (onError) onError(error, attempt);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
});
