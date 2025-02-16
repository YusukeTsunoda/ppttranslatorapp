import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export function generateFileId(): string {
  return uuidv4();
}

export async function createUserDirectories(userId: string, fileId: string) {
  const userDir = join(process.cwd(), 'tmp', 'users', userId);
  const uploadDir = join(userDir, 'uploads');
  const slidesDir = join(userDir, 'slides', fileId);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(slidesDir, { recursive: true });

  return { uploadDir, slidesDir };
}

export async function cleanupOldFiles(userId: string) {
  try {
    const userDir = join(process.cwd(), 'tmp', 'users', userId);
    const uploadDir = join(userDir, 'uploads');
    const slidesDir = join(userDir, 'slides');

    // ディレクトリが存在する場合のみ削除を実行
    if (await fs.access(uploadDir).then(() => true).catch(() => false)) {
      await fs.rm(uploadDir, { recursive: true, force: true });
      await fs.mkdir(uploadDir, { recursive: true });
    }

    if (await fs.access(slidesDir).then(() => true).catch(() => false)) {
      await fs.rm(slidesDir, { recursive: true, force: true });
      await fs.mkdir(slidesDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
} 