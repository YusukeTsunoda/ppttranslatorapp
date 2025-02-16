import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Node.jsランタイムを使用することを明示
export const runtime = 'nodejs';

export default withAuth(
  async function middleware(req) {
    try {
      const token = await getToken({ req: req as any })
      const path = req.nextUrl.pathname;

      // APIルートの保護
      if (path.startsWith('/api/') && !token) {
        return new NextResponse(
          JSON.stringify({ error: "認証が必要です" }),
          { 
            status: 401, 
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, max-age=0',
            } 
          }
        );
      }

      // HTMLレスポンスの場合はContent-Typeを設定
      if (path.endsWith('/')) {
        const response = NextResponse.next()
        response.headers.set('Content-Type', 'text/html; charset=utf-8')
        return response
      }

      return NextResponse.next({
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    } catch (error) {
      console.error('Middleware error:', error);
      return new NextResponse(
        JSON.stringify({ error: "サーバーエラーが発生しました" }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0',
          } 
        }
      );
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        try {
          const path = req.nextUrl.pathname;
          
          // 認証が不要なパス
          if (
            path === '/' ||
            path === '/sign-in' ||
            path === '/sign-up' ||
            path === '/api/auth/signin' ||
            path === '/api/auth/signup' ||
            path.startsWith('/api/auth/')
          ) {
            return true;
          }

          // その他のパスは認証が必要
          return !!token;
        } catch (error) {
          console.error('Authorization error:', error);
          return false;
        }
      },
    },
  }
);

export const config = {
  matcher: [
    '/translate/:path*',
    '/teams/:path*',
    '/settings/:path*',
    '/api/:path*',
  ],
};
