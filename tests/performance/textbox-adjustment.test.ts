import { performance } from 'perf_hooks';
import { calculateTextSize, adjustTextBoxSize, getCharacterType, analyzeTextComposition } from '@/lib/utils/fontMapping';

describe('TextboxAdjuster Performance Tests', () => {
  // テストデータの準備
  const generateTestText = (length: number, language: 'en' | 'ja'): string => {
    if (language === 'en') {
      return 'Lorem ipsum '.repeat(Math.ceil(length / 12)).slice(0, length);
    }
    return 'こんにちは'.repeat(Math.ceil(length / 5)).slice(0, length);
  };

  // メモリ使用量の測定
  const measureMemoryUsage = () => {
    const used = process.memoryUsage();
    return {
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    };
  };

  // パフォーマンス測定用のラッパー関数
  const measurePerformance = async (fn: () => any, iterations: number = 1000) => {
    const startMemory = measureMemoryUsage();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const endTime = performance.now();
    const endMemory = measureMemoryUsage();

    return {
      executionTime: (endTime - startTime) / iterations,
      memoryDelta: {
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        rss: endMemory.rss - startMemory.rss
      }
    };
  };

  describe('Text Size Calculation Performance', () => {
    test('calculateTextSize performance for various text lengths', async () => {
      const testCases = [10, 100, 1000, 10000];
      
      for (const length of testCases) {
        const englishText = generateTestText(length, 'en');
        const japaneseText = generateTestText(length, 'ja');

        console.log(`\nTesting text length: ${length}`);

        // 英語テキストのパフォーマンス測定
        const englishResult = await measurePerformance(() => 
          calculateTextSize(englishText, 12, 'Arial')
        );
        console.log('English text performance:', {
          length,
          ...englishResult
        });

        // 日本語テキストのパフォーマンス測定
        const japaneseResult = await measurePerformance(() => 
          calculateTextSize(japaneseText, 12, 'Meiryo')
        );
        console.log('Japanese text performance:', {
          length,
          ...japaneseResult
        });

        // パフォーマンス基準の検証
        expect(englishResult.executionTime).toBeLessThan(5); // 5ms以下
        expect(japaneseResult.executionTime).toBeLessThan(10); // 10ms以下
      }
    });
  });

  describe('Text Box Adjustment Performance', () => {
    test('adjustTextBoxSize performance for different languages', async () => {
      const testCases = [
        { text: generateTestText(100, 'en'), source: 'en', target: 'ja' },
        { text: generateTestText(100, 'ja'), source: 'ja', target: 'en' },
        { text: generateTestText(1000, 'en'), source: 'en', target: 'ja' },
        { text: generateTestText(1000, 'ja'), source: 'ja', target: 'en' }
      ];

      for (const { text, source, target } of testCases) {
        console.log(`\nTesting adjustment: ${source} -> ${target}, length: ${text.length}`);

        const result = await measurePerformance(() => 
          adjustTextBoxSize(text, 500, 300, source, target)
        );

        console.log('Adjustment performance:', {
          source,
          target,
          length: text.length,
          ...result
        });

        // パフォーマンス基準の検証
        expect(result.executionTime).toBeLessThan(15); // 15ms以下
      }
    });
  });

  describe('Character Type Detection Performance', () => {
    test('getCharacterType and analyzeTextComposition performance', async () => {
      const testCases = [
        { text: generateTestText(100, 'en'), type: 'Mixed English' },
        { text: generateTestText(100, 'ja'), type: 'Mixed Japanese' },
        { text: generateTestText(1000, 'en'), type: 'Long English' },
        { text: generateTestText(1000, 'ja'), type: 'Long Japanese' }
      ];

      for (const { text, type } of testCases) {
        console.log(`\nTesting character type detection: ${type}`);

        // 文字種別判定のパフォーマンス
        const charTypeResult = await measurePerformance(() => {
          for (let char of text) {
            getCharacterType(char);
          }
        });

        console.log('Character type detection performance:', {
          type,
          length: text.length,
          ...charTypeResult
        });

        // テキスト構成分析のパフォーマンス
        const compositionResult = await measurePerformance(() => 
          analyzeTextComposition(text)
        );

        console.log('Text composition analysis performance:', {
          type,
          length: text.length,
          ...compositionResult
        });

        // パフォーマンス基準の検証
        expect(charTypeResult.executionTime).toBeLessThan(5); // 5ms以下
        expect(compositionResult.executionTime).toBeLessThan(10); // 10ms以下
      }
    });
  });
}); 