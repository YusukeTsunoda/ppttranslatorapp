import { z } from 'zod';
import { redirect } from 'next/navigation';
import type { users } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/prisma';

async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: users
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData, user as users);
  };
}

export function withAuth<T>(
  action: (data: T, formData: FormData, user: users) => Promise<Response>
) {
  return async (data: T, formData: FormData, user: users) => {
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    return action(data, formData, user);
  };
}

// チーム関連の処理用のミドルウェア
// 注意: Teamモデルが削除されたため、この関数はユーザー情報のみを使用するように修正
export function withTeam(action: (formData: FormData, user: users) => Promise<any>) {
  return async (formData: FormData) => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    return action(formData, user as users);
  };
}
