<<<<<<< HEAD
import { POST } from '@/app/api/auth/signup/route';
import { User } from '@prisma/client';
import { NextRequest } from 'next/server';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// bcrypt.hash のモック
=======
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// モック設定
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

>>>>>>> c58ec68 (実装途中)
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

<<<<<<< HEAD
// crypto.randomUUID のモック
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

const prismaMock = createPrismaMock();
const bcryptHashMock = bcrypt.hash as jest.Mock;
const cryptoRandomUUIDMock = crypto.randomUUID as jest.Mock;

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    clearAllMocks();
    bcryptHashMock.mockResolvedValue('hashed_password_signup');
    cryptoRandomUUIDMock.mockReturnValue('mocked-uuid-signup');
  });

  it('should signup a new user successfully and return 201', async () => {
    const requestBody = {
      email: 'newuser@example.com',
      password: 'password1234',
      name: 'New Signup User',
    };
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    const createdUser = createMockUser({
      id: 'mocked-uuid-signup',
      email: requestBody.email,
      name: requestBody.name,
      password: 'hashed_password_signup',
      credits: 100,
    });
    prismaMock.user.create.mockResolvedValue(createdUser);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.message).toBe('ユーザーが正常に作成されました');
    expect(responseBody.user.id).toBe(createdUser.id);
    expect(responseBody.user.email).toBe(requestBody.email);
    expect(responseBody.user.name).toBe(requestBody.name);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: requestBody.email },
    });
    expect(bcryptHashMock).toHaveBeenCalledWith(requestBody.password, 10);
    expect(cryptoRandomUUIDMock).toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        id: 'mocked-uuid-signup',
        email: requestBody.email,
        name: requestBody.name,
        password: 'hashed_password_signup',
        credits: 100,
        updatedAt: expect.any(Date),
      },
    });
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });

  it('should return 400 if email already exists', async () => {
    const requestBody = {
      email: 'existing-signup@example.com',
      password: 'password1234',
      name: 'Existing Signup User',
    };
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(createMockUser({
      id: 'existing-user-id',
      email: requestBody.email,
      name: requestBody.name,
    }));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('このメールアドレスは既に登録されています');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });

  it('should return 400 for invalid input based on zod schema (e.g., short password)', async () => {
    const requestBody = {
      email: 'invalid@example.com',
      password: '123', // Too short
      name: 'Invalid User',
    };
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('パスワードは6文字以上必要です');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    // $disconnect might or might not be called depending on where the validation error is caught
  });

  it('should return 500 if bcrypt.hash fails', async () => {
    const requestBody = {
      email: 'bcryptfail@example.com',
      password: 'password1234',
      name: 'Bcrypt Fail User',
    };
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockRejectedValue(new Error('bcrypt hashing failed'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('bcrypt hashing failed');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    // $disconnect might or might not be called
  });

  it('should return 500 if prisma.user.create fails', async () => {
    const requestBody = {
      email: 'prismacreatefail@example.com',
      password: 'password1234',
      name: 'Prisma Create Fail User',
    };
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed_password_prisma_fail');
    cryptoRandomUUIDMock.mockReturnValue('uuid_prisma_fail');
    prismaMock.user.create.mockRejectedValue(new Error('DB create error'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('DB create error');
    // $disconnect might or might not be called
=======
describe('Signup API', () => {
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('POST /api/auth/signup', () => {
    it('正常なサインアップリクエストを処理できる', async () => {
      // ユーザーが存在しない場合のモック設定
      prisma.user.findUnique.mockResolvedValue(null);
      
      // パスワードハッシュ化のモック
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      // ユーザー作成のモック
      prisma.user.create.mockResolvedValue({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        credits: 100,
        updatedAt: new Date(),
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
      const testCases = [
        { 
          body: { email: 'test@example.com', password: 'password123' },
          expectedError: '名前は必須です'
        },
        { 
          body: { name: 'Test User', password: 'password123' },
          expectedError: '有効なメールアドレスを入力してください'
        },
        { 
          body: { name: 'Test User', email: 'test@example.com' },
          expectedError: 'パスワードは6文字以上必要です'
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
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        name: 'Existing User',
        email: 'test@example.com',
        password: 'hashed_password',
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
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

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
>>>>>>> c58ec68 (実装途中)
  });
}); 