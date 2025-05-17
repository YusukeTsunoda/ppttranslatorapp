import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { TranslationCache } from '@/lib/translation/cache';

describe('Translation Cache', () => {
  let cache: TranslationCache;

  beforeEach(() => {
    cache = new TranslationCache({
      maxSize: 1000,
      ttl: 3600, // 1時間
    });
  });

  describe('基本的な操作', () => {
    it('キャッシュに値を設定して取得する', () => {
      const key = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const value = { translated: 'こんにちは', timestamp: Date.now() };

      cache.set(key, value);
      const cached = cache.get(key);

      expect(cached).toEqual(value);
    });

    it('存在しないキーはnullを返す', () => {
      const key = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const cached = cache.get(key);

      expect(cached).toBeNull();
    });

    it('TTL経過後はキャッシュが無効になる', async () => {
      const key = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const value = { translated: 'こんにちは', timestamp: Date.now() };

      cache = new TranslationCache({ maxSize: 1000, ttl: 1 }); // TTLを1秒に設定
      cache.set(key, value);

      // TTLが経過するまで待機
      await new Promise(resolve => setTimeout(resolve, 1100));

      const cached = cache.get(key);
      expect(cached).toBeNull();
    });
  });

  describe('キャッシュサイズ制限', () => {
    it('最大サイズを超えた場合は古いエントリを削除する', () => {
      cache = new TranslationCache({ maxSize: 2, ttl: 3600 });

      const keys = [
        { text: 'Hello', sourceLang: 'en', targetLang: 'ja' },
        { text: 'World', sourceLang: 'en', targetLang: 'ja' },
        { text: 'Test', sourceLang: 'en', targetLang: 'ja' },
      ];

      keys.forEach((key, index) => {
        cache.set(key, { translated: `Value ${index}`, timestamp: Date.now() });
      });

      // 最も古いエントリが削除されていることを確認
      expect(cache.get(keys[0])).toBeNull();
      expect(cache.get(keys[1])).not.toBeNull();
      expect(cache.get(keys[2])).not.toBeNull();
    });

    it('キャッシュサイズを取得する', () => {
      const keys = [
        { text: 'Hello', sourceLang: 'en', targetLang: 'ja' },
        { text: 'World', sourceLang: 'en', targetLang: 'ja' },
      ];

      keys.forEach((key, index) => {
        cache.set(key, { translated: `Value ${index}`, timestamp: Date.now() });
      });

      expect(cache.size()).toBe(2);
    });
  });

  describe('キャッシュ操作', () => {
    it('キャッシュをクリアする', () => {
      const key = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const value = { translated: 'こんにちは', timestamp: Date.now() };

      cache.set(key, value);
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get(key)).toBeNull();
    });

    it('キャッシュから特定のエントリを削除する', () => {
      const key = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const value = { translated: 'こんにちは', timestamp: Date.now() };

      cache.set(key, value);
      expect(cache.get(key)).not.toBeNull();

      cache.delete(key);
      expect(cache.get(key)).toBeNull();
    });

    it('キャッシュの統計情報を取得する', () => {
      const keys = [
        { text: 'Hello', sourceLang: 'en', targetLang: 'ja' },
        { text: 'World', sourceLang: 'en', targetLang: 'ja' },
      ];

      keys.forEach((key, index) => {
        cache.set(key, { translated: `Value ${index}`, timestamp: Date.now() });
        cache.get(key); // ヒットカウントを増やす
      });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });
  });

  describe('キャッシュキーの生成', () => {
    it('異なるテキストで異なるキーを生成する', () => {
      const key1 = { text: 'Hello', sourceLang: 'en', targetLang: 'ja' };
      const key2 = { text: 'World', sourceLang: 'en', targetLang: 'ja' };

      cache.set(key1, { translated: 'こんにちは', timestamp: Date.now() });
      cache.set(key2, { translated: '世界', timestamp: Date.now() });

      expect(cache.get(key1)?.translated).toBe('こんにちは');
      expect(cache.get(key2)?.translated).toBe('世界');
    });

    it('異なる言語ペアで異なるキーを生成する', () => {
      const text = 'Hello';
      const key1 = { text, sourceLang: 'en', targetLang: 'ja' };
      const key2 = { text, sourceLang: 'en', targetLang: 'fr' };

      cache.set(key1, { translated: 'こんにちは', timestamp: Date.now() });
      cache.set(key2, { translated: 'Bonjour', timestamp: Date.now() });

      expect(cache.get(key1)?.translated).toBe('こんにちは');
      expect(cache.get(key2)?.translated).toBe('Bonjour');
    });
  });

  describe('エラー処理', () => {
    it('無効なTTL値でエラーをスローする', () => {
      expect(() => {
        new TranslationCache({ maxSize: 1000, ttl: -1 });
      }).toThrow('TTL must be a positive number');
    });

    it('無効なキャッシュサイズでエラーをスローする', () => {
      expect(() => {
        new TranslationCache({ maxSize: 0, ttl: 3600 });
      }).toThrow('Cache size must be a positive number');
    });

    it('無効なキャッシュキーでエラーをスローする', () => {
      expect(() => {
        cache.set({ text: '', sourceLang: 'en', targetLang: 'ja' }, { translated: 'test', timestamp: Date.now() });
      }).toThrow('Invalid cache key');
    });
  });
}); 