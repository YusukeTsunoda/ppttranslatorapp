/*
import { prisma } from '@/lib/db/prisma';
import { Prisma, ActivityAction } from '@prisma/client';
import {
  createDatabaseError,
  createValidationError,
  createNotFoundError,
} from '@/lib/utils/error-handler';

export { ActivityAction };

export interface ActivityLogData {
  userId: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
}

// メモリキャッシュの実装
const userCache = new Map<string, { id: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

async function getUserFromCache(userId: string) {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id };
  }

  // @ts-ignore - Prismaの型定義と実際のプロパティの間に不一致があるため
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    userCache.set(userId, {
      id: user.id,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }
  return user;
}

export async function logActivity({
  userId,
  action,
  metadata
}: ActivityLogData) {
  if (!userId || !action) {
    throw createValidationError('必須パラメータが不足しています。');
  }

  try {
    // キャッシュを使用してユーザーの存在確認
    const user = await getUserFromCache(userId);

    if (!user) {
      throw createNotFoundError('指定されたユーザーが見つかりません。');
    }

    const ipAddress = process.env.NODE_ENV === 'development' 
      ? '127.0.0.1' 
      : // 本番環境では適切なIPアドレス取得ロジックを実装
        '0.0.0.0';

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        ipAddress,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('prisma')) {
        throw createDatabaseError('アクティビティログの保存に失敗しました。');
      }
      throw error;
    }
    throw error;
  }
}

export async function getUserActivityLogs(userId: string, limit = 50, cursor?: string) {
  if (!userId) {
    throw createValidationError('ユーザーIDが指定されていません。');
  }

  try {
    // キャッシュを使用してユーザーの存在確認
    const user = await getUserFromCache(userId);

    if (!user) {
      throw createNotFoundError('指定されたユーザーが見つかりません。');
    }

    // カーソルベースのページネーションを実装
    const logs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      ...(cursor ? {
        cursor: {
          id: cursor,
        },
        skip: 1,
      } : {}),
    });

    const nextCursor = logs.length === limit ? logs[logs.length - 1].id : undefined;

    return {
      logs,
      nextCursor,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('prisma')) {
        throw createDatabaseError('アクティビティログの取得に失敗しました。');
      }
      throw error;
    }
    throw error;
  }
}
*/

// ActivityLogモデルが存在しないため、一時的にダミー実装を提供
import { Prisma } from '@prisma/client';

export enum ActivityAction {
  sign_in = 'sign_in',
  sign_up = 'sign_up',
  sign_out = 'sign_out',
  update_account = 'update_account',
  update_password = 'update_password',
  delete_account = 'delete_account',
  file_upload = 'file_upload',
  translation = 'translation',
  download = 'download',
  settings_change = 'settings_change',
  file_access = 'file_access',
}

export interface ActivityLogData {
  userId: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
}

export async function logActivity(data: ActivityLogData): Promise<void> {
  console.log('Activity logged (dummy):', data);
  return;
}

export async function getUserActivityLogs(userId: string, limit = 50, cursor?: string) {
  console.log('Get user activity logs (dummy):', { userId, limit, cursor });
  return {
    logs: [],
    nextCursor: undefined,
  };
}
