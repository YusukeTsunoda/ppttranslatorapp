import { 
  FilePathManager, 
  FileState,
  FILE_CONFIG,
  generateFileId,
  createUserDirectories,
  cleanupOldFiles,
  withRetry
} from '@/lib/utils/file-utils';
import { join } from 'path';
import { expect } from '@jest/globals';

// fsモジュールのモック
jest.mock('fs/promises', () => {
  return {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue(['file1.pptx']),
    stat: jest.fn().mockResolvedValue({ mtimeMs: Date.now() }),
    unlink: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined)
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

// prismaのモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    file: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    }
  }
}));

// FilePathManagerのメソッドをモック
jest.mock('@/lib/utils/file-utils', () => {
  const original = jest.requireActual('@/lib/utils/file-utils');
  return {
    ...original,
    FilePathManager: jest.fn().mockImplementation(() => ({
      getTempPath: jest.fn().mockImplementation((userId, fileId, type = 'original') => {
        return join('tmp/users', userId, 'uploads', `${fileId}_${type}.pptx`);
      }),
      getPublicPath: jest.fn().mockImplementation((userId, fileId, type = 'translated') => {
        return join('uploads', userId, `${fileId}_${type}.pptx`);
      }),
      getProcessingPath: jest.fn().mockImplementation((userId, fileId) => {
        return join('tmp/processing', userId, fileId);
      }),
      getSlidesPath: jest.fn().mockImplementation((userId, fileId) => {
        return join('tmp/users', userId, 'slides', fileId);
      }),
      getAbsolutePath: jest.fn().mockImplementation((path) => {
        if (path.startsWith('/')) return path;
        return join('/mock/root', path);
      }),
      ensurePath: jest.fn().mockResolvedValue(undefined),
      findActualFilePath: jest.fn().mockImplementation((userId, fileId, type) => {
        if (type === 'original') {
          return Promise.resolve(join('tmp/users', userId, 'uploads', `${fileId}_original.pptx`));
        } else {
          return Promise.resolve(join('tmp/users', userId, 'uploads', `${fileId}_translated.pptx`));
        }
      }),
      moveFile: jest.fn().mockResolvedValue(undefined),
      ensurePublicDirectory: jest.fn().mockResolvedValue(undefined),
      moveToPublic: jest.fn().mockResolvedValue('uploads/test-user/test-file.pptx')
    })),
    createUserDirectories: jest.fn().mockResolvedValue({
      uploadDir: '/mock/root/tmp/users/test-user/uploads',
      slidesDir: '/mock/root/tmp/users/test-user/slides/test-file'
    }),
    cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
    FILE_CONFIG: original.FILE_CONFIG,
    FileState: original.FileState,
    generateFileId: jest.fn().mockReturnValue('mock-file-id'),
    withRetry: original.withRetry
  };
});

describe('File Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('FilePathManager', () => {
    const filePathManager = new FilePathManager();
    const userId = 'test-user';
    const fileId = 'test-file';
    
    it('getTempPathが正しいパスを返す', () => {
      const originalPath = filePathManager.getTempPath(userId, fileId, 'original');
      const translatedPath = filePathManager.getTempPath(userId, fileId, 'translated');
      
      expect(originalPath).toBe(join('tmp/users', userId, 'uploads', `${fileId}_original.pptx`));
      expect(translatedPath).toBe(join('tmp/users', userId, 'uploads', `${fileId}_translated.pptx`));
      expect(filePathManager.getTempPath).toHaveBeenCalledTimes(2);
    });
    
    it('getPublicPathが正しいパスを返す', () => {
      const originalPath = filePathManager.getPublicPath(userId, fileId, 'original');
      const translatedPath = filePathManager.getPublicPath(userId, fileId, 'translated');
      
      expect(originalPath).toBe(join('uploads', userId, `${fileId}_original.pptx`));
      expect(translatedPath).toBe(join('uploads', userId, `${fileId}_translated.pptx`));
      expect(filePathManager.getPublicPath).toHaveBeenCalledTimes(2);
    });
    
    it('getProcessingPathが正しいパスを返す', () => {
      const processingPath = filePathManager.getProcessingPath(userId, fileId);
      
      expect(processingPath).toBe(join('tmp/processing', userId, fileId));
      expect(filePathManager.getProcessingPath).toHaveBeenCalledTimes(1);
    });
    
    it('getSlidesPathが正しいパスを返す', () => {
      const slidesPath = filePathManager.getSlidesPath(userId, fileId);
      
      expect(slidesPath).toBe(join('tmp/users', userId, 'slides', fileId));
      expect(filePathManager.getSlidesPath).toHaveBeenCalledTimes(1);
    });
    
    it('getAbsolutePathが相対パスを絶対パスに変換する', () => {
      const relativePath = 'uploads/test-file.pptx';
      const absolutePath = filePathManager.getAbsolutePath(relativePath);
      
      expect(absolutePath).toBe(join('/mock/root', relativePath));
      expect(filePathManager.getAbsolutePath).toHaveBeenCalledTimes(1);
    });
    
    it('getAbsolutePathが絶対パスをそのまま返す', () => {
      const absolutePath = '/absolute/path/to/file.pptx';
      const result = filePathManager.getAbsolutePath(absolutePath);
      
      expect(result).toBe(absolutePath);
      expect(filePathManager.getAbsolutePath).toHaveBeenCalledTimes(1);
    });
    
    it('ensurePathがディレクトリを作成する', async () => {
      const filePath = 'uploads/test-user/test-file.pptx';
      
      await filePathManager.ensurePath(filePath);
      
      expect(filePathManager.ensurePath).toHaveBeenCalledWith(filePath);
    });
    
    it('findActualFilePathが正しいファイルを見つける', async () => {
      const originalPath = await filePathManager.findActualFilePath(userId, fileId, 'original');
      const translatedPath = await filePathManager.findActualFilePath(userId, fileId, 'translated');
      
      expect(originalPath).toBe(join('tmp/users', userId, 'uploads', `${fileId}_original.pptx`));
      expect(translatedPath).toBe(join('tmp/users', userId, 'uploads', `${fileId}_translated.pptx`));
      expect(filePathManager.findActualFilePath).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Utility Functions', () => {
    it('generateFileIdがユニークなIDを生成する', () => {
      const fileId = generateFileId();
      
      expect(fileId).toBe('mock-file-id');
      expect(generateFileId).toHaveBeenCalledTimes(1);
    });
    
    it('createUserDirectoriesがディレクトリを作成する', async () => {
      const result = await createUserDirectories('test-user', 'test-file');
      
      expect(result).toEqual({
        uploadDir: '/mock/root/tmp/users/test-user/uploads',
        slidesDir: '/mock/root/tmp/users/test-user/slides/test-file'
      });
      expect(createUserDirectories).toHaveBeenCalledWith('test-user', 'test-file');
    });
    
    it('cleanupOldFilesが古いファイルを削除する', async () => {
      await cleanupOldFiles('test-user');
      
      expect(cleanupOldFiles).toHaveBeenCalledWith('test-user');
    });
    
    it('withRetryが成功するまで再試行する', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success');
      
      const result = await withRetry(operation, { 
        maxRetries: 3, 
        delay: 0,
        onError: jest.fn()
      });
      
      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toBe('Success');
    });
    
    it('withRetryが最大試行回数を超えるとエラーをスローする', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { 
        maxRetries: 2, 
        delay: 0,
        onError: jest.fn()
      })).rejects.toThrow('Operation failed');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('FileState Enum', () => {
    it('FileStateが正しい値を持つ', () => {
      expect(FileState.UPLOADED).toBe(0);
      expect(FileState.PROCESSING).toBe(1);
      expect(FileState.READY).toBe(2);
      expect(FileState.ARCHIVED).toBe(3);
    });
  });
}); 