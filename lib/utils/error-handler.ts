import { toast } from '@/components/ui/use-toast';

// エラーの種類
export type ErrorType = 'AUTH' | 'VALIDATION' | 'SERVER' | 'NETWORK' | 'NOT_FOUND' | 'PERMISSION' | 'UNKNOWN';

// エラーの詳細情報
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  context?: Record<string, any>;
  originalError?: Error;
}

// カスタムエラークラス
export class AppError extends Error {
  type: ErrorType;
  code?: string;
  context?: Record<string, any>;
  originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = 'AppError';
    this.type = details.type;
    this.code = details.code;
    this.context = details.context;
    this.originalError = details.originalError;
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // ネットワークエラーの検出
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return new AppError({
        type: 'NETWORK',
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        originalError: error,
      });
    }

    // データベースエラーの検出
    if (error.message.includes('prisma') || error.message.includes('database')) {
      return new AppError({
        type: 'SERVER',
        message: 'データベースエラーが発生しました。しばらく待ってから再試行してください。',
        code: ErrorCodes.DATABASE_ERROR,
        originalError: error,
      });
    }

    // API関連エラーの検出
    if (error.message.includes('api') || error.message.includes('status')) {
      return new AppError({
        type: 'SERVER',
        message: 'APIエラーが発生しました。しばらく待ってから再試行してください。',
        code: ErrorCodes.API_ERROR,
        originalError: error,
      });
    }
  }

  // 不明なエラー
  return new AppError({
    type: 'UNKNOWN',
    message: '予期せぬエラーが発生しました。しばらく待ってから再試行してください。',
    code: ErrorCodes.UNKNOWN_ERROR,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown error occurred';
}

// バリデーションエラーの作成
export function createValidationError(message: string, context?: Record<string, any>): AppError {
  return new AppError({
    type: 'VALIDATION',
    message,
    code: ErrorCodes.VALIDATION_ERROR,
    context,
  });
}

// 認証エラーの作成
export function createAuthError(message: string, code?: string, context?: Record<string, any>): AppError {
  return new AppError({
    type: 'AUTH',
    message,
    code,
    context,
  });
}

// 権限エラーの作成
export function createForbiddenError(message = 'この操作を実行する権限がありません。'): AppError {
  return new AppError({
    type: 'PERMISSION',
    message,
    code: ErrorCodes.FORBIDDEN,
  });
}

// 未検出エラーの作成
export function createNotFoundError(message: string): AppError {
  return new AppError({
    type: 'NOT_FOUND',
    message,
    code: ErrorCodes.NOT_FOUND,
  });
}

// レート制限エラーの作成
export function createRateLimitError(
  message = 'リクエスト制限を超えました。しばらく待ってから再試行してください。',
): AppError {
  return new AppError({
    type: 'SERVER',
    message,
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  });
}

// データベースエラーの作成
export function createDatabaseError(message: string, originalError?: Error): AppError {
  return new AppError({
    type: 'SERVER',
    message,
    code: ErrorCodes.DATABASE_ERROR,
    originalError,
  });
}

// セッションエラーをAppErrorに変換
export function mapSessionErrorToAppError(sessionError: SessionError, message: string): AppError {
  switch (sessionError) {
    case 'EXPIRED':
      return createAuthError('セッションの有効期限が切れました', 'SESSION_EXPIRED');
    case 'INVALID':
      return createAuthError('無効なセッションです', 'SESSION_INVALID');
    case 'UNAUTHORIZED':
      return createAuthError('認証が必要です', 'UNAUTHORIZED');
    case 'NETWORK':
      return new AppError({
        type: 'NETWORK',
        message: 'ネットワークエラーが発生しました',
        originalError: new Error(message),
      });
    default:
      return createAuthError(message, 'AUTH_ERROR');
  }
}

// エラーハンドリング関数（クライアント側）
export function handleClientError(error: unknown, defaultMessage = '予期しないエラーが発生しました'): void {
  console.error('Client error:', error);

  let errorMessage = defaultMessage;
  let errorType: 'default' | 'destructive' = 'destructive';

  if (error instanceof AppError) {
    errorMessage = error.message;

    // エラータイプに応じた処理
    switch (error.type) {
      case 'AUTH':
        // 認証エラーの場合はリダイレクトなどの処理を追加できる
        break;
      case 'VALIDATION':
        // バリデーションエラーは警告として表示
        errorType = 'default';
        break;
      case 'NETWORK':
        // ネットワークエラーの場合は再試行オプションを提供できる
        break;
      default:
        break;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // トースト通知
  toast({
    title: 'エラー',
    description: errorMessage,
    variant: errorType,
  });
}

// エラーハンドリング関数（API側）
export function handleApiError(
  error: unknown,
  defaultMessage = 'Internal Server Error',
): {
  error: string;
  code?: string;
  status: number;
} {
  console.error('API error:', error);

  if (error instanceof AppError) {
    // エラータイプに応じたステータスコードを設定
    let status = 500;

    switch (error.type) {
      case 'AUTH':
        status = 401;
        break;
      case 'VALIDATION':
        status = 400;
        break;
      case 'NOT_FOUND':
        status = 404;
        break;
      case 'PERMISSION':
        status = 403;
        break;
      case 'NETWORK':
        status = 502;
        break;
      default:
        status = 500;
    }

    return {
      error: error.message,
      code: error.code,
      status,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      status: 500,
    };
  }

  return {
    error: defaultMessage,
    status: 500,
  };
}

// セッションエラーの種類
export type SessionError = 'EXPIRED' | 'INVALID' | 'NETWORK' | 'UNAUTHORIZED' | 'UNKNOWN';
