import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync, statSync, readdirSync } from 'fs';
import { FILE_CONFIG } from '@/lib/utils/file-utils';
import { withAPILogging } from '@/lib/utils/api-logging';
import { serialize } from 'v8';

// メモリ内キャッシュ
const imageCache = new Map<string, { buffer: Buffer, timestamp: number, contentType: string }>();
const CACHE_TTL = 60 * 60 * 1000; // 1時間のキャッシュ有効期限

// 画像圧縮オプション
interface ImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

// スライド画像のファイル詳細を確認する関数
async function checkFileDetails(path: string) {
  try {
    const exists = existsSync(path);
    
    if (exists) {
      const stats = statSync(path);
      return { exists, stats };
    }
    
    console.log('ファイルが存在しません:', { path });
    return { exists, stats: null };
  } catch (error) {
    console.error('ファイル詳細確認エラー:', {
      path,
      error: error instanceof Error ? error.message : String(error)
    });
    return { exists: false, stats: null, error };
  }
}

// キャッシュから画像を取得または保存する関数
function getCachedImage(cacheKey: string) {
  const cachedImage = imageCache.get(cacheKey);
  if (cachedImage && Date.now() - cachedImage.timestamp < CACHE_TTL) {
    return cachedImage;
  }
  return null;
}

function setCachedImage(cacheKey: string, buffer: Buffer, contentType: string) {
  // キャッシュが大きすぎる場合は古いエントリを削除
  if (imageCache.size > 1000) {
    const oldestKey = [...imageCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    imageCache.delete(oldestKey);
  }
  
  imageCache.set(cacheKey, {
    buffer,
    timestamp: Date.now(),
    contentType
  });
}

// メインのGETハンドラー
async function handleGET(request: NextRequest, { params }: { params: { path: string[] } }) {
  console.log('スライドAPI - リクエスト受信:', {
    url: request.url,
    params: params.path,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  try {
    // パスパラメータからファイルIDと画像名を取得
    if (!params.path || params.path.length < 2) {
      return NextResponse.json(
        { error: '無効なパスパラメータ' },
        { status: 400 }
      );
    }

    const fileId = params.path[0];
    // 新形式のパス構造のみをサポート
    // /api/slides/{fileId}/slides/{imageName} 形式
    if (params.path.length < 3 || params.path[1] !== 'slides') {
      return NextResponse.json(
        { error: '無効なパス形式。/api/slides/{fileId}/slides/{imageName}の形式を使用してください。' },
        { status: 400 }
      );
    }
    
    const imageName = params.path[2];

    // 画像処理オプションのパース
    const url = new URL(request.url);
    const imageOptions: ImageOptions = {
      maxWidth: url.searchParams.get('width') ? parseInt(url.searchParams.get('width')!) : undefined,
      maxHeight: url.searchParams.get('height') ? parseInt(url.searchParams.get('height')!) : undefined,
      quality: url.searchParams.get('quality') ? parseInt(url.searchParams.get('quality')!) : undefined,
    };

    // キャッシュキーにリクエストパラメータも含める
    const cacheKey = `${fileId}_${imageName}_${serialize(imageOptions).toString('hex')}`;
    
    // キャッシュから取得を試みる
    const cachedImage = getCachedImage(cacheKey);
    if (cachedImage) {
      console.log('スライドAPI - キャッシュヒット:', {
        fileId,
        imageName,
        cacheAge: Date.now() - cachedImage.timestamp,
        contentType: cachedImage.contentType
      });

      // CORSヘッダー
      const headers = {
        'Content-Type': cachedImage.contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      };

      return new NextResponse(cachedImage.buffer, { headers });
    }

    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions);

    // 開発環境では認証をバイパスする処理
    if (process.env.NODE_ENV === 'development' && !session) {
      // 開発環境でのみ、すべてのユーザーディレクトリを検索
      const uploadsDir = join(process.cwd(), FILE_CONFIG.tempDir);
      
      if (existsSync(uploadsDir)) {
        const userDirs = readdirSync(uploadsDir).filter(dir => 
          existsSync(join(uploadsDir, dir)) && 
          statSync(join(uploadsDir, dir)).isDirectory()
        );
        
        for (const userDir of userDirs) {
          // 新形式のパス構造のみを使用
          const possiblePath = join(uploadsDir, userDir, fileId, 'slides', imageName);
          
          if (existsSync(possiblePath)) {
            try {
              const imageBuffer = await readFile(possiblePath);
              const stats = statSync(possiblePath);
              
              // 画像のMIMEタイプを判定
              const contentType = imageName.endsWith('.png') 
                ? 'image/png' 
                : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
                ? 'image/jpeg'
                : 'application/octet-stream';
              
              // キャッシュに保存
              setCachedImage(cacheKey, imageBuffer, contentType);
              
              // CORSヘッダーを改善
              const headers = {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
              };

              return new NextResponse(imageBuffer, { headers });
            } catch (error) {
              console.error('スライドAPI - ファイル読み込みエラー:', {
                path: possiblePath,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
        
        return NextResponse.json(
          { error: 'ファイルが見つかりません' },
          { status: 404 }
        );
      }
    }

    // 認証チェック
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ユーザーIDを取得
    const userId = session.user.id;

    // 画像ファイルのパスを構築
    // 新形式のパス構造のみを使用
    const imagePath = join(process.cwd(), FILE_CONFIG.tempDir, userId, fileId, 'slides', imageName);

    // ファイルの存在確認
    const { exists, stats } = await checkFileDetails(imagePath);

    if (!exists) {
      // 代替パスは試さない - 新形式のみをサポート
      return NextResponse.json(
        { error: 'ファイルが見つかりません', path: imagePath, fileId, imageName },
        { status: 404 }
      );
    }

    try {
      // ファイルを読み込む
      const imageBuffer = await readFile(imagePath);

      // 画像のMIMEタイプを判定
      const contentType = imageName.endsWith('.png') 
        ? 'image/png' 
        : imageName.endsWith('.jpg') || imageName.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream';
        
      // キャッシュに保存
      setCachedImage(cacheKey, imageBuffer, contentType);

      // CORSヘッダーを改善
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      };

      return new NextResponse(imageBuffer, { headers });
    } catch (error) {
      // ファイル読み込みエラー
      return NextResponse.json(
        { error: 'ファイル読み込みエラー' },
        { status: 500 }
      );
    }
  } catch (error) {
    // 予期しないエラー
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// OPTIONSリクエストに対応するためのハンドラを追加
async function handleOPTIONS(request: NextRequest) {
  console.log('スライドAPI - OPTIONSリクエスト:', {
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  // CORSヘッダーを改善
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
export const GET = withAPILogging(handleGET, 'slide-image-get');
export const OPTIONS = withAPILogging(handleOPTIONS, 'slide-image-options');
