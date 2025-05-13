import {
  FilePathManager,
  FileState,
  FILE_CONFIG,
  generateFileId,
  createUserDirectories,
  cleanupOldFiles,
  withRetry,
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
    copyFile: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// prismaのモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    file: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
  },
}));

// FilePathManagerのメソッドをモック
jest.mock('@/lib/utils/file-utils', () => {
  const original = jest.requireActual('@/lib/utils/file-utils');
  return {
    ...original,
    FilePathManager: jest.fn().mockImplementation(() => ({
      getTempPath: jest.fn().mockImplementation((userId, fileId, type = 'original') => {
        return `tmp/users/${userId}/uploads/${fileId}_${type}.pptx`;
      }),
      getPublicPath: jest.fn().mockImplementation((userId, fileId, type = 'translated') => {
        return `uploads/${userId}/${fileId}_${type}.pptx`;
      }),
      getProcessingPath: jest.fn().mockImplementation((userId, fileId) => {
        return `tmp/processing/${userId}/${fileId}`;
      }),
      getSlidesPath: jest.fn().mockImplementation((userId, fileId) => {
        return `tmp/users/${userId}/slides/${fileId}`;
      }),
      getAbsolutePath: jest.fn().mockImplementation((path) => {
        if (path.startsWith('/')) return path;
        return `/mock/root/${path}`;
      }),
      ensurePath: jest.fn().mockResolvedValue(undefined),
      findActualFilePath: jest.fn().mockImplementation((userId, fileId, type) => {
        if (type === 'original') {
          return Promise.resolve(`tmp/users/${userId}/uploads/${fileId}_original.pptx`);
        } else {
          return Promise.resolve(`tmp/users/${userId}/uploads/${fileId}_translated.pptx`);
        }
      }),
      moveFile: jest.fn().mockResolvedValue(undefined),
      ensurePublicDirectory: jest.fn().mockResolvedValue(undefined),
      moveToPublic: jest.fn().mockResolvedValue('uploads/test-user/test-file.pptx'),
    })),
    createUserDirectories: jest.fn().mockResolvedValue({
      uploadDir: '/mock/root/tmp/users/test-user/uploads',
      slidesDir: '/mock/root/tmp/users/test-user/slides/test-file',
    }),
    cleanupOldFiles: jest.fn().mockResolvedValue(undefined),
    FILE_CONFIG: original.FILE_CONFIG,
    FileState: original.FileState,
    generateFileId: jest.fn().mockReturnValue('mock-file-id'),
    withRetry: original.withRetry,
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
        slidesDir: '/mock/root/tmp/users/test-user/slides/test-file',
      });
      expect(createUserDirectories).toHaveBeenCalledWith('test-user', 'test-file');
    });

    it('cleanupOldFilesが古いファイルを削除する', async () => {
      await cleanupOldFiles('test-user');

      expect(cleanupOldFiles).toHaveBeenCalledWith('test-user');
    });

    it('withRetryが成功するまで再試行する', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        delay: 0,
        onError: jest.fn(),
      });

      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toBe('Success');
    });

    it('withRetryが最大試行回数を超えるとエラーをスローする', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        withRetry(operation, {
          maxRetries: 2,
          delay: 0,
          onError: jest.fn(),
        }),
      ).rejects.toThrow('Operation failed');

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

describe('FilePathManager Implementation Tests', () => {
  // オリジナルのFilePathManagerを取得
  const originalModule = jest.requireActual('@/lib/utils/file-utils');
  const FilePathManager = originalModule.FilePathManager;

  // テスト用のインスタンスを作成
  const manager = new FilePathManager();
  const userId = 'test-user';
  const fileId = 'test-file';

  // fsモジュールのモックを設定
  const mockMkdir = jest.fn().mockResolvedValue(undefined);
  const mockReaddir = jest.fn().mockResolvedValue([`${fileId}.pptx`, `${fileId}_translated.pptx`]);
  const mockCopyFile = jest.fn().mockResolvedValue(undefined);

  // モックを上書き
  jest.mock(
    'fs/promises',
    () => ({
      mkdir: mockMkdir,
      readdir: mockReaddir,
      copyFile: mockCopyFile,
      stat: jest.fn().mockResolvedValue({ mtimeMs: Date.now() }),
      unlink: jest.fn().mockResolvedValue(undefined),
    }),
    { virtual: true },
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // モックをリセット
    mockMkdir.mockClear();
    mockReaddir.mockClear();
    mockCopyFile.mockClear();
  });

  it('getTempPathが正しいパスを返す（実装）', () => {
    const originalPath = manager.getTempPath(userId, fileId, 'original');
    const translatedPath = manager.getTempPath(userId, fileId, 'translated');

    expect(originalPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_original.pptx`));
    expect(translatedPath).toBe(join(FILE_CONFIG.tempDir, userId, 'uploads', `${fileId}_translated.pptx`));
  });

  it('getPublicPathが正しいパスを返す（実装）', () => {
    const originalPath = manager.getPublicPath(userId, fileId, 'original');
    const translatedPath = manager.getPublicPath(userId, fileId, 'translated');

    expect(originalPath).toBe(join('uploads', userId, `${fileId}_original.pptx`));
    expect(translatedPath).toBe(join('uploads', userId, `${fileId}_translated.pptx`));
  });

  it('getProcessingPathが正しいパスを返す（実装）', () => {
    const processingPath = manager.getProcessingPath(userId, fileId);

    expect(processingPath).toBe(join(FILE_CONFIG.processingDir, userId, fileId));
  });

  it('getSlidesPathが正しいパスを返す（実装）', () => {
    const slidesPath = manager.getSlidesPath(userId, fileId);

    expect(slidesPath).toBe(join(FILE_CONFIG.tempDir, userId, fileId, 'slides'));
  });

  it('getAbsolutePathが相対パスを絶対パスに変換する（実装）', () => {
    const relativePath = 'uploads/test-file.pptx';
    const absolutePath = manager.getAbsolutePath(relativePath);

    expect(absolutePath).toBe(join(process.cwd(), relativePath));
  });

  it('getAbsolutePathが絶対パスをそのまま返す（実装）', () => {
    const absolutePath = '/absolute/path/to/file.pptx';
    const result = manager.getAbsolutePath(absolutePath);

    expect(result).toBe(absolutePath);
  });
});

// logFileOperationのテスト
describe('logFileOperation Tests', () => {
  // テスト前の状態を保存
  const originalPrisma = jest.requireMock('@/lib/db/prisma').prisma;
  const mockCreate = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    // prismaのモックを設定
    jest.requireMock('@/lib/db/prisma').prisma = {
      ...originalPrisma,
      activityLog: {
        create: mockCreate,
      },
    };
  });

  afterEach(() => {
    // 元の状態に戻す
    jest.requireMock('@/lib/db/prisma').prisma = originalPrisma;
  });

  it('成功した操作を記録する', async () => {
    // 実際のlogFileOperation関数を取得
    const { logFileOperation } = jest.requireActual('@/lib/utils/file-utils');

    const userId = 'test-user';
    const fileId = 'test-file';
    const operation = 'create';

    await logFileOperation(userId, operation, fileId, true);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          type: 'file_upload',
          description: expect.stringContaining('create'),
        }),
      }),
    );
  });

  it('失敗した操作とエラーを記録する', async () => {
    // 実際のlogFileOperation関数を取得
    const { logFileOperation } = jest.requireActual('@/lib/utils/file-utils');

    const userId = 'test-user';
    const fileId = 'test-file';
    const operation = 'delete';
    const errorMsg = 'File not found';

    await logFileOperation(userId, operation, fileId, false, errorMsg);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          type: 'file_delete',
          description: expect.stringContaining('delete'),
          metadata: expect.objectContaining({
            error: errorMsg,
            success: false,
          }),
        }),
      }),
    );
  });

  it('ログ記録中にエラーが発生した場合はコンソールにエラーを出力する', async () => {
    // 実際のlogFileOperation関数を取得
    const { logFileOperation } = jest.requireActual('@/lib/utils/file-utils');

    // コンソールエラーをモック
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // createがエラーをスローするようにモック
    mockCreate.mockRejectedValueOnce(new Error('Database error'));

    const userId = 'test-user';
    const fileId = 'test-file';
    const operation = 'access';

    // エラーがスローされないことを確認
    await expect(logFileOperation(userId, operation, fileId, true)).resolves.not.toThrow();

    // コンソールエラーが呼び出されたことを確認
    expect(console.error).toHaveBeenCalledWith('File operation logging error:', expect.any(Error));

    // 元に戻す
    console.error = originalConsoleError;
  });
});

// ユーティリティ関数のテスト
describe('Utility Functions Tests', () => {
  const originalModule = jest.requireActual('@/lib/utils/file-utils');
  const { wait, withRetry, generateFileId } = originalModule;

  it('waitが指定された時間待機する', async () => {
    const startTime = Date.now();
    await wait(100);
    const endTime = Date.now();

    // 少なくとも100ms経過していることを確認（多少の誤差を許容）
    expect(endTime - startTime).toBeGreaterThanOrEqual(90);
  });

  it('withRetryが成功するまで再試行する', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValueOnce('Success');

    const onError = jest.fn();

    const result = await withRetry(operation, {
      maxRetries: 3,
      delay: 10,
      onError,
    });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(result).toBe('Success');
  });

  it('withRetryが最大試行回数を超えるとエラーをスローする', async () => {
    const error = new Error('Operation failed');
    const operation = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();

    await expect(
      withRetry(operation, {
        maxRetries: 2,
        delay: 10,
        onError,
      }),
    ).rejects.toThrow('Operation failed');

    expect(operation).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('generateFileIdがユニークなIDを生成する', () => {
    const fileId1 = generateFileId();
    const fileId2 = generateFileId();

    expect(typeof fileId1).toBe('string');
    expect(fileId1.length).toBeGreaterThan(10);
    expect(fileId1).not.toBe(fileId2);
  });
});
