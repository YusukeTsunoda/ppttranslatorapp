import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FilePathManager, FILE_CONFIG, generateFileId, wait, withRetry } from '@/lib/utils/file-utils';
import { join } from 'path';

// fs/promises と fs のモックは jest.setup.js で設定済み
jest.mock('fs/promises');
jest.mock('fs');

// グローバルのユーティリティ関数を使用
declare global {
  function __mockReaddir(files: string[]): void;
  function __mockExistsSync(exists: boolean): void;
  function __mockMkdir(implementationFn?: Function): void;
}

describe('ファイルユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FilePathManager', () => {
    let filePathManager: FilePathManager;
    const userId = 'user123';
    const fileId = 'file123';

    beforeEach(() => {
      filePathManager = new FilePathManager();
    });

    describe('getTempPath', () => {
      it('正しい一時ファイルパスを返す', () => {
        const result = filePathManager.getTempPath(userId, fileId);
        const expected = join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_original.pptx`);
        expect(result).toBe(expected);
      });
    });

    describe('getPublicPath', () => {
      it('正しい公開ファイルパスを返す', () => {
        const result = filePathManager.getPublicPath(userId, fileId);
        expect(result).toBe(`uploads/${userId}/${fileId}_translated.pptx`);
      });
    });

    describe('getProcessingPath', () => {
      it('正しい処理中ファイルパスを返す', () => {
        const result = filePathManager.getProcessingPath(userId, fileId);
        expect(result).toBe(`${FILE_CONFIG.processingDir}/${userId}/${fileId}`);
      });
    });
  });

  describe('generateFileId', () => {
    it('一意のファイルIDを生成する', () => {
      const id = generateFileId();
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });
  });

  describe('wait', () => {
    it('指定された時間だけ待機する', async () => {
      jest.useFakeTimers();
      const waitPromise = wait(1000);
      jest.advanceTimersByTime(1000);
      await waitPromise;
      jest.useRealTimers();
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('初回で成功した場合はリトライしない', async () => {
      const operation = jest.fn<() => Promise<string>>().mockResolvedValue('成功');
      const onError = jest.fn();

      const result = await withRetry(operation, { maxRetries: 3, delay: 100, onError });

      expect(result).toBe('成功');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('失敗後にリトライして成功する場合', async () => {
      const operation = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('エラー1'))
        .mockResolvedValue('成功');
      const onError = jest.fn();

      const retryPromise = withRetry(operation, { maxRetries: 3, delay: 100, onError });

      await Promise.resolve(); // 初回実行
      jest.advanceTimersByTime(100); // 遅延
      await Promise.resolve(); // リトライ

      const result = await retryPromise;

      expect(result).toBe('成功');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('最大リトライ回数を超えた場合はエラーをスロー', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('エラー'));
      const onError = jest.fn();

      const retryPromise = withRetry(operation, { maxRetries: 2, delay: 100, onError });

      await Promise.resolve(); // 初回実行
      jest.advanceTimersByTime(100); // 1回目の遅延
      await Promise.resolve(); // 1回目のリトライ
      jest.advanceTimersByTime(200); // 2回目の遅延

      await expect(retryPromise).rejects.toThrow('エラー');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });
});
