import { Prisma, PrismaClient } from '@prisma/client';

/**
 * 列挙型の定義
 */
export const ActivityAction = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  SIGN_OUT: 'sign_out',
  UPDATE_ACCOUNT: 'update_account',
  UPDATE_PASSWORD: 'update_password',
  DELETE_ACCOUNT: 'delete_account',
  FILE_UPLOAD: 'file_upload',
  TRANSLATION: 'translation',
  DOWNLOAD: 'download',
  SETTINGS_CHANGE: 'settings_change',
} as const;

// 型をこれだけにして重複を避ける
type ActivityActionType = (typeof ActivityAction)[keyof typeof ActivityAction];
export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'trial';

/**
 * モデルの型定義
 */
export type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: ActivityActionType; // 型名変更
  ipAddress: string;
  metadata: any;
  createdAt: Date;
};

export type Translation = {
  id: string;
  slides: any;
  translations: any;
  currentSlide: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Subscription = {
  id: string;
  userId: string;
  status: 'active' | 'canceled' | 'past_due';
  priceId: string;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Prismaクライアントの型
 */
export type PrismaDB = PrismaClient;

// Prisma型のエクスポート
export type PrismaUser = Prisma.UserGetPayload<{}>;
export type PrismaTranslation = Prisma.TranslationGetPayload<{}>;
