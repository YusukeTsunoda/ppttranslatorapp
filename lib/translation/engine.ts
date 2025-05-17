/**
 * 翻訳エンジン連携モジュール
 * Anthropic APIを使用した翻訳処理を担当
 */

import Anthropic from '@anthropic-ai/sdk';
import { Language } from '@prisma/client';
import { withRetry } from './error-handler';
import { preprocessText, generateTranslationPrompt } from './utils';
import { normalizeTranslatedText, checkTranslationQuality } from './normalizer';
import { TranslationErrorContext } from './types';

// 翻訳エンジンの設定
const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * 翻訳エンジンクラス
 */
export class TranslationEngine {
  private anthropic: Anthropic;
  private model: string;
  
  /**
   * コンストラクタ
   * @param apiKey Anthropic API Key
   * @param model 使用するモデル名
   */
  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('API設定が不足しています');
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    this.model = model || DEFAULT_MODEL;
  }
  
  /**
   * 単一テキストの翻訳を実行
   * @param text 翻訳対象テキスト
   * @param sourceLang ソース言語
   * @param targetLang ターゲット言語
   * @param context エラー時のコンテキスト情報
   * @returns 翻訳されたテキスト
   */
  async translateText(
    text: string,
    sourceLang: Language,
    targetLang: Language,
    context?: TranslationErrorContext
  ): Promise<string> {
    if (!text || text.trim() === '') {
      return '';
    }
    
    // 翻訳プロンプトを生成
    const prompt = generateTranslationPrompt(
      preprocessText(text),
      sourceLang,
      targetLang
    );
    
    // システムプロンプト
    const systemPrompt = `あなたは高品質な翻訳エンジンです。${sourceLang}から${targetLang}への翻訳を行います。元のテキストの意味を正確に保ちながら、自然な${targetLang}に翻訳してください。フォーマットや記号は保持し、翻訳のみを行ってください。余分な説明や前置き、後置きは一切加えないでください。`;
    
    try {
      // Anthropic APIを使用して翻訳
      const translationResult = await withRetry(
        async () => {
          return await this.anthropic.messages.create({
            model: this.model,
            max_tokens: MAX_TOKENS,
            temperature: DEFAULT_TEMPERATURE,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          });
        },
        MAX_RETRIES,
        RETRY_DELAY_MS,
        (error: Error) => {
          const textIndex = context?.textIndex ?? -1;
          const totalTexts = context?.totalTexts ?? 0;
          console.error(`翻訳リトライエラー (${textIndex + 1}/${totalTexts}):`, error);
          return true; // すべてのエラーでリトライ
        }
      );

      // レスポンスからテキスト内容を取得
      let translatedContent = '';
      if (translationResult.content && translationResult.content.length > 0) {
        // contentの各ブロックを確認
        for (const block of translationResult.content) {
          if (block.type === 'text') {
            translatedContent += block.text;
          }
        }
      }

      // 翻訳結果を正規化
      const normalizedTranslation = normalizeTranslatedText(translatedContent);
      
      // 翻訳品質チェック
      const qualityCheck = checkTranslationQuality(normalizedTranslation, text);
      if (!qualityCheck.isValid) {
        console.warn(`翻訳品質の問題が検出されました: ${qualityCheck.issues.join(', ')}`);
        // 問題があっても処理は続行し、後で改善または再翻訳を検討
      }
      
      return normalizedTranslation;
    } catch (error) {
      const textIndex = context?.textIndex ?? -1;
      const totalTexts = context?.totalTexts ?? 0;
      console.error(`翻訳エラー (${textIndex + 1}/${totalTexts}):`, error);
      throw error;
    }
  }
  
  /**
   * 複数テキストの翻訳を実行
   * @param texts 翻訳対象テキスト配列
   * @param sourceLang ソース言語
   * @param targetLang ターゲット言語
   * @returns 翻訳結果と処理情報
   */
  async translateTexts(
    texts: string[],
    sourceLang: Language,
    targetLang: Language
  ): Promise<{
    translations: string[];
    error: Error | null;
    processingTimeMs: number;
  }> {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return {
        translations: [],
        error: new Error('テキストが必要です'),
        processingTimeMs: 0
      };
    }
    
    const startTime = Date.now();
    const translations: string[] = [];
    let translationError: Error | null = null;
    
    // 各テキストを順番に翻訳
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || text.trim() === '') {
        translations.push('');
        continue;
      }
      
      try {
        const translatedText = await this.translateText(
          text,
          sourceLang,
          targetLang,
          {
            textIndex: i,
            totalTexts: texts.length
          }
        );
        
        translations.push(translatedText);
      } catch (error) {
        translationError = error as Error;
        // エラーが発生しても続行し、可能な限り翻訳を完了させる
        continue;
      }
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`翻訳処理時間: ${processingTime}ms (${translations.length}/${texts.length} 完了)`);
    
    return {
      translations,
      error: translationError,
      processingTimeMs: processingTime
    };
  }
  
  /**
   * モデル名を設定
   * @param model モデル名
   */
  setModel(model: string): void {
    this.model = model;
  }
  
  /**
   * 現在のモデル名を取得
   * @returns 現在のモデル名
   */
  getModel(): string {
    return this.model;
  }
  
  /**
   * モデル名が有効かチェック
   * @param model モデル名
   * @returns 有効な場合はtrue
   */
  static isValidModel(model: string): boolean {
    const validModels = [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229'
    ];
    
    return validModels.includes(model);
  }
  
  /**
   * 無料ユーザー向けのモデル名を取得
   * @returns 無料ユーザー向けモデル名
   */
  static getFreeUserModel(): string {
    return DEFAULT_MODEL;
  }
}
