import { NextRequest, NextResponse } from 'next/server';

// APIリクエストを処理する前の処理を行うラッパー関数
export function withAPILogging<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  route: string
): (...funcArgs: Parameters<T>) => Promise<NextResponse> {
  return async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const requestInfo = extractRequestInfo(args[0] as NextRequest);
    
    console.log(`[API:${route}] リクエスト開始:`, {
      route,
      method: requestInfo.method,
      path: requestInfo.path,
      query: requestInfo.query,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await handler(...args);
      
      const endTime = Date.now();
      console.log(`[API:${route}] リクエスト完了:`, {
        route,
        method: requestInfo.method,
        path: requestInfo.path,
        statusCode: response.status,
        duration: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      const endTime = Date.now();
      console.error(`[API:${route}] エラー発生:`, {
        route,
        method: requestInfo.method,
        path: requestInfo.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
      });
      
      // エラーに対するレスポンスを返す
      return new NextResponse(
        JSON.stringify({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : String(error))
            : 'サーバーエラーが発生しました'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  };
}

// NextRequestから必要な情報を抽出するヘルパー関数
function extractRequestInfo(request: NextRequest) {
  return {
    method: request.method,
    path: request.nextUrl.pathname,
    query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries()),
  };
}

// アプリケーション起動時にAPI構築状況をログに記録
export function logAPIBuildStatus() {
  console.log('[API:BUILD] APIルートのビルド状況:', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    buildId: process.env.BUILD_ID || 'unknown',
    isServer: process.env.BUILD_IS_SERVER === 'true',
    isDev: process.env.BUILD_IS_DEV === 'true',
  });
} 