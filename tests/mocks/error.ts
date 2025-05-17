import { ErrorType, ErrorCodes } from '@/types/error';

export class AppError extends Error {
  type: ErrorType;
  statusCode: number;
  code?: ErrorCodes;
  context?: Record<string, unknown>;
  originalError?: Error;

  constructor({
    message,
    type = ErrorType.UNKNOWN,
    statusCode = 500,
    code,
    context,
    originalError,
  }: {
    message: string;
    type?: ErrorType;
    statusCode?: number;
    code?: ErrorCodes;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.originalError = originalError;
  }
}

export const createAuthError = (message = '認証エラー') =>
  new AppError({
    message,
    type: ErrorType.AUTH,
    statusCode: 401,
    code: ErrorCodes.UNAUTHORIZED,
  });

export const createValidationError = (message = '検証エラー') =>
  new AppError({
    message,
    type: ErrorType.VALIDATION,
    statusCode: 400,
    code: ErrorCodes.VALIDATION_ERROR,
  });

export const createNotFoundError = (message = '未検出エラー') =>
  new AppError({
    message,
    type: ErrorType.NOT_FOUND,
    statusCode: 404,
    code: ErrorCodes.NOT_FOUND,
  });

export const createForbiddenError = (message = 'アクセス拒否エラー') =>
  new AppError({
    message,
    type: ErrorType.FORBIDDEN,
    statusCode: 403,
    code: ErrorCodes.FORBIDDEN,
  });

export const createDatabaseError = (message = 'データベースエラー') =>
  new AppError({
    message,
    type: ErrorType.DATABASE,
    statusCode: 500,
    code: ErrorCodes.DATABASE_ERROR,
  });

export const createRateLimitError = (message = 'レート制限エラー') =>
  new AppError({
    message,
    type: ErrorType.RATE_LIMIT,
    statusCode: 429,
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
  });

export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      type: ErrorType.UNKNOWN,
      originalError: error,
    });
  }

  if (typeof error === 'string') {
    return new AppError({
      message: error,
      type: ErrorType.UNKNOWN,
    });
  }

  return new AppError({
    message: '予期せぬエラーが発生しました。しばらく待ってから再試行してください。',
    type: ErrorType.UNKNOWN,
  });
}; 