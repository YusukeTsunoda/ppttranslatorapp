// Jestのインポートは不要（グローバルに利用可能）
import { 
  normalizeTranslatedText, 
  structureTranslations, 
  checkTranslationQuality,
  createPartialTranslationResult
} from '@/lib/translation/normalizer';
import { SlideData, StructuredTranslation } from '@/lib/translation/types';

describe('normalizeTranslatedText', () => {
  it('余分なテキストを除去する', () => {
    const input = 'ここが翻訳結果です。\n\n翻訳：';
    const expected = 'ここが翻訳結果です。';
    expect(normalizeTranslatedText(input)).toBe(expected);
  });

  it('前後の空白を削除する', () => {
    const input = '  テキスト前後の空白  ';
    const expected = 'テキスト前後の空白';
    expect(normalizeTranslatedText(input)).toBe(expected);
  });

  it('「翻訳：」のプレフィックスを削除する', () => {
    const input = '翻訳：これは翻訳されたテキストです。';
    const expected = 'これは翻訳されたテキストです。';
    expect(normalizeTranslatedText(input)).toBe(expected);
  });

  it('「Translation:」のプレフィックスを削除する', () => {
    const input = 'Translation: This is translated text.';
    const expected = 'This is translated text.';
    expect(normalizeTranslatedText(input)).toBe(expected);
  });

  it('複数行の余分なテキストを削除する', () => {
    const input = 'これは翻訳です。\n\n翻訳者：AI\n日付：2025年5月17日';
    const expected = 'これは翻訳です。';
    expect(normalizeTranslatedText(input)).toBe(expected);
  });

  it('空の入力に対して空文字列を返す', () => {
    expect(normalizeTranslatedText('')).toBe('');
    expect(normalizeTranslatedText(' ')).toBe('');
  });
});

describe('structureTranslations', () => {
  it('翻訳結果を構造化する', () => {
    const translations = ['翻訳1', '翻訳2', '翻訳3'];
    const originalTexts = ['原文1', '原文2', '原文3'];
    const slides: SlideData[] = [
      {
        slideIndex: 0,
        texts: [
          { index: 0, text: '原文1', position: { x: 10, y: 10, width: 100, height: 50 } },
          { index: 1, text: '原文2', position: { x: 10, y: 70, width: 100, height: 50 } }
        ]
      },
      {
        slideIndex: 1,
        texts: [
          { index: 2, text: '原文3', position: { x: 10, y: 10, width: 100, height: 50 } }
        ]
      }
    ];

    const result = structureTranslations(translations, originalTexts, slides);
    
    expect(result).toHaveLength(2);
    expect(result[0].slideIndex).toBe(0);
    expect(result[0].texts).toHaveLength(2);
    expect(result[0].texts[0].originalText).toBe('原文1');
    expect(result[0].texts[0].translatedText).toBe('翻訳1');
    expect(result[0].texts[1].originalText).toBe('原文2');
    expect(result[0].texts[1].translatedText).toBe('翻訳2');
    
    expect(result[1].slideIndex).toBe(1);
    expect(result[1].texts).toHaveLength(1);
    expect(result[1].texts[0].originalText).toBe('原文3');
    expect(result[1].texts[0].translatedText).toBe('翻訳3');
  });

  it('翻訳が不足している場合、空文字列で埋める', () => {
    const translations = ['翻訳1']; // 1つだけ
    const originalTexts = ['原文1', '原文2', '原文3'];
    const slides: SlideData[] = [
      {
        slideIndex: 0,
        texts: [
          { index: 0, text: '原文1', position: { x: 10, y: 10, width: 100, height: 50 } },
          { index: 1, text: '原文2', position: { x: 10, y: 70, width: 100, height: 50 } }
        ]
      },
      {
        slideIndex: 1,
        texts: [
          { index: 2, text: '原文3', position: { x: 10, y: 10, width: 100, height: 50 } }
        ]
      }
    ];

    const result = structureTranslations(translations, originalTexts, slides);
    
    expect(result[0].texts[0].translatedText).toBe('翻訳1');
    expect(result[0].texts[1].translatedText).toBe(''); // 空文字列
    expect(result[1].texts[0].translatedText).toBe(''); // 空文字列
  });
});

describe('checkTranslationQuality', () => {
  it('翻訳品質が良好な場合、isValidがtrueを返す', () => {
    const translatedText = 'これは良質な翻訳です。';
    const originalText = 'This is a good translation.';
    
    const result = checkTranslationQuality(translatedText, originalText);
    
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('翻訳が短すぎる場合、問題を検出する', () => {
    const translatedText = '短い';
    const originalText = 'This is a much longer text that should result in a longer translation.';
    
    const result = checkTranslationQuality(translatedText, originalText);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('短すぎる');
  });

  it('翻訳が空の場合、問題を検出する', () => {
    const translatedText = '';
    const originalText = 'This should have a translation.';
    
    const result = checkTranslationQuality(translatedText, originalText);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('空');
  });
});

describe('createPartialTranslationResult', () => {
  it('部分的な翻訳結果を構造化する', () => {
    const translations = ['翻訳1', '翻訳2']; // 2つだけ
    const originalTexts = ['原文1', '原文2', '原文3'];
    const slides: SlideData[] = [
      {
        slideIndex: 0,
        texts: [
          { index: 0, text: '原文1', position: { x: 10, y: 10, width: 100, height: 50 } },
          { index: 1, text: '原文2', position: { x: 10, y: 70, width: 100, height: 50 } }
        ]
      },
      {
        slideIndex: 1,
        texts: [
          { index: 2, text: '原文3', position: { x: 10, y: 10, width: 100, height: 50 } }
        ]
      }
    ];
    const error = new Error('テスト用エラー');

    const result = createPartialTranslationResult(translations, originalTexts, slides, error);
    
    expect(result.isPartial).toBe(true);
    expect(result.error).toBe('テスト用エラー');
    expect(result.translatedSlides).toHaveLength(2);
    expect(result.translatedSlides[0].texts[0].translatedText).toBe('翻訳1');
    expect(result.translatedSlides[0].texts[1].translatedText).toBe('翻訳2');
    expect(result.translatedSlides[1].texts[0].translatedText).toBe(''); // 翻訳なし
  });
});
