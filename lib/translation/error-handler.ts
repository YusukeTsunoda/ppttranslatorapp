import { NextResponse } from 'next/server';
import { TranslationErrorContext } from './types';

export interface TranslationError extends Error {
  name: string;
  status?: number;
  retryable?: boolean;
  retryAfter?: number;
  context?: TranslationErrorContext;
}

/**
 * エラーレスポンスを生成する
 * @param error エラーオブジェクト
 * @param additionalContext 追加のコンテキスト情報
 * @returns NextResponse
 */
export function handleTranslationError(error: TranslationError, additionalContext?: TranslationErrorContext): NextResponse {
  console.error('Translation error:', error);

  // エラーの種類に応じたステータスコードとメッセージを設定
  let status = error.status || 500;
  let message = error.message;
  let retryAfter: number | undefined;

  switch (error.name) {
    case 'RateLimitError':
      status = 429;
      message = 'リクエスト制限を超えました。しばらく待ってから再試行してください。';
      retryAfter = error.retryAfter || 60;
      break;
    case 'TimeoutError':
      status = 504;
      message = 'リクエストがタイムアウトしました。再試行してください。';
      break;
    case 'NetworkError':
      status = 503;
      message = 'ネットワークエラーが発生しました。再試行してください。';
      break;
    case 'ValidationError':
      status = 400;
      message = error.message || 'リクエストが不正です。';
      break;
    case 'AuthenticationError':
      status = 401;
      message = '認証が必要です。';
      break;
    case 'AuthorizationError':
      status = 403;
      message = 'アクセスが拒否されました。';
      break;
    case 'NotFoundError':
      status = 404;
      message = 'リソースが見つかりません。';
      break;
    default:
      status = 500;
      message = '内部サーバーエラーが発生しました。';
  }

  // エラーレスポンスを生成
  const response = {
    error: message,
    code: error.name,
    retryable: error.retryable ?? isRetryableError(status),
    context: { ...error.context, ...additionalContext },
  };

  // レスポンスヘッダーを設定
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });

  // Retry-Afterヘッダーを設定（必要な場合）
  if (retryAfter) {
    headers.set('Retry-After', retryAfter.toString());
  }

  return new NextResponse(JSON.stringify(response), {
    status,
    headers,
  });
}

/**
 * リトライ可能なエラーかどうかを判定する
 * @param status HTTPステータスコード
 * @returns リトライ可能な場合はtrue
 */
function isRetryableError(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/**
 * リトライ処理を実行する
 * @param operation 実行する処理
 * @param maxRetries 最大リトライ回数
 * @param baseDelay 基本待機時間（ミリ秒）
 * @returns 処理結果
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  onRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // カスタムリトライハンドラーがある場合は実行
      if (onRetry && !onRetry(lastError)) {
        throw error; // リトライハンドラーがfalseを返した場合はリトライしない
      }
      
      // リトライ不可能なエラーの場合は即座にスロー
      if (error instanceof Error && !isRetryableError(getErrorStatus(error))) {
        throw error;
      }
      
      // 最後の試行でエラーの場合はスロー
      if (attempt === maxRetries - 1) {
        const enhancedError = new Error('最大リトライ回数を超えました。後でもう一度お試しください。');
        enhancedError.name = 'MaxRetriesExceededError';
        (enhancedError as any).originalError = lastError;
        throw enhancedError;
      }
      
      // 指数バックオフで待機
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`リトライ ${attempt + 1}/${maxRetries} (${delay}ms後)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Unknown error');
}

/**
 * エラーからHTTPステータスコードを取得する
 * @param error エラーオブジェクト
 * @returns HTTPステータスコード
 */
function getErrorStatus(error: Error): number {
  if ('status' in error && typeof (error as any).status === 'number') {
    return (error as any).status;
  }
  
  switch (error.name) {
    case 'RateLimitError':
      return 429;
    case 'TimeoutError':
      return 504;
    case 'NetworkError':
      return 503;
    case 'ValidationError':
      return 400;
    case 'AuthenticationError':
      return 401;
    case 'AuthorizationError':
      return 403;
    case 'NotFoundError':
      return 404;
    default:
      return 500;
  }
}

/**
 * エラーログを記録する
 * @param error エラーオブジェクト
 * @param context エラーコンテキスト
 */
export function logTranslationError(error: Error, context: TranslationErrorContext = {}): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
  };

  // エラーログを出力（本番環境では適切なロギングサービスに送信）
  console.error('Translation Error:', JSON.stringify(errorLog, null, 2));
  
  // 開発環境では詳細なエラー情報を出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', error);
  }
} 