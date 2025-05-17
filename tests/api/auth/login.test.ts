import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';
import { comparePasswords } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// モックの設定
jest.mock('@/lib/auth/session', () => ({
  comparePasswords: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// NextRequestのモック
const createMockRequest = (body: any) => {
  return {
    json: jest.fn().mockResolvedValue(body),
    ip: '127.0.0.1',
    headers: {
      get: jest.fn().mockReturnValue('Mozilla/5.0 Test User Agent'),
    },
  } as unknown as NextRequest;
};

describe('Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // データベース接続のモックをデフォルトで成功に設定
    (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
    (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/auth/login', () => {
    it('正常なログインリクエストを処理できる', async () => {
      // ユーザーが存在し、パスワードが一致する場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
      });
      (comparePasswords as jest.Mock).mockResolvedValue(true);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('必須フィールドが欠けている場合は400エラーを返す', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          // パスワードを省略
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('メールアドレスとパスワードは必須です');
    });

    it('存在しないユーザーの場合は401エラーを返す', async () => {
      // ユーザーが存在しない場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('パスワードが一致しない場合は401エラーを返す', async () => {
      // ユーザーは存在するがパスワードが一致しない場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
      });
      (comparePasswords as jest.Mock).mockResolvedValue(false);

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong_password',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('データベース接続エラーの場合は500エラーを返す', async () => {
      // データベース接続エラーのモック設定
      (prisma.$connect as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('データベース接続エラー');
    });

    it('予期せぬエラーの場合は500エラーを返す', async () => {
      // 予期せぬエラーのモック設定
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('ログイン処理中にエラーが発生しました');
    });
  });
});
