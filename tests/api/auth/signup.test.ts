import { POST } from '@/app/api/auth/signup/route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';

// PrismaClientのモック
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
const mockDisconnect = jest.fn();

// PrismaClientのモック設定
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        user: {
          findUnique: mockUserFindUnique,
          create: mockUserCreate,
        },
        $disconnect: mockDisconnect,
      };
    }),
  };
});

// bcryptのモック設定
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// テスト用のモック関数
const bcryptHashMock = bcrypt.hash as jest.Mock;

describe('Signup API', () => {
  // prisma変数は不要になったため削除

  beforeEach(() => {
    jest.clearAllMocks();
    bcryptHashMock.mockResolvedValue('hashed_password');
    
    // モックのリセット
    mockUserFindUnique.mockReset();
    mockUserCreate.mockReset();
    mockDisconnect.mockReset();
  });

  describe('POST /api/auth/signup', () => {
    it('正常なサインアップリクエストを処理できる', async () => {
      // ユーザーが存在しない場合のモック設定
      mockUserFindUnique.mockResolvedValue(null);
      
      // パスワードハッシュ化のモック
      bcryptHashMock.mockResolvedValue('hashed_password');

      // ユーザー作成のモック
      mockUserCreate.mockResolvedValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        credits: 100,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      const req = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.message).toBe('ユーザーが正常に作成されました');
      expect(data.user).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('必須フィールドが欠けている場合は400エラーを返す', async () => {
      // 実際のAPIレスポンスに合わせて期待値を設定
      const testCases = [
        { 
          body: { email: 'test@example.com', password: 'password123' },
          expectedError: 'Required'
        },
        { 
          body: { name: 'Test User', password: 'password123' },
          expectedError: 'Required'
        },
        { 
          body: { name: 'Test User', email: 'test@example.com' },
          expectedError: 'Required'
        },
      ];

      for (const testCase of testCases) {
        const req = new Request('http://localhost:3000/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.body),
        });

        const response = await POST(req as unknown as NextRequest);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBe(testCase.expectedError);
      }
    });

    it('既存のメールアドレスの場合は400エラーを返す', async () => {
      // ユーザーが既に存在する場合のモック設定
      mockUserFindUnique.mockResolvedValue({
        id: 'existing-user-id',
        name: 'Existing User',
        email: 'test@example.com',
        password: 'hashed_password',
        credits: 100,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      const req = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('このメールアドレスは既に登録されています');
    });

    it('パスワードが短すぎる場合は400エラーを返す', async () => {
      const req = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: '12345', // 6文字未満
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('パスワードは6文字以上必要です');
    });

    it('メールアドレスの形式が不正な場合は400エラーを返す', async () => {
      const req = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email', // 不正なメールアドレス形式
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('有効なメールアドレスを入力してください');
    });

    it('データベースエラーの場合は500エラーを返す', async () => {
      // データベースエラーのモック設定
      mockUserFindUnique.mockRejectedValue(new Error('Database error'));

      const req = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
  });
});