import { getServerSession } from 'next-auth';
import type { DefaultSession, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { authOptions } from './auth-options';
import { randomBytes } from 'crypto';

// Node.jsランタイムを明示的に指定
// bcryptjsはNode.js APIに依存しているため、Edge Runtimeでは使用できません
export const runtime = 'nodejs';

const prisma = new PrismaClient();

// セッションのセキュリティ設定
export const SESSION_OPTIONS = {
  maxAge: 30 * 24 * 60 * 60, // 30日間（秒単位）
  updateAge: 24 * 60 * 60, // 1日ごとに更新（秒単位）
  cookieName: 'next-auth.session-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
};

/**
 * サーバーサイドでセッションを取得する
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * セッションが有効かどうかを検証する
 */
export function isValidSession(session: Session | null): boolean {
  if (!session) return false;
  
  // セッションの有効期限を確認
  const expiryDate = session.expires ? new Date(session.expires) : null;
  if (expiryDate && expiryDate < new Date()) {
    return false;
  }
  
  // ユーザー情報が存在するか確認
  if (!session.user || !session.user.email) {
    return false;
  }
  
  return true;
}

/**
 * パスワードを比較する
 */
export async function comparePasswords(plainText: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  
  try {
    // bcryptを使用して安全にパスワードを比較
    return await bcrypt.compare(plainText, hash);
  } catch (error) {
    console.error('パスワード比較エラー:', error);
    return false;
  }
}

/**
 * パスワードをハッシュ化する
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // 強度10のソルトを生成し、パスワードをハッシュ化
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('パスワードハッシュ化エラー:', error);
    throw new Error('パスワードの処理中にエラーが発生しました');
  }
}

/**
 * CSRFトークンを生成する
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * CSRFトークンを検証する
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  
  // 定数時間比較を使用してタイミング攻撃を防止
  return timingSafeEqual(token, storedToken);
}

/**
 * 定数時間比較（タイミング攻撃対策）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

type SessionType = {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
  expires: string;
  csrfToken?: string;
};

/**
 * JWTトークンを検証する
 */
export async function verifyToken(token: string): Promise<SessionType | null> {
  if (!token) return null;
  
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not defined');
      return null;
    }
    
    // トークンを検証
    const decoded = verify(token, secret) as any;
    
    // トークンの有効期限を確認
    const expiryDate = decoded.exp ? new Date(decoded.exp * 1000) : null;
    if (expiryDate && expiryDate < new Date()) {
      return null;
    }
    
    // セッション情報を構築
    const session: SessionType = {
      user: {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
      expires: expiryDate ? expiryDate.toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      csrfToken: decoded.csrfToken,
    };
    
    return session;
  } catch (error) {
    console.error('トークン検証エラー:', error);
    return null;
  }
}

/**
 * ユーザーエージェントを検証する（セッションハイジャック対策）
 */
export function validateUserAgent(currentUA: string, storedUA: string): boolean {
  if (!currentUA || !storedUA) return false;
  
  // ユーザーエージェントの主要部分を抽出して比較
  const currentBrowser = extractBrowserInfo(currentUA);
  const storedBrowser = extractBrowserInfo(storedUA);
  
  return currentBrowser === storedBrowser;
}

/**
 * ユーザーエージェントから主要なブラウザ情報を抽出
 */
function extractBrowserInfo(userAgent: string): string {
  // 主要なブラウザ情報を抽出（Chrome、Firefox、Safariなど）
  const match = userAgent.match(/(chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i);
  return match ? `${match[1]}-${match[2]}` : userAgent.substring(0, 50);
}
