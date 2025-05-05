#!/usr/bin/env ts-node
/**
 * ファイル構造マイグレーションスクリプト
 * 
 * 旧形式のパス構造 `/tmp/users/{userId}/slides/{fileId}` から
 * 新形式のパス構造 `/tmp/users/{userId}/{fileId}/slides` に
 * 既存のファイルを移行するスクリプト
 */

import { join } from 'path';
import { existsSync, readdirSync, mkdirSync, copyFileSync, unlinkSync, rmdirSync } from 'fs';
import { FILE_CONFIG } from '../lib/utils/file-utils';

// 実行時の確認フラグ
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// 移行対象のディレクトリ
const BASE_DIR = FILE_CONFIG.tempDir.startsWith('/')
  ? FILE_CONFIG.tempDir
  : join(process.cwd(), FILE_CONFIG.tempDir);

console.log(`ファイル構造マイグレーション開始 (Dry Run: ${DRY_RUN})`);
console.log(`ベースディレクトリ: ${BASE_DIR}`);

// 移行処理の実行
migrateFileStructure();

/**
 * ファイル構造の移行処理
 */
function migrateFileStructure() {
  try {
    // ユーザーディレクトリの一覧を取得
    const userDirs = readdirSync(BASE_DIR);
    
    console.log(`ユーザーディレクトリ数: ${userDirs.length}`);
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // 各ユーザーディレクトリを処理
    for (const userId of userDirs) {
      const userPath = join(BASE_DIR, userId);
      
      // slidesディレクトリの存在確認
      const oldSlidesDir = join(userPath, 'slides');
      if (!existsSync(oldSlidesDir)) {
        if (VERBOSE) console.log(`ユーザー ${userId} のslidesディレクトリが見つかりません。スキップします。`);
        continue;
      }
      
      // ファイルIDディレクトリの一覧を取得
      const fileIds = readdirSync(oldSlidesDir);
      
      console.log(`ユーザー ${userId} のファイル数: ${fileIds.length}`);
      
      // 各ファイルIDディレクトリを処理
      for (const fileId of fileIds) {
        const oldFilePath = join(oldSlidesDir, fileId);
        const newFilePath = join(userPath, fileId);
        const newSlidesPath = join(newFilePath, 'slides');
        
        // 新しいパスが既に存在する場合はスキップ
        if (existsSync(newSlidesPath)) {
          console.log(`ファイル ${fileId} は既に新形式に移行済みです。スキップします。`);
          totalSkipped++;
          continue;
        }
        
        try {
          // 新しいディレクトリ構造を作成
          if (!DRY_RUN) {
            if (!existsSync(newFilePath)) {
              mkdirSync(newFilePath, { recursive: true });
            }
            mkdirSync(newSlidesPath, { recursive: true });
          }
          
          // スライドファイルの一覧を取得
          const slideFiles = readdirSync(oldFilePath);
          
          console.log(`ファイル ${fileId} のスライド数: ${slideFiles.length}`);
          
          // 各スライドファイルを移動
          for (const slideFile of slideFiles) {
            const oldSlidePath = join(oldFilePath, slideFile);
            const newSlidePath = join(newSlidesPath, slideFile);
            
            if (VERBOSE) console.log(`移動: ${oldSlidePath} -> ${newSlidePath}`);
            
            if (!DRY_RUN) {
              // ファイルをコピー
              copyFileSync(oldSlidePath, newSlidePath);
              
              // 元のファイルを削除
              unlinkSync(oldSlidePath);
            }
          }
          
          // 空になった元のディレクトリを削除
          if (!DRY_RUN) {
            rmdirSync(oldFilePath);
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
