import { POST } from '@/app/api/profile/update/route';
import { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth/auth-options';
import { createPrismaMock, createSessionMock, clearAllMocks, createMockUser } from '@/tests/helpers/mockSetup';

const prismaMock = createPrismaMock();
const getServerSessionMock = createSessionMock();

describe('POST /api/profile/update', () => {
  const mockUserId = 'user-123-profile';
  const mockUserEmail = 'testuser@example.com';

  beforeEach(() => {
    clearAllMocks();
  });

  it('should update user profile successfully', async () => {
    const newName = 'Updated Test User';
    const req = new NextRequest('http://localhost/api/profile/update', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
      headers: { 'Content-Type': 'application/json' },
    });

    getServerSessionMock.mockResolvedValue({
      user: { id: mockUserId, email: mockUserEmail, name: 'Old Name' },
      expires: 'some-date',
    });

    const updatedUserDbResult = createMockUser({
      id: mockUserId,
      name: newName,
      email: mockUserEmail,
    });
    prismaMock.user.update.mockResolvedValue(updatedUserDbResult);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.user.id).toBe(mockUserId);
    expect(responseBody.user.name).toBe(newName);
    expect(responseBody.user.email).toBe(mockUserEmail);

    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: {
        name: newName,
        updatedAt: expect.any(Date),
      },
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    const req = new NextRequest('http://localhost/api/profile/update', {
      method: 'POST',
      body: JSON.stringify({ name: 'Any Name' }),
    });

    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error).toBe('認証が必要です');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should return 400 if name is not provided', async () => {
    const req = new NextRequest('http://localhost/api/profile/update', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } });

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('名前は必須です');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should return 500 if prisma.user.update fails', async () => {
    const req = new NextRequest('http://localhost/api/profile/update', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid Name' }),
    });

    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } });
    prismaMock.user.update.mockRejectedValue(new Error('DB update failed'));

    const response = await POST(req as Request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('プロフィールの更新に失敗しました');
  });
}); 