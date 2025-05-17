import { POST } from '@/app/api/auth/reset-password/route';
import { prisma } from '@/lib/db/prisma';
import { generateResetToken } from '@/lib/auth/token';
import { sendPasswordResetEmail } from '@/lib/email/send';
import { UserRole } from '@prisma/client';

// Jestのexpect関数をモック化しないようにする
const actualExpect = global.expect;

// モック設定
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/token', () => ({
  generateResetToken: jest.fn(),
}));

jest.mock('@/lib/email/send', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

describe('Password Reset API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/auth/reset-password', () => {
    it('正常なパスワードリセットリクエストを処理できる', async () => {
      // ユーザーが存在する場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
      });

      // トークン生成のモック
      (generateResetToken as jest.Mock).mockResolvedValue('test-reset-token');

      // ユーザー更新のモック
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        updatedAt: new Date(),
      });

      // メール送信のモック
      (sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(200);

      const data = await response.json();
      actualExpect(data.success).toBe(true);

      // メール送信が呼び出されたことを確認
      actualExpect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'test-reset-token');
    });

    it('存在しないユーザーの場合でも成功レスポンスを返す（セキュリティ対策）', async () => {
      // ユーザーが存在しない場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(200);

      const data = await response.json();
      actualExpect(data.success).toBe(true);

      // メール送信が呼び出されていないことを確認
      actualExpect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('メールアドレスの形式が不正な場合は400エラーを返す', async () => {
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(400);

      const data = await response.json();
      actualExpect(data.error).toBeTruthy();
    });

    it('メール送信サービスの設定がない場合は500エラーを返す', async () => {
      // RESEND_API_KEYを削除
      delete process.env.RESEND_API_KEY;

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(500);

      const data = await response.json();
      actualExpect(data.error).toBe('Email service configuration error');
    });

    it('メール送信に失敗した場合は500エラーを返す', async () => {
      // ユーザーが存在する場合のモック設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
      });

      // メール送信エラーのモック
      (sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Failed to send email'));

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(500);

      const data = await response.json();
      actualExpect(data.error).toBe('パスワードリセットの要求に失敗しました');
    });

    it('データベースエラーの場合は500エラーを返す', async () => {
      // データベースエラーのモック設定
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(req as Request);
      actualExpect(response.status).toBe(500);

      const data = await response.json();
      actualExpect(data.error).toBe('パスワードリセットの要求に失敗しました');
    });
  });
}); 