import { calculateTextSize, adjustTextBoxSize } from '@/lib/utils/fontMapping';
import { PERFORMANCE_THRESHOLDS, TEST_CONFIGURATIONS } from '../config/test-config';
import { measurePerformance, generateTestText, calculateStatistics } from '../utils/measurement';

describe('Basic Performance Test Suite', () => {
  describe('Single Text Box Processing', () => {
    test('Text size calculation performance', async () => {
      const { TEXT_LENGTHS, FONTS } = TEST_CONFIGURATIONS;
      
      for (const length of Object.values(TEXT_LENGTHS)) {
        // 日本語テスト
        const jaText = generateTestText(length, 'ja');
        const jaResult = await measurePerformance(() => 
          calculateTextSize(jaText, 12, FONTS.ja[0])
        );

        console.log(`日本語テキスト (${length}文字) の処理時間:`, {
          平均実行時間: `${jaResult.executionTime.toFixed(2)}ms`,
          メモリ使用量: `${jaResult.memoryDelta.heapUsed}MB`,
          統計: calculateStatistics(jaResult.measurements.times)
        });

        // 英語テスト
        const enText = generateTestText(length, 'en');
        const enResult = await measurePerformance(() => 
          calculateTextSize(enText, 12, FONTS.en[0])
        );

        console.log(`英語テキスト (${length}文字) の処理時間:`, {
          平均実行時間: `${enResult.executionTime.toFixed(2)}ms`,
          メモリ使用量: `${enResult.memoryDelta.heapUsed}MB`,
          統計: calculateStatistics(enResult.measurements.times)
        });

        // 基準値との比較
        expect(jaResult.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME.SINGLE_SLIDE);
        expect(enResult.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME.SINGLE_SLIDE);
      }
    });

    test('Text box adjustment performance', async () => {
      const { TEXT_LENGTHS, LANGUAGE_PAIRS } = TEST_CONFIGURATIONS;
      
      for (const { source, target } of LANGUAGE_PAIRS) {
        for (const length of [TEXT_LENGTHS.SHORT, TEXT_LENGTHS.MEDIUM]) {
          const text = generateTestText(length, source as 'en' | 'ja' | 'zh');
          
          const result = await measurePerformance(() => 
            adjustTextBoxSize(text, 500, 300, source, target)
          );

          console.log(`テキストボックス調整 (${source} → ${target}, ${length}文字):`, {
            平均実行時間: `${result.executionTime.toFixed(2)}ms`,
            メモリ使用量: `${result.memoryDelta.heapUsed}MB`,
            統計: calculateStatistics(result.measurements.times)
          });

          expect(result.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME.SINGLE_SLIDE);
          expect(result.memoryDelta.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE.SINGLE_SLIDE);
        }
      }
    });
  });

  describe('Cache Performance', () => {
    test('Text size calculation cache hit rate', async () => {
      const text = generateTestText(TEST_CONFIGURATIONS.TEXT_LENGTHS.MEDIUM, 'ja');
      const result = await measurePerformance(
        () => calculateTextSize(text, 12, TEST_CONFIGURATIONS.FONTS.ja[0]),
        { withCache: true }
      );

      console.log('キャッシュヒット率:', {
        率: `${result.cacheHitRate?.toFixed(2)}%`,
        平均実行時間: `${result.executionTime.toFixed(2)}ms`
      });

      expect(result.cacheHitRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CACHE.MIN_HIT_RATE);
    });
  });

  describe('Edge Cases', () => {
    test('Extreme text length handling', async () => {
      const text = generateTestText(TEST_CONFIGURATIONS.TEXT_LENGTHS.EXTREME, 'ja');
      const result = await measurePerformance(() => 
        calculateTextSize(text, 12, TEST_CONFIGURATIONS.FONTS.ja[0])
      );

      console.log('極端に長いテキストの処理:', {
        長さ: TEST_CONFIGURATIONS.TEXT_LENGTHS.EXTREME,
        平均実行時間: `${result.executionTime.toFixed(2)}ms`,
        メモリ使用量: `${result.memoryDelta.heapUsed}MB`
      });

      expect(result.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PROCESSING_TIME.SINGLE_SLIDE * 2);
      expect(result.memoryDelta.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE.SINGLE_SLIDE);
    });
  });
}); 