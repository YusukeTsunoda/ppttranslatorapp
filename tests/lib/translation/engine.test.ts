// Jestのインポートは不要（グローバルに利用可能）
import { TranslationEngine } from '@/lib/translation/engine';
import { Language } from '@prisma/client';

// Anthropic APIをモック
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'これはモックされた翻訳結果です。'
            }
          ]
        })
      }
    }))
  };
});

describe('TranslationEngine', () => {
  let engine: TranslationEngine;
  const mockApiKey = 'mock-api-key';
  
  beforeEach(() => {
    // 各テスト前にエンジンを初期化
    engine = new TranslationEngine(mockApiKey);
  });
  
  afterEach(() => {
    // モックをリセット
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('APIキーなしで初期化するとエラーになる', () => {
      expect(() => new TranslationEngine('')).toThrow('API設定が不足しています');
    });
    
    it('デフォルトモデルで初期化される', () => {
      expect(engine.getModel()).toBe('claude-3-haiku-20240307');
    });
    
    it('指定したモデルで初期化される', () => {
      const customEngine = new TranslationEngine(mockApiKey, 'claude-3-opus-20240229');
      expect(customEngine.getModel()).toBe('claude-3-opus-20240229');
    });
  });
  
  describe('translateText', () => {
    it('テキストを翻訳する', async () => {
      const result = await engine.translateText(
        'Hello world',
        Language.en,
        Language.ja,
        { textIndex: 0, totalTexts: 1 }
      );
      
      expect(result).toBe('これはモックされた翻訳結果です。');
    });
    
    it('空のテキストは空文字列を返す', async () => {
      const result = await engine.translateText(
        '',
        Language.en,
        Language.ja
      );
      
      expect(result).toBe('');
    });
  });
  
  describe('translateTexts', () => {
    it('複数のテキストを翻訳する', async () => {
      const texts = ['Hello', 'World'];
      const result = await engine.translateTexts(
        texts,
        Language.en,
        Language.ja
      );
      
      expect(result.translations).toHaveLength(2);
      expect(result.translations[0]).toBe('これはモックされた翻訳結果です。');
      expect(result.translations[1]).toBe('これはモックされた翻訳結果です。');
      expect(result.error).toBeNull();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
    
    it('空の配列は空の結果を返す', async () => {
      const result = await engine.translateTexts(
        [],
        Language.en,
        Language.ja
      );
      
      expect(result.translations).toHaveLength(0);
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('テキストが必要です');
    });
  });
  
  describe('setModel/getModel', () => {
    it('モデルを設定・取得できる', () => {
      engine.setModel('claude-3-sonnet-20240229');
      expect(engine.getModel()).toBe('claude-3-sonnet-20240229');
    });
  });
  
  describe('static methods', () => {
    it('isValidModel - 有効なモデルを検証する', () => {
      expect(TranslationEngine.isValidModel('claude-3-haiku-20240307')).toBe(true);
      expect(TranslationEngine.isValidModel('claude-3-sonnet-20240229')).toBe(true);
      expect(TranslationEngine.isValidModel('claude-3-opus-20240229')).toBe(true);
      expect(TranslationEngine.isValidModel('invalid-model')).toBe(false);
    });
    
    it('getFreeUserModel - 無料ユーザー向けモデルを返す', () => {
      expect(TranslationEngine.getFreeUserModel()).toBe('claude-3-haiku-20240307');
    });
  });
});
