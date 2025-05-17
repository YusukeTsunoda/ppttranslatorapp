import { POST } from '@/app/api/auth/signup/route';
import { User } from '@prisma/client';
import { NextRequest } from 'next/server';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// bcrypt.hash のモック
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

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
  });
}); 