import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { existsSync, statSync } from 'fs';
import { FILE_CONFIG } from '@/lib/utils/file-utils';
import { withAPILogging } from '@/lib/utils/api-logging';
import sharp from 'sharp';
import { createHash } from 'crypto';

/**
 * パフォーマンスモニタリング用のメトリクス
 */
const METRICS = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  processingErrors: 0,
  averageResponseTime: 0,
  totalResponseTime: 0,
  lastResetTime: Date.now()
};

// 1時間ごとにメトリクスをリセット
setInterval(() => {
  console.log('スライドAPI - パフォーマンスメトリクス:', {
    totalRequests: METRICS.totalRequests,
    cacheHits: METRICS.cacheHits,
    cacheMisses: METRICS.cacheMisses,
    cacheHitRate: METRICS.totalRequests > 0 ? (METRICS.cacheHits / METRICS.totalRequests * 100).toFixed(2) + '%' : '0%',
    processingErrors: METRICS.processingErrors,
    averageResponseTime: METRICS.totalRequests > 0 ? Math.round(METRICS.totalResponseTime / METRICS.totalRequests) + 'ms' : '0ms',
    period: `${Math.round((Date.now() - METRICS.lastResetTime) / (60 * 1000))} minutes`,
    timestamp: new Date().toISOString()
  });
  
  // メトリクスをリセット
  METRICS.totalRequests = 0;
  METRICS.cacheHits = 0;
  METRICS.cacheMisses = 0;
  METRICS.processingErrors = 0;
  METRICS.totalResponseTime = 0;
  METRICS.averageResponseTime = 0;
  METRICS.lastResetTime = Date.now();
}, 60 * 60 * 1000); // 1時間ごと

/**
 * キャッシュ・パフォーマンス設定
 */
const CACHE_CONFIG = {
  MAX_SIZE: 2000, // キャッシュの最大エントリ数
  TTL: 24 * 60 * 60 * 1000, // キャッシュの有効期限（24時間）
  MEMORY_LIMIT: 500 * 1024 * 1024, // キャッシュの最大メモリ使用量（500MB）
  CURRENT_MEMORY_USAGE: 0 // 現在のメモリ使用量
};

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  buffer: Buffer;
  timestamp: number;
  contentType: string;
  size: number; // バッファサイズをトラッキング
  hits: number;  // キャッシュヒット数をトラッキング
}

// メモリ内キャッシュ - キーはハッシュ化して効率化
const imageCache = new Map<string, CacheEntry>();

/**
 * 画像圧縮オプションの型定義
 */
interface ImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp'; // 出力フォーマットオプション追加
}

/**
 * ファイルパスからコンテントタイプを判定する関数
 */
function getContentTypeFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

/**
 * スライド画像のファイル詳細を確認する関数
 * パフォーマンス最適化版
 */
async function checkFileDetails(path: string) {
  try {
    // 存在確認とファイル情報取得を一括で処理
    if (existsSync(path)) {
      try {
        const stats = statSync(path);
        return { exists: true, stats, contentType: getContentTypeFromPath(path) };
      } catch (statError) {
        // ファイルは存在するが、ステータス取得に失敗
        console.error('ファイルステータス取得エラー:', {
          path,
          error: statError instanceof Error ? statError.message : String(statError)
        });
        return { exists: true, stats: null, error: statError };
      }
    }
    
    // ファイルが存在しない場合
    return { exists: false, stats: null, contentType: null };
  } catch (error) {
    console.error('ファイル詳細確認エラー:', {
      path,
      error: error instanceof Error ? error.message : String(error)
    });
    return { exists: false, stats: null, error };
  }
}

/**
 * キャッシュキーを生成する関数
 */
function generateCacheKey(fileId: string, imageName: string, options: ImageOptions): string {
  // キャッシュキーをハッシュ化してメモリ使用量を削減
  const optionsStr = JSON.stringify(options);
  return createHash('md5')
    .update(`${fileId}_${imageName}_${optionsStr}`)
    .digest('hex');
}

/**
 * キャッシュから画像を取得する関数
 */
function getCachedImage(cacheKey: string): CacheEntry | null {
  const cachedImage = imageCache.get(cacheKey);
  
  if (cachedImage) {
    // 有効期限内かチェック
    if (Date.now() - cachedImage.timestamp < CACHE_CONFIG.TTL) {
      // キャッシュヒット数をインクリメント
      cachedImage.hits++;
      // タイムスタンプを更新（よく使われるエントリは長く保持）
      cachedImage.timestamp = Date.now();
      return cachedImage;
    }
    
    // 有効期限切れの場合はキャッシュから削除してメモリを解放
    CACHE_CONFIG.CURRENT_MEMORY_USAGE -= cachedImage.size;
    imageCache.delete(cacheKey);
  }
  
  return null;
}

/**
 * キャッシュに画像を保存する関数
 */
function setCachedImage(cacheKey: string, buffer: Buffer, contentType: string): void {
  const bufferSize = buffer.length;
  
  // メモリ使用量が制限を超えそうな場合、古いエントリや使用頻度の低いエントリを削除
  if (CACHE_CONFIG.CURRENT_MEMORY_USAGE + bufferSize > CACHE_CONFIG.MEMORY_LIMIT || 
      imageCache.size >= CACHE_CONFIG.MAX_SIZE) {
    cleanupCache(bufferSize);
  }
  
  // キャッシュに保存
  imageCache.set(cacheKey, {
    buffer,
    timestamp: Date.now(),
    contentType,
    size: bufferSize,
    hits: 1
  });
  
  // メモリ使用量を更新
  CACHE_CONFIG.CURRENT_MEMORY_USAGE += bufferSize;
}

/**
 * キャッシュのクリーンアップを行う関数
 */
function cleanupCache(requiredSpace: number = 0): void {
  // キャッシュが空の場合は何もしない
  if (imageCache.size === 0) return;
  
  // キャッシュエントリをヒット数とタイムスタンプの組み合わせでソート
  const entries = [...imageCache.entries()]
    .sort((a, b) => {
      // まずヒット数でソート（使用頻度の低いものから削除）
      const hitsDiff = a[1].hits - b[1].hits;
      if (hitsDiff !== 0) return hitsDiff;
      // ヒット数が同じ場合は古いものから削除
      return a[1].timestamp - b[1].timestamp;
    });
  
  // 必要なスペースを確保するまで削除を続ける
  let freedSpace = 0;
  const entriesToRemove = Math.ceil(imageCache.size * 0.2); // 最低でもキャッシュの20%を削除
  
  for (let i = 0; i < entriesToRemove || (requiredSpace > 0 && freedSpace < requiredSpace); i++) {
    if (i >= entries.length) break;
    
    const [key, entry] = entries[i];
    freedSpace += entry.size;
    CACHE_CONFIG.CURRENT_MEMORY_USAGE -= entry.size;
    imageCache.delete(key);
  }
  
  // キャッシュクリーンアップの結果をログ出力
  console.log('キャッシュクリーンアップ完了:', {
    removedEntries: entriesToRemove,
    freedSpace: `${(freedSpace / 1024 / 1024).toFixed(2)} MB`,
    remainingEntries: imageCache.size,
    currentMemoryUsage: `${(CACHE_CONFIG.CURRENT_MEMORY_USAGE / 1024 / 1024).toFixed(2)} MB`,
    timestamp: new Date().toISOString()
  });
}

/**
 * 画像処理を行う関数
 * リサイズや圧縮を行い、最適化された画像を返す
 */
async function processImage(buffer: Buffer, options: ImageOptions, originalContentType: string): Promise<{ buffer: Buffer, contentType: string }> {
  try {
    // Sharpインスタンスを作成
    let image = sharp(buffer);
    let metadata = await image.metadata();
    
    // 出力フォーマットを決定
    let outputFormat = options.format || (originalContentType === 'image/png' ? 'png' : 
                                       originalContentType === 'image/jpeg' ? 'jpeg' : 
                                       originalContentType === 'image/webp' ? 'webp' : 'jpeg');
    
    // リサイズが必要か確認
    if (options.maxWidth || options.maxHeight) {
      const width = metadata.width || 1;
      const height = metadata.height || 1;
      
      // アスペクト比を維持してリサイズ
      if (options.maxWidth && options.maxHeight) {
        // 両方の制約を満たすようにリサイズ
        const aspectRatio = width / height;
        const targetAspectRatio = options.maxWidth / options.maxHeight;
        
        if (aspectRatio > targetAspectRatio) {
          // 幅が制約要因
          image = image.resize(options.maxWidth, Math.round(options.maxWidth / aspectRatio));
        } else {
          // 高さが制約要因
          image = image.resize(Math.round(options.maxHeight * aspectRatio), options.maxHeight);
        }
      } else if (options.maxWidth) {
        // 幅のみ指定された場合
        image = image.resize(options.maxWidth, null);
      } else if (options.maxHeight) {
        // 高さのみ指定された場合
        image = image.resize(null, options.maxHeight);
      }
    }
    
    // 出力フォーマットに応じた処理
    let outputOptions: any = {};
    let contentType: string;
    
    switch (outputFormat) {
      case 'jpeg':
        outputOptions.quality = options.quality || 85;
        contentType = 'image/jpeg';
        image = image.jpeg(outputOptions);
        break;
      case 'webp':
        outputOptions.quality = options.quality || 80;
        contentType = 'image/webp';
        image = image.webp(outputOptions);
        break;
      case 'png':
      default:
        // PNGはロスレスなのでqualityは使わない
        contentType = 'image/png';
        image = image.png({ compressionLevel: 9 }); // 最大圧縮
        break;
    }
    
    // 処理した画像をバッファとして取得
    const processedBuffer = await image.toBuffer();
    
    return {
      buffer: processedBuffer,
      contentType
    };
  } catch (error) {
    console.error('画像処理エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      options
    });
    
    // エラー時は元のバッファをそのまま返す
    return {
      buffer,
      contentType: originalContentType
    };
  }
}

/**
 * 最適化されたレスポンスヘッダーを生成する関数
 */
function generateOptimizedHeaders(request: NextRequest, contentType: string): HeadersInit {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // 1日キャッシュ、7日間は古いキャッシュを許容
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin', // オリジンごとに異なるレスポンスをキャッシュ
    'X-Content-Type-Options': 'nosniff', // MIMEタイプのスニッフィングを防止
    'X-Frame-Options': 'DENY', // クリックジャッキング防止
    'Content-Security-Policy': "img-src 'self' data: blob:", // セキュリティポリシー
  };
}

/**
 * エラーレスポンスを生成する関数
 */
function createErrorResponse(status: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json(
    {
      error: errorCode,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * メインのGETハンドラー
 * パフォーマンス最適化版
 */
async function handleGET(request: NextRequest, { params }: { params: { path: string[] } }): Promise<NextResponse> {
  const startTime = Date.now();
  METRICS.totalRequests++;
  
  try {
    // パスパラメータからファイルIDと画像名を取得
    if (!params.path || params.path.length < 2) {
      METRICS.processingErrors++;
      return createErrorResponse(400, 'BAD_REQUEST', '無効なパスパラメータ');
    }

    const fileId = params.path[0];
    // 新形式のパス構造のみをサポート
    // /api/slides/{fileId}/slides/{imageName} 形式
    if (params.path.length < 3 || params.path[1] !== 'slides') {
      METRICS.processingErrors++;
      return createErrorResponse(
        400, 
        'BAD_REQUEST', 
        '無効なパス形式。/api/slides/{fileId}/slides/{imageName}の形式を使用してください。'
      );
    }
    
    const imageName = params.path[2];

    // 画像処理オプションのパース
    const url = new URL(request.url);
    const imageOptions: ImageOptions = {
      maxWidth: url.searchParams.get('width') ? parseInt(url.searchParams.get('width')!) : undefined,
      maxHeight: url.searchParams.get('height') ? parseInt(url.searchParams.get('height')!) : undefined,
      quality: url.searchParams.get('quality') ? parseInt(url.searchParams.get('quality')!) : undefined,
      format: url.searchParams.get('format') as ('jpeg' | 'png' | 'webp') || undefined
    };

    // キャッシュキーを生成
    const cacheKey = generateCacheKey(fileId, imageName, imageOptions);
    
    // キャッシュから取得を試みる
    const cachedImage = getCachedImage(cacheKey);
    if (cachedImage) {
      METRICS.cacheHits++;
      
      // キャッシュヒットのログはデバッグレベルにする
      if (process.env.NODE_ENV === 'development') {
        console.log('スライドAPI - キャッシュヒット:', {
          fileId,
          imageName,
          cacheAge: Date.now() - cachedImage.timestamp,
          contentType: cachedImage.contentType,
          responseTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });
      }

      // 最適化されたヘッダーでレスポンスを返す
      const headers = generateOptimizedHeaders(request, cachedImage.contentType);
      
      // レスポンス時間を記録
      const responseTime = Date.now() - startTime;
      METRICS.totalResponseTime += responseTime;
      
      return new NextResponse(cachedImage.buffer, { headers });
    }
    
    METRICS.cacheMisses++;

    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      METRICS.processingErrors++;
      return createErrorResponse(401, 'UNAUTHORIZED', 'セッションが存在しません');
    }
    
    if (!session.user) {
      METRICS.processingErrors++;
      return createErrorResponse(401, 'UNAUTHORIZED', 'ユーザー情報がありません');
    }
    
    if (!session.user.id) {
      METRICS.processingErrors++;
      return createErrorResponse(401, 'UNAUTHORIZED', 'ユーザーIDがありません');
    }

    // ユーザーIDを取得
    const userId = session.user.id;

    // 画像ファイルのパスを構築
    // 新形式のパス構造のみを使用
    const imagePath = join(process.cwd(), FILE_CONFIG.tempDir, userId, fileId, 'slides', imageName);

    // ファイルの存在確認
    const { exists, stats, contentType } = await checkFileDetails(imagePath);

    if (!exists) {
      METRICS.processingErrors++;
      return createErrorResponse(404, 'NOT_FOUND', 'ファイルが見つかりません');
    }

    try {
      // ファイルを読み込む
      const imageBuffer = await readFile(imagePath);
      
      // コンテンツタイプを取得
      const originalContentType = contentType || getContentTypeFromPath(imagePath);
      
      // 画像処理（リサイズ・圧縮）を実行
      const { buffer: processedBuffer, contentType: processedContentType } = 
        await processImage(imageBuffer, imageOptions, originalContentType);
      
      // キャッシュに保存
      setCachedImage(cacheKey, processedBuffer, processedContentType);

      // 最適化されたヘッダーでレスポンスを返す
      const headers = generateOptimizedHeaders(request, processedContentType);
      
      // レスポンス時間を記録
      const responseTime = Date.now() - startTime;
      METRICS.totalResponseTime += responseTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('スライドAPI - 画像処理完了:', {
          fileId,
          imageName,
          originalSize: imageBuffer.length,
          processedSize: processedBuffer.length,
          compressionRatio: ((1 - processedBuffer.length / imageBuffer.length) * 100).toFixed(2) + '%',
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        });
      }
      
      return new NextResponse(processedBuffer, { headers });
    } catch (error) {
      METRICS.processingErrors++;
      console.error('ファイル読み込みエラー:', {
        path: imagePath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return createErrorResponse(500, 'INTERNAL_SERVER_ERROR', 'ファイル読み込みエラー');
    }
  } catch (error) {
    METRICS.processingErrors++;
    console.error('予期しないエラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      timestamp: new Date().toISOString()
    });
    
    return createErrorResponse(
      500, 
      'INTERNAL_SERVER_ERROR', 
      '予期しないエラーが発生しました'
    );
  } finally {
    // レスポンス時間を記録（エラー時も含む）
    const responseTime = Date.now() - startTime;
    if (responseTime > 0) {
      METRICS.totalResponseTime += responseTime;
    }
  }
}

/**
 * OPTIONSリクエストに対応するためのハンドラ
 */
async function handleOPTIONS(request: NextRequest): Promise<NextResponse> {
  const headers = {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
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
