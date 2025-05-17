import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma';

const execAsync = promisify(exec);

interface BackupConfig {
  databaseUrl: string;
  backupDir: string;
  fileStorageDir: string;
  retentionPeriod: {
    daily: number;   // 日数
    weekly: number;  // 週数
    monthly: number; // 月数
  };
}

class BackupManager {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  async performBackup(type: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.backupDir, type, timestamp);

    try {
      // バックアップディレクトリの作成
      await fs.mkdir(backupPath, { recursive: true });

      // データベースのバックアップ
      await this.backupDatabase(backupPath);

      // ファイルストレージのバックアップ
      await this.backupFileStorage(backupPath);

      // 古いバックアップの削除
      await this.cleanupOldBackups(type);

      console.log(`バックアップが完了しました: ${backupPath}`);
    } catch (error) {
      console.error('バックアップ中にエラーが発生しました:', error);
      throw error;
    }
  }

  private async backupDatabase(backupPath: string): Promise<void> {
    const dumpFile = path.join(backupPath, 'database.dump');
    
    // pg_dumpを使用してデータベースをバックアップ
    await execAsync(`pg_dump "${this.config.databaseUrl}" > "${dumpFile}"`);
  }

  private async backupFileStorage(backupPath: string): Promise<void> {
    const storageBackupPath = path.join(backupPath, 'storage');
    
    // rsyncを使用してファイルストレージをバックアップ
    await execAsync(`rsync -av "${this.config.fileStorageDir}/" "${storageBackupPath}/"`);
  }

  private async cleanupOldBackups(type: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const backupDir = path.join(this.config.backupDir, type);
    const backups = await fs.readdir(backupDir);
    const retentionDays = {
      daily: this.config.retentionPeriod.daily,
      weekly: this.config.retentionPeriod.weekly * 7,
      monthly: this.config.retentionPeriod.monthly * 30
    }[type];

    const now = new Date();
    for (const backup of backups) {
      const backupPath = path.join(backupDir, backup);
      const stats = await fs.stat(backupPath);
      const ageInDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays > retentionDays) {
        await fs.rm(backupPath, { recursive: true });
        console.log(`古いバックアップを削除しました: ${backupPath}`);
      }
    }
  }
}

// バックアップ設定
const config: BackupConfig = {
  databaseUrl: process.env.DATABASE_URL || '',
  backupDir: process.env.BACKUP_DIR || '/var/backups/ppttranslator',
  fileStorageDir: process.env.FILE_STORAGE_DIR || '/var/www/uploads',
  retentionPeriod: {
    daily: 14,    // 2週間
    weekly: 12,   // 3ヶ月
    monthly: 12   // 1年
  }
};

// バックアップの実行
const backupManager = new BackupManager(config);

// コマンドライン引数からバックアップタイプを取得
const backupType = process.argv[2] as 'daily' | 'weekly' | 'monthly';
if (!backupType || !['daily', 'weekly', 'monthly'].includes(backupType)) {
  console.error('バックアップタイプを指定してください: daily, weekly, monthly');
  process.exit(1);
}

backupManager.performBackup(backupType)
  .then(() => process.exit(0))
  .catch(() => process.exit(1)); 