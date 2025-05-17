// next-authのモック化
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// auth-optionsのモック化
jest.mock('@/lib/auth/auth-options', () => ({
  authOptions: {}
}));

// NextResponseのモック化
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn().mockImplementation((data) => ({
        json: () => Promise.resolve(data),
        statusText: 'OK',
        headers: new Map(),
      })),
    },
  };
});

// モジュールのインポートはモック化後に行う
import { GET } from '@/app/api/auth/session/route';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';

// getServerSessionのモックを直接使用
const getServerSessionMock = getServerSession as jest.Mock;

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should return user information if session exists', async () => {
    const mockUser = createMockUser({
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
    });
    // モックの返値を設定
    getServerSessionMock.mockResolvedValueOnce({
      user: mockUser,
      expires: 'some-date',
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.statusText).toBe('OK');
    expect(responseBody.user).toEqual(mockUser);
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });

  it('should return null for user if session does not exist', async () => {
    getServerSessionMock.mockResolvedValueOnce(null);

    const response = await GET();
    const responseBody = await response.json();

    expect(response.statusText).toBe('OK');
    expect(responseBody.user).toBeNull();
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });

  it('should return null for user if getServerSession throws an error', async () => {
    getServerSessionMock.mockRejectedValueOnce(new Error('Session fetch error'));

    const response = await GET();
    const responseBody = await response.json();

    expect(response.statusText).toBe('OK'); // APIはエラーをキャッチしてnullを返す
    expect(responseBody.user).toBeNull();
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });
}); 