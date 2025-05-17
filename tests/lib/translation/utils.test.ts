import { describe, expect, it } from '@jest/globals';
import { cleanTranslatedText, validateTranslationRequest, preprocessText, generateTranslationPrompt } from '@/lib/translation/utils';

describe('Translation Utilities', () => {
  describe('cleanTranslatedText', () => {
    it('余分なプレフィックスを削除する', () => {
      const inputs = [
        'Translation: Hello',
        'Translated text: Hello',
        'The translation is: Hello',
        'In English: Hello',
        'In Japanese: こんにちは',
        'The text "Hello" translates to: こんにちは',
      ];

      inputs.forEach(input => {
        const cleaned = cleanTranslatedText(input);
        expect(cleaned).toBe('Hello');
      });
    });

    it('引用符を適切に処理する', () => {
      const inputs = [
        '"Hello"',
        '"こんにちは"',
        'The text "Hello" in English is: "World"',
      ];

      const expected = [
        'Hello',
        'こんにちは',
        'World',
      ];

      inputs.forEach((input, index) => {
        const cleaned = cleanTranslatedText(input);
        expect(cleaned).toBe(expected[index]);
      });
    });

    it('空白を適切に処理する', () => {
      const inputs = [
        '  Hello  ',
        '\nHello\n',
        '\tHello\t',
      ];

      inputs.forEach(input => {
        const cleaned = cleanTranslatedText(input);
        expect(cleaned).toBe('Hello');
      });
    });
  });

  describe('validateTranslationRequest', () => {
    it('有効なリクエストを検証する', () => {
      const validRequest = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [
          {
            index: 0,
            texts: [{ text: 'Hello', index: 0 }],
          },
        ],
      };

      const result = validateTranslationRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('必須フィールドが欠けている場合はエラーを返す', () => {
      const invalidRequests = [
        { sourceLanguage: 'en', targetLanguage: 'ja' }, // textsが欠けている
        { texts: ['Hello'], targetLanguage: 'ja' }, // sourceLanguageが欠けている
        { texts: ['Hello'], sourceLanguage: 'en' }, // targetLanguageが欠けている
        { texts: ['Hello'], sourceLanguage: 'en', targetLanguage: 'ja' }, // fileIdが欠けている
      ];

      invalidRequests.forEach(request => {
        const result = validateTranslationRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('不正なデータ型の場合はエラーを返す', () => {
      const invalidRequests = [
        { texts: 'Hello', sourceLanguage: 'en', targetLanguage: 'ja', fileId: 'test' }, // textsが配列でない
        { texts: ['Hello'], sourceLanguage: 123, targetLanguage: 'ja', fileId: 'test' }, // sourceLanguageが文字列でない
        { texts: ['Hello'], sourceLanguage: 'en', targetLanguage: true, fileId: 'test' }, // targetLanguageが文字列でない
        { texts: ['Hello'], sourceLanguage: 'en', targetLanguage: 'ja', fileId: 123 }, // fileIdが文字列でない
      ];

      invalidRequests.forEach(request => {
        const result = validateTranslationRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('空の配列や文字列の場合はエラーを返す', () => {
      const invalidRequests = [
        { texts: [], sourceLanguage: 'en', targetLanguage: 'ja', fileId: 'test' }, // 空の配列
        { texts: [''], sourceLanguage: 'en', targetLanguage: 'ja', fileId: 'test' }, // 空の文字列
        { texts: ['Hello'], sourceLanguage: '', targetLanguage: 'ja', fileId: 'test' }, // 空のsourceLanguage
        { texts: ['Hello'], sourceLanguage: 'en', targetLanguage: '', fileId: 'test' }, // 空のtargetLanguage
        { texts: ['Hello'], sourceLanguage: 'en', targetLanguage: 'ja', fileId: '' }, // 空のfileId
      ];

      invalidRequests.forEach(request => {
        const result = validateTranslationRequest(request);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('preprocessText', () => {
    it('前後の空白を削除する', () => {
      const inputs = [
        '  Hello  ',
        '\tHello\t',
        '\nHello\n',
      ];

      inputs.forEach(input => {
        const processed = preprocessText(input);
        expect(processed).toBe('Hello');
      });
    });

    it('連続する空白を1つにまとめる', () => {
      const input = 'Hello    World   !';
      const processed = preprocessText(input);
      expect(processed).toBe('Hello World !');
    });

    it('連続する改行を1つにまとめる', () => {
      const input = 'Hello\n\n\nWorld\r\n\r\n!';
      const processed = preprocessText(input);
      expect(processed).toBe('Hello\nWorld\n!');
    });

    it('複合的な空白と改行を処理する', () => {
      const input = '  Hello  \n\n  World  \r\n\r\n  !  ';
      const processed = preprocessText(input);
      expect(processed).toBe('Hello\nWorld\n!');
    });
  });

  describe('generateTranslationPrompt', () => {
    it('基本的な翻訳プロンプトを生成する', () => {
      const text = 'Hello World';
      const sourceLang = 'en';
      const targetLang = 'ja';

      const prompt = generateTranslationPrompt(text, sourceLang, targetLang);

      expect(prompt).toContain('テキスト: "Hello World"');
      expect(prompt).toContain('enからjaに翻訳');
      expect(prompt).toContain('自然なjaに翻訳');
    });

    it('特殊文字を含むテキストのプロンプトを生成する', () => {
      const text = 'Hello\nWorld!@#$%';
      const sourceLang = 'en';
      const targetLang = 'ja';

      const prompt = generateTranslationPrompt(text, sourceLang, targetLang);

      expect(prompt).toContain('テキスト: "Hello\nWorld!@#$%"');
      expect(prompt).toContain('フォーマットや記号は保持');
    });

    it('異なる言語ペアのプロンプトを生成する', () => {
      const testCases = [
        { text: 'Hello', source: 'en', target: 'ja' },
        { text: 'Bonjour', source: 'fr', target: 'en' },
        { text: 'こんにちは', source: 'ja', target: 'en' },
      ];

      testCases.forEach(({ text, source, target }) => {
        const prompt = generateTranslationPrompt(text, source, target);
        expect(prompt).toContain(`${source}から${target}に翻訳`);
        expect(prompt).toContain(`自然な${target}に翻訳`);
        expect(prompt).toContain(`テキスト: "${text}"`);
      });
    });
  });
}); 