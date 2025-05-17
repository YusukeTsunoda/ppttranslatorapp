import path from 'path';
import fs from 'fs/promises';
import { BackupManager } from './backup';

async function testBackup() {
  console.log('バックアップシステムのテストを開始します...\n');

  // テスト用の設定
  const testConfig = {
    databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
    backupDir: path.join(__dirname, '../test-backups'),
    fileStorageDir: path.join(__dirname, '../test-storage'),
    retentionPeriod: {
      daily: 1,    // テスト用に1日
      weekly: 1,   // テスト用に1週間
      monthly: 1   // テスト用に1月
    }
  };

  // テスト用のディレクトリ作成
  console.log('1. テスト環境のセットアップ');
  try {
    await fs.mkdir(testConfig.backupDir, { recursive: true });
    await fs.mkdir(testConfig.fileStorageDir, { recursive: true });
    
    // テスト用のファイルを作成
    await fs.writeFile(
      path.join(testConfig.fileStorageDir, 'test.txt'),
      'テスト用のファイルです'
    );
    console.log('✅ テスト環境のセットアップ成功\n');
  } catch (error) {
    console.error('❌ テスト環境のセットアップ失敗:', error);
    process.exit(1);
  }

  // バックアップマネージャーの初期化
  const backupManager = new BackupManager(testConfig);

  // 日次バックアップのテスト
  console.log('2. 日次バックアップのテスト');
  try {
    await backupManager.performBackup('daily');
    console.log('✅ 日次バックアップテスト成功\n');
  } catch (error) {
    console.error('❌ 日次バックアップテスト失敗:', error);
    process.exit(1);
  }

  // 週次バックアップのテスト
  console.log('3. 週次バックアップのテスト');
  try {
    await backupManager.performBackup('weekly');
    console.log('✅ 週次バックアップテスト成功\n');
  } catch (error) {
    console.error('❌ 週次バックアップテスト失敗:', error);
    process.exit(1);
  }

  // 月次バックアップのテスト
  console.log('4. 月次バックアップのテスト');
  try {
    await backupManager.performBackup('monthly');
    console.log('✅ 月次バックアップテスト成功\n');
  } catch (error) {
    console.error('❌ 月次バックアップテスト失敗:', error);
    process.exit(1);
  }

  // バックアップの検証
  console.log('5. バックアップの検証');
  try {
    const backupTypes = ['daily', 'weekly', 'monthly'];
    for (const type of backupTypes) {
      const typeDir = path.join(testConfig.backupDir, type);
      const backups = await fs.readdir(typeDir);
      if (backups.length === 0) {
        throw new Error(`${type}バックアップが作成されていません`);
      }
      
      const latestBackup = backups[backups.length - 1];
      const backupPath = path.join(typeDir, latestBackup);
      const stats = await fs.stat(backupPath);
      
      console.log(`- ${type}バックアップ:`, {
        path: backupPath,
        size: stats.size,
        created: stats.birthtime
      });
    }
    console.log('✅ バックアップ検証成功\n');
  } catch (error) {
    console.error('❌ バックアップ検証失敗:', error);
    process.exit(1);
  }

  // クリーンアップ
  console.log('6. 古いバックアップの削除テスト');
  try {
    // 古いバックアップファイルを作成（7日前の日付）
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 7);
    
    const oldBackupDir = path.join(testConfig.backupDir, 'daily', oldDate.toISOString());
    await fs.mkdir(oldBackupDir, { recursive: true });
    
    // クリーンアップを実行
    await backupManager.cleanupOldBackups('daily');
    
    // 削除されたことを確認
    try {
      await fs.access(oldBackupDir);
      throw new Error('古いバックアップが削除されていません');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('✅ 古いバックアップの削除テスト成功\n');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 古いバックアップの削除テスト失敗:', error);
    process.exit(1);
  }

  console.log('すべてのバックアップテストが完了しました。');
}

// テストの実行
testBackup().catch(console.error); 