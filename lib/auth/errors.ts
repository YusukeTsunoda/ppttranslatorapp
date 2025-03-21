import { type LogLevel, type ErrorLog } from '@/types/logger';

/**
 * セッション関連のエラー型定義
 */
export type SessionError =
  | 'RefreshAccessTokenError'
  | 'SessionExpiredError'
  | 'AuthenticationError'
  | 'InvalidCredentialsError'
  | 'DatabaseError';

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
} as const;

/**
 * エラーログのレベル定義
 */
export const AUTH_ERROR_LEVELS: Record<SessionError, Extract<LogLevel, 'info' | 'warn' | 'error'>> = {
  RefreshAccessTokenError: 'warn',
  SessionExpiredError: 'info',
  AuthenticationError: 'error',
  InvalidCredentialsError: 'warn',
  DatabaseError: 'error',
};

/**
 * エラーメッセージを取得する
 */
export function getAuthErrorMessage(error: SessionError | string): string {
  const message = (AUTH_ERROR_MESSAGES as Record<string, string>)[error];
  return message || 'エラーが発生しました。しばらく時間をおいて再度お試しください。';
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
  const errorLevel: Extract<LogLevel, 'error' | 'fatal'> = 'error';

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
    },
  };
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

  // エラーメッセージを返す
  return {
    message: errorLog.message,
    level: errorLog.level,
    timestamp: errorLog.timestamp,
  };
}
