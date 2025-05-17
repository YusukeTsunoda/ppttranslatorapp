import { calculateTextSize, adjustTextBoxSize } from '@/lib/utils/fontMapping';
import { PERFORMANCE_THRESHOLDS, TEST_CONFIGURATIONS } from '../config/test-config';
import { measurePerformance, generateTestText, calculateStatistics } from '../utils/measurement';

describe('Large PPTX Performance Test Suite', () => {
  describe('Large Scale Processing', () => {
    test('Multiple slides text processing', async () => {
      const { SLIDE_COUNTS, TEXT_LENGTHS, FONTS } = TEST_CONFIGURATIONS;
      
      // スライド数ごとのテスト
      for (const slideCount of Object.values(SLIDE_COUNTS)) {
        console.log(`\nテスト: ${slideCount}スライドの処理`);
        
        const texts = Array(slideCount).fill(null).map(() => ({
          ja: generateTestText(TEXT_LENGTHS.MEDIUM, 'ja'),
          en: generateTestText(TEXT_LENGTHS.MEDIUM, 'en')
        }));

        // 全スライドの処理時間測定
        const result = await measurePerformance(
          async () => {
            for (const text of texts) {
              await calculateTextSize(text.ja, 12, FONTS.ja[0]);
              await calculateTextSize(text.en, 12, FONTS.en[0]);
            }
          },
          { iterations: TEST_UTILS.ITERATIONS.QUICK }
        );

        const stats = calculateStatistics(result.measurements.times);
        console.log('処理結果:', {
          スライド数: slideCount,
          平均処理時間: `${result.executionTime.toFixed(2)}ms`,
          メモリ使用量: `${result.memoryDelta.heapUsed}MB`,
          統計: {
            最小: `${stats.min.toFixed(2)}ms`,
            最大: `${stats.max.toFixed(2)}ms`,
            中央値: `${stats.median.toFixed(2)}ms`,
            95パーセンタイル: `${stats.p95.toFixed(2)}ms`
          }
        });

        // スライド数に応じた基準値との比較
        const threshold = slideCount <= SLIDE_COUNTS.SMALL
          ? PERFORMANCE_THRESHOLDS.PROCESSING_TIME.SMALL_PPTX
          : slideCount <= SLIDE_COUNTS.MEDIUM
            ? PERFORMANCE_THRESHOLDS.PROCESSING_TIME.MEDIUM_PPTX
            : PERFORMANCE_THRESHOLDS.PROCESSING_TIME.LARGE_PPTX;

        expect(result.executionTime).toBeLessThan(threshold);
        expect(result.memoryDelta.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE.LARGE_FILE);
      }
    });

    test('Memory usage during large file processing', async () => {
      const slideCount = TEST_CONFIGURATIONS.SLIDE_COUNTS.LARGE;
      const texts = Array(slideCount).fill(null).map(() => ({
        ja: generateTestText(TEST_CONFIGURATIONS.TEXT_LENGTHS.LONG, 'ja'),
        en: generateTestText(TEST_CONFIGURATIONS.TEXT_LENGTHS.LONG, 'en')
      }));

      console.log('\nメモリ使用量の長期的な測定');
      
      const result = await measurePerformance(
        async () => {
          for (const text of texts) {
            await calculateTextSize(text.ja, 12, TEST_CONFIGURATIONS.FONTS.ja[0]);
            await calculateTextSize(text.en, 12, TEST_CONFIGURATIONS.FONTS.en[0]);
          }
        },
        {
          iterations: TEST_UTILS.ITERATIONS.THOROUGH,
          warmup: false
        }
      );

      // メモリ使用量の推移を分析
      const memoryTrend = result.measurements.memory.map((usage, index) => ({
        測定ポイント: index * TEST_UTILS.MEASUREMENT_INTERVAL,
        ヒープ使用量: usage.heapUsed
      }));

      console.log('メモリ使用量の推移:', memoryTrend);
      console.log('最終メモリ状態:', {
        合計使用量: `${result.memoryDelta.heapTotal}MB`,
        実際の使用量: `${result.memoryDelta.heapUsed}MB`,
        外部メモリ: `${result.memoryDelta.external}MB`
      });

      // メモリリークの検出（単調増加のチェック）
      const isMonotonicIncrease = memoryTrend.every((point, i) => 
        i === 0 || point.ヒープ使用量 >= memoryTrend[i - 1].ヒープ使用量
      );

      if (isMonotonicIncrease) {
        console.warn('警告: メモリ使用量が単調増加しています。メモリリークの可能性があります。');
      }

      expect(result.memoryDelta.heapUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE.LARGE_FILE);
    });
  });

  describe('Concurrent Processing', () => {
    test('Parallel text processing performance', async () => {
      const batchSize = 10;
      const batches = 5;
      const texts = Array(batchSize * batches).fill(null).map(() => 
        generateTestText(TEST_CONFIGURATIONS.TEXT_LENGTHS.MEDIUM, 'ja')
      );

      console.log('\n並行処理のパフォーマンステスト');

      const result = await measurePerformance(
        async () => {
          // バッチ単位で並行処理
          for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            await Promise.all(
              batch.map(text => 
                calculateTextSize(text, 12, TEST_CONFIGURATIONS.FONTS.ja[0])
              )
            );
          }
        },
        { iterations: TEST_UTILS.ITERATIONS.STANDARD }
      );

      console.log('並行処理結果:', {
        バッチ数: batches,
        バッチサイズ: batchSize,
        平均処理時間: `${result.executionTime.toFixed(2)}ms`,
        メモリ使用量: `${result.memoryDelta.heapUsed}MB`,
        統計: calculateStatistics(result.measurements.times)
      });

      // 並行処理の効率性検証
      const sequentialResult = await measurePerformance(
        async () => {
          for (const text of texts) {
            await calculateTextSize(text, 12, TEST_CONFIGURATIONS.FONTS.ja[0]);
          }
        },
        { iterations: TEST_UTILS.ITERATIONS.STANDARD }
      );

      const speedup = sequentialResult.executionTime / result.executionTime;
      console.log('並行処理の効率:', {
        速度向上率: `${speedup.toFixed(2)}倍`,
        メモリオーバーヘッド: `${(result.memoryDelta.heapUsed - sequentialResult.memoryDelta.heapUsed).toFixed(2)}MB`
      });

      expect(speedup).toBeGreaterThan(1.5); // 最低1.5倍の速度向上を期待
    });
  });
}); 