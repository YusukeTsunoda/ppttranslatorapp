import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Node.jsランタイムを使用することを明示
export const runtime = 'nodejs';

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

const prisma = new PrismaClient();

export const config = {
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
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ user, account }: { user: any; account: any }) {
      if (!account || !user) {
        return false;
      }

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email ?? undefined },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Error checking if user exists: ", error);
        return false;
      }
    },
  },
  events: {
    async signOut() {
      try {
        // ログアウト時の処理をここに実装
      } catch (error) {
        console.error("Error during signOut: ", error);
      }
    },
  },
};
