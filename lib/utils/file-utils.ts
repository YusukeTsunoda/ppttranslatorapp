import { mkdir, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/db/prisma';
import { ActivityAction } from '@prisma/client';

// ファイル保持期間の定数
export const FILE_RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24時間

// ファイル操作のマッピング
const FILE_OPERATIONS = {
  create: 'file_upload' as ActivityAction,
  delete: 'file_delete' as ActivityAction,
  access: 'file_access' as ActivityAction
} as const;

type FileOperation = keyof typeof FILE_OPERATIONS;

// ファイルパス生成ユーティリティ
export function createFilePath(userId: string, fileId: string, type: 'original' | 'translated' = 'original'): string {
  return join('tmp', 'users', userId, 'uploads', `${fileId}_${type}.pptx`);
}

// 絶対パスの生成
export function getAbsolutePath(relativePath: string): string {
  return join(process.cwd(), relativePath);
}

// ファイルの存在確認と作成
export async function ensureFilePath(filePath: string): Promise<void> {
  try {
    const dirPath = join(process.cwd(), filePath, '..');
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error('Directory creation error:', error);
    throw error;
  }
}

// ファイル操作のログ記録
export async function logFileOperation(
  userId: string,
  operation: FileOperation,
  fileId: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const action = FILE_OPERATIONS[operation];
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        ipAddress: 'unknown',
        metadata: {
          fileId,
          operation,
          timestamp: new Date().toISOString(),
          success,
          error
        }
      }
    });
  } catch (logError) {
    console.error('File operation logging error:', logError);
  }
}

export function generateFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function createUserDirectories(userId: string, fileId: string) {
  const baseDir = join(process.cwd(), 'tmp', 'users', userId);
  const uploadDir = join(baseDir, 'uploads');
  const slidesDir = join(baseDir, 'slides', fileId);

  for (const dir of [baseDir, uploadDir, slidesDir]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  return { uploadDir, slidesDir };
}

export async function cleanupOldFiles(userId: string) {
  try {
    const baseDir = join(process.cwd(), 'tmp', 'users', userId);
    const uploadsDir = join(baseDir, 'uploads');
    const slidesDir = join(baseDir, 'slides');

    if (existsSync(uploadsDir)) {
      const files = await readdir(uploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = join(uploadsDir, file);
        const fileStat = await stat(filePath);
        
        if (now - fileStat.mtimeMs > FILE_RETENTION_PERIOD) {
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
        
        if (now - dirStat.mtimeMs > FILE_RETENTION_PERIOD) {
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