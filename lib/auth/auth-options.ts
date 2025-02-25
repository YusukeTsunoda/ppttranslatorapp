import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import { comparePasswords } from '@/lib/auth/password';
import { User } from '@prisma/client';

/**
 * セッション有効期限の設定
 */
const SESSION_MAXAGE = 24 * 60 * 60; // 24時間（1日）
const SESSION_UPDATE_AGE = 60 * 60; // 1時間

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" }
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('メールアドレスとパスワードは必須です');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        const isValid = await comparePasswords(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        // ログイン成功時の処理
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLogin: new Date(),
            sessionExpires: new Date(Date.now() + SESSION_MAXAGE * 1000)
          }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.lastLogin,
          sessionExpires: user.sessionExpires
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAXAGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: {
    signIn: '/signin',
    error: '/error',
    newUser: '/signup'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.lastLogin = user.lastLogin;
        token.sessionExpires = user.sessionExpires;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        (session.user as any).role = token.role as string;
        (session.user as any).lastLogin = token.lastLogin as Date | null;
        (session.user as any).sessionExpires = token.sessionExpires as Date | null;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
}; 