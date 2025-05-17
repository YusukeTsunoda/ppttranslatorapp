import { GET } from '@/app/api/auth/session/route';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/auth-options';
import { createSessionMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';

const getServerSessionMock = createSessionMock();

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
    getServerSessionMock.mockResolvedValue({
      user: mockUser,
      expires: 'some-date',
    });

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.user).toEqual(mockUser);
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });

  it('should return null for user if session does not exist', async () => {
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.user).toBeNull();
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });

  it('should return null for user if getServerSession throws an error', async () => {
    getServerSessionMock.mockRejectedValue(new Error('Session fetch error'));

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200); // APIはエラーをキャッチしてnullを返す
    expect(responseBody.user).toBeNull();
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
  });
}); 