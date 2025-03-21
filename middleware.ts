import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextRequestWithAuth) {
    // 認証済みの場合は、そのまま次の処理へ
    if (req.nextauth.token) {
      return NextResponse.next();
    }

    // 認証されていない場合は、サインインページへリダイレクト
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const signInUrl = new URL('/signin', baseUrl);
    const fullCallbackUrl = `${baseUrl}${req.nextUrl.pathname}`;
    signInUrl.searchParams.set('callbackUrl', fullCallbackUrl);

    return NextResponse.redirect(signInUrl);
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
  },
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
    '/api/protected/:path*',
  ],
};
