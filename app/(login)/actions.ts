'use server';

import { z } from 'zod';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';
import { ActivityAction } from '@/lib/utils/activity-logger';
import { verifyToken } from '@/lib/auth/session';

async function logActivity(teamId: string, userId: string, action: ActivityAction) {
  await prisma.activityLog.create({
    data: {
      teamId,
      userId,
      action,
      ipAddress: '127.0.0.1'
    }
  });
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      teams: {
        include: {
          team: true
        }
      }
    }
  });

  if (!user) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password,
    };
  }

  const isPasswordValid = await comparePasswords(password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password,
    };
  }

  const team = user.teams[0]?.team;

  await Promise.all([
    setSession(user),
    team ? logActivity(team.id, user.id, ActivityAction.sign_in) : Promise.resolve(),
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team, priceId });
  }

  redirect('/translate');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password,
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'owner', // Default role, will be overridden if there's an invitation
    }
  });

  if (!user) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password,
    };
  }

  let team;
  let userRole: string;

  if (inviteId) {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: inviteId,
        email,
        status: 'pending'
      }
    });

    if (invitation) {
      userRole = invitation.role;

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' }
      });

      await logActivity(invitation.teamId, user.id, ActivityAction.accept_invitation);

      team = await prisma.team.findUnique({
        where: { id: invitation.teamId }
      });
    } else {
      return { error: 'Invalid or expired invitation.', email, password };
    }
  } else {
    team = await prisma.team.create({
      data: {
        name: `${email}'s Team`,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      }
    });

    if (!team) {
      return {
        error: 'Failed to create team. Please try again.',
        email,
        password,
      };
    }

    userRole = 'owner';
    await logActivity(team.id, user.id, ActivityAction.create_team);
  }

  if (team) {
    await Promise.all([
      prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: userRole
        }
      }),
      logActivity(team.id, user.id, ActivityAction.sign_up),
      setSession(user)
    ]);
  }

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team, priceId });
  }

  redirect('/translate');
});

export async function signOut() {
  const user = await getUser();
  if (!user) return;
  
  const userWithTeam = await getUserWithTeam(user.id);
  if (userWithTeam) {
    await logActivity(userWithTeam.teamId, user.id, ActivityAction.sign_out);
  }
  (await cookies()).delete('session');
}

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword } = data;

    if (!user.passwordHash) {
      return {
        error: 'パスワードが設定されていません。',
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      };
    }

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return {
        error: '現在のパスワードが正しくありません。',
        currentPassword,
        newPassword,
        confirmPassword: newPassword,
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

    return { success: 'パスワードを更新しました。' };
  },
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: 'Incorrect password. Account deletion failed.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    if (userWithTeam?.teamId) {
      await logActivity(
        userWithTeam.teamId,
        user.id,
        ActivityAction.delete_account,
      );
    }

    // Soft delete
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `${user.email}-${user.id}-deleted`
      }
    });

    if (userWithTeam?.teamId) {
      await prisma.teamMember.deleteMany({
        where: {
          userId: user.id,
          teamId: userWithTeam.teamId
        }
      });
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  },
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { name, email }
    });

    if (userWithTeam?.teamId) {
      await logActivity(
        userWithTeam.teamId,
        user.id,
        ActivityAction.update_account,
      );
    }

    return { success: 'Account updated successfully.' };
  },
);

const removeTeamMemberSchema = z.object({
  memberId: z.string(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await prisma.teamMember.delete({
      where: {
        id: memberId,
        teamId: userWithTeam.teamId
      }
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityAction.remove_team_member,
    );

    return { success: 'Team member removed successfully' };
  },
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await prisma.user.findFirst({
      where: {
        email,
        teams: {
          some: {
            id: userWithTeam.teamId
          }
        }
      }
    });

    if (existingMember) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        teamId: userWithTeam.teamId,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await prisma.invitation.create({
      data: {
        teamId: userWithTeam.teamId,
        email,
        role,
        invitedBy: user.id,
        status: 'pending',
      }
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityAction.invite_team_member,
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  },
);
