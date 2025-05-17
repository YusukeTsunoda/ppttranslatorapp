import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { getServerSession } from 'next-auth';

// Prisma Clientのモック作成
export const createPrismaMock = () => {
  const prismaMock = mockDeep<PrismaClient>();
  jest.mock('@/lib/db/prisma', () => ({
    prisma: prismaMock,
  }));
  return prismaMock as unknown as DeepMockProxy<PrismaClient>;
};

// getServerSessionのモック作成
export const createSessionMock = () => {
  const sessionMock = jest.fn().mockResolvedValue(null);
  jest.mock('next-auth', () => {
    return {
      __esModule: true,
      getServerSession: () => sessionMock(),
    };
  });
  return sessionMock;
};

// 共通のモッククリア
export const clearAllMocks = () => {
  jest.clearAllMocks();
};

// 共通のユーザーモックデータ
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed_password',
  credits: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: 'USER',
  deletedAt: null,
  emailVerified: null,
  stripeCustomerId: null,
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  stripeSubscriptionId: null,
  magicLinkToken: null,
  magicLinkExpiresAt: null,
  passwordResetToken: null,
  passwordResetExpiresAt: null,
  image: null,
  ...overrides,
}); 