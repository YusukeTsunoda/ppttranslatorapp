import {
  AppError,
  ErrorCodes,
  ErrorType,
  createAuthError,
  createDatabaseError,
  createForbiddenError,
  createNotFoundError,
  createRateLimitError,
  createValidationError,
  getErrorMessage,
  handleError,
  isAppError,
  mapSessionErrorToAppError,
} from '@/lib/utils/error-handler';

// use-toastをモック化
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

describe('ErrorHandler', () => {
  describe('AppError', () => {
    it('AppErrorインスタンスを正しく作成する', () => {
      const error = new AppError({
        type: 'VALIDATION',
        message: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        context: { field: 'email' },
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('VALIDATION');
      expect(error.message).toBe('バリデーションエラー');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.context).toEqual({ field: 'email' });
    });
  });

  describe('isAppError', () => {
    it('AppErrorインスタンスの場合はtrueを返す', () => {
      const error = new AppError({
        type: 'VALIDATION',
        message: 'バリデーションエラー',
      });

      expect(isAppError(error)).toBe(true);
    });

    it('通常のErrorインスタンスの場合はfalseを返す', () => {
      const error = new Error('通常のエラー');

      expect(isAppError(error)).toBe(false);
    });

    it('nullやundefinedの場合はfalseを返す', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('handleError', () => {
    it('AppErrorをそのまま返す', () => {
      const appError = new AppError({
        type: 'VALIDATION',
        message: 'バリデーションエラー',
      });

      const result = handleError(appError);

      expect(result).toBe(appError);
    });

    it('ネットワークエラーをAppErrorに変換する', () => {
      const networkError = new Error('network connection failed');
      networkError.name = 'NetworkError';

      const result = handleError(networkError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe('NETWORK');
      expect(result.originalError).toBe(networkError);
    });

    it('データベースエラーをAppErrorに変換する', () => {
      const dbError = new Error('prisma query failed');

      const result = handleError(dbError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe('SERVER');
      expect(result.code).toBe(ErrorCodes.DATABASE_ERROR);
      expect(result.originalError).toBe(dbError);
    });

    it('APIエラーをAppErrorに変換する', () => {
      const apiError = new Error('api returned status 500');

      const result = handleError(apiError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe('SERVER');
      expect(result.code).toBe(ErrorCodes.API_ERROR);
      expect(result.originalError).toBe(apiError);
    });

    it('不明なエラーをAppErrorに変換する', () => {
      const result = handleError('これはエラーではない');

      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe('UNKNOWN');
      expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });
  });

  describe('getErrorMessage', () => {
    it('Errorインスタンスからメッセージを取得する', () => {
      const error = new Error('テストエラーメッセージ');

      expect(getErrorMessage(error)).toBe('テストエラーメッセージ');
    });

    it('エラーではない値の場合はデフォルトメッセージを返す', () => {
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(getErrorMessage(123)).toBe('Unknown error occurred');
    });
  });

  describe('エラー作成関数', () => {
    it('createValidationError', () => {
      const error = createValidationError('入力が無効です', { field: 'email' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('VALIDATION');
      expect(error.message).toBe('入力が無効です');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.context).toEqual({ field: 'email' });
    });

    it('createAuthError', () => {
      const error = createAuthError('認証に失敗しました', 'INVALID_CREDENTIALS', { userId: '123' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('認証に失敗しました');
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.context).toEqual({ userId: '123' });
    });

    it('createForbiddenError', () => {
      const error = createForbiddenError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('PERMISSION');
      expect(error.message).toBe('この操作を実行する権限がありません。');
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('createNotFoundError', () => {
      const error = createNotFoundError('ユーザーが見つかりません');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('NOT_FOUND');
      expect(error.message).toBe('ユーザーが見つかりません');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('createRateLimitError', () => {
      const error = createRateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('SERVER');
      expect(error.message).toBe('リクエスト制限を超えました。しばらく待ってから再試行してください。');
      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });

    it('createDatabaseError', () => {
      const originalError = new Error('DB connection failed');
      const error = createDatabaseError('データベースエラーが発生しました', originalError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('SERVER');
      expect(error.message).toBe('データベースエラーが発生しました');
      expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('mapSessionErrorToAppError', () => {
    it('EXPIREDエラーを変換する', () => {
      const error = mapSessionErrorToAppError('EXPIRED', 'セッションエラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('セッションの有効期限が切れました');
      expect(error.code).toBe('SESSION_EXPIRED');
    });

    it('INVALIDエラーを変換する', () => {
      const error = mapSessionErrorToAppError('INVALID', 'セッションエラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('無効なセッションです');
      expect(error.code).toBe('SESSION_INVALID');
    });

    it('UNAUTHORIZEDエラーを変換する', () => {
      const error = mapSessionErrorToAppError('UNAUTHORIZED', 'セッションエラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('認証が必要です');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('NETWORKエラーを変換する', () => {
      const error = mapSessionErrorToAppError('NETWORK', 'ネットワークエラー発生');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('NETWORK');
      expect(error.message).toBe('ネットワークエラーが発生しました');
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.originalError?.message).toBe('ネットワークエラー発生');
    });

    it('未知のエラーを変換する', () => {
      const error = mapSessionErrorToAppError('UNKNOWN' as any, 'その他のエラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('その他のエラー');
      expect(error.code).toBe('AUTH_ERROR');
    });
  });
});
