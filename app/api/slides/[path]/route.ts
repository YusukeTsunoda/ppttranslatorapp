// Node.jsランタイムを明示的に指定
// ファイルシステム操作を含むため、Edge Runtimeでは動作しません
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { withAPILogging } from '@/lib/utils/api-logging';

// パスの検証関数
const validatePath = (path: string): boolean => {
  // パスに '..' が含まれていないことを確認（ディレクトリトラバーサル対策）
  if (path.includes('..')) return false;

  // パスの形式を検証（fileIdのみを許可）
  const pathPattern = /^[\w-]+$/;
  if (!pathPattern.test(path)) return false;

  return true;
};

/**
 * 旧形式のパス `/api/slides/{fileId}/{imageName}` から
 * 新形式のパス `/api/slides/{fileId}/slides/{imageName}` へリダイレクトするハンドラー
 */
async function handleGET(request: NextRequest, { params }: { params: { path: string } }) {
  try {
    console.log('スライドAPI - 旧形式パスリクエスト:', {
      url: request.url,
      path: params.path,
      method: request.method,
      timestamp: new Date().toISOString()
    });

    // パスの検証
    if (!validatePath(params.path)) {
      return NextResponse.json({ 
        error: '無効なファイルパスです',
        message: '新形式のパス `/api/slides/{fileId}/slides/{imageName}` を使用してください'
      }, { status: 400 });
    }

    // パスからファイルIDを抽出
    const fileId = params.path;
    
    // リクエストURLからクエリパラメータを取得
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    
    // 新しいURLを構築
    // 例: /api/slides/abc123 → /api/slides/abc123/slides/1.png
    const originalUrl = new URL(request.url);
    const pathSegments = originalUrl.pathname.split('/');
    
    // 最後のセグメントがファイルIDの場合は、デフォルトで最初のスライドにリダイレクト
    let newPath = `/api/slides/${fileId}/slides/1.png${queryString}`;
    
    // URLに画像名が含まれている場合（例: /api/slides/abc123/slide_1.png）
    if (pathSegments.length > 3) {
      const imageName = pathSegments[pathSegments.length - 1];
      if (imageName.match(/slide_\d+\.png/)) {
        // slide_1.png → 1.png のように変換
        const slideNumber = imageName.replace('slide_', '');
        newPath = `/api/slides/${fileId}/slides/${slideNumber}${queryString}`;
      }
    }
    
    console.log('スライドAPI - リダイレクト:', {
      from: request.url,
      to: newPath,
      timestamp: new Date().toISOString()
    });
    
    // 307 Temporary Redirectでリダイレクト
    // 307は元のHTTPメソッドとリクエストボディを保持する
    return NextResponse.redirect(new URL(newPath, request.url), {
      status: 307,
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    console.error('スライドAPI - リダイレクトエラー:', {
      url: request.url,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json({ 
      error: 'リダイレクト処理中にエラーが発生しました',
      message: '新形式のパス `/api/slides/{fileId}/slides/{imageName}` を直接使用してください'
    }, { status: 500 });
  }
}

// OPTIONSリクエストハンドラー
async function handleOPTIONS(request: NextRequest) {
  console.log('スライドAPI - 旧形式パスOPTIONSリクエスト:', {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  // CORSヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

// API ルートハンドラーにロギングを追加
export const GET = withAPILogging(handleGET, 'slide-image-redirect');
export const OPTIONS = withAPILogging(handleOPTIONS, 'slide-image-options-redirect');
