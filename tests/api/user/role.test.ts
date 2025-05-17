import { GET } from '@/app/api/user/role/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { authOptions } from '@/lib/auth/auth-options';
import { User, UserRole } from '@prisma/client'; // UserRoleもインポート

// getServerSession のモック
jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

// Prisma Client のモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: mockDeep<DeepMockProxy<typeof prisma>>(),
}));

const getServerSessionMock = getServerSession as jest.Mock;
const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('GET /api/user/role', () => {
  const mockUserId = 'user-role-test-id';
  // NextRequestのモックはGETでは通常不要だが、型合わせのためにダミーを渡すことがある
  const mockRequest = new NextRequest('http://localhost/api/user/role'); 

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isAdmin true and role ADMIN for admin user', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN } as Pick<User, 'role'>);

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.isAdmin).toBe(true);
    expect(responseBody.role).toBe(UserRole.ADMIN);
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
      select: { role: true },
    });
  });

  it('should return isAdmin false and role USER for non-admin user', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockResolvedValue({ role: UserRole.USER } as Pick<User, 'role'>);

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.isAdmin).toBe(false);
    expect(responseBody.role).toBe(UserRole.USER);
  });

  it('should return 401 with isAdmin false and role null if not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null); // No session

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.isAdmin).toBe(false);
    expect(responseBody.role).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('should return 404 with isAdmin false and role null if user not found', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockResolvedValue(null); // User not found

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.isAdmin).toBe(false);
    expect(responseBody.role).toBeNull();
  });

  it('should return 500 if prisma.user.findUnique fails', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: mockUserId } } as any);
    prismaMock.user.findUnique.mockRejectedValue(new Error('DB query failed'));

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('ユーザーロールの取得に失敗しました');
  });
}); 