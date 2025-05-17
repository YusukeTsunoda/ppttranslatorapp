import { prisma } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { hash } from 'bcryptjs';

interface CreateTestUserOptions {
  role?: 'USER' | 'ADMIN';
  email?: string;
  name?: string;
}

export const createTestUser = async (options: CreateTestUserOptions = {}) => {
  const {
    role = 'USER',
    email = `test-${Date.now()}@example.com`,
    name = 'Test User'
  } = options;

  const passwordHash = await hash('testpassword123', 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      emailVerified: new Date(),
      credits: 100
    }
  });

  const token = generateToken(user);

  return {
    ...user,
    token
  };
};

export const deleteTestUser = async (userId: string) => {
  await prisma.user.delete({
    where: { id: userId }
  });
}; 