import { GET } from '@/app/api/user/credits/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server'; // GETリクエストには不要だが、一応入れておく
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { authOptions } from '@/lib/auth/auth-options';
import { User } from '@prisma/client';

// getServerSession のモック
jest.mock('next-auth', () => ({
    ...jest.requireActual('next-auth'),
    getServerSession: jest.fn(),
}));

// Prisma Client のモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: mockDeep<DeepMockProxy<typeof prisma>>(),
}));

const getServerSessionMock = getServerSession as jest.Mock;
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('GET /api/user/credits', () => {
  const mockUserId = 'user-credits-test-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user credits successfully', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: mockUserId, name: 'Test User', email: 'test@example.com' },
      expires: 'some-date',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: mockUserId,
      credits: 100,
      // 他のUserモデルのフィールドはselectで指定されていないので不要
    } as unknown as Pick<User, 'credits'> ); // Pickで型を合わせる

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.credits).toBe(100);
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
      select: { credits: true },
    });
  });

  it('should return 0 credits if user credits are zero or negative', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockResolvedValue({ credits: -50 } as Pick<User, 'credits'>);

    let response = await GET();
    let responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.credits).toBe(0);

    prismaMock.user.findUnique.mockResolvedValue({ credits: 0 } as Pick<User, 'credits'>);
    response = await GET();
    responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.credits).toBe(0);
  });

  it('should return 401 if user is not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null); // No session

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error).toBe('認証が必要です');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('should return 404 if user is not found in DB', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockResolvedValue(null); // User not found

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toBe('ユーザーが見つかりません');
  });

  it('should return 500 if prisma.user.findUnique fails', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockRejectedValue(new Error('DB query failed'));

    const response = await GET();
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('クレジット残高の取得に失敗しました');
  });
}); 