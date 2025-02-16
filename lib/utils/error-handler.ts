export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
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

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

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
      return new AppError(
        'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        ErrorCodes.NETWORK_ERROR,
        503
      );
    }

    // データベースエラーの検出
    if (error.message.includes('prisma') || error.message.includes('database')) {
      return new AppError(
        'データベースエラーが発生しました。しばらく待ってから再試行してください。',
        ErrorCodes.DATABASE_ERROR,
        500
      );
    }

    // API関連エラーの検出
    if (error.message.includes('api') || error.message.includes('status')) {
      return new AppError(
        'APIエラーが発生しました。しばらく待ってから再試行してください。',
        ErrorCodes.API_ERROR,
        500
      );
    }
  }

  // 不明なエラー
  return new AppError(
    '予期せぬエラーが発生しました。しばらく待ってから再試行してください。',
    ErrorCodes.UNKNOWN_ERROR,
    500
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown error occurred";
}

// バリデーションエラーの作成
export function createValidationError(
  message: string,
  details?: Record<string, any>
): AppError {
  return new AppError(message, ErrorCodes.VALIDATION_ERROR, 400, details);
}

// 認証エラーの作成
export function createAuthError(
  message = '認証が必要です。再度ログインしてください。'
): AppError {
  return new AppError(message, ErrorCodes.UNAUTHORIZED, 401);
}

// 権限エラーの作成
export function createForbiddenError(
  message = 'この操作を実行する権限がありません。'
): AppError {
  return new AppError(message, ErrorCodes.FORBIDDEN, 403);
}

// 未検出エラーの作成
export function createNotFoundError(
  message = '要求されたリソースが見つかりませんでした。'
): AppError {
  return new AppError(message, ErrorCodes.NOT_FOUND, 404);
}

// レート制限エラーの作成
export function createRateLimitError(
  message = 'リクエスト制限を超えました。しばらく待ってから再試行してください。'
): AppError {
  return new AppError(message, ErrorCodes.RATE_LIMIT_EXCEEDED, 429);
}

// データベースエラーの作成
export function createDatabaseError(
  message = 'データベースエラーが発生しました。しばらく待ってから再試行してください。'
): AppError {
  return new AppError(message, ErrorCodes.DATABASE_ERROR, 500);
} 