import { FilePathManager, FileState, FILE_CONFIG, generateFileId, wait, withRetry } from '@/lib/utils/file-utils';
import { mkdir, readdir, unlink, stat, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/db/prisma';

// モック設定
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ isFile: () => true }),
  copyFile: jest.fn().mockResolvedValue(undefined)
}));
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
    let filePathManager: FilePathManager;
    const userId = 'user123';
    const fileId = 'file123';

    beforeEach(() => {
      filePathManager = new FilePathManager(FILE_CONFIG);
      jest.clearAllMocks();
    });

    describe('getTempPath', () => {
      it('正しい一時ファイルパスを返す', () => {
        const result = filePathManager.getTempPath(userId, fileId);
        expect(result).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}`);
      });
    });

    describe('getPublicPath', () => {
      it('正しい公開ファイルパスを返す', () => {
        const result = filePathManager.getPublicPath(userId, fileId);
        expect(result).toBe(`${FILE_CONFIG.publicDir}/${userId}/${fileId}`);
      });
    });

    describe('getProcessingPath', () => {
      it('正しい処理中ファイルパスを返す', () => {
        const result = filePathManager.getProcessingPath(userId, fileId);
        expect(result).toBe(`${FILE_CONFIG.processingDir}/${userId}/${fileId}`);
      });
    });

    describe('findActualFilePath', () => {
      it('ファイルが存在する場合はパスを返す', async () => {
        // モックを設定
        (readdir as jest.Mock).mockResolvedValue([`${fileId}_original.pptx`, 'other-file.pptx']);
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        expect(result).toBe(`${FILE_CONFIG.tempDir}/${userId}/uploads/${fileId}_original.pptx`);
      });

      it('ファイルが存在しない場合はnullを返す', async () => {
        // モックを設定
        (readdir as jest.Mock).mockResolvedValue(['other-file.pptx']);
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        expect(result).toBeNull();
      });

      it('ディレクトリの読み取りに失敗した場合はnullを返す', async () => {
        // モックを設定
        (readdir as jest.Mock).mockRejectedValue(new Error('読み取りエラー'));
        
        const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
        expect(result).toBeNull();
      });
    });

    describe('ensurePath', () => {
      it('ディレクトリが存在しない場合は作成する', async () => {
        // モックを設定
        (existsSync as jest.Mock).mockReturnValue(false);
        
        const dirPath = `${FILE_CONFIG.tempDir}/${userId}/uploads`;
        await filePathManager.ensurePath(dirPath);
        
        expect(mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      });

      it('ディレクトリが既に存在する場合は何もしない', async () => {
        // モックを設定
        (existsSync as jest.Mock).mockReturnValue(true);
        
        const dirPath = `${FILE_CONFIG.tempDir}/${userId}/uploads`;
        await filePathManager.ensurePath(dirPath);
        
        expect(mkdir).not.toHaveBeenCalled();
      });
    });
  });

  describe('generateFileId', () => {
    it('一意のファイルIDを生成する', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();
      
      // タイムスタンプとランダム文字列の形式になっているかチェック
      expect(id1).toMatch(/^\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+_[a-z0-9]+$/);
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
      
      expect(operation).toHaveBeenCalledTimes(2); // 初回 + 1回のリトライ
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });
});
