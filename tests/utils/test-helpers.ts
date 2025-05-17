import { PrismaClient } from '@prisma/client';
import { createMockRequest } from './test-utils';
import { AppError } from '../mocks/error';
import fs from 'fs/promises';
import path from 'path';
import { expect } from '@jest/globals';

// テストユーザーの作成ヘルパー
export const createTestUser = async (prisma: PrismaClient, data: any = {}) => {
  return await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'USER',
      ...data,
    },
  });
};

// 認証済みリクエストの作成ヘルパー
export const createAuthenticatedRequest = (method: string, body?: any, user?: any) => {
  const headers = new Headers();
  headers.set('Authorization', `Bearer test-token`);
  if (user) {
    headers.set('X-User-Id', user.id);
    headers.set('X-User-Role', user.role);
  }
  return createMockRequest(method, body, headers);
};

// エラーアサーションヘルパー
export const expectAppError = (error: unknown, expectedType: string, expectedStatus: number) => {
  // Jestのアサーションを使用
  if (!(error instanceof AppError)) {
    throw new Error(`エラーがAppErrorインスタンスではありません: ${error}`);
  }
  
  const appError = error as AppError;
  
  if (appError.type !== expectedType) {
    throw new Error(`エラータイプが一致しません: 期待=${expectedType}, 実際=${appError.type}`);
  }
  
  if (appError.statusCode !== expectedStatus) {
    throw new Error(`ステータスコードが一致しません: 期待=${expectedStatus}, 実際=${appError.statusCode}`);
  }
};

// レスポンスアサーションヘルパー
export const expectSuccessResponse = async (response: Response, expectedStatus = 200) => {
  // Jestのアサーションを使用せずにチェック
  if (response.status !== expectedStatus) {
    throw new Error(`ステータスコードが一致しません: 期待=${expectedStatus}, 実際=${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data) {
    throw new Error('レスポンスデータが定義されていません');
  }
  
  return data;
};

// テストファイルの作成ヘルパー
export const createTestFile = (name = 'test.pptx', type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation') => {
  return new File(['test content'], name, { type });
};

// 非同期処理の待機ヘルパー
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 条件が満たされるまで待機するヘルパー
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
) => {
  const { timeout = 5000, interval = 100, timeoutMessage = '条件が満たされませんでした' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await Promise.resolve(condition())) {
      return true;
    }
    await waitFor(interval);
  }

  throw new Error(timeoutMessage);
};

// Promiseが解決されるまで待機するヘルパー
export const waitForPromise = async <T>(
  promiseFn: () => Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
    retries?: number;
  } = {}
) => {
  const { timeout = 5000, interval = 100, timeoutMessage = 'Promiseが解決されませんでした', retries = 3 } = options;
  const startTime = Date.now();
  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < retries) {
    try {
      return await Promise.race([
        promiseFn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(timeoutMessage)), timeout);
        }),
      ]);
    } catch (error) {
      lastError = error as Error;
      retryCount++;
      await waitFor(interval);
    }
  }

  throw lastError || new Error('不明なエラーが発生しました');
};

// フラッキーテストを検出するためのヘルパー
export const detectFlaky = async (
  testFn: () => Promise<void>,
  options: {
    iterations?: number;
    failureThreshold?: number;
    logResults?: boolean;
  } = {}
) => {
  const { iterations = 10, failureThreshold = 1, logResults = true } = options;
  const results: Array<{ success: boolean; error?: Error; duration: number }> = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    try {
      await testFn();
      results.push({ success: true, duration: Date.now() - startTime });
    } catch (error) {
      results.push({ success: false, error: error as Error, duration: Date.now() - startTime });
    }
  }

  const failures = results.filter(r => !r.success);
  const isFlaky = failures.length > 0 && failures.length < iterations;
  const isFailing = failures.length >= failureThreshold;

  if (logResults) {
    console.log(`テスト結果: ${iterations - failures.length}/${iterations} 成功`);
    console.log(`平均実行時間: ${results.reduce((sum, r) => sum + r.duration, 0) / results.length}ms`);
    if (isFlaky) {
      console.warn(`警告: このテストは不安定です (${failures.length}/${iterations} 失敗)`);
    }
  }

  return {
    isFlaky,
    isFailing,
    results,
    failureRate: failures.length / iterations,
    averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
  };
};

// テストデータのクリーンアップヘルパー
export const cleanupTestData = async (prisma: PrismaClient, userId: string) => {
  await prisma.translationHistory.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
};

// 一時ファイルのクリーンアップヘルパー
export const cleanupTempFiles = async (directory: string) => {
  try {
    const files = await fs.readdir(directory);
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          await cleanupTempFiles(filePath);
          await fs.rmdir(filePath);
        } else {
          await fs.unlink(filePath);
        }
      })
    );
  } catch (error) {
    console.error(`一時ファイルのクリーンアップ中にエラーが発生しました:`, error);
  }
};

// テストデータディレクトリの作成ヘルパー
export const createTestDataDirectory = async (directoryName: string = 'test-data') => {
  const testDataDir = path.join(process.cwd(), 'tmp', directoryName);
  try {
    await fs.mkdir(testDataDir, { recursive: true });
  } catch (error) {
    // ディレクトリが既に存在する場合は無視
  }
  return testDataDir;
};

// テストデータの生成ヘルパー
export const generateTestData = async (options: {
  type: 'pptx' | 'json' | 'txt';
  size?: 'small' | 'medium' | 'large';
  name?: string;
  content?: string;
  directory?: string;
}) => {
  const { type, size = 'small', name, content, directory } = options;
  const testDataDir = directory || await createTestDataDirectory();
  
  let fileName = name;
  let fileContent = content;
  
  if (!fileName) {
    fileName = `test-${Date.now()}.${type}`;
  }
  
  if (!fileContent) {
    // サイズに応じたデフォルトコンテンツを生成
    const sizeMap = {
      small: 1,
      medium: 100,
      large: 1000
    };
    const multiplier = sizeMap[size];
    
    if (type === 'pptx') {
      // PPTXファイルの場合はダミーバイナリデータを生成
      fileContent = 'DUMMY PPTX CONTENT'.repeat(multiplier);
    } else if (type === 'json') {
      // JSONファイルの場合はダミーオブジェクトを生成
      const slides = [];
      for (let i = 0; i < multiplier; i++) {
        slides.push({
          id: `slide${i}`,
          title: `スライド ${i}`,
          content: `スライド ${i} のコンテンツ`,
          index: i
        });
      }
      fileContent = JSON.stringify({ slides });
    } else {
      // テキストファイルの場合はダミーテキストを生成
      fileContent = 'テストデータです。'.repeat(multiplier);
    }
  }
  
  const filePath = path.join(testDataDir, fileName);
  await fs.writeFile(filePath, fileContent);
  
  return {
    path: filePath,
    name: fileName,
    content: fileContent,
    size: Buffer.from(fileContent).length
  };
}; 