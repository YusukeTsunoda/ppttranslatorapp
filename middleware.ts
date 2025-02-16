import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Node.jsランタイムを使用することを明示
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保護されたルートのパターン
  const protectedPaths = ['/translate', '/profile', '/settings', '/history', '/integrations'];
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path));

  // 認証関連のパス
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 認証済みユーザーが認証ページにアクセスした場合
  if (isAuthPath) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      return NextResponse.redirect(new URL('/translate', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
