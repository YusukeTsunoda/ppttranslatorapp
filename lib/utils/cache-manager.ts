'use strict';

/**
 * 高度なキャッシュ管理システム
 * メモリキャッシュとディスクキャッシュを組み合わせて効率的なキャッシュ戦略を提供
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// キャッシュエントリのインターフェース
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  metadata?: Record<string, any>;
  hash: string;
}

// キャッシュ統計情報のインターフェース
export interface CacheStats {
  size: number;
  memorySize: number;
  diskSize: number;
  hits: {
    memory: number;
    disk: number;
    total: number;
  };
  misses: number;
  writes: {
    memory: number;
    disk: number;
    total: number;
  };
  evictions: number;
  errors: number;
}

// キャッシュオプションのインターフェース
export interface CacheOptions {
  // メモリキャッシュの最大エントリ数
  maxMemoryEntries?: number;
  // ディスクキャッシュの最大エントリ数
  maxDiskEntries?: number;
  // キャッシュの有効期限（ミリ秒）
  ttl?: number;
  // ディスクキャッシュのディレクトリ
  cacheDir?: string;
  // ディスクキャッシュを使用するかどうか
  useDiskCache?: boolean;
  // キャッシュのプレフィックス
  prefix?: string;
  // ディスクキャッシュの圧縮を有効にするかどうか
  compressDiskCache?: boolean;
  // 自動クリーンアップの間隔（ミリ秒）
  cleanupInterval?: number;
  // ハッシュ計算に使用するアルゴリズム
  hashAlgorithm?: string;
}

// デフォルトのキャッシュオプション
const DEFAULT_OPTIONS: CacheOptions = {
  maxMemoryEntries: 100,
  maxDiskEntries: 1000,
  ttl: 60 * 60 * 1000, // 1時間
  cacheDir: path.join(process.cwd(), '.cache'),
  useDiskCache: true,
  prefix: 'cache',
  compressDiskCache: true,
  cleanupInterval: 10 * 60 * 1000, // 10分
  hashAlgorithm: 'sha256'
};

/**
 * 高度なキャッシュマネージャークラス
 */
export class CacheManager<T> {
  private memoryCache: Map<string, CacheEntry<T>>;
  private options: CacheOptions;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * コンストラクタ
   * @param options キャッシュオプション
   */
  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.memoryCache = new Map<string, CacheEntry<T>>();
    this.stats = {
      size: 0,
      memorySize: 0,
      diskSize: 0,
      hits: {
        memory: 0,
        disk: 0,
        total: 0
      },
      misses: 0,
      writes: {
        memory: 0,
        disk: 0,
        total: 0
      },
      evictions: 0,
      errors: 0
    };

    // ディスクキャッシュディレクトリの作成
    if (this.options.useDiskCache) {
      this.ensureCacheDir();
    }

    // 自動クリーンアップの設定
    if (this.options.cleanupInterval && this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanupInterval);
    }
  }

  /**
   * キャッシュディレクトリの存在を確認し、必要に応じて作成
   */
  private ensureCacheDir(): void {
    if (!this.options.cacheDir) return;

    try {
      if (!fs.existsSync(this.options.cacheDir)) {
        fs.mkdirSync(this.options.cacheDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create cache directory:', error);
      this.stats.errors++;
    }
  }

  /**
   * キーからハッシュを生成
   * @param key キャッシュキー
   * @returns ハッシュ文字列
   */
  private generateHash(key: string | object): string {
    const keyString = typeof key === 'string' ? key : JSON.stringify(key);
    const hash = crypto.createHash(this.options.hashAlgorithm || 'sha256');
    hash.update(keyString);
    return hash.digest('hex');
  }

  /**
   * ディスクキャッシュのファイルパスを取得
   * @param hash ハッシュ値
   * @returns ファイルパス
   */
  private getDiskCachePath(hash: string): string {
    if (!this.options.cacheDir) return '';
    
    // ハッシュの最初の2文字をサブディレクトリとして使用（シャーディング）
    const subDir = hash.substring(0, 2);
    const dir = path.join(this.options.cacheDir, subDir);
    
    // サブディレクトリの作成
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return path.join(dir, `${this.options.prefix || 'cache'}_${hash}.json`);
  }

  /**
   * キャッシュにデータを設定
   * @param key キャッシュキー
   * @param data キャッシュデータ
   * @param metadata メタデータ（オプション）
   * @returns 成功した場合はtrue
   */
  set(key: string | object, data: T, metadata?: Record<string, any>): boolean {
    try {
      const hash = this.generateHash(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        metadata,
        hash
      };

      // メモリキャッシュに保存
      this.setMemoryCache(hash, entry);

      // ディスクキャッシュに保存
      if (this.options.useDiskCache) {
        this.setDiskCache(hash, entry);
      }

      this.stats.writes.total++;
      this.updateCacheSize();
      return true;
    } catch (error) {
      console.error('Failed to set cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * メモリキャッシュにデータを設定
   * @param hash ハッシュ値
   * @param entry キャッシュエントリ
   */
  private setMemoryCache(hash: string, entry: CacheEntry<T>): void {
    // メモリキャッシュが最大サイズに達している場合、古いエントリを削除
    if (this.memoryCache.size >= (this.options.maxMemoryEntries || 100)) {
      this.evictOldestMemoryEntry();
    }

    this.memoryCache.set(hash, entry);
    this.stats.writes.memory++;
  }

  /**
   * ディスクキャッシュにデータを設定
   * @param hash ハッシュ値
   * @param entry キャッシュエントリ
   */
  private setDiskCache(hash: string, entry: CacheEntry<T>): void {
    try {
      const cachePath = this.getDiskCachePath(hash);
      if (!cachePath) return;

      const data = JSON.stringify(entry);
      fs.writeFileSync(cachePath, data);
      this.stats.writes.disk++;
    } catch (error) {
      console.error('Failed to write disk cache:', error);
      this.stats.errors++;
    }
  }

  /**
   * 最も古いメモリキャッシュエントリを削除
   */
  private evictOldestMemoryEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @returns キャッシュデータまたはnull
   */
  get(key: string | object): T | null {
    try {
      const hash = this.generateHash(key);

      // メモリキャッシュから取得
      const memoryEntry = this.memoryCache.get(hash);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.stats.hits.memory++;
        this.stats.hits.total++;
        return memoryEntry.data;
      }

      // ディスクキャッシュから取得
      if (this.options.useDiskCache) {
        const diskEntry = this.getDiskCache(hash);
        if (diskEntry && !this.isExpired(diskEntry)) {
          // ディスクから取得したデータをメモリキャッシュに保存（LRU戦略）
          this.memoryCache.set(hash, diskEntry);
          this.stats.hits.disk++;
          this.stats.hits.total++;
          return diskEntry.data;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Failed to get cache:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * ディスクキャッシュからデータを取得
   * @param hash ハッシュ値
   * @returns キャッシュエントリまたはnull
   */
  private getDiskCache(hash: string): CacheEntry<T> | null {
    try {
      const cachePath = this.getDiskCachePath(hash);
      if (!cachePath || !fs.existsSync(cachePath)) {
        return null;
      }

      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data) as CacheEntry<T>;
    } catch (error) {
      console.error('Failed to read disk cache:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * キャッシュエントリが期限切れかどうかを確認
   * @param entry キャッシュエントリ
   * @returns 期限切れの場合はtrue
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp > (this.options.ttl || 3600000);
  }

  /**
   * キャッシュからエントリを削除
   * @param key キャッシュキー
   * @returns 成功した場合はtrue
   */
  delete(key: string | object): boolean {
    try {
      const hash = this.generateHash(key);

      // メモリキャッシュから削除
      this.memoryCache.delete(hash);

      // ディスクキャッシュから削除
      if (this.options.useDiskCache) {
        const cachePath = this.getDiskCachePath(hash);
        if (cachePath && fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }
      }

      this.updateCacheSize();
      return true;
    } catch (error) {
      console.error('Failed to delete cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    // メモリキャッシュをクリア
    this.memoryCache.clear();

    // ディスクキャッシュをクリア
    if (this.options.useDiskCache && this.options.cacheDir) {
      try {
        this.clearDiskCache();
      } catch (error) {
        console.error('Failed to clear disk cache:', error);
        this.stats.errors++;
      }
    }

    // 統計情報をリセット
    this.resetStats();
  }

  /**
   * ディスクキャッシュをクリア
   */
  private clearDiskCache(): void {
    if (!this.options.cacheDir) return;

    const files = this.getDirectoryFiles(this.options.cacheDir);
    for (const file of files) {
      if (file.endsWith('.json') && file.includes(this.options.prefix || 'cache')) {
        try {
          fs.unlinkSync(path.join(this.options.cacheDir, file));
        } catch (error) {
          console.error(`Failed to delete cache file ${file}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  /**
   * ディレクトリ内のファイルを再帰的に取得
   * @param dir ディレクトリパス
   * @returns ファイルパスの配列
   */
  private getDirectoryFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
        // 再帰的にサブディレクトリを処理
        results = results.concat(this.getDirectoryFiles(filePath));
      } else {
        results.push(filePath);
      }
    });
    
    return results;
  }

  /**
   * 期限切れのキャッシュエントリをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();

    // メモリキャッシュのクリーンアップ
    for (const [hash, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(hash);
        this.stats.evictions++;
      }
    }

    // ディスクキャッシュのクリーンアップ
    if (this.options.useDiskCache && this.options.cacheDir) {
      try {
        this.cleanupDiskCache(now);
      } catch (error) {
        console.error('Failed to cleanup disk cache:', error);
        this.stats.errors++;
      }
    }

    this.updateCacheSize();
  }

  /**
   * ディスクキャッシュのクリーンアップ
   * @param now 現在のタイムスタンプ
   */
  private cleanupDiskCache(now: number): void {
    if (!this.options.cacheDir) return;

    const files = this.getDirectoryFiles(this.options.cacheDir);
    for (const file of files) {
      if (file.endsWith('.json') && file.includes(this.options.prefix || 'cache')) {
        try {
          const data = fs.readFileSync(file, 'utf8');
          const entry = JSON.parse(data) as CacheEntry<T>;
          
          if (this.isExpired(entry)) {
            fs.unlinkSync(file);
            this.stats.evictions++;
          }
        } catch (error) {
          console.error(`Failed to process cache file ${file}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  /**
   * キャッシュサイズを更新
   */
  private updateCacheSize(): void {
    this.stats.memorySize = this.memoryCache.size;
    
    if (this.options.useDiskCache && this.options.cacheDir) {
      try {
        let diskSize = 0;
        const files = this.getDirectoryFiles(this.options.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json') && file.includes(this.options.prefix || 'cache')) {
            diskSize++;
          }
        }
        this.stats.diskSize = diskSize;
      } catch (error) {
        console.error('Failed to update disk cache size:', error);
        this.stats.errors++;
      }
    }
    
    this.stats.size = this.stats.memorySize + this.stats.diskSize;
  }

  /**
   * 統計情報をリセット
   */
  private resetStats(): void {
    this.stats = {
      size: 0,
      memorySize: 0,
      diskSize: 0,
      hits: {
        memory: 0,
        disk: 0,
        total: 0
      },
      misses: 0,
      writes: {
        memory: 0,
        disk: 0,
        total: 0
      },
      evictions: 0,
      errors: 0
    };
  }

  /**
   * 統計情報を取得
   * @returns キャッシュ統計情報
   */
  getStats(): CacheStats {
    this.updateCacheSize();
    return { ...this.stats };
  }

  /**
   * キャッシュのヒット率を取得
   * @returns ヒット率（0-1）
   */
  getHitRate(): number {
    const total = this.stats.hits.total + this.stats.misses;
    return total > 0 ? this.stats.hits.total / total : 0;
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// シングルトンインスタンスを作成
export const createCacheManager = <T>(options?: CacheOptions): CacheManager<T> => {
  return new CacheManager<T>(options);
};
