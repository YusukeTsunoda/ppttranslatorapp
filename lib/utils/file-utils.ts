import { mkdir, readdir, unlink, stat, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/db/prisma';

// ファイル設定の一元管理
export const FILE_CONFIG = {
  tempDir: 'tmp/users',
  publicDir: 'public/uploads',
  processingDir: 'tmp/processing',
  retentionPeriod: 24 * 60 * 60 * 1000, // 24時間
  maxRetries: 3,
  retryDelay: 1000, // 1秒
};

// 文字列リテラル型を定義
type ActivityAction = 'file_upload' | 'file_delete' | 'file_access';

// ファイル操作のマッピング
const FILE_OPERATIONS = {
  create: 'file_upload' as ActivityAction,
  delete: 'file_delete' as ActivityAction,
  access: 'file_access' as ActivityAction,
} as const;

type FileOperation = keyof typeof FILE_OPERATIONS;

// ファイルの状態を表す列挙型
export enum FileState {
  UPLOADED, // アップロード直後
  PROCESSING, // 処理中
  READY, // 処理完了、利用可能
  ARCHIVED, // アーカイブ済み
}

// ファイルパス管理クラス
export class FilePathManager {
  constructor(private config = FILE_CONFIG) {}

  // 一時ディレクトリのパスを取得
  getTempPath(userId: string, fileId: string, type: 'original' | 'translated' = 'original'): string {
    // ワイルドカードではなく、タイプに基づいた具体的なパスを返す
    return join(
      this.config.tempDir,
      userId,
      'uploads',
      `${fileId}_${type === 'translated' ? 'translated' : 'original'}.pptx`,
    );
  }

  // 実際のファイルパスを取得するヘルパーメソッド
  async findActualFilePath(
    userId: string,
    fileId: string,
    type: 'original' | 'translated' = 'original',
  ): Promise<string | null> {
    try {
      const dirPath = join(this.config.tempDir, userId, 'uploads');
      const files = await readdir(dirPath);

      // ファイルIDで始まり、タイプに応じたファイルを検索
      const pattern = type === 'translated' ? '_translated.pptx' : '.pptx';
      const file = files.find(
        (f) => f.startsWith(fileId) && (type === 'original' ? !f.includes('_translated') : f.includes('_translated')),
      );

      if (file) {
        // 相対パスを返す
        return join(this.config.tempDir, userId, 'uploads', file);
      }

      return null;
    } catch (error) {
      console.error(`Error finding ${type} file for fileId: ${fileId}:`, error);
      return null;
    }
  }

  // 公開ディレクトリのパスを取得
  getPublicPath(userId: string, fileId: string, type: 'original' | 'translated' = 'translated'): string {
    return join('uploads', userId, `${fileId}_${type}.pptx`);
  }

  // 処理中ディレクトリのパスを取得
  getProcessingPath(userId: string, fileId: string): string {
    return join(this.config.processingDir, userId, fileId);
  }

  // スライドディレクトリのパスを取得
  getSlidesPath(userId: string, fileId: string): string {
    return join(this.config.tempDir, userId, 'slides', fileId);
  }

  // 絶対パスを取得
  getAbsolutePath(relativePath: string): string {
    // 既に絶対パスの場合はそのまま返す
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    return join(process.cwd(), relativePath);
  }

  // パスの存在確認と作成
  async ensurePath(filePath: string): Promise<void> {
    // 絶対パスかどうかを確認
    const dirPath = filePath.startsWith('/') ? join(filePath, '..') : join(process.cwd(), filePath, '..');

    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Directory creation error:', error);
      throw error;
    }
  }

  // ファイルの移動
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const sourceAbsPath = this.getAbsolutePath(sourcePath);
    const destAbsPath = this.getAbsolutePath(destPath);

    // 宛先ディレクトリの作成
    await this.ensurePath(destPath);

    try {
      // ファイルのコピー
      await copyFile(sourceAbsPath, destAbsPath);
    } catch (error) {
      console.error(`Error copying file from ${sourceAbsPath} to ${destAbsPath}:`, error);
      throw error;
    }
  }

  // 公開ディレクトリの存在確認と作成
  async ensurePublicDirectory(userId: string): Promise<void> {
    const publicUserDir = join(this.config.publicDir, userId);
    const absolutePublicUserDir = this.getAbsolutePath(publicUserDir);

    try {
      await mkdir(absolutePublicUserDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating public directory ${absolutePublicUserDir}:`, error);
      throw error;
    }
  }

  // 一時ファイルから公開ファイルへの移動
  async moveToPublic(userId: string, fileId: string, type: 'original' | 'translated' = 'translated'): Promise<string> {
    // 公開ディレクトリの存在確認
    await this.ensurePublicDirectory(userId);

    // 実際のファイルパスを検索
    const actualFilePath = await this.findActualFilePath(userId, fileId, type);
    if (!actualFilePath) {
      throw new Error(`${type} file not found for fileId: ${fileId}`);
    }

    // 公開ディレクトリのパスを取得（URLパス用）
    const publicPath = this.getPublicPath(userId, fileId, type);
    // 実際のファイルシステム上のパス（ファイル操作用）
    const publicFsPath = join(this.config.publicDir, userId, `${fileId}_${type}.pptx`);

    // ファイルを移動
    await this.moveFile(actualFilePath, publicFsPath);

    return publicPath;
  }
}

// ファイルパスマネージャーのインスタンス
export const filePathManager = new FilePathManager();

// ファイル操作のログ記録
export async function logFileOperation(
  userId: string,
  operation: FileOperation,
  fileId: string,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    const action = FILE_OPERATIONS[operation];
    await prisma.activityLog.create({
      data: {
        userId,
        type: action,
        description: `File operation: ${operation}`,
        metadata: {
          fileId,
          operation,
          timestamp: new Date().toISOString(),
          success,
          error,
        },
      },
    });
  } catch (logError) {
    console.error('File operation logging error:', logError);
  }
}

// 非同期処理の待機
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// リトライ機能付きの関数実行
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries: number; delay: number; onError?: (error: Error, attempt: number) => void },
): Promise<T> {
  const { maxRetries, delay, onError } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(lastError, attempt);
      }
      if (attempt < maxRetries) {
        await wait(delay * attempt);
      }
    }
  }

  throw lastError!;
}

// 以下は既存の関数を維持
export function generateFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function createUserDirectories(userId: string, fileId: string) {
  const pathManager = new FilePathManager();
  const baseDir = FILE_CONFIG.tempDir.startsWith('/')
    ? join(FILE_CONFIG.tempDir, userId)
    : join(process.cwd(), FILE_CONFIG.tempDir, userId);
  const uploadDir = join(baseDir, 'uploads');
  const slidesDir = pathManager.getSlidesPath(userId, fileId);
  const absoluteSlidesDir = slidesDir.startsWith('/') ? slidesDir : pathManager.getAbsolutePath(slidesDir);

  console.log('Creating directories:', {
    baseDir,
    uploadDir,
    slidesDir,
    absoluteSlidesDir,
  });

  for (const dir of [baseDir, uploadDir, absoluteSlidesDir]) {
    try {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        console.log(`Successfully created directory: ${dir}`);
      }
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      throw new Error(`Error creating directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { uploadDir, slidesDir: absoluteSlidesDir };
}

export async function cleanupOldFiles(userId: string) {
  try {
    const pathManager = new FilePathManager();
    const baseDir = FILE_CONFIG.tempDir.startsWith('/')
      ? join(FILE_CONFIG.tempDir, userId)
      : join(process.cwd(), FILE_CONFIG.tempDir, userId);
    const uploadsDir = join(baseDir, 'uploads');
    const slidesDir = join(baseDir, 'slides');

    if (existsSync(uploadsDir)) {
      const files = await readdir(uploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = join(uploadsDir, file);
        const fileStat = await stat(filePath);

        if (now - fileStat.mtimeMs > FILE_CONFIG.retentionPeriod) {
          try {
            await unlink(filePath);
            await logFileOperation(userId, 'delete', file, true);
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Error deleting file ${filePath}:`, error);
              await logFileOperation(userId, 'delete', file, false, error.message);
            }
          }
        }
      }
    }

    if (existsSync(slidesDir)) {
      const directories = await readdir(slidesDir);
      const now = Date.now();

      for (const dir of directories) {
        const dirPath = join(slidesDir, dir);
        const dirStat = await stat(dirPath);

        if (now - dirStat.mtimeMs > FILE_CONFIG.retentionPeriod) {
          try {
            const files = await readdir(dirPath);
            for (const file of files) {
              await unlink(join(dirPath, file));
            }
            await unlink(dirPath);
            await logFileOperation(userId, 'delete', dir, true);
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Error cleaning up directory ${dirPath}:`, error);
              await logFileOperation(userId, 'delete', dir, false, error.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    throw error;
  }
}
