// TODO: 将来的なリファクタリング計画
// 1. プロジェクトルートにauth.tsを作成
// 2. NextAuth.js v5の新しい設定形式に移行
// 3. auth()関数を使用する実装に更新
// 4. 正しい型定義の導入

import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

const prisma = new PrismaClient();

// 認証設定
const config = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: any; account?: any }) {
      if (account && user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// NextAuth.jsハンドラーの作成とエクスポート
const handler = NextAuth(config);
export { handler as GET, handler as POST };
