import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

// 環境変数をデバッグ用に出力
console.log('Middleware初期化時の環境変数:');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('BASE_URL:', process.env.BASE_URL);

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextRequestWithAuth) {
    console.log('===== Middleware実行 =====');
    console.log('Middleware token:', req.nextauth.token ? '存在します' : '存在しません');
    if (req.nextauth.token) {
      console.log('Token詳細:', JSON.stringify(req.nextauth.token, null, 2));
    }
    console.log('Request URL:', req.url);
    console.log('Next URL pathname:', req.nextUrl.pathname);
    console.log('Request headers:', Object.fromEntries(req.headers));
    
    // Cookieの詳細をログ出力
    const cookie = req.headers.get('cookie');
    console.log('Cookie:', cookie);
    
    // セッショントークンの存在確認
    const hasSessionToken = cookie?.includes('next-auth.session-token') || cookie?.includes('__Secure-next-auth.session-token');
    console.log('セッショントークンの存在:', hasSessionToken);
    
    // 認証済みの場合は、そのまま次の処理へ
    if (req.nextauth.token) {
      console.log('認証済み、次の処理へ進みます');
      console.log('Token内容:', JSON.stringify(req.nextauth.token));
      return NextResponse.next();
    }
    
    // 認証されていない場合は、サインインページへリダイレクト
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    console.log('使用するbaseUrl:', baseUrl);
    
    const signInUrl = new URL('/signin', baseUrl);
    const fullCallbackUrl = `${baseUrl}${req.nextUrl.pathname}`;
    signInUrl.searchParams.set('callbackUrl', fullCallbackUrl);
    
    console.log('未認証、リダイレクト先:', signInUrl.toString());
    console.log('設定したcallbackUrl:', fullCallbackUrl);
    console.log('===== Middleware終了 =====');
    
    return NextResponse.redirect(signInUrl);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log('認証チェック開始:');
        console.log('Token存在:', !!token);
        if (token) {
          console.log('Token内容:', JSON.stringify(token));
        }
        console.log('Request path:', req?.nextUrl?.pathname);
        console.log('認証チェック結果:', !!token);
        return !!token;
      }
    },
  }
)

// 保護するパスを指定
export const config = {
  matcher: [
    '/translate/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/history/:path*',
    '/activity/:path*',
    '/integrations/:path*',
    '/dashboard/:path*',
    '/api/protected/:path*'
  ]
};
