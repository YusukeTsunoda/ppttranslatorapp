import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { signToken } from "@/lib/auth/session";

const prisma = new PrismaClient();

const handler = NextAuth({
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.userId = user.id;
      }
      return token;
    },
    async signIn({ user, account }) {
      if (!user?.email) {
        return false;
      }

      try {
        const sessionToken = await signToken({
          userId: user.id,
          email: user.email,
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
    async signOut({ token }) {
      // セッショントークンを削除
      const response = new Response(null, { status: 200 });
      response.headers.set(
        "Set-Cookie",
        "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      );
    },
  },
});

export { handler as GET, handler as POST };
