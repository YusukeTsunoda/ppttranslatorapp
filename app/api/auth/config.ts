import { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Node.jsランタイムを使用することを明示
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export const authOptions: NextAuthConfig = {
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
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ user, account }) {
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
