import { FilePathManager, FileState } from '@/lib/utils/file-utils';
import { join } from 'path';
import { expect } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';

// fs/promisesのモックを設定
const mockMkdir = jest.fn();
const mockCopyFile = jest.fn();
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  mkdir: mockMkdir,
  unlink: jest.fn(),
  stat: jest.fn(),
  copyFile: mockCopyFile,
}));

// fsのモックを設定
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// process.cwdのモック
const originalCwd = process.cwd;
process.cwd = jest.fn().mockReturnValue('/mock/root');

describe('FilePathManager', () => {
  const testConfig = {
    tempDir: 'test-tmp/users',
    publicDir: 'test-public/uploads',
    processingDir: 'test-tmp/processing',
    retentionPeriod: 24 * 60 * 60 * 1000,
    maxRetries: 3,
    retryDelay: 1000,
  };

  const userId = 'test-user-123';
  const fileId = 'test-file-456';
  
  let filePathManager: FilePathManager;
  let consoleErrorSpy: jest.SpyInstance;
  
  beforeEach(() => {
    filePathManager = new FilePathManager(testConfig);
    jest.clearAllMocks();
    // コンソールエラーを抑制
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // ensurePathメソッドをモック
    jest.spyOn(filePathManager, 'ensurePath').mockImplementation(async () => {
      return Promise.resolve();
    });
    
    // moveFileメソッドをモック
    jest.spyOn(filePathManager, 'moveFile').mockImplementation(async (sourcePath, destPath) => {
      return Promise.resolve();
    });
    
    // ensurePublicDirectoryメソッドをモック
    jest.spyOn(filePathManager, 'ensurePublicDirectory').mockImplementation(async () => {
      return Promise.resolve();
    });
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    // process.cwdを元に戻す
    process.cwd = originalCwd;
  });
  
  describe('getTempPath', () => {
    it('オリジナルファイルの一時パスを正しく生成する', () => {
      const result = filePathManager.getTempPath(userId, fileId, 'original');
      const expected = join(testConfig.tempDir, userId, 'uploads', `${fileId}_original.pptx`);
      expect(result).toBe(expected);
    });
    
    it('翻訳済みファイルの一時パスを正しく生成する', () => {
      const result = filePathManager.getTempPath(userId, fileId, 'translated');
      const expected = join(testConfig.tempDir, userId, 'uploads', `${fileId}_translated.pptx`);
      expect(result).toBe(expected);
    });
    
    it('タイプが指定されていない場合はデフォルトでオリジナルを使用する', () => {
      const result = filePathManager.getTempPath(userId, fileId);
      const expected = join(testConfig.tempDir, userId, 'uploads', `${fileId}_original.pptx`);
      expect(result).toBe(expected);
    });
  });
  
  describe('getPublicPath', () => {
    it('翻訳済みファイルの公開パスを正しく生成する', () => {
      const result = filePathManager.getPublicPath(userId, fileId, 'translated');
      const expected = join('uploads', userId, `${fileId}_translated.pptx`);
      expect(result).toBe(expected);
    });
    
    it('オリジナルファイルの公開パスを正しく生成する', () => {
      const result = filePathManager.getPublicPath(userId, fileId, 'original');
      const expected = join('uploads', userId, `${fileId}_original.pptx`);
      expect(result).toBe(expected);
    });
    
    it('タイプが指定されていない場合はデフォルトで翻訳済みを使用する', () => {
      const result = filePathManager.getPublicPath(userId, fileId);
      const expected = join('uploads', userId, `${fileId}_translated.pptx`);
      expect(result).toBe(expected);
    });
  });
  
  describe('getProcessingPath', () => {
    it('処理中ディレクトリのパスを正しく生成する', () => {
      const result = filePathManager.getProcessingPath(userId, fileId);
      const expected = join(testConfig.processingDir, userId, fileId);
      expect(result).toBe(expected);
    });
  });
  
  describe('getSlidesPath', () => {
    it('スライドディレクトリのパスを正しく生成する', () => {
      const result = filePathManager.getSlidesPath(userId, fileId);
      const expected = join(testConfig.tempDir, userId, 'slides', fileId);
      expect(result).toBe(expected);
    });
  });

  describe('getAbsolutePath', () => {
    it('相対パスを絶対パスに変換する', () => {
      const relativePath = 'relative/path/to/file.txt';
      const result = filePathManager.getAbsolutePath(relativePath);
      const expected = join('/mock/root', relativePath);
      expect(result).toBe(expected);
    });

    it('絶対パスはそのまま返す', () => {
      const absolutePath = '/absolute/path/to/file.txt';
      const result = filePathManager.getAbsolutePath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('moveToPublic', () => {
    it('ファイルを公開ディレクトリに移動する', async () => {
      // findActualFilePathのモック
      jest.spyOn(filePathManager, 'findActualFilePath').mockResolvedValueOnce('tmp/users/test-user-123/uploads/test-file-456_original.pptx');
      
      const result = await filePathManager.moveToPublic(userId, fileId, 'original');
      const expectedPublicPath = join('uploads', userId, `${fileId}_original.pptx`);
      
      expect(result).toBe(expectedPublicPath);
      expect(filePathManager.findActualFilePath).toHaveBeenCalledWith(userId, fileId, 'original');
      expect(filePathManager.ensurePublicDirectory).toHaveBeenCalledWith(userId);
      expect(filePathManager.moveFile).toHaveBeenCalled();
    });
    
    it('ファイルが見つからない場合はエラーをスローする', async () => {
      // findActualFilePathのモック（ファイルが見つからない）
      jest.spyOn(filePathManager, 'findActualFilePath').mockResolvedValueOnce(null);
      
      await expect(filePathManager.moveToPublic(userId, fileId, 'original')).rejects.toThrow(
        `original file not found for fileId: ${fileId}`
      );
    });
  });
}); 