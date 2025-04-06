import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  // セッションを取得
  const token = await getToken({ req: request });

  // パスを取得
  const path = request.nextUrl.pathname;

  // 管理者ページへのアクセスを制限
  if (path.startsWith('/admin')) {
    // セッションがない場合はログインページにリダイレクト
    if (!token) {
      const url = new URL('/signin', request.url);
      url.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(url);
    }

    // 管理者権限をチェック
    try {
      const userId = token.id as string;
      const prisma = new PrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      await prisma.$disconnect();

      // 管理者でない場合は403ページまたはホームページにリダイレクト
      if (!user || user.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/translate', request.url));
      }
    } catch (error) {
      console.error('Admin check error:', error);
      return NextResponse.redirect(new URL('/translate', request.url));
    }
  }

  // 保護されたルートへのアクセス（/signin, /signup, /api/healthを除く）
  if (
    !path.startsWith('/signin') &&
    !path.startsWith('/signup') &&
    !path.startsWith('/api/auth') &&
    !path.startsWith('/_next') &&
    !path.startsWith('/public') &&
    !path.startsWith('/api/health')
  ) {
    if (!token) {
      const url = new URL('/signin', request.url);
      url.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
