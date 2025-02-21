// TODO: 将来的なリファクタリング計画
// 1. プロジェクトルートにauth.tsを作成
// 2. NextAuth.js v４.26.11の新しい設定形式に移行
// 3. auth()関数を使用する実装に更新
// 4. 正しい型定義の導入

// Node.jsランタイムを明示的に指定
// bcryptjsはNode.js APIに依存しているため、Edge Runtimeでは使用できません
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { authOptions } from "@/lib/auth/auth-options";
import NextAuth from "next-auth";

const isDevelopment = process.env.NODE_ENV === 'development';

const handler = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間ごとにセッションを更新
  },
  cookies: {
    sessionToken: {
      name: isDevelopment ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: !isDevelopment,
        domain: isDevelopment ? 'localhost' : undefined // ドメイン設定を追加
      }
    },
    callbackUrl: {
      name: isDevelopment ? 'next-auth.callback-url' : '__Secure-next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: !isDevelopment
      }
    },
    csrfToken: {
      name: isDevelopment ? 'next-auth.csrf-token' : '__Host-next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: !isDevelopment
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
