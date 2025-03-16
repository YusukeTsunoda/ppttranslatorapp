import { FilePathManager, FileState, FILE_CONFIG, generateFileId, wait, withRetry } from '@/lib/utils/file-utils';
import { mkdir, readdir, unlink, stat, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/db/prisma';

// モック設定
jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn()
}));
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    fileActivity: {
      create: jest.fn().mockResolvedValue({}),
    },
    file: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}));
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('ファイルユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FilePathManager', () => {
    const filePathManager = new FilePathManager();
    const userId = 'test-user-id';
    const fileId = 'test-file-id';

    describe('getTempPath', () => {
      it('オリジナルファイルの一時パスを正しく生成する', () => {
        const path = filePathManager.getTempPath(userId, fileId, 'original');
        expect(path).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}_original.pptx`);
        expect(join).toHaveBeenCalledWith(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_original.pptx`);
      });

      it('翻訳済みファイルの一時パスを正しく生成する', () => {
        const path = filePathManager.getTempPath(userId, fileId, 'translated');
        expect(path).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}_translated.pptx`);
        expect(join).toHaveBeenCalledWith(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_translated.pptx`);
      });

      it('タイプが指定されていない場合はデフォルトでオリジナルを使用する', () => {
        const path = filePathManager.getTempPath(userId, fileId);
        expect(path).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}_original.pptx`);
      });
    });

    describe('findActualFilePath', () => {
      it('ファイルが存在する場合はパスを返す', async () => {
        (readdir as jest.Mock).mockResolvedValueOnce([`${fileId}_original.pptx`, 'other-file.pptx']);
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        
        expect(result).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}_original.pptx`);
        expect(readdir).toHaveBeenCalledWith(`${FILE_CONFIG.tempDir}/${userId}/uploads`);
      });

      it('ファイルが存在しない場合はnullを返す', async () => {
        (readdir as jest.Mock).mockResolvedValueOnce(['other-file.pptx']);
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        
        expect(result).toBeNull();
      });

      it('ディレクトリの読み取りに失敗した場合はnullを返す', async () => {
        (readdir as jest.Mock).mockRejectedValueOnce(new Error('読み取りエラー'));
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        
        expect(result).toBeNull();
      });
    });
  });

  describe('generateFileId', () => {
    it('一意のファイルIDを生成する', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();
      
      expect(id1).toMatch(/^file_[a-zA-Z0-9]{16}$/);
      expect(id2).toMatch(/^file_[a-zA-Z0-9]{16}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('wait', () => {
    it('指定された時間だけ待機する', async () => {
      jest.useFakeTimers();
      
      const waitPromise = wait(1000);
      jest.advanceTimersByTime(1000);
      await waitPromise;
      
      // 正常に完了すればテスト成功
      expect(true).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('withRetry', () => {
    it('初回で成功した場合はリトライしない', async () => {
      const operation = jest.fn().mockResolvedValueOnce('成功');
      const onError = jest.fn();
      
      const result = await withRetry(operation, { maxRetries: 3, delay: 100, onError });
      
      expect(result).toBe('成功');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('失敗後にリトライして成功する場合', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('エラー1'))
        .mockResolvedValueOnce('成功');
      const onError = jest.fn();
      
      const result = await withRetry(operation, { maxRetries: 3, delay: 100, onError });
      
      expect(result).toBe('成功');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('最大リトライ回数を超えた場合はエラーをスロー', async () => {
      const error = new Error('エラー');
      const operation = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();
      
      await expect(withRetry(operation, { maxRetries: 2, delay: 100, onError }))
        .rejects
        .toThrow('エラー');
      
      expect(operation).toHaveBeenCalledTimes(3); // 初回 + 2回のリトライ
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });
});
