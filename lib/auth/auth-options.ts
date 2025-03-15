import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import { comparePasswords } from '@/lib/auth/password';
import { JWT } from 'next-auth/jwt';

/**
 * セッション有効期限の設定
 */
const SESSION_MAXAGE = 24 * 60 * 60; // 24時間（1日）
const SESSION_UPDATE_AGE = 60 * 60; // 1時間
const TOKEN_REFRESH_MARGIN = 60 * 5; // 5分前に更新

// トークンの有効期限を確認し、必要に応じて更新する
const refreshToken = async (token: JWT): Promise<JWT> => {
  // トークンに有効期限がない場合は更新
  if (!token.exp) {
    token.exp = Math.floor(Date.now() / 1000) + SESSION_MAXAGE;
    token.iat = Math.floor(Date.now() / 1000);
    console.log('Token expiration initialized:', new Date((token.exp as number) * 1000).toISOString());
    return token;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = (token.exp as number) - now;

  // 有効期限が近づいている場合は更新
  if (timeUntilExpiry < TOKEN_REFRESH_MARGIN) {
    console.log('Refreshing token that expires in', timeUntilExpiry, 'seconds');
    
    // ユーザー情報を再確認
    if (token.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: token.email as string }
        });
        
        if (user) {
          // トークンの有効期限を更新
          token.exp = Math.floor(Date.now() / 1000) + SESSION_MAXAGE;
          token.iat = Math.floor(Date.now() / 1000);
          
          // ユーザー情報を更新
          await prisma.user.update({
            where: { id: user.id },
            data: { updatedAt: new Date() }
          });
          
          console.log('Token refreshed, new expiration:', new Date((token.exp as number) * 1000).toISOString());
        } else {
          console.warn('User not found during token refresh:', token.email);
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }
  }
  
  return token;
};

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
        console.log('Authorize関数実行:', { email: credentials?.email });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('認証エラー: 必須フィールドが不足しています');
          throw new Error('メールアドレスとパスワードは必須です');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        console.log('ユーザー検索結果:', { found: !!user });

        if (!user || !user.password) {
          console.log('認証エラー: ユーザーが見つからないか、パスワードが設定されていません');
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        const isValid = await comparePasswords(credentials.password, user.password);
        console.log('パスワード検証結果:', { isValid });
        
        if (!isValid) {
          console.log('認証エラー: パスワードが一致しません');
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        // ログイン成功時の処理
        await prisma.user.update({
          where: { id: user.id },
          data: {
            updatedAt: new Date()
          }
        });
        
        console.log('認証成功:', { userId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.name
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
    async jwt({ token, user, trigger, session }) {
      console.log('JWT Callback実行:', { 
        trigger, 
        hasUser: !!user, 
        hasToken: !!token,
        tokenId: token?.id,
        userId: user?.id
      });
      
      // 初回ログイン時にユーザー情報をトークンに追加
      if (user) {
        console.log('ユーザー情報をトークンに追加:', user.id);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.iat = Math.floor(Date.now() / 1000);
        token.exp = Math.floor(Date.now() / 1000) + SESSION_MAXAGE;
        
        // セキュリティ強化: ユーザーエージェント情報を追加
        if (typeof window !== 'undefined') {
          token.ua = window.navigator.userAgent;
        }
      }
      
      // セッション更新時の処理
      if (trigger === 'update' && session) {
        console.log('セッション更新トリガー:', session);
        if (session.user) {
          token.name = session.user.name;
        }
      }
      
      // トークンのリフレッシュ処理
      const refreshedToken = await refreshToken(token);
      console.log('トークンリフレッシュ後:', { 
        id: refreshedToken.id,
        exp: refreshedToken.exp,
        iat: refreshedToken.iat
      });
      return refreshedToken;
    },
    async session({ session, token }) {
      console.log('Session Callback実行:', { 
        hasToken: !!token, 
        tokenId: token?.id,
        sessionUserId: session?.user?.id
      });
      
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        
        // セッションに有効期限情報を追加
        if (token.exp) {
          session.expires = new Date((token.exp as number) * 1000).toISOString();
          console.log('セッション有効期限設定:', session.expires);
        }
        
        // セキュリティ強化: ユーザーエージェントの検証
        if (typeof window !== 'undefined' && token.ua) {
          const currentUA = window.navigator.userAgent;
          if (currentUA !== token.ua) {
            console.warn('User agent mismatch detected');
            // 本番環境では、ここでセッションを無効化する処理を追加できる
            // 今回はデモのため、警告のみ
          }
        }
      }
      
      console.log('最終的なセッション:', { 
        userId: session?.user?.id, 
        expires: session?.expires 
      });
      return session;
    }
  },
  jwt: {
    // JWTの設定
    maxAge: SESSION_MAXAGE,
  },
  cookies: {
    // Cookieのセキュリティ設定
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAXAGE
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.callback-url`
        : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Host-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
  },
  // CSRF対策を有効化
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
}; 