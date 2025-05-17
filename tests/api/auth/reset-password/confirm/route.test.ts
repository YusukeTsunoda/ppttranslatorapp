import { POST } from '@/app/api/auth/reset-password/confirm/route';
import { hashPassword } from '@/lib/auth/password';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';

// Jestのexpect関数をモック化しないようにする
const actualExpect = global.expect;

// next/serverのモック化
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, options = {}) => ({
      json: () => Promise.resolve(data),
      status: options.status || 200,
      headers: new Map(),
    })),
  },
}));

// hashPasswordのモック
jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
}));

// console.logのモック
// consoleのモック化
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const prismaMock = createPrismaMock();
const hashPasswordMock = hashPassword as jest.Mock;

describe('POST /api/auth/reset-password/confirm', () => {
  beforeEach(() => {
    clearAllMocks();
    hashPasswordMock.mockResolvedValue('new_hashed_password');
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  it('should reset password successfully for dummy user', async () => {
    const requestBody = {
      token: 'any-token', // Currently ignored by the API
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockUser = createMockUser({
      id: 'dummy-user-id',
      email: 'dummy@example.com',
      name: 'Dummy User',
      password: 'old_hashed_password',
    });
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue(mockUser);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(200);
    actualExpect(responseBody.success).toBe(true);
    actualExpect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'dummy@example.com' },
    });
    actualExpect(hashPasswordMock).toHaveBeenCalledWith(requestBody.password);
    actualExpect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        password: 'new_hashed_password',
        updatedAt: actualExpect.any(Date),
      },
    });
  });

  it('should return 400 if token is invalid (dummy user not found)', async () => {
    const requestBody = {
      token: 'invalid-token',
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    prismaMock.user.findFirst.mockResolvedValue(null);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    actualExpect(response.status).toBe(400);
    actualExpect(responseBody.error).toBe('トークンが無効か有効期限が切れています');
    actualExpect(hashPasswordMock).not.toHaveBeenCalled();
    actualExpect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should return error for invalid input (e.g., short password)', async () => {
    const requestBody = {
      token: 'any-token',
      password: 'short',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
  });

  it('should return 500 if hashPassword fails', async () => {
    const requestBody = {
      token: 'any-token',
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockUser = createMockUser({ id: 'dummy-user-id' });
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    hashPasswordMock.mockRejectedValue(new Error('Hashing failed'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should return 500 if prisma.user.update fails', async () => {
    const requestBody = {
      token: 'any-token',
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockUser = createMockUser({ id: 'dummy-user-id' });
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    hashPasswordMock.mockResolvedValue('new_hashed_password');
    prismaMock.user.update.mockRejectedValue(new Error('DB update failed'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
  });

  it('should validate request body structure', async () => {
    const invalidRequests = [
      { password: 'validPassword123' }, // missing token
      { token: 'valid-token' }, // missing password
      {}, // empty body
    ];

    for (const body of invalidRequests) {
      const req = new Request('http://localhost/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req as Request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
      expect(mockConsoleError).toHaveBeenCalled();
    }
  });

  it('should validate password requirements', async () => {
    const invalidPasswords = [
      'short', // too short
      '12345678', // only numbers
      'abcdefgh', // only lowercase
      'ABCDEFGH', // only uppercase
    ];

    for (const password of invalidPasswords) {
      const req = new Request('http://localhost/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token', password }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req as Request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
    }
  });

  it('should log password reset activity', async () => {
    const requestBody = {
      token: 'valid-token',
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockUser = createMockUser({
      id: 'test-user-id',
      email: 'dummy@example.com',
    });

    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue(mockUser);

    await POST(req as Request);

    actualExpect(mockConsoleLog).toHaveBeenCalledWith('Password reset:', actualExpect.objectContaining({
      userId: mockUser.id,
      action: 'update_password',
      timestamp: actualExpect.any(String),
    }));
  });

  it('should handle database unique constraint violations', async () => {
    const requestBody = {
      token: 'valid-token',
      password: 'newValidPassword123',
    };
    const req = new Request('http://localhost/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const mockUser = createMockUser({ id: 'test-user-id' });
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    prismaMock.user.update.mockRejectedValue(new Error('P2002')); // Prisma unique constraint error

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('パスワードのリセットに失敗しました');
    expect(mockConsoleError).toHaveBeenCalled();
  });
}); 