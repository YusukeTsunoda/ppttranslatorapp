interface CacheKey {
  text: string;
  sourceLang: string;
  targetLang: string;
}

interface CacheValue {
  translated: string;
  timestamp: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
}

interface CacheOptions {
  maxSize: number;
  ttl: number; // 秒単位
}

/**
 * 翻訳キャッシュクラス
 */
export class TranslationCache {
  private cache: Map<string, CacheValue>;
  private maxSize: number;
  private ttl: number;
  private hits: number;
  private misses: number;

  constructor(options: CacheOptions) {
    this.validateOptions(options);
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.ttl = options.ttl * 1000; // ミリ秒に変換
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * キャッシュに値を設定
   * @param key キャッシュキー
   * @param value キャッシュ値
   */
  set(key: CacheKey, value: CacheValue): void {
    this.validateKey(key);

    // キャッシュが最大サイズに達している場合、最も古いエントリを削除
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const cacheKey = this.generateKey(key);
    this.cache.set(cacheKey, {
      ...value,
      timestamp: Date.now(),
    });
  }

  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュ値またはnull
   */
  get(key: CacheKey): CacheValue | null {
    const cacheKey = this.generateKey(key);
    const value = this.cache.get(cacheKey);

    if (!value) {
      this.misses++;
      return null;
    }

    // TTLチェック
    if (this.isExpired(value)) {
      this.cache.delete(cacheKey);
      this.misses++;
      return null;
    }

    this.hits++;
    return value;
  }

  /**
   * キャッシュから特定のエントリを削除
   * @param key キャッシュキー
   */
  delete(key: CacheKey): void {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 現在のキャッシュサイズを取得
   * @returns キャッシュサイズ
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの統計情報を取得
   * @returns 統計情報
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * キャッシュキーを生成
   * @param key キャッシュキー
   * @returns 文字列化されたキャッシュキー
   */
  private generateKey(key: CacheKey): string {
    return `${key.text}:${key.sourceLang}:${key.targetLang}`;
  }

  /**
   * エントリが期限切れかどうかをチェック
   * @param value キャッシュ値
   * @returns 期限切れの場合true
   */
  private isExpired(value: CacheValue): boolean {
    return Date.now() - value.timestamp > this.ttl;
  }

  /**
   * 最も古いエントリのキーを取得
   * @returns 最も古いエントリのキー
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * オプションを検証
   * @param options キャッシュオプション
   */
  private validateOptions(options: CacheOptions): void {
    if (options.maxSize <= 0) {
      throw new Error('Cache size must be a positive number');
    }
    if (options.ttl <= 0) {
      throw new Error('TTL must be a positive number');
    }
  }

  /**
   * キャッシュキーを検証
   * @param key キャッシュキー
   */
  private validateKey(key: CacheKey): void {
    if (!key.text || !key.sourceLang || !key.targetLang) {
      throw new Error('Invalid cache key');
    }
  }
} 