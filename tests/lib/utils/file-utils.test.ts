import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FilePathManager, FILE_CONFIG, generateFileId, withRetry } from '@/lib/utils/file-utils';
import { join } from 'path';
import { promises as fs } from 'fs';

// fsモジュールのモック
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue(['test-file.pptx']),
  copyFile: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ mtimeMs: Date.now() }),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

describe('FilePathManager', () => {
  let filePathManager: FilePathManager;
  const userId = 'test-user';
  const fileId = 'test-file';

  beforeEach(() => {
    jest.clearAllMocks();
    filePathManager = new FilePathManager();
  });

  describe('パス生成メソッド', () => {
    it('getTempPathが正しいパスを返す', () => {
      const originalPath = filePathManager.getTempPath(userId, fileId, 'original');
      const translatedPath = filePathManager.getTempPath(userId, fileId, 'translated');

      expect(originalPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_original.pptx`));
      expect(translatedPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_translated.pptx`));
    });

    it('getPublicPathが正しいパスを返す', () => {
      const originalPath = filePathManager.getPublicPath(userId, fileId, 'original');
      const translatedPath = filePathManager.getPublicPath(userId, fileId, 'translated');

      expect(originalPath).toBe(join('uploads', userId, `${fileId}_original.pptx`));
      expect(translatedPath).toBe(join('uploads', userId, `${fileId}_translated.pptx`));
    });

    it('getProcessingPathが正しいパスを返す', () => {
      const path = filePathManager.getProcessingPath(userId, fileId);
      expect(path).toBe(join(FILE_CONFIG.processingDir, userId, fileId));
    });

    it('getSlidesPathが正しいパスを返す', () => {
      const path = filePathManager.getSlidesPath(userId, fileId);
      expect(path).toBe(join(FILE_CONFIG.tempDir, userId, fileId, 'slides'));
    });
  });

  describe('パス変換メソッド', () => {
    it('getAbsolutePathが相対パスを絶対パスに変換する', () => {
      const relativePath = 'uploads/test-file.pptx';
      const absolutePath = filePathManager.getAbsolutePath(relativePath);
      expect(absolutePath).toBe(join(process.cwd(), relativePath));
    });

    it('getAbsolutePathが絶対パスをそのまま返す', () => {
      const absolutePath = '/absolute/path/to/file.pptx';
      const result = filePathManager.getAbsolutePath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('ファイル操作メソッド', () => {
    it('findActualFilePathが正しいファイルを見つける', async () => {
      const mockFiles = [`${fileId}.pptx`, `${fileId}_translated.pptx`];
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const originalPath = await filePathManager.findActualFilePath(userId, fileId, 'original');
      const translatedPath = await filePathManager.findActualFilePath(userId, fileId, 'translated');

      expect(originalPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}.pptx`));
      expect(translatedPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_translated.pptx`));
    });

    it('findActualFilePathがファイルが見つからない場合nullを返す', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['other-file.pptx']);

      const result = await filePathManager.findActualFilePath(userId, fileId, 'original');
      expect(result).toBeNull();
    });

    it('ensurePathがディレクトリを作成する', async () => {
      const filePath = join('uploads', userId, 'test-file.pptx');
      await filePathManager.ensurePath(filePath);

      expect(fs.mkdir).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', userId),
        { recursive: true }
      );
    });

    it('moveToPublicがファイルを公開ディレクトリに移動する', async () => {
      const sourcePath = join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_translated.pptx`);
      const destPath = join(FILE_CONFIG.publicDir, userId, `${fileId}_translated.pptx`);
      
      (fs.readdir as jest.Mock).mockResolvedValue([`${fileId}_translated.pptx`]);

      const result = await filePathManager.moveToPublic(userId, fileId);

      expect(fs.mkdir).toHaveBeenCalledWith(
        join(process.cwd(), FILE_CONFIG.publicDir, userId),
        { recursive: true }
      );
      expect(fs.copyFile).toHaveBeenCalledWith(
        join(process.cwd(), sourcePath),
        join(process.cwd(), destPath)
      );
      expect(result).toBe(join('uploads', userId, `${fileId}_translated.pptx`));
    });
  });
});

describe('ユーティリティ関数', () => {
  describe('generateFileId', () => {
    it('一意のファイルIDを生成する', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-f0-9-]+$/);
    });
  });

  describe('withRetry', () => {
    it('成功時に結果を返す', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation, { maxRetries: 3, delay: 100 });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('失敗時にリトライする', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3, delay: 100 });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数を超えた場合にエラーを投げる', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      await expect(withRetry(operation, { maxRetries: 3, delay: 100 }))
        .rejects.toThrow('fail');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
