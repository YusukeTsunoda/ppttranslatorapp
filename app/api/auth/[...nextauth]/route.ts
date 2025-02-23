import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { prisma } from '@/lib/db/prisma';
import { DefaultSession } from 'next-auth';

// セッション型の拡張
interface CustomSession extends DefaultSession {
    user: {
        id: string;
        email?: string | null;
        name?: string | null;
    } & DefaultSession["user"];
}

declare module "next-auth" {
    interface Session extends CustomSession {}
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('メールアドレスとパスワードを入力してください');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.passwordHash) {
                    throw new Error('メールアドレスまたはパスワードが正しくありません');
                }

                const isPasswordValid = await compare(credentials.password, user.passwordHash);

                if (!isPasswordValid) {
                    throw new Error('メールアドレスまたはパスワードが正しくありません');
                }

                // ユーザー情報を返す際にidを含める
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name
                };
            }
        })
    ],
    pages: {
        signIn: '/signin',
        newUser: '/signup',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30日
    },
    callbacks: {
        // JWTコールバックの修正
        async jwt({ token, user }) {
            // 初回サインイン時にユーザー情報をトークンに保存
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            // デバッグ情報を出力
            console.log('JWT Callback:', {
                tokenId: token.id,
                tokenSub: token.sub,
                userId: user?.id
            });
            return token;
        },
        // セッションコールバックの修正
        async session({ session, token }) {
            // セッションにユーザー情報を追加
            if (session?.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            // デバッグ情報を出力
            console.log('Session Callback:', {
                sessionUser: session?.user,
                tokenId: token.id,
                hasUserId: !!session?.user?.id
            });
            return session;
        }
    },
    // セキュリティ設定
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 