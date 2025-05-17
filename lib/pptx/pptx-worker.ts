/**
 * PPTXファイル解析用ワーカースクリプト
 * Worker Threadsから呼び出されて実行されます
 */

import { setupWorker } from './worker-pool';
import { PythonShell } from 'python-shell';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { SlideContent } from './types';

const fsPromises = fs.promises;

// タスクハンドラーの定義
const taskHandlers = {
  /**
   * スライドを解析するタスク
   * @param data タスクデータ
   * @returns 解析結果
   */
  async parseSlide(data: {
    inputPath: string;
    outputDir: string;
    slideIndex: number;
    pythonPath: string;
    scriptPath: string;
  }): Promise<SlideContent> {
    const { inputPath, outputDir, slideIndex, pythonPath, scriptPath } = data;
    
    // 出力ディレクトリが存在しない場合は作成
    await fsPromises.mkdir(outputDir, { recursive: true });
    
    // Pythonスクリプトのオプション
    const options = {
      mode: 'json' as const,
      pythonPath,
      scriptPath: path.dirname(scriptPath),
      args: [
        inputPath,
        outputDir,
        '--slide-index', String(slideIndex),
        '--single-slide'
      ]
    };
    
    // Pythonスクリプトを実行
    try {
      const results = await new Promise<any[]>((resolve, reject) => {
        PythonShell.run(path.basename(scriptPath), options, (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });
      
      // 結果を解析
      if (!results || results.length === 0) {
        throw new Error(`スライド ${slideIndex} の解析結果が空です`);
      }
      
      const slideContent = results[results.length - 1];
      
      // スライド番号を追加
      return {
        ...slideContent,
        index: slideIndex
      };
    } catch (error) {
      console.error(`スライド ${slideIndex} の解析中にエラーが発生しました:`, error);
      // エラーが発生しても最低限の情報を返す
      return {
        index: slideIndex,
        textElements: [],
        shapes: [],
        images: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  /**
   * PPTXファイルのメタデータを抽出するタスク
   * @param data タスクデータ
   * @returns メタデータ
   */
  async extractMetadata(data: {
    inputPath: string;
    pythonPath: string;
    scriptPath: string;
  }): Promise<any> {
    const { inputPath, pythonPath, scriptPath } = data;
    
    // Pythonスクリプトのオプション
    const options = {
      mode: 'json' as const,
      pythonPath,
      scriptPath: path.dirname(scriptPath),
      args: [
        inputPath,
        '--metadata-only'
      ]
    };
    
    // Pythonスクリプトを実行
    try {
      const results = await new Promise<any[]>((resolve, reject) => {
        PythonShell.run(path.basename(scriptPath), options, (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });
      
      // 結果を解析
      if (!results || results.length === 0) {
        throw new Error('メタデータの抽出結果が空です');
      }
      
      return results[results.length - 1].metadata || {};
    } catch (error) {
      console.error('メタデータの抽出中にエラーが発生しました:', error);
      // エラーが発生しても最低限の情報を返す
      return {
        title: path.basename(inputPath),
        author: 'Unknown',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        lastModifiedBy: 'System',
        revision: 1
      };
    }
  },
  
  /**
   * スライド数を取得するタスク
   * @param data タスクデータ
   * @returns スライド数
   */
  async getSlideCount(data: {
    inputPath: string;
    pythonPath: string;
    scriptPath: string;
  }): Promise<number> {
    const { inputPath, pythonPath, scriptPath } = data;
    
    // Pythonスクリプトのオプション
    const options = {
      mode: 'json' as const,
      pythonPath,
      scriptPath: path.dirname(scriptPath),
      args: [
        inputPath,
        '--count-only'
      ]
    };
    
    // Pythonスクリプトを実行
    try {
      const results = await new Promise<any[]>((resolve, reject) => {
        PythonShell.run(path.basename(scriptPath), options, (err, results) => {
          if (err) reject(err);
          else resolve(results || []);
        });
      });
      
      // 結果を解析
      if (!results || results.length === 0) {
        throw new Error('スライド数の取得結果が空です');
      }
      
      return results[results.length - 1].slideCount || 0;
    } catch (error) {
      console.error('スライド数の取得中にエラーが発生しました:', error);
      return 0;
    }
  }
};

// ワーカーのセットアップ
setupWorker(taskHandlers);
