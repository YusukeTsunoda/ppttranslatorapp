'use server';

import { z } from 'zod';
import { comparePasswords, hashPassword, setSession, getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/queries';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';
import { ActivityAction } from '@/lib/utils/activity-logger';

async function logActivity(userId: string, action: ActivityAction) {
  await prisma.activityLog.create({
    data: {
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
    where: { email }
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

  await Promise.all([
    setSession(user),
    logActivity(user.id, ActivityAction.sign_in)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo) {
    redirect(redirectTo);
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const { email, password, name } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return {
      error: 'Email already exists. Please try a different email.',
      email,
      password,
      name,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name,
    }
  });

  await Promise.all([
    logActivity(user.id, ActivityAction.sign_up),
    setSession(user)
  ]);

  redirect('/dashboard');
});

export const signOut = validatedActionWithUser(z.object({}), async (_, __, user) => {
  await logActivity(user.id, ActivityAction.sign_out);
  (await cookies()).delete('session');
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    'New password must be different from current password'
  );

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        error: 'Current password is incorrect.',
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
      },
    });

    return { success: true };
  }
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
      return {
        error: 'Password is incorrect.',
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
      },
    });

    await logActivity(user.id, ActivityAction.delete_account);

    (await cookies()).delete('session');
    redirect('/');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().min(3).max(255),
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;

    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return {
          error: 'Email already exists.',
        };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name, email },
    });

    await logActivity(user.id, ActivityAction.update_account);

    return { success: true };
  }
);
