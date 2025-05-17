import { describe, expect, it, jest } from '@jest/globals';
import { handleTranslationError, withRetry, logTranslationError, TranslationError } from '@/lib/translation/error-handler';

describe('Translation Error Handler', () => {
  describe('handleTranslationError', () => {
    it('レート制限エラーを適切に処理する', () => {
      const error: TranslationError = {
        name: 'RateLimitError',
        message: 'Rate limit exceeded',
        retryAfter: 30,
      } as TranslationError;

      const response = handleTranslationError(error);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('30');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('タイムアウトエラーを適切に処理する', () => {
      const error: TranslationError = {
        name: 'TimeoutError',
        message: 'Request timeout',
      } as TranslationError;

      const response = handleTranslationError(error);
      expect(response.status).toBe(504);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('ネットワークエラーを適切に処理する', () => {
      const error: TranslationError = {
        name: 'NetworkError',
        message: 'Network error',
      } as TranslationError;

      const response = handleTranslationError(error);
      expect(response.status).toBe(503);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('バリデーションエラーを適切に処理する', () => {
      const error: TranslationError = {
        name: 'ValidationError',
        message: 'Invalid request',
      } as TranslationError;

      const response = handleTranslationError(error);
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('不明なエラーを適切に処理する', () => {
      const error: TranslationError = {
        name: 'UnknownError',
        message: 'Unknown error',
      } as TranslationError;

      const response = handleTranslationError(error);
      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('withRetry', () => {
    it('最初の試行で成功した場合', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('リトライ後に成功する場合', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const result = await withRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数を超えた場合', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(withRetry(operation, 3)).rejects.toThrow('最大リトライ回数を超えました');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('リトライ不可能なエラーの場合は即座に失敗する', async () => {
      const error = new Error('Authentication failed');
      error.name = 'AuthenticationError';
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation)).rejects.toThrow('Authentication failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('logTranslationError', () => {
    it('エラーログを適切にフォーマットする', () => {
      // コンソール出力をモック
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      const context = { userId: 'test-user', operation: 'translate' };

      logTranslationError(error, context);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      
      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData).toHaveProperty('name', 'Error');
      expect(loggedData).toHaveProperty('message', 'Test error');
      expect(loggedData).toHaveProperty('stack');
      expect(loggedData).toHaveProperty('context.userId', 'test-user');
      expect(loggedData).toHaveProperty('context.operation', 'translate');

      // モックをリストア
      consoleSpy.mockRestore();
    });

    it('コンテキストなしでもエラーログを記録する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      logTranslationError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
      
      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData).toHaveProperty('name', 'Error');
      expect(loggedData).toHaveProperty('message', 'Test error');
      expect(loggedData).toHaveProperty('context');
      expect(Object.keys(loggedData.context)).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });
}); 