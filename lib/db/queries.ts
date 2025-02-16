import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { prisma, Prisma } from '@/lib/db';

export async function getUser() {
  try {
    const sessionCookie = cookies().get('session');
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = await verifyToken(sessionCookie.value);
    if (!sessionData?.user?.id) {
      return null;
    }

    if (new Date(sessionData.expires) < new Date()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: sessionData.user.id
      }
    });

    if (!user) return null;

    return user;
  } catch (error) {
    console.error('Error in getUser:', error);
    return null;
  }
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: string) {
  const userWithTeam = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teams: {
        include: {
          team: true
        }
      }
    }
  });

  if (!userWithTeam) return null;

  const teamMember = userWithTeam.teams[0];
  if (!teamMember) return null;

  return {
    ...userWithTeam,
    teamId: teamMember.teamId,
    team: teamMember.team
  };
}

export async function getActivityLogs(userId: string) {
  return await prisma.activityLog.findMany({
    where: {
      userId: userId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });
}

export async function getTeamForUser(userId: number) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      teamMembers: {
        with: {
          team: {
            with: {
              teamMembers: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return result?.teamMembers[0]?.team || null;
}
