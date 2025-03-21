import 'next-auth';
import { User as PrismaUser } from '@prisma/client';
import { SessionError } from '@/lib/auth/errors';

declare module 'next-auth' {
  /**
   * PrismaUserからパスワードハッシュを除外し、セッション関連のプロパティを追加
   */
  interface User extends Omit<PrismaUser, 'passwordHash'> {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
    lastLogin: Date | null;
    sessionExpires: Date | null;
    accessTokenExpires: number;
  }

  /**
   * セッション情報の型定義
   */
  interface Session {
    user: {
      id: string;
      email: string | null;
      name: string | null;
      role: string;
      lastLogin: Date | null;
      accessTokenExpires: number;
    };
    error?: SessionError;
  }

  /**
   * JWTトークンの型定義
   */
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    lastLogin: Date | null;
    sessionExpires: Date | null;
    accessTokenExpires: number;
    error?: SessionError;
  }
}
