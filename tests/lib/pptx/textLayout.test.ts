import { adjustTextElement, calculateTextScalingFactor } from '@/lib/pptx/textLayout';
import { TextElement } from '@/lib/pptx/types';

describe('テキストレイアウト調整', () => {
  describe('マージン調整テスト', () => {
    it('日本語から英語への変換時のマージン調整', () => {
      const originalElement: TextElement = {
        text: '日本語テキスト',
        position: {
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          margin: 10
        }
      };

      const result = adjustTextElement(
        originalElement,
        '日本語テキスト',
        'Japanese Text',
        'ja',
        'en'
      );

      expect(result.position.margin).toBeLessThan(originalElement.position.margin);
      expect(result.position.margin).toBe(5); // ベースマージン1%で計算
    });

    it('RTL言語のテキスト処理', () => {
      const originalElement: TextElement = {
        text: 'English text',
        position: {
          x: 100,
          y: 100,
          width: 200,
          height: 50,
          margin: 10
        }
      };

      const result = adjustTextElement(
        originalElement,
        'English text',
        'نص عربي', // アラビア語テキスト
        'en',
        'ar'
      );

      expect(result.position.marginRight).toBeGreaterThan(result.position.marginLeft);
      expect(result.position.marginRight / result.position.marginLeft).toBeGreaterThan(8); // 右マージンが左マージンの8倍以上
    });
  });

  describe('スケーリング係数計算', () => {
    it('日本語から英語への変換時のスケーリング', () => {
      const result = calculateTextScalingFactor(
        '日本語テキスト',
        'Japanese Text',
        'ja',
        'en'
      );

      expect(result).toBeLessThan(1.0); // 日本語から英語への変換は縮小
    });

    it('英語から日本語への変換時のスケーリング', () => {
      const result = calculateTextScalingFactor(
        'English Text',
        '英語テキスト',
        'en',
        'ja'
      );

      expect(result).toBeGreaterThan(1.0); // 英語から日本語への変換は拡大
    });
  });
}); 