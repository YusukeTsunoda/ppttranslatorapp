import { Prisma, User, File, TranslationHistory, ActivityLog } from '@prisma/client';
import { prisma, userPrisma, filePrisma, translationPrisma, activityPrisma, getPrismaForModel } from './prisma';

/**
 * 最適化されたデータベースアクセスユーティリティ
 * 
 * このファイルでは、Prismaクライアントを使用したデータベース操作を
 * 効率的に行うためのユーティリティ関数を提供します。
 * 最適化の主な方針:
 * 1. 必要なフィールドのみをselect（オーバーフェッチの削減）
 * 2. 適切なインデックスを使用
 * 3. N+1問題の回避（関連データの一括取得）
 * 4. モデル特化型クライアントの使用
 */

// ユーザー関連の最適化された操作
export const userUtils = {
  // ユーザー取得時に必要最小限のフィールドのみをselect
  async getUserById(userId: string, includeCredits = false): Promise<Partial<User> | null> {
    return userPrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        ...(includeCredits ? { credits: true } : {}),
      },
    });
  },

  // リクエスト制限付きのユーザー一覧取得
  async getUsers(page = 1, limit = 10, includeActivityCount = false): Promise<{ users: Partial<User>[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      userPrisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          credits: true,
          createdAt: true,
          ...(includeActivityCount ? {
            _count: {
              select: {
                ActivityLog: true,
                TranslationHistory: true,
              }
            }
          } : {}),
        },
      }),
      userPrisma.user.count(),
    ]);

    return { users, total };
  },
};

// ファイル操作関連ユーティリティ
export const fileUtils = {
  // ファイル情報取得（軽量バージョン）
  async getFileInfo(fileId: string): Promise<Partial<File> | null> {
    return filePrisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        originalName: true,
        status: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },
    });
  },

  // ユーザー別ファイル一覧（ページネーション対応）
  async getUserFiles(userId: string, page = 1, limit = 10): Promise<{ files: Partial<File>[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [files, total] = await Promise.all([
      filePrisma.file.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          status: true,
          fileSize: true,
          createdAt: true,
        },
      }),
      filePrisma.file.count({ where: { userId } }),
    ]);

    return { files, total };
  },
};

// 翻訳履歴関連ユーティリティ
export const translationUtils = {
  // 翻訳履歴取得（軽量バージョン）
  async getTranslationHistory(userId: string, page = 1, limit = 10): Promise<{ histories: Partial<TranslationHistory>[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [histories, total] = await Promise.all([
      translationPrisma.translationHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          sourceLang: true,
          targetLang: true,
          model: true,
          creditsUsed: true,
          status: true,
          pageCount: true,
          thumbnailPath: true,
          file: {
            select: {
              originalName: true,
              fileSize: true,
            },
          },
        },
      }),
      translationPrisma.translationHistory.count({ where: { userId } }),
    ]);

    return { histories, total };
  },

  // 詳細な翻訳履歴取得（単一ID）
  async getTranslationHistoryById(id: string): Promise<Partial<TranslationHistory> | null> {
    return translationPrisma.translationHistory.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        sourceLang: true,
        targetLang: true,
        model: true,
        creditsUsed: true,
        status: true,
        pageCount: true,
        thumbnailPath: true,
        processingTime: true,
        fileId: true,
        translatedFileKey: true,
        file: {
          select: {
            originalName: true,
            fileSize: true,
            mimeType: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  },
};

// アクティビティログ関連ユーティリティ
export const activityUtils = {
  // ユーザーのアクティビティログ取得
  async getUserActivity(userId: string, page = 1, limit = 10): Promise<{ logs: Partial<ActivityLog>[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      activityPrisma.activityLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
        },
      }),
      activityPrisma.activityLog.count({ where: { userId } }),
    ]);

    return { logs, total };
  },

  // 効率的なアクティビティログ記録
  async logActivity(userId: string, type: string, description: string, metadata?: any): Promise<void> {
    await activityPrisma.activityLog.create({
      data: {
        userId,
        type,
        description,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
      select: { id: true }, // 最小限のデータのみ返す
    });
  },
};

// バッチ操作のためのトランザクション関数
export async function withTransaction<T>(
  modelName: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const client = getPrismaForModel(modelName);
  return client.$transaction(callback);
}

export default {
  userUtils,
  fileUtils,
  translationUtils,
  activityUtils,
  withTransaction,
}; 