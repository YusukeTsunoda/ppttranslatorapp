import { PrismaClient } from '@prisma/client';
import { createMockRequest } from './test-utils';
import { AppError } from '../mocks/error';

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
  expect(error).toBeInstanceOf(AppError);
  const appError = error as AppError;
  expect(appError.type).toBe(expectedType);
  expect(appError.statusCode).toBe(expectedStatus);
};

// レスポンスアサーションヘルパー
export const expectSuccessResponse = async (response: Response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toBeDefined();
  return data;
};

// テストファイルの作成ヘルパー
export const createTestFile = (name = 'test.pptx', type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation') => {
  return new File(['test content'], name, { type });
};

// 非同期処理の待機ヘルパー
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// テストデータのクリーンアップヘルパー
export const cleanupTestData = async (prisma: PrismaClient, userId: string) => {
  await prisma.translationHistory.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}; 