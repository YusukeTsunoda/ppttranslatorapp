import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from "next-auth"
import type { User } from "next-auth"

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // データベース接続情報のデバッグ出力
          console.log('Database URL format check:', {
            hasProtocol: process.env.DATABASE_URL?.startsWith('postgresql://') || 
                        process.env.DATABASE_URL?.startsWith('postgres://'),
            urlLength: process.env.DATABASE_URL?.length
          });

          const prismaUser = await prisma.user.findUnique({
            where: {
              email: credentials?.email
            }
          });

          // ユーザー検索結果のデバッグ出力
          console.log('User lookup result:', {
            found: !!prismaUser,
            timestamp: new Date().toISOString()
          });

          if (!prismaUser) {
            return null;
          }

          // NextAuth.jsのUser型に変換
          const user: User = {
            ...prismaUser,
            accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24時間後に期限切れ
          };

          return user;
        } catch (error: any) {
          // エラー詳細のデバッグ出力
          console.error('Authorization error:', {
            message: error.message,
            timestamp: new Date().toISOString()
          });
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/signin',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 