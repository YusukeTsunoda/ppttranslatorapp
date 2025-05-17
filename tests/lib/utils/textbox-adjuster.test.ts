import { TextBoxAdjuster } from '../../../lib/utils/textbox-adjuster';

describe('TextBoxAdjuster', () => {
  // 実際のユースケーステスト
  describe('実際のユースケース', () => {
    test('日本語から英語への変換時のテキストボックス調整', () => {
      const text = 'This is a test text for English translation';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        text,
        currentMetrics,
        'ja',
        'en',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThanOrEqual(8);
      expect(result.fontSize).toBeLessThanOrEqual(72);
      expect(result.margins.left).toBeLessThan(currentMetrics.margins.left);
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });

    test('英語から日本語への変換時のテキストボックス調整', () => {
      const text = '日本語のテストテキストです。';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        text,
        currentMetrics,
        'en',
        'ja',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThanOrEqual(8);
      expect(result.margins.left).toBeGreaterThan(5);
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });

    test('混合テキスト（日英）の適切な処理', () => {
      const text = '日本語とEnglish混在テキスト with 記号!?';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        text,
        currentMetrics,
        'ja',
        'en',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThanOrEqual(8);
      expect(result.margins.left).toBeDefined();
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });
  });

  // エッジケーステスト
  describe('エッジケース', () => {
    test('極端に長いテキスト', () => {
      const longText = 'a'.repeat(1000);
      const currentMetrics = {
        width: 200,
        height: 50,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        longText,
        currentMetrics,
        'en',
        'en',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBe(8); // 最小フォントサイズ
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });

    test('極端に短いテキスト', () => {
      const shortText = 'a';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        shortText,
        currentMetrics,
        'en',
        'en',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThan(12); // 元のフォントサイズより大きくなるはず
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });

    test('特殊文字を含むテキスト', () => {
      const specialText = '特殊文字✨🌟★☆♪♫、記号!@#$%^&*()';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        specialText,
        currentMetrics,
        'ja',
        'en',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThanOrEqual(8);
      expect(result.width).toBeLessThanOrEqual(currentMetrics.width);
    });

    test('RTL言語のテキスト', () => {
      const rtlText = 'مرحبا بالعالم'; // アラビア語のテキスト
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const result = TextBoxAdjuster.calculateOptimalLayout(
        rtlText,
        currentMetrics,
        'ar',
        'ar',
        'text-to-fit-shape'
      );

      expect(result.fontSize).toBeGreaterThanOrEqual(8);
      expect(result.margins.right).toBeGreaterThan(result.margins.left);
    });
  });

  // パフォーマンステスト
  describe('パフォーマンス', () => {
    test('大量のテキストの処理時間', () => {
      const longText = 'a'.repeat(10000);
      const currentMetrics = {
        width: 800,
        height: 600,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      const startTime = performance.now();
      
      const result = TextBoxAdjuster.calculateOptimalLayout(
        longText,
        currentMetrics,
        'en',
        'en',
        'text-to-fit-shape'
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100); // 100ms以内に処理が完了すること
      expect(result.fontSize).toBeGreaterThanOrEqual(8);
    });

    test('キャッシュの効果の検証', () => {
      const text = 'Cache test text';
      const currentMetrics = {
        width: 400,
        height: 100,
        fontSize: 12,
        margins: { left: 10, right: 10, top: 5, bottom: 5 }
      };

      // 1回目の実行
      const startTime1 = performance.now();
      const result1 = TextBoxAdjuster.calculateOptimalLayout(
        text,
        currentMetrics,
        'en',
        'en',
        'text-to-fit-shape'
      );
      const executionTime1 = performance.now() - startTime1;

      // 2回目の実行（キャッシュが効くはず）
      const startTime2 = performance.now();
      const result2 = TextBoxAdjuster.calculateOptimalLayout(
        text,
        currentMetrics,
        'en',
        'en',
        'text-to-fit-shape'
      );
      const executionTime2 = performance.now() - startTime2;

      expect(executionTime2).toBeLessThan(executionTime1);
      expect(result1).toEqual(result2);
    });
  });
}); 