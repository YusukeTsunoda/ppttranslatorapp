import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { CredentialsProvider } from 'next-auth/providers';
import { prisma } from '@/lib/prisma';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        try {
          // データベース接続情報のデバッグ出力
          console.log('Database URL format check:', {
            hasProtocol: process.env.DATABASE_URL?.startsWith('postgresql://') || 
                        process.env.DATABASE_URL?.startsWith('postgres://'),
            urlLength: process.env.DATABASE_URL?.length
          });

          const user = await prisma.user.findUnique({
            where: {
              email: credentials?.email
            }
          });

          // ユーザー検索結果のデバッグ出力
          console.log('User lookup result:', {
            found: !!user,
            timestamp: new Date().toISOString()
          });

          return user;
        } catch (error) {
          // エラー詳細のデバッグ出力
          console.error('Authorization error:', {
            message: error.message,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      }
    })
  ]
});

export { handler as GET, handler as POST }; 