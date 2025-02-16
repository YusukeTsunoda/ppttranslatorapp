import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  createDatabaseError,
  createValidationError,
  createNotFoundError,
} from '@/lib/utils/error-handler';

export const ActivityAction = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  SIGN_OUT: 'sign_out',
  CREATE_TEAM: 'create_team',
  ACCEPT_INVITATION: 'accept_invitation',
  INVITE_TEAM_MEMBER: 'invite_team_member',
  REMOVE_TEAM_MEMBER: 'remove_team_member',
  UPDATE_ACCOUNT: 'update_account',
  UPDATE_PASSWORD: 'update_password',
  DELETE_ACCOUNT: 'delete_account',
} as const;

export type ActivityAction = typeof ActivityAction[keyof typeof ActivityAction];

export interface ActivityLogData {
  teamId: string;
  userId: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
}

// メモリキャッシュの実装
const teamCache = new Map<string, { id: string; expiresAt: number }>();
const userCache = new Map<string, { id: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

async function getTeamFromCache(teamId: string) {
  const cached = teamCache.get(teamId);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id };
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team) {
    teamCache.set(teamId, {
      id: team.id,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }
  return team;
}

async function getUserFromCache(userId: string) {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { id: cached.id };
  }

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
  teamId,
  userId,
  action,
  metadata
}: ActivityLogData) {
  if (!teamId || !userId || !action) {
    throw createValidationError('必須パラメータが不足しています。');
  }

  try {
    // キャッシュを使用してチームとユーザーの存在確認
    const [team, user] = await Promise.all([
      getTeamFromCache(teamId),
      getUserFromCache(userId)
    ]);

    if (!team) {
      throw createNotFoundError('指定されたチームが見つかりません。');
    }

    if (!user) {
      throw createNotFoundError('指定されたユーザーが見つかりません。');
    }

    const ipAddress = process.env.NODE_ENV === 'development' 
      ? '127.0.0.1' 
      : // 本番環境では適切なIPアドレス取得ロジックを実装
        '0.0.0.0';

    await prisma.activityLog.create({
      data: {
        teamId,
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

export async function getTeamActivityLogs(teamId: string, limit = 50, cursor?: string) {
  if (!teamId) {
    throw createValidationError('チームIDが指定されていません。');
  }

  try {
    // キャッシュを使用してチームの存在確認
    const team = await getTeamFromCache(teamId);

    if (!team) {
      throw createNotFoundError('指定されたチームが見つかりません。');
    }

    // カーソルベースのページネーションを実装
    const logs = await prisma.activityLog.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      ...(cursor ? {
        cursor: {
          id: cursor,
        },
        skip: 1, // カーソルの次のアイテムから取得
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
      include: {
        team: {
          select: {
            name: true,
          },
        },
      },
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