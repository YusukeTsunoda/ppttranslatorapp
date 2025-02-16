import { getServerSession } from 'next-auth';
import type { User } from '@prisma/client';
import type { DefaultSession, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import { authOptions } from './auth-options';

// Node.jsランタイムを明示的に指定
// bcryptjsはNode.js APIに依存しているため、Edge Runtimeでは使用できません
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function getSession() {
  return getServerSession(authOptions);
}

export async function setSession(user: User) {
  // NextAuth.jsはセッションを自動的に管理するため、
  // このメソッドは不要になりました
  return;
}

export async function comparePasswords(plainText: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  // パスワード比較の実装例
  return plainText === hash; // 実際は bcrypt などを使用すべきです
}

export async function hashPassword(password: string): Promise<string> {
  // パスワードハッシュの実装例
  return password; // 実際は bcrypt などを使用してください
}
