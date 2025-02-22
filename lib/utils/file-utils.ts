import { mkdir, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export function generateFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function createUserDirectories(userId: string, fileId: string) {
  const baseDir = join(process.cwd(), 'tmp', 'users', userId);
  const uploadDir = join(baseDir, 'uploads');
  const slidesDir = join(baseDir, 'slides', fileId);

  // ディレクトリが存在しない場合は作成
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

    // 古いアップロードファイルの削除（24時間以上前のファイル）
    if (existsSync(uploadsDir)) {
      const files = await readdir(uploadsDir);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = join(uploadsDir, file);
        const fileStat = await stat(filePath);
        if (now - fileStat.mtimeMs > ONE_DAY) {
          await unlink(filePath);
        }
      }
    }

    // 古いスライドディレクトリの削除（24時間以上前のディレクトリ）
    if (existsSync(slidesDir)) {
      const directories = await readdir(slidesDir);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      for (const dir of directories) {
        const dirPath = join(slidesDir, dir);
        const dirStat = await stat(dirPath);
        if (now - dirStat.mtimeMs > ONE_DAY) {
          // ディレクトリ内のファイルを削除
          const files = await readdir(dirPath);
          for (const file of files) {
            await unlink(join(dirPath, file));
          }
          // ディレクトリを削除
          await unlink(dirPath);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    // エラーは上位で処理
    throw error;
  }
} 