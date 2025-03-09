import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function getUser() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    });

    if (!user) return null;

    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

// ActivityLog モデルが存在しないためコメントアウト
/*
export async function getActivityLogs(userId: string) {
  return prisma.activityLog.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  });
}
*/

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  return user;
}
