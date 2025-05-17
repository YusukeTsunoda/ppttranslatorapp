import { z } from 'zod';
import { Language, TranslationStatus, UserRole, FileStatus, BatchJobStatus } from '@prisma/client';

// 基本的なフィルターのスキーマ定義
const baseFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  startDate: z.string().optional().refine(
    val => !val || !isNaN(Date.parse(val)),
    { message: '有効な日付形式で指定してください' }
  ),
  endDate: z.string().optional().refine(
    val => !val || !isNaN(Date.parse(val)),
    { message: '有効な日付形式で指定してください' }
  )
});

// 翻訳履歴フィルタリングスキーマ
export const translationHistoryFilterSchema = baseFilterSchema.extend({
  status: z.nativeEnum(TranslationStatus).optional(),
  sourceLang: z.nativeEnum(Language).optional(),
  targetLang: z.nativeEnum(Language).optional(),
  sort: z.enum([
    'createdAt', 'updatedAt', 'pageCount', 'status', 'creditsUsed',
    'sourceLang', 'targetLang', 'model', 'fileSize', 'processingTime',
    'originalFileName'
  ]).default('createdAt'),
  tags: z.array(z.string()).optional(),
  minPageCount: z.coerce.number().int().nonnegative().optional(),
  maxPageCount: z.coerce.number().int().nonnegative().optional(),
  minCreditsUsed: z.coerce.number().int().nonnegative().optional(),
  maxCreditsUsed: z.coerce.number().int().nonnegative().optional(),
  minFileSize: z.coerce.number().int().nonnegative().optional(),
  maxFileSize: z.coerce.number().int().nonnegative().optional(),
});

// ファイルフィルタリングスキーマ
export const fileFilterSchema = baseFilterSchema.extend({
  status: z.nativeEnum(FileStatus).optional(),
  mimeType: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'fileSize', 'originalName', 'status']).default('createdAt'),
  minFileSize: z.coerce.number().int().nonnegative().optional(),
  maxFileSize: z.coerce.number().int().nonnegative().optional(),
});

// ユーザーフィルタリング用スキーマ（管理者向け）
export const userFilterSchema = baseFilterSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  emailVerified: z.boolean().optional(),
  sort: z.enum(['name', 'email', 'createdAt', 'updatedAt', 'credits', 'role']).default('createdAt'),
  minCredits: z.coerce.number().int().nonnegative().optional(),
  maxCredits: z.coerce.number().int().nonnegative().optional(),
});

// アクティビティログフィルタリングスキーマ
export const activityLogFilterSchema = baseFilterSchema.extend({
  type: z.string().optional(),
  userId: z.string().optional(),
  sort: z.enum(['createdAt', 'type', 'userId']).default('createdAt'),
});

// フィルタリングパラメータからPrismaのwhere条件を構築するユーティリティ
export type FilterParams = z.infer<typeof baseFilterSchema>;
export type TranslationHistoryFilterParams = z.infer<typeof translationHistoryFilterSchema>;
export type FileFilterParams = z.infer<typeof fileFilterSchema>;
export type UserFilterParams = z.infer<typeof userFilterSchema>;
export type ActivityLogFilterParams = z.infer<typeof activityLogFilterSchema>;

// サニタイズ関数（SQLインジェクション対策）
export const sanitizeString = (str: string): string => {
  if (!str) return '';
  // 基本的なサニタイズ（特殊文字を削除）
  return str.replace(/[;'"\\%_]/g, '');
};

// エラーメッセージのローカライズ
export const errorMessages = {
  invalidPage: '無効なページ番号です',
  invalidLimit: '無効な制限数です',
  invalidSortOrder: '無効なソート順序です',
  invalidSortKey: '無効なソートキーです',
  invalidDateFormat: '無効な日付形式です',
  invalidParameter: (param: string) => `無効なパラメータです: ${param}`,
  unauthorized: '認証が必要です',
  forbidden: 'アクセス権限がありません',
}; 