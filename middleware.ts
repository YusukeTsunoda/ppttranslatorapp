import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ミドルウェアのランタイムを指定しない（デフォルトでEdgeになる）

export async function middleware(request: NextRequest) {
  // 必要最小限のログのみ出力
  const path = request.nextUrl.pathname;
  
  // セッショントークンの存在をチェック
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // 保護されたルートへのアクセス
  if (
    !path.startsWith('/signin') &&
    !path.startsWith('/signup') &&
    !path.startsWith('/api/auth') &&
    !path.startsWith('/_next') &&
    !path.startsWith('/public') &&
    !path.startsWith('/api/health') &&
    !path.startsWith('/api/static') &&
    path !== '/'
  ) {
    // セッショントークンがない場合はサインインページにリダイレクト
    if (!sessionToken) {
      const url = new URL('/signin', request.url);
      url.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(url);
    }
    
    // 管理者ページへのアクセス制限
    if (path.startsWith('/admin')) {
      // JWTトークンからユーザー情報を取得
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      console.log('[middleware] 管理者ページアクセスチェック:', token);
      
      // 管理者権限がない場合は翻訳ページにリダイレクト
      if (!token || token.role !== 'ADMIN') {
        console.log('[middleware] 管理者権限なし - 翻訳ページにリダイレクト');
        return NextResponse.redirect(new URL('/translate', request.url));
      }
      
      console.log('[middleware] 管理者権限確認OK');
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
