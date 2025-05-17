import { describe, expect, it, jest } from '@jest/globals';
import { translateConcurrently } from '@/lib/translation/concurrent';

describe('Translation Concurrent Processing', () => {
  describe('translateConcurrently', () => {
    it('複数のテキストを並行して翻訳する', async () => {
      const texts = Array.from({ length: 10 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage);
      expect(result).toHaveLength(texts.length);
      result.forEach((translation, index) => {
        expect(translation).toHaveProperty('original', texts[index]);
        expect(translation).toHaveProperty('translated');
      });
    });

    it('バッチサイズを指定して翻訳する', async () => {
      const texts = Array.from({ length: 20 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';
      const batchSize = 5;

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage, { batchSize });
      expect(result).toHaveLength(texts.length);
    });

    it('同時実行数を制限して翻訳する', async () => {
      const texts = Array.from({ length: 15 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';
      const concurrency = 3;

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage, { concurrency });
      expect(result).toHaveLength(texts.length);
    });

    it('エラー発生時にリトライする', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';

      // 最初の呼び出しでエラー、2回目で成功するモックを作成
      let attempts = new Map();
      const mockTranslate = jest.fn().mockImplementation((text) => {
        const currentAttempt = (attempts.get(text) || 0) + 1;
        attempts.set(text, currentAttempt);

        if (currentAttempt === 1) {
          throw new Error('Temporary error');
        }
        return Promise.resolve({ original: text, translated: `Translated ${text}` });
      });

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage, {
        translate: mockTranslate,
        maxRetries: 3,
      });

      expect(result).toHaveLength(texts.length);
      texts.forEach(text => {
        expect(attempts.get(text)).toBe(2); // 各テキストが2回試行されたことを確認
      });
    });

    it('部分的な失敗を処理する', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';

      // Text 2の翻訳が常に失敗するモックを作成
      const mockTranslate = jest.fn().mockImplementation((text) => {
        if (text === 'Text 2') {
          throw new Error('Persistent error');
        }
        return Promise.resolve({ original: text, translated: `Translated ${text}` });
      });

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage, {
        translate: mockTranslate,
        maxRetries: 2,
      });

      expect(result).toHaveLength(2); // 失敗したテキストを除外
      expect(result.map(r => r.original)).not.toContain('Text 2');
    });

    it('進捗コールバックを呼び出す', async () => {
      const texts = Array.from({ length: 5 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';
      const onProgress = jest.fn();

      await translateConcurrently(texts, sourceLanguage, targetLanguage, { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(texts.length);
      expect(onProgress).toHaveBeenLastCalledWith(1); // 最後は100%
    });

    it('キャンセル時に実行中の翻訳を中止する', async () => {
      const texts = Array.from({ length: 10 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';
      const abortController = new AbortController();

      // 翻訳を開始して即座にキャンセル
      setTimeout(() => abortController.abort(), 100);

      await expect(
        translateConcurrently(texts, sourceLanguage, targetLanguage, { signal: abortController.signal })
      ).rejects.toThrow('Translation cancelled');
    });

    it('メモリ使用量を監視する', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Text ${i + 1}`);
      const sourceLanguage = 'en';
      const targetLanguage = 'ja';
      const memoryLimit = 100 * 1024 * 1024; // 100MB

      const result = await translateConcurrently(texts, sourceLanguage, targetLanguage, {
        memoryLimit,
        onMemoryExceeded: jest.fn(),
      });

      expect(result).toHaveLength(texts.length);
    });
  });
}); 