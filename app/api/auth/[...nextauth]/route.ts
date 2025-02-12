// TODO: 将来的なリファクタリング計画
// 1. プロジェクトルートにauth.tsを作成
// 2. NextAuth.js v5の新しい設定形式に移行
// 3. auth()関数を使用する実装に更新
// 4. 正しい型定義の導入

import NextAuth from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { signToken } from "@/lib/auth/session";

const prisma = new PrismaClient();

// TODO: 後でauth.tsに移動する設定
// TODO: 正しい型定義を導入する
export const authOptions: any = {
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
    async session({ session, user }: { session: Session; user: User }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: any }) {
      if (account && user) {
        token.userId = user.id;
      }
      return token;
    },
    async signIn({ user, account }: { user: User; account: any }) {
      if (!user?.email || !user?.id) {
        return false;
      }

      try {
        const sessionToken = await signToken({
          user: { id: parseInt(user.id) },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        // セッショントークンをクッキーに設定
        const response = new Response(null, { status: 200 });
        response.headers.set(
          "Set-Cookie",
          `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax`
        );

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
  },
  events: {
    async signOut() {
      // セッショントークンを削除
      const response = new Response(null, { status: 200 });
      response.headers.set(
        "Set-Cookie",
        "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      );
    },
  },
};

// 一時的にNextAuthを使用する実装を維持
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
