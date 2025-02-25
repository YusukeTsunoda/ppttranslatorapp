import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const token = request.nextauth.token;

    // セッションエラーがある場合はサインインページにリダイレクト
    if (token?.error) {
      console.log('Auth error detected:', token.error);
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set('error', token.error as string);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    // セッション有効期限切れの場合はサインインページにリダイレクト
    if (token?.sessionExpires && new Date(token.sessionExpires as string | number | Date) < new Date()) {
      console.log('Session expired. Current time:', new Date().toISOString(), 'Session expires:', new Date(token.sessionExpires as string | number | Date).toISOString());
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set('error', 'SessionExpiredError');
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/signin'
    }
  }
);

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
