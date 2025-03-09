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
} from '@/lib/utils/error-handler';
import { toast } from '@/components/ui/use-toast';

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
      expect(error.type).toBe('AUTH');
      expect(error.message).toBe('認証に失敗しました');
    });

    it('バリデーションエラーを正しく作成する', () => {
      const context = { field: 'email', message: '有効なメールアドレスを入力してください' };
      const error = createValidationError('入力内容に誤りがあります', context);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('VALIDATION');
      expect(error.message).toBe('入力内容に誤りがあります');
      expect(error.context).toEqual(context);
    });

    it('Not Foundエラーを正しく作成する', () => {
      const error = createNotFoundError('リソースが見つかりません');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('NOT_FOUND');
      expect(error.message).toBe('リソースが見つかりません');
    });

    it('権限エラーを正しく作成する', () => {
      const error = createForbiddenError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('PERMISSION');
      expect(error.message).toBe('この操作を実行する権限がありません。');
    });

    it('データベースエラーを正しく作成する', () => {
      const originalError = new Error('DB connection failed');
      const error = createDatabaseError('データベースエラーが発生しました', originalError);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe('SERVER');
      expect(error.message).toBe('データベースエラーが発生しました');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('エラーハンドリング関数', () => {
    it('クライアントエラーを正しく処理する', () => {
      const error = new Error('テストエラー');
      handleClientError(error);
      
      expect(console.error).toHaveBeenCalledWith('Client error:', error);
      expect(toast).toHaveBeenCalledWith({
        title: 'エラー',
        description: 'テストエラー',
        variant: 'destructive',
      });
    });

    it('AppErrorのクライアントエラーを正しく処理する', () => {
      const error = createValidationError('入力内容に誤りがあります');
      handleClientError(error);
      
      expect(console.error).toHaveBeenCalledWith('Client error:', error);
      expect(toast).toHaveBeenCalledWith({
        title: 'エラー',
        description: '入力内容に誤りがあります',
        variant: 'default',
      });
    });

    it('APIエラーを正しく処理する', () => {
      const error = createAuthError('認証に失敗しました');
      const result = handleApiError(error);
      
      expect(console.error).toHaveBeenCalledWith('API error:', error);
      expect(result).toEqual({
        error: '認証に失敗しました',
        code: error.code,
        status: 401,
      });
    });
  });

  describe('AppErrorクラス', () => {
    it('正しく初期化される', () => {
      const error = new AppError({
        type: 'UNKNOWN',
        message: 'テストエラー',
      });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('テストエラー');
      expect(error.type).toBe('UNKNOWN');
    });

    it('コンテキスト情報を持つことができる', () => {
      const context = { userId: '123', action: 'delete' };
      const error = new AppError({
        type: 'PERMISSION',
        message: '権限がありません',
        context,
      });
      
      expect(error.message).toBe('権限がありません');
      expect(error.type).toBe('PERMISSION');
      expect(error.context).toEqual(context);
    });

    it('元のエラーを保持できる', () => {
      const originalError = new Error('元のエラー');
      const error = new AppError({
        type: 'SERVER',
        message: 'サーバーエラー',
        originalError,
      });
      
      expect(error.message).toBe('サーバーエラー');
      expect(error.type).toBe('SERVER');
      expect(error.originalError).toBe(originalError);
    });
  });
}); 