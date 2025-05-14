import {
  createAuthError,
  createValidationError,
  createNotFoundError,
  createForbiddenError,
  createDatabaseError,
  handleClientError,
  handleApiError,
  AppError,
  ErrorType,
  ErrorCodes,
  isAppError,
  handleError,
  getErrorMessage,
  createRateLimitError,
  mapSessionErrorToAppError,
} from '@/lib/utils/error-handler';
import { toast } from '@/components/ui/use-toast';
import { expect } from '@jest/globals';

// トーストのモック
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// コンソールのモック
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('エラーハンドリングユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('エラー作成関数', () => {
    it('認証エラーを正しく作成する', () => {
      const error = createAuthError('認証に失敗しました');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.message).toBe('認証に失敗しました');
      expect(error.statusCode).toBe(401);
    });

    it('バリデーションエラーを正しく作成する', () => {
      const error = createValidationError('入力が無効です');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('入力が無効です');
      expect(error.statusCode).toBe(400);
    });

    it('Not Foundエラーを正しく作成する', () => {
      const error = createNotFoundError('リソースが見つかりません');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.message).toBe('リソースが見つかりません');
      expect(error.statusCode).toBe(404);
    });

    it('権限エラーを正しく作成する', () => {
      const error = createForbiddenError('権限がありません');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.FORBIDDEN);
      expect(error.message).toBe('権限がありません');
      expect(error.statusCode).toBe(403);
    });

    it('データベースエラーを正しく作成する', () => {
      const error = createDatabaseError('データベースエラーが発生しました');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.message).toBe('データベースエラーが発生しました');
      expect(error.statusCode).toBe(500);
    });

    it('レート制限エラーを正しく作成する', () => {
      const error = createRateLimitError('リクエスト数が制限を超えました');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.message).toBe('リクエスト数が制限を超えました');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('エラーハンドリング関数', () => {
    it('クライアントエラーを正しく処理する', () => {
      const error = new Error('クライアントエラー');
      handleClientError(error);

      expect(console.error).toHaveBeenCalledWith('Client error:', error);
    });

    it('AppErrorのクライアントエラーを正しく処理する', () => {
      const error = createAuthError('AppError認証エラー');
      handleClientError(error);

      expect(console.error).toHaveBeenCalledWith('Client error:', error);
    });

    it('APIエラーを正しく処理する', () => {
      const error = new Error('APIエラー');
      const result = handleApiError(error);

      expect(console.error).toHaveBeenCalledWith('API error:', error);
      expect(result).toEqual({
        error: 'APIエラー',
        code: ErrorCodes.UNKNOWN_ERROR,
        status: 500,
      });
    });

    it('ネットワークエラーを正しく処理する', () => {
      const error = new Error('Failed to fetch');
      handleClientError(error);

      expect(console.error).toHaveBeenCalledWith('Client error:', expect.any(AppError));
    });

    it('プリズマエラーを正しく処理する', () => {
      const error = new Error('Prisma error');
      error.name = 'PrismaClientKnownRequestError';
      handleClientError(error);

      expect(console.error).toHaveBeenCalledWith('Client error:', expect.any(AppError));
    });

    it('nullエラーを処理できる', () => {
      handleClientError(null);

      expect(console.error).toHaveBeenCalledWith('Client error:', expect.any(AppError));
    });
  });

  describe('AppErrorクラス', () => {
    it('正しく初期化される', () => {
      const error = new AppError({
        message: 'テストエラー',
        type: ErrorType.AUTH,
        statusCode: 401,
      });

      expect(error.message).toBe('テストエラー');
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AppError');
    });

    it('コンテキスト情報を持つことができる', () => {
      const context = { userId: '123', action: 'login' };
      const error = new AppError({
        message: 'テストエラー',
        type: ErrorType.AUTH,
        statusCode: 401,
        context,
      });

      expect(error.context).toEqual(context);
    });

    it('元のエラーを保持できる', () => {
      const originalError = new Error('元のエラー');
      const error = new AppError({
        message: 'テストエラー',
        type: ErrorType.AUTH,
        statusCode: 401,
        originalError,
      });

      expect(error.originalError).toBe(originalError);
    });

    it('デフォルト値で初期化できる', () => {
      const error = new AppError({
        message: 'テストエラー',
      });

      expect(error.message).toBe('テストエラー');
      expect(error.type).toBe(ErrorType.UNKNOWN);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('Error Creators', () => {
    it('createValidationErrorが正しいAppErrorを作成する', () => {
      const error = createValidationError('検証エラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('検証エラー');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('createAuthErrorが正しいAppErrorを作成する', () => {
      const error = createAuthError('認証エラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.message).toBe('認証エラー');
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('createForbiddenErrorが正しいAppErrorを作成する', () => {
      const error = createForbiddenError('アクセス拒否エラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.FORBIDDEN);
      expect(error.message).toBe('アクセス拒否エラー');
      expect(error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('createNotFoundErrorが正しいAppErrorを作成する', () => {
      const error = createNotFoundError('未検出エラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.message).toBe('未検出エラー');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('createRateLimitErrorが正しいAppErrorを作成する', () => {
      const error = createRateLimitError('レート制限エラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.message).toBe('レート制限エラー');
      expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });

    it('createDatabaseErrorが正しいAppErrorを作成する', () => {
      const error = createDatabaseError('データベースエラー');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.message).toBe('データベースエラー');
      expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
    });
  });

  describe('mapSessionErrorToAppError', () => {
    it('EXPIREDエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'EXPIRED' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.message).toBe('セッションの有効期限が切れました');
      expect(error.statusCode).toBe(401);
    });

    it('INVALIDエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'INVALID' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.message).toBe('無効なセッションです');
      expect(error.statusCode).toBe(401);
    });

    it('NETWORKエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'NETWORK' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('ネットワークエラーが発生しました');
      expect(error.statusCode).toBe(500);
    });

    it('UNAUTHORIZEDエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'UNAUTHORIZED' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.message).toBe('認証が必要です');
      expect(error.statusCode).toBe(401);
    });

    it('UNKNOWNエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'UNKNOWN' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.UNKNOWN);
      expect(error.message).toBe('不明なエラーが発生しました');
      expect(error.statusCode).toBe(500);
    });

    it('不明なタイプのエラーを正しく変換する', () => {
      const error = mapSessionErrorToAppError({ type: 'SOMETHING_ELSE' as any });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.UNKNOWN);
      expect(error.message).toBe('不明なエラーが発生しました');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('handleError関数', () => {
    it('AppErrorをそのまま返す', () => {
      const appError = createAuthError('認証エラー');
      const result = handleError(appError);
      
      expect(result).toBe(appError);
    });
    
    it('一般的なErrorをAppErrorに変換する', () => {
      const error = new Error('一般的なエラー');
      const result = handleError(error);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('一般的なエラー');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });
    
    it('nullやundefinedを処理できる', () => {
      const result = handleError(null);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('不明なエラーが発生しました');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    it('objectを文字列化して処理できる', () => {
      const obj = { foo: 'bar' };
      const result = handleError(obj as any);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toContain('{"foo":"bar"}');
    });
  });

  describe('isAppError関数', () => {
    it('AppErrorの場合はtrueを返す', () => {
      const error = createAuthError('認証エラー');
      expect(isAppError(error)).toBe(true);
    });
    
    it('一般的なErrorの場合はfalseを返す', () => {
      const error = new Error('一般的なエラー');
      expect(isAppError(error)).toBe(false);
    });
    
    it('nullやundefinedの場合はfalseを返す', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('getErrorMessage関数', () => {
    it('Errorインスタンスからメッセージを取得する', () => {
      const error = new Error('エラーメッセージ');
      expect(getErrorMessage(error)).toBe('エラーメッセージ');
    });
    
    it('文字列をそのまま返す', () => {
      expect(getErrorMessage('エラー文字列')).toBe('エラー文字列');
    });
    
    it('AppErrorからメッセージを取得する', () => {
      const error = createAuthError('AppErrorメッセージ');
      expect(getErrorMessage(error)).toBe('AppErrorメッセージ');
    });
    
    it('オブジェクトをJSON文字列に変換する', () => {
      const obj = { error: 'オブジェクトエラー' };
      expect(getErrorMessage(obj)).toBe('{"error":"オブジェクトエラー"}');
    });
    
    it('nullやundefinedの場合はデフォルトメッセージを返す', () => {
      expect(getErrorMessage(null)).toBe('不明なエラーが発生しました');
      expect(getErrorMessage(undefined)).toBe('不明なエラーが発生しました');
    });
  });
});
