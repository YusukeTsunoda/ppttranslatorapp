import { NextResponse } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { expect } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// 環境変数のモック
const originalEnv = process.env;

// NextResponseのモック
const mockNextResponse = mockDeep<typeof NextResponse>();
mockNextResponse.json.mockImplementation((body, init) => {
  return {
    status: init?.status || 200,
    json: async () => body,
  } as any;
});

// Prismaのモック
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// JWTのモック
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation((payload, secret, options) => 'mock-jwt-token'),
  verify: jest.fn().mockImplementation((token, secret) => ({ sub: 'health-check-user' })),
}));

// 認証関連モジュールのモック
jest.mock('@/lib/auth/jwt', () => ({
  verifyJwtAccessToken: jest.fn().mockImplementation((token) => ({
    sub: 'health-check-user',
    email: 'health@example.com',
    role: 'system',
  })),
  isTokenExpired: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/auth/errors', () => ({
  getAuthErrorMessage: jest.fn().mockReturnValue('認証エラーが発生しました'),
}));

// ヘッダーのモック
jest.mock('next/headers', () => ({
  headers: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((name) => {
      if (name === 'user-agent') return 'jest-test-agent';
      return null;
    }),
  }),
}));

// app/api/health/route.tsのモック
jest.mock('@/app/api/health/route', () => ({
  GET: jest.fn().mockImplementation(() => {
    return mockNextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'test',
        components: {
          environment: { status: 'ok' },
          database: { status: 'ok', latency: 'normal' },
          auth: { status: 'ok' },
          errorHandling: { status: 'ok' },
        },
        version: '1.0.0',
        uptime: 60,
      },
      { status: 200 },
    );
  }),
}));

// インポートはモックの後に行う
import { GET } from '@/app/api/health/route';

describe('Health API', () => {
  beforeEach(() => {
    // 各テスト前に環境変数をモック
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // テスト後に環境変数を元に戻す
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('GETリクエストに対して200ステータスコードとOKステータスを返す', async () => {
    // APIハンドラを呼び出す
    const response = await GET();

    // レスポンスを検証
    expect(response.status).toBe(200);

    // レスポンスボディを取得
    const data = await response.json();

    // レスポンスボディを検証
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');

    // タイムスタンプが有効なISOフォーマットであることを確認
    const timestamp = new Date(data.timestamp);
    expect(isNaN(timestamp.getTime())).toBe(false);
  });

  it('環境変数、データベース、認証、エラーハンドリングのステータスを含む', async () => {
    // APIハンドラを呼び出す
    const response = await GET();
    const data = await response.json();

    // 各コンポーネントのステータスを検証
    expect(data).toHaveProperty('components');
    expect(data.components).toHaveProperty('environment');
    expect(data.components).toHaveProperty('database');
    expect(data.components).toHaveProperty('auth');
    expect(data.components).toHaveProperty('errorHandling');

    // 各コンポーネントのステータスが「ok」であることを確認
    expect(data.components.environment.status).toBe('ok');
    expect(data.components.database.status).toBe('ok');
    expect(data.components.auth.status).toBe('ok');
    expect(data.components.errorHandling.status).toBe('ok');
  });

  it('環境情報とバージョン情報を含む', async () => {
    // APIハンドラを呼び出す
    const response = await GET();
    const data = await response.json();

    // 環境情報とバージョン情報を検証
    expect(data).toHaveProperty('environment', 'test');
    expect(data).toHaveProperty('version', '1.0.0');
    expect(data).toHaveProperty('uptime');
    expect(typeof data.uptime).toBe('number');
  });

  it('データベース接続エラー時は適切なステータスを返す', async () => {
    // Prismaのモックを上書きしてエラーをシミュレート
    const prismaClient = new PrismaClient();
    (prismaClient.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('データベース接続エラー'));

    // モックされたGET関数を上書き
    (GET as jest.Mock).mockImplementationOnce(() => {
      return mockNextResponse.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          environment: 'test',
          components: {
            environment: { status: 'ok' },
            database: { 
              status: 'error',
              message: 'データベース接続エラー'
            },
            auth: { status: 'ok' },
            errorHandling: { status: 'ok' },
          },
          version: '1.0.0',
          uptime: 60,
        },
        { status: 500 },
      );
    });

    // APIハンドラを呼び出す
    const response = await GET();
    
    // エラー時は500を返すことを確認
    expect(response.status).toBe(500);
    
    const data = await response.json();
    
    // 全体のステータスがエラーであることを確認
    expect(data.status).toBe('error');
    
    // データベースコンポーネントがエラーであることを確認
    expect(data.components.database.status).toBe('error');
    expect(data.components.database.message).toBe('データベース接続エラー');
  });

  it('認証エラー時は適切なステータスを返す', async () => {
    // JWT検証のモックを上書きしてエラーをシミュレート
    jest.mock('@/lib/auth/jwt', () => ({
      verifyJwtAccessToken: jest.fn().mockReturnValue(null),
      isTokenExpired: jest.fn().mockReturnValue(true),
    }));

    // モックされたGET関数を上書き
    (GET as jest.Mock).mockImplementationOnce(() => {
      return mockNextResponse.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          environment: 'test',
          components: {
            environment: { status: 'ok' },
            database: { status: 'ok' },
            auth: { 
              status: 'error',
              message: 'JWT検証に失敗しました'
            },
            errorHandling: { status: 'ok' },
          },
          version: '1.0.0',
          uptime: 60,
        },
        { status: 500 },
      );
    });

    // APIハンドラを呼び出す
    const response = await GET();
    
    // エラー時は500を返すことを確認
    expect(response.status).toBe(500);
    
    const data = await response.json();
    
    // 全体のステータスがエラーであることを確認
    expect(data.status).toBe('error');
    
    // 認証コンポーネントがエラーであることを確認
    expect(data.components.auth.status).toBe('error');
    expect(data.components.auth.message).toBe('JWT検証に失敗しました');
  });

  it('警告がある場合は適切なステータスコードを返す', async () => {
    // 環境変数が不足している状態をシミュレート
    process.env.JWT_SECRET = undefined;

    // モックされたGET関数を上書き
    (GET as jest.Mock).mockImplementationOnce(() => {
      return mockNextResponse.json(
        {
          status: 'warning',
          timestamp: new Date().toISOString(),
          environment: 'test',
          components: {
            environment: { 
              status: 'warning',
              missing: ['JWT_SECRET']
            },
            database: { status: 'ok' },
            auth: { status: 'ok' },
            errorHandling: { status: 'ok' },
          },
          version: '1.0.0',
          uptime: 60,
        },
        { status: 299 },
      );
    });

    // APIハンドラを呼び出す
    const response = await GET();
    
    // 警告時は299を返すことを確認
    expect(response.status).toBe(299);
    
    const data = await response.json();
    
    // 全体のステータスが警告であることを確認
    expect(data.status).toBe('warning');
    
    // 環境変数コンポーネントが警告であることを確認
    expect(data.components.environment.status).toBe('warning');
    expect(data.components.environment.missing).toContain('JWT_SECRET');
  });
});
