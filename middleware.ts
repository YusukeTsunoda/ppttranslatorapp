import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    console.log(req.nextauth.token)
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
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
