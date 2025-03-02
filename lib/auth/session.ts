import { getServerSession } from 'next-auth';
import type { DefaultSession, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import { authOptions } from './auth-options';
import { compare } from "bcrypt";
import { sign, verify } from "jsonwebtoken";

// Node.jsランタイムを明示的に指定
// bcryptjsはNode.js APIに依存しているため、Edge Runtimeでは使用できません
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function getSession() {
  return getServerSession(authOptions);
}

// This function is no longer necessary as NextAuth.js handles session management automatically
export const setSession = async (user: any) => {
  // Implementation details...
};

export async function comparePasswords(plainText: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  // パスワード比較の実装例
  return plainText === hash; // 実際は bcrypt などを使用すべきです
}

export async function hashPassword(password: string): Promise<string> {
  // パスワードハッシュの実装例
  return password; // 実際は bcrypt などを使用してください
}

type SessionType = {
  user: {
    id: string;
    // その他のプロパティ
  };
  // 他のセッション情報
};

export async function verifyToken(token: string): Promise<SessionType | null> {
  // トークンの検証ロジックを実装
  // 例:
  if (tokenIsValid(token)) {
    const session: SessionType = {
      user: {
        id: "example-user-id",
        // 他のプロパティ
      },
      // 他のセッション情報
    };
    return session;
  }
  return null;
}

function tokenIsValid(token: string): boolean {
  // トークンの検証ロジック（仮実装）
  return token === "valid-token";
}
