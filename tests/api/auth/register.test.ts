import { mockDeep, mockReset, MockProxy } from 'jest-mock-extended';
import { PrismaClient, UserRole } from '@prisma/client';

// Prismaクライアントのモックを作成
const prismaMock = mockDeep<PrismaClient>();

// モック定義を先に行う
jest.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock
}));

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
}));

// モック定義後にインポートする
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';

// Jestのexpect関数をモック化しないようにする
const actualExpect = global.expect;
const hashPasswordMock = hashPassword as jest.Mock;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    clearAllMocks();
    jest.clearAllMocks();
    hashPasswordMock.mockResolvedValue('hashed_password');
  });

  it('should register a new user successfully', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    const createdUser = createMockUser({
      id: 'generated-uuid',
      email: requestBody.email,
      name: requestBody.name,
      password: 'hashed_password',
      credits: 15,
      role: UserRole.USER,
    });
    prismaMock.user.create.mockResolvedValue(createdUser);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(200);
    actualExpect(responseBody.success).toBe(true);
    actualExpect(responseBody.userId).toBe(createdUser.id);

    actualExpect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: requestBody.email },
    });
    actualExpect(hashPasswordMock).toHaveBeenCalledWith(requestBody.password);
    actualExpect(prismaMock.user.create).toHaveBeenCalledWith(
      actualExpect.objectContaining({
        data: actualExpect.objectContaining({
          email: requestBody.email,
          name: requestBody.name,
          password: 'hashed_password',
          credits: 15,
        }),
      })
    );
  });

  it('should return 400 if email already exists', async () => {
    const requestBody = {
      email: 'existing@example.com',
      password: 'password123',
      name: 'Existing User',
    };
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(createMockUser({
      email: requestBody.email,
      name: requestBody.name,
    }));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(400);
    actualExpect(responseBody.error).toBe('このメールアドレスは既に登録されています');
    actualExpect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 500 if hashing password fails', async () => {
    const requestBody = {
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
    };
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    hashPasswordMock.mockRejectedValue(new Error('Hashing failed'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(500);
    actualExpect(responseBody.error).toBe('ユーザー登録中にエラーが発生しました');
    actualExpect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 500 if creating user fails', async () => {
    const requestBody = {
      email: 'test3@example.com',
      password: 'password123',
      name: 'Test User 3',
    };
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    hashPasswordMock.mockResolvedValue('hashed_password_for_test3');
    prismaMock.user.create.mockRejectedValue(new Error('DB error'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(500);
    actualExpect(responseBody.error).toBe('ユーザー登録中にエラーが発生しました');
  });

  // TODO: リクエストボディのバリデーションに関するテストケースを追加
  // (例: email, password, name が欠落している場合など。現状のAPIは自前でバリデーションしていないため、
  //  NextRequestの挙動や、将来的なバリデーションライブラリ導入時にテスト追加を検討)
}); 