// TODO: 将来的なリファクタリング計画
// 1. プロジェクトルートにauth.tsを作成
// 2. NextAuth.js v４.26.11の新しい設定形式に移行
// 3. auth()関数を使用する実装に更新
// 4. 正しい型定義の導入

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Node.jsランタイムを明示的に指定
export const config = {
  runtime: 'nodejs'
};

const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      try {
        if (session?.user && token?.sub) {
          session.user.id = token.sub;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
  },
});

export { handler as GET, handler as POST };
