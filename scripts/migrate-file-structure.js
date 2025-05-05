/**
 * ファイル構造マイグレーションスクリプト
 * 
 * 旧形式のパス構造 `/tmp/users/{userId}/slides/{fileId}` から
 * 新形式のパス構造 `/tmp/users/{userId}/{fileId}/slides` に
 * 既存のファイルを移行するスクリプト
 */

const path = require('path');
const fs = require('fs');

// ファイル設定（file-utils.tsから抽出）
const FILE_CONFIG = {
  tempDir: path.join(process.cwd(), 'tmp', 'users'),
  publicDir: path.join(process.cwd(), 'public', 'uploads'),
  processingDir: path.join(process.cwd(), 'tmp', 'processing'),
};

// 実行時の確認フラグ
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// 移行対象のディレクトリ
const BASE_DIR = FILE_CONFIG.tempDir;

console.log(`ファイル構造マイグレーション開始 (Dry Run: ${DRY_RUN})`);
console.log(`ベースディレクトリ: ${BASE_DIR}`);

// 移行処理の実行
migrateFileStructure();

/**
 * ファイル構造の移行処理
 */
function migrateFileStructure() {
  try {
    // ベースディレクトリの存在確認
    if (!fs.existsSync(BASE_DIR)) {
      console.log(`ベースディレクトリが存在しません: ${BASE_DIR}`);
      return;
    }

    // ユーザーディレクトリの一覧を取得
    const userDirs = fs.readdirSync(BASE_DIR);
    
    console.log(`ユーザーディレクトリ数: ${userDirs.length}`);
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // 各ユーザーディレクトリを処理
    for (const userId of userDirs) {
      const userPath = path.join(BASE_DIR, userId);
      
      // ディレクトリかどうか確認
      if (!fs.statSync(userPath).isDirectory()) {
        continue;
      }
      
      // slidesディレクトリの存在確認
      const oldSlidesDir = path.join(userPath, 'slides');
      if (!fs.existsSync(oldSlidesDir)) {
        if (VERBOSE) console.log(`ユーザー ${userId} のslidesディレクトリが見つかりません。スキップします。`);
        continue;
      }
      
      // ファイルIDディレクトリの一覧を取得
      const fileIds = fs.readdirSync(oldSlidesDir);
      
      console.log(`ユーザー ${userId} のファイル数: ${fileIds.length}`);
      
      // 各ファイルIDディレクトリを処理
      for (const fileId of fileIds) {
        const oldFilePath = path.join(oldSlidesDir, fileId);
        
        // ディレクトリかどうか確認
        if (!fs.statSync(oldFilePath).isDirectory()) {
          continue;
        }
        
        const newFilePath = path.join(userPath, fileId);
        const newSlidesPath = path.join(newFilePath, 'slides');
        
        // 新しいパスが既に存在する場合はスキップ
        if (fs.existsSync(newSlidesPath)) {
          console.log(`ファイル ${fileId} は既に新形式に移行済みです。スキップします。`);
          totalSkipped++;
          continue;
        }
        
        try {
          // 新しいディレクトリ構造を作成
          if (!DRY_RUN) {
            if (!fs.existsSync(newFilePath)) {
              fs.mkdirSync(newFilePath, { recursive: true });
            }
            fs.mkdirSync(newSlidesPath, { recursive: true });
          }
          
          // スライドファイルの一覧を取得
          const slideFiles = fs.readdirSync(oldFilePath);
          
          console.log(`ファイル ${fileId} のスライド数: ${slideFiles.length}`);
          
          // 各スライドファイルを移動
          for (const slideFile of slideFiles) {
            const oldSlidePath = path.join(oldFilePath, slideFile);
            const newSlidePath = path.join(newSlidesPath, slideFile);
            
            if (VERBOSE) console.log(`移動: ${oldSlidePath} -> ${newSlidePath}`);
            
            if (!DRY_RUN) {
              // ファイルをコピー
              fs.copyFileSync(oldSlidePath, newSlidePath);
              
              // 元のファイルを削除
              fs.unlinkSync(oldSlidePath);
            }
          }
          
          // 空になった元のディレクトリを削除
          if (!DRY_RUN) {
            fs.rmdirSync(oldFilePath);
          }
          
          console.log(`ファイル ${fileId} の移行が完了しました。`);
          totalMigrated++;
        } catch (error) {
          console.error(`ファイル ${fileId} の移行中にエラーが発生しました:`, error);
          totalErrors++;
        }
      }
    }
    
    console.log('\n===== 移行結果 =====');
    console.log(`移行完了: ${totalMigrated} ファイル`);
    console.log(`スキップ: ${totalSkipped} ファイル`);
    console.log(`エラー: ${totalErrors} ファイル`);
    
    if (DRY_RUN) {
      console.log('\n実際に移行を実行するには、--dry-runオプションを外して再実行してください。');
    }
  } catch (error) {
    console.error('マイグレーション処理中にエラーが発生しました:', error);
  }
}
