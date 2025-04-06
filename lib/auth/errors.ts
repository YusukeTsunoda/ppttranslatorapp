import { type LogLevel, type ErrorLog } from '@/types/logger';

/**
 * セッション関連のエラー型定義
 */
export type SessionError =
  | 'RefreshAccessTokenError'
  | 'SessionExpiredError'
  | 'AuthenticationError'
  | 'InvalidCredentialsError'
  | 'DatabaseError'
  | 'RateLimitError'
  | 'AccountLockedError'
  | 'InvalidTokenError'
  | 'PermissionDeniedError'
  | 'MissingCredentialsError';

/**
 * エラーメッセージの定義
 */
export const AUTH_ERROR_MESSAGES = {
  RefreshAccessTokenError: 'セッションの更新に失敗しました。再度ログインしてください。',
  SessionExpiredError: 'セッションの有効期限が切れました。再度ログインしてください。',
  AuthenticationError: '認証に失敗しました。再度ログインしてください。',
  InvalidCredentialsError: 'メールアドレスまたはパスワードが正しくありません。',
  DatabaseError: 'データベースエラーが発生しました。しばらく時間をおいて再度お試しください。',
  RequiredFields: 'メールアドレスとパスワードを入力してください。',
  UserNotFound: 'ユーザーが見つかりません。',
  RateLimitError: 'ログイン試行回数が多すぎます。しばらく時間をおいて再度お試しください。',
  AccountLockedError: 'アカウントがロックされています。管理者にお問い合わせください。',
  InvalidTokenError: '無効なトークンです。再度ログインしてください。',
  PermissionDeniedError: 'このリソースにアクセスする権限がありません。',
  MissingCredentialsError: '認証情報が不足しています。',
} as const;

/**
 * エラーの重大度を定義
 * 内部的にはより詳細なレベルを使用するが、ErrorLogには'error'または'fatal'のみを設定
 */
export const AUTH_ERROR_LEVELS: Record<SessionError, LogLevel> = {
  RefreshAccessTokenError: 'warn',
  SessionExpiredError: 'info',
  AuthenticationError: 'error',
  InvalidCredentialsError: 'warn',
  DatabaseError: 'error',
  RateLimitError: 'warn',
  AccountLockedError: 'error',
  InvalidTokenError: 'warn',
  PermissionDeniedError: 'error',
  MissingCredentialsError: 'warn',
};

/**
 * エラーメッセージを取得する
 */
export function getAuthErrorMessage(error: SessionError | string): string {
  const message = (AUTH_ERROR_MESSAGES as Record<string, string>)[error];
  return message || 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
}

/**
 * LogLevelをErrorLog用のレベルに変換する
 * ErrorLogは'error'または'fatal'のみを受け付ける
 */
function convertToErrorLogLevel(level: LogLevel): Extract<LogLevel, 'error' | 'fatal'> {
  // 'error'と'fatal'はそのまま返す
  if (level === 'error' || level === 'fatal') {
    return level;
  }
  
  // その他のレベルは'error'に変換
  return 'error';
}

/**
 * エラーログを生成する
 */
export function createAuthErrorLog(
  error: SessionError | Error,
  userId?: string,
  metadata?: Record<string, unknown>,
): ErrorLog {
  const now = new Date();
  const errorName = error instanceof Error ? error.name : error;
  const errorMessage = error instanceof Error ? error.message : getAuthErrorMessage(error);
  
  // エラーレベルを決定
  let logLevel: LogLevel = 'error';
  if (typeof error === 'string' && error in AUTH_ERROR_LEVELS) {
    logLevel = AUTH_ERROR_LEVELS[error as SessionError];
  }
  
  // ErrorLog用にレベルを変換
  const errorLevel = convertToErrorLogLevel(logLevel);

  return {
    level: errorLevel,
    message: errorMessage,
    timestamp: now.toISOString(),
    userId,
    error: {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    },
    context: {
      action: 'authentication',
      component: 'auth',
      ...((metadata?.context as Record<string, string>) || {}),
    },
    metadata: {
      ...metadata,
      errorType: errorName,
      originalLevel: logLevel, // 元のログレベルも保存
      browser: metadata?.userAgent ? getUserAgentInfo(metadata.userAgent as string) : undefined,
      ipAddress: metadata?.ipAddress,
    },
  };
}

/**
 * ユーザーエージェント情報を解析する
 */
function getUserAgentInfo(userAgent: string): Record<string, string> {
  try {
    const browser = userAgent.match(/(chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    const os = userAgent.match(/windows nt|macintosh|linux|android|ios/i) || [];
    
    return {
      browser: browser[1] || 'unknown',
      version: browser[2] || 'unknown',
      os: os[0] || 'unknown',
    };
  } catch (e) {
    return { browser: 'unknown', version: 'unknown', os: 'unknown' };
  }
}

/**
 * エラーをハンドリングする
 */
export async function handleAuthError(
  error: SessionError | Error,
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<{
  message: string;
  level: LogLevel;
  timestamp: string;
}> {
  const errorLog = createAuthErrorLog(error, userId, metadata);

  // エラーログを出力
  console.error('認証エラー:', errorLog);
  
  // エラーログを保存（本番環境では実際のログ保存システムを使用）
  await saveErrorLog(errorLog);

  // レート制限の場合は一時的なブロックを設定
  if (
    (typeof error === 'string' && error === 'RateLimitError') || 
    (error instanceof Error && error.name === 'RateLimitError')
  ) {
    await setRateLimit(userId || 'anonymous', metadata?.ipAddress as string | undefined);
  }

  // エラーメッセージを返す
  return {
    message: errorLog.message,
    level: errorLog.level,
    timestamp: errorLog.timestamp,
  };
}

/**
 * エラーログを保存する（実装例）
 */
async function saveErrorLog(errorLog: ErrorLog): Promise<void> {
  try {
    // 本番環境では実際のログ保存システムを使用
    // 例: データベースに保存、ログサービスに送信など
    if (process.env.NODE_ENV === 'production') {
      // 実際のログ保存処理をここに実装
      console.log('エラーログを保存しました', errorLog.message);
    }
  } catch (e) {
    console.error('エラーログの保存に失敗しました:', e);
  }
}

/**
 * レート制限を設定する（実装例）
 */
async function setRateLimit(userId: string, ipAddress?: string): Promise<void> {
  try {
    // 本番環境では実際のレート制限システムを使用
    // 例: Redis/Memcachedにカウンターを保存など
    if (process.env.NODE_ENV === 'production') {
      // 実際のレート制限処理をここに実装
      console.log('レート制限を設定しました', { userId, ipAddress });
    }
  } catch (e) {
    console.error('レート制限の設定に失敗しました:', e);
  }
}
