'use strict';

/**
 * PPTXパーサー用のキャッシュヘルパー
 * 高度なキャッシュ戦略を提供し、パフォーマンスを向上させる
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CacheManager, CacheOptions } from '../utils/cache-manager';
import { PPTXParseResult } from './types';

// PPTXパーサーキャッシュエントリのインターフェース
export interface PPTXCacheEntry {
  result: PPTXParseResult;
  fileHash: string;
  metadata: {
    fileName: string;
    fileSize: number;
    slideCount: number;
    parseTime: number;
    timestamp: number;
  };
}

// PPTXキャッシュオプションのインターフェース
export interface PPTXCacheOptions extends CacheOptions {
  // キャッシュの有効期限（ミリ秒）
  ttl?: number;
  // 最大メモリキャッシュサイズ
  maxMemoryEntries?: number;
  // 最大ディスクキャッシュサイズ
  maxDiskEntries?: number;
  // ディスクキャッシュを使用するかどうか
  useDiskCache?: boolean;
  // ディスクキャッシュディレクトリ
  cacheDir?: string;
  // 自動クリーンアップの間隔（ミリ秒）
  cleanupInterval?: number;
}

// デフォルトのPPTXキャッシュオプション
const DEFAULT_PPTX_CACHE_OPTIONS: PPTXCacheOptions = {
  ttl: 60 * 60 * 1000, // 1時間
  maxMemoryEntries: 20, // メモリには少数のエントリのみ保持
  maxDiskEntries: 100, // ディスクにはより多くのエントリを保持
  useDiskCache: true,
  cacheDir: path.join(process.cwd(), '.cache', 'pptx'),
  prefix: 'pptx_cache',
  cleanupInterval: 10 * 60 * 1000, // 10分
};

/**
 * PPTXパーサー用のキャッシュヘルパークラス
 */
export class PPTXCacheHelper {
  private cacheManager: CacheManager<PPTXCacheEntry>;
  private options: PPTXCacheOptions;

  /**
   * コンストラクタ
   * @param options キャッシュオプション
   */
  constructor(options: PPTXCacheOptions = {}) {
    this.options = { ...DEFAULT_PPTX_CACHE_OPTIONS, ...options };
    this.cacheManager = new CacheManager<PPTXCacheEntry>(this.options);
  }

  /**
   * ファイルのハッシュを計算
   * @param filePath ファイルパス
   * @returns ハッシュ文字列
   */
  async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (data) => {
          hash.update(data);
        });
        
        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * ファイルのハッシュを同期的に計算（小さいファイル用）
   * @param filePath ファイルパス
   * @returns ハッシュ文字列
   */
  calculateFileHashSync(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * キャッシュキーを生成
   * @param filePath ファイルパス
   * @param fileHash ファイルハッシュ
   * @returns キャッシュキー
   */
  generateCacheKey(filePath: string, fileHash: string): string {
    const fileName = path.basename(filePath);
    return `${fileName}_${fileHash}`;
  }

  /**
   * キャッシュにパース結果を設定
   * @param filePath ファイルパス
   * @param fileHash ファイルハッシュ
   * @param result パース結果
   * @param parseTime パース時間（ミリ秒）
   * @returns 成功した場合はtrue
   */
  setCacheResult(
    filePath: string,
    fileHash: string,
    result: PPTXParseResult,
    parseTime: number
  ): boolean {
    try {
      const key = this.generateCacheKey(filePath, fileHash);
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      const slideCount = result.slides?.length || 0;
      
      const entry: PPTXCacheEntry = {
        result,
        fileHash,
        metadata: {
          fileName,
          fileSize,
          slideCount,
          parseTime,
          timestamp: Date.now()
        }
      };
      
      return this.cacheManager.set(key, entry);
    } catch (error) {
      console.error('Failed to set cache result:', error);
      return false;
    }
  }

  /**
   * キャッシュからパース結果を取得
   * @param filePath ファイルパス
   * @param fileHash ファイルハッシュ
   * @returns パース結果またはnull
   */
  getCacheResult(filePath: string, fileHash: string): PPTXParseResult | null {
    try {
      const key = this.generateCacheKey(filePath, fileHash);
      const entry = this.cacheManager.get(key);
      
      if (!entry || entry.fileHash !== fileHash) {
        return null;
      }
      
      return entry.result;
    } catch (error) {
      console.error('Failed to get cache result:', error);
      return null;
    }
  }

  /**
   * キャッシュからエントリを削除
   * @param filePath ファイルパス
   * @param fileHash ファイルハッシュ
   * @returns 成功した場合はtrue
   */
  deleteCacheResult(filePath: string, fileHash: string): boolean {
    try {
      const key = this.generateCacheKey(filePath, fileHash);
      return this.cacheManager.delete(key);
    } catch (error) {
      console.error('Failed to delete cache result:', error);
      return false;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * キャッシュの統計情報を取得
   * @returns 統計情報
   */
  getStats() {
    return this.cacheManager.getStats();
  }

  /**
   * キャッシュのヒット率を取得
   * @returns ヒット率（0-1）
   */
  getHitRate(): number {
    return this.cacheManager.getHitRate();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.cacheManager.dispose();
  }
}

// シングルトンインスタンスを作成
export const createPPTXCacheHelper = (options?: PPTXCacheOptions): PPTXCacheHelper => {
  return new PPTXCacheHelper(options);
};
