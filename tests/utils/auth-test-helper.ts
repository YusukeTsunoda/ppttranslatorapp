/**
 * 認証テストヘルパー
 * 認証関連のテストを支援するためのユーティリティ
 */

import { NextRequest } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createMockRequest } from './test-utils';

// テストユーザーの役割（UserRoleと互換性を持たせる）
export enum TestUserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  GUEST = 'GUEST',
}

// TestUserRoleとUserRoleの変換関数
export function testRoleToUserRole(role: TestUserRole): UserRole {
  switch (role) {
    case TestUserRole.USER:
      return 'USER' as UserRole;
    case TestUserRole.ADMIN:
      return 'ADMIN' as UserRole;
    case TestUserRole.GUEST:
      return 'GUEST' as UserRole;
    default:
      return 'USER' as UserRole;
  }
}

// テストユーザー情報
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: TestUserRole;
  token: string;
}

/**
 * テストユーザーを作成
 */
export async function createTestUser(
  prisma: PrismaClient,
  options: {
    role?: TestUserRole;
    email?: string;
    name?: string;
  } = {}
): Promise<TestUser> {
  const {
    role = TestUserRole.USER,
    email = `test-${Date.now()}@example.com`,
    name = 'Test User',
  } = options;
  
  // データベースにユーザーを作成
  // Prismaの型定義に合わせて必要なフィールドを追加
  const user = await prisma.user.create({
    data: {
      id: uuidv4(), // IDを生成して追加
      email,
      name,
      role: testRoleToUserRole(role), // UserRole型に変換
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  // テストトークンを生成
  const token = `test-token-${uuidv4()}`;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as TestUserRole,
    token,
  };
}

/**
 * 認証済みリクエストを作成
 */
export function createAuthenticatedRequest(
  method: string,
  body?: any,
  user?: TestUser
): NextRequest {
  const headers = new Headers();
  
  if (user) {
    // 認証ヘッダーを設定
    headers.set('Authorization', `Bearer ${user.token}`);
    headers.set('X-User-Id', user.id);
    headers.set('X-User-Role', user.role.toString());
  }
  
  return createMockRequest(method, body, headers);
}

/**
 * 認証情報を検証
 */
export function validateAuthHeaders(headers: Headers): {
  isAuthenticated: boolean;
  userId?: string;
  userRole?: string;
  token?: string;
} {
  // ヘッダーから値を取得
  const authHeader = headers.get('Authorization');
  const userId = headers.get('X-User-Id');
  const userRole = headers.get('X-User-Role');
  
  // nullチェックを実施
  if (!authHeader || !userId || !userRole) {
    return { isAuthenticated: false };
  }
  
  // ここで型アサーションを使用してTypeScriptに型を保証する
  // この時点でnullでないことは確認済み
  const token = (authHeader as string).replace('Bearer ', '');
  
  return {
    isAuthenticated: true,
    userId: userId as string,
    userRole: userRole as string,
    token,
  };
}

/**
 * クロスオリジンリクエストを作成
 */
export function createCrossOriginRequest(
  method: string,
  origin: string,
  body?: any,
  user?: TestUser
): NextRequest {
  const headers = new Headers();
  
  // オリジンヘッダーを設定
  headers.set('Origin', origin);
  
  if (user) {
    // 認証ヘッダーを設定
    headers.set('Authorization', `Bearer ${user.token}`);
    headers.set('X-User-Id', user.id);
    headers.set('X-User-Role', user.role.toString()); // 型変換を明示的に行う
  }
  
  return createMockRequest(method, body, headers);
}

/**
 * 認証エラーレスポンスを検証
 */
export async function validateAuthErrorResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }
  
  const data = await response.json();
  
  return (
    data.success === false &&
    (data.error?.includes('認証') || data.error?.includes('権限') || data.error?.includes('auth'))
  );
}
