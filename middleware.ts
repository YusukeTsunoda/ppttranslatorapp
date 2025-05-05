import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    
    // 管理者ページへのアクセス制限は、APIルート側で行う
    // ここではセッションの存在のみをチェック
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
