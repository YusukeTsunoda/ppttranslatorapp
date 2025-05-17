import { POST } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';
import { hashPassword } from '@/lib/auth/password';

// hashPasswordのモック
jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
}));

const prismaMock = createPrismaMock();
const hashPasswordMock = hashPassword as jest.Mock;

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    clearAllMocks();
    hashPasswordMock.mockResolvedValue('hashed_password');
  });

  it('should register a new user successfully', async () => {
    const requestBody = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const req = new NextRequest('http://localhost/api/auth/register', {
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
    });
    prismaMock.user.create.mockResolvedValue(createdUser);

    const response = await POST(req as NextRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.userId).toBe(createdUser.id);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: requestBody.email },
    });
    expect(hashPasswordMock).toHaveBeenCalledWith(requestBody.password);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
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
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(createMockUser({
      email: requestBody.email,
      name: requestBody.name,
    }));

    const response = await POST(req as NextRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('このメールアドレスは既に登録されています');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 500 if hashing password fails', async () => {
    const requestBody = {
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
    };
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    hashPasswordMock.mockRejectedValue(new Error('Hashing failed'));

    const response = await POST(req as NextRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('ユーザー登録中にエラーが発生しました');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 500 if creating user fails', async () => {
    const requestBody = {
      email: 'test3@example.com',
      password: 'password123',
      name: 'Test User 3',
    };
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    hashPasswordMock.mockResolvedValue('hashed_password_for_test3');
    prismaMock.user.create.mockRejectedValue(new Error('DB error'));

    const response = await POST(req as NextRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('ユーザー登録中にエラーが発生しました');
  });

  // TODO: リクエストボディのバリデーションに関するテストケースを追加
  // (例: email, password, name が欠落している場合など。現状のAPIは自前でバリデーションしていないため、
  //  NextRequestの挙動や、将来的なバリデーションライブラリ導入時にテスト追加を検討)
}); 