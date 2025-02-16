// TODO: 将来的なリファクタリング計画
// 1. プロジェクトルートにauth.tsを作成
// 2. NextAuth.js v４.26.11の新しい設定形式に移行
// 3. auth()関数を使用する実装に更新
// 4. 正しい型定義の導入

// Node.jsランタイムを明示的に指定
// bcryptjsはNode.js APIに依存しているため、Edge Runtimeでは使用できません
export const runtime = 'nodejs';

import NextAuth, { DefaultSession, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { comparePasswords } from "@/lib/auth/password";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("メールアドレスとパスワードが必要です");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            throw new Error("このメールアドレスのユーザーが見つかりません");
          }

          if (!user.passwordHash) {
            throw new Error("パスワードが設定されていません");
          }

          const isValid = await comparePasswords(credentials.password, user.passwordHash);
          if (!isValid) {
            throw new Error("パスワードが正しくありません");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth debug:', code, metadata);
    },
  },
});

export { handler as GET, handler as POST };
