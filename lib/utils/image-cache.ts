'use client';

/**
 * 画像キャッシュとプリフェッチのためのユーティリティ
 */

interface CachedImage {
  url: string;
  blob: Blob;
  objectUrl: string;
  timestamp: number;
}

// キャッシュの有効期限（ミリ秒）
const CACHE_EXPIRY = 1000 * 60 * 5; // 5分

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private prefetchQueue: string[] = [];
  private isPrefetching = false;
  private maxCacheSize = 30; // 最大キャッシュサイズ

  /**
   * 画像のプリフェッチをキューに追加
   */
  prefetch(urls: string[]): void {
    // 既にキャッシュされているURLは除外
    const newUrls = urls.filter(url => !this.cache.has(url));
    
    // キューに追加
    this.prefetchQueue.push(...newUrls);
    
    // プリフェッチが動いていなければ開始
    if (!this.isPrefetching) {
      this.processPrefetchQueue();
    }
  }

  /**
   * プリフェッチキューを処理
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) {
      this.isPrefetching = false;
      return;
    }

    this.isPrefetching = true;
    const url = this.prefetchQueue.shift();
    
    if (url) {
      try {
        await this.loadAndCacheImage(url);
        console.log(`Prefetched image: ${url}`);
      } catch (error) {
        console.error(`Failed to prefetch image: ${url}`, error);
      }
    }

    // 次のプリフェッチを少し遅延させて処理（サーバーに負荷をかけないため）
    setTimeout(() => this.processPrefetchQueue(), 200);
  }

  /**
   * 画像をロードしてキャッシュに保存
   */
  private async loadAndCacheImage(url: string): Promise<string> {
    // 既にキャッシュにある場合はそれを返す
    if (this.cache.has(url)) {
      const cached = this.cache.get(url)!;
      cached.timestamp = Date.now(); // 使用時間を更新
      return cached.objectUrl;
    }

    // キャッシュサイズが上限に達していたら古いものを削除
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanCache();
    }

    // 画像をフェッチ
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Failed to load image: ${url}, status: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // キャッシュに保存
    this.cache.set(url, {
      url,
      blob,
      objectUrl,
      timestamp: Date.now()
    });

    return objectUrl;
  }

  /**
   * 画像を取得（キャッシュにあればそれを返し、なければロード）
   */
  async getImage(url: string): Promise<string> {
    return this.loadAndCacheImage(url);
  }

  /**
   * 古いキャッシュを削除
   */
  private cleanCache(): void {
    const now = Date.now();
    
    // 期限切れのキャッシュエントリを特定
    const expiredEntries: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_EXPIRY) {
        expiredEntries.push(key);
      }
    });

    // 期限切れのエントリがある場合は削除
    if (expiredEntries.length > 0) {
      expiredEntries.forEach(key => {
        const entry = this.cache.get(key);
        if (entry) {
          URL.revokeObjectURL(entry.objectUrl);
          this.cache.delete(key);
        }
      });
      return;
    }

    // 期限切れのエントリがない場合は最も古いものを削除
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    });

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        URL.revokeObjectURL(entry.objectUrl);
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.forEach(entry => {
      URL.revokeObjectURL(entry.objectUrl);
    });
    this.cache.clear();
  }
}

// シングルトンインスタンスをエクスポート
export const imageCache = new ImageCache(); 