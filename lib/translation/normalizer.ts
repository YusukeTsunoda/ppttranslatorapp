/**
 * 翻訳結果の正規化と構造化を行うモジュール
 * 翻訳APIからのレスポンスを整形し、余分なテキストを除去する
 */

import { cleanTranslatedText } from './utils';

/**
 * 翻訳結果の構造化データ型
 */
export interface StructuredTranslation {
  slideIndex: number;
  texts: {
    index: number;
    originalText: string;
    translatedText: string;
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    style?: Record<string, any>;
  }[];
}

/**
 * 翻訳結果を正規化する拡張パターン
 * より多くのAI翻訳モデルの出力パターンに対応
 */
const EXTENDED_PATTERNS = [
  // 基本的な前置きパターン
  /^Here is the translation from .+ to .+:\s*/i,
  /^Translation(s)?:\s*/i,
  /^Translated text:\s*/i,
  /^The translation is:\s*/i,
  
  // 言語固有の前置きパターン
  /^In (English|Japanese|Chinese|German|French|Spanish|Russian|Korean|Arabic):\s*/i,
  /^(英語|日本語|中国語|ドイツ語|フランス語|スペイン語|ロシア語|韓国語|アラビア語)で(は)?:\s*/i,
  
  // 引用形式のパターン
  /^The text ["']([^"']+)["'] translates to:\s*/i,
  /^The text ["']([^"']+)["'] translates to .+ as:\s*/i,
  /^The text ["']([^"']+)["'] can be translated to .+ as:\s*/i,
  /^The text ["']([^"']+)["'] in .+ is:\s*/i,
  /^The .+ translation of ["']([^"']+)["'] is:\s*/i,
  
  // 引用符のみのパターン
  /^["'](.+)["']$/,
  
  // コロン終わりのパターン
  /^(.+):$/,
  
  // 追加の複雑なパターン
  /^Translating from .+ to .+:\s*/i,
  /^Here's the translation:\s*/i,
  /^Translated from .+ to .+:\s*/i,
  /^Translation result:\s*/i,
  /^The .+ text translated to .+ is:\s*/i,
  /^I'll translate this from .+ to .+:\s*/i,
  /^Translating ["']([^"']+)["'] from .+ to .+:\s*/i,
  
  // 翻訳後の余分な説明文
  /\s*This is the (accurate|direct|literal) translation.$/i,
  /\s*I've maintained the original (meaning|nuance|tone).$/i,
  /\s*The translation preserves the original (meaning|nuance|tone).$/i,
];

/**
 * 翻訳結果から余分なテキストを削除する拡張版
 * @param text 翻訳結果のテキスト
 * @returns クリーニング済みのテキスト
 */
export function normalizeTranslatedText(text: string): string {
  if (!text) return '';
  
  let cleanedText = text.trim();
  
  // 拡張パターンを適用
  EXTENDED_PATTERNS.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });
  
  // 二重引用符の削除 (引用符で囲まれたテキスト全体の場合)
  if ((cleanedText.startsWith('"') && cleanedText.endsWith('"')) || 
      (cleanedText.startsWith("'") && cleanedText.endsWith("'"))) {
    cleanedText = cleanedText.substring(1, cleanedText.length - 1);
  }
  
  // 末尾のコロンを削除
  if (cleanedText.endsWith(':')) {
    cleanedText = cleanedText.substring(0, cleanedText.length - 1);
  }
  
  // 改行の正規化
  cleanedText = cleanedText.replace(/\r\n/g, '\n');
  
  return cleanedText.trim();
}

/**
 * 翻訳結果を構造化する
 * @param rawTranslations 生の翻訳結果
 * @param originalTexts 元のテキスト
 * @param slides スライドデータ
 * @returns 構造化された翻訳結果
 */
export function structureTranslations(
  rawTranslations: string[],
  originalTexts: string[],
  slides: any[]
): StructuredTranslation[] {
  // スライドデータがない場合は空配列を返す
  if (!slides || !Array.isArray(slides)) {
    return [];
  }
  
  // 構造化された翻訳結果を格納する配列
  const structuredTranslations: StructuredTranslation[] = [];
  
  // 翻訳インデックスのカウンター
  let translationIndex = 0;
  
  // 各スライドごとに処理
  slides.forEach((slide, slideIndex) => {
    // スライドの翻訳データを初期化
    const slideTranslation: StructuredTranslation = {
      slideIndex,
      texts: []
    };
    
    // スライド内のテキストを処理
    if (slide.texts && Array.isArray(slide.texts)) {
      slide.texts.forEach((textData: any, textIndex: number) => {
        // 翻訳インデックスが範囲内かチェック
        if (translationIndex < rawTranslations.length) {
          // 翻訳テキストを正規化
          const normalizedTranslation = normalizeTranslatedText(rawTranslations[translationIndex]);
          
          // テキストデータを構造化
          slideTranslation.texts.push({
            index: textIndex,
            originalText: textData.text || '',
            translatedText: normalizedTranslation,
            position: textData.position || undefined,
            style: textData.style || undefined
          });
          
          // 翻訳インデックスをインクリメント
          translationIndex++;
        }
      });
    }
    
    // スライドの翻訳データを追加
    structuredTranslations.push(slideTranslation);
  });
  
  return structuredTranslations;
}

/**
 * エラー発生時の部分的な翻訳結果を生成
 * @param rawTranslations 生の翻訳結果
 * @param originalTexts 元のテキスト
 * @param slides スライドデータ
 * @param error エラー情報
 * @returns 部分的な翻訳結果
 */
export function createPartialTranslationResult(
  rawTranslations: string[],
  originalTexts: string[],
  slides: any[],
  error: Error
): {
  translatedSlides: StructuredTranslation[];
  error: string;
  isPartial: boolean;
} {
  // 可能な限りの翻訳結果を構造化
  const partialTranslations = structureTranslations(
    rawTranslations,
    originalTexts,
    slides
  );
  
  return {
    translatedSlides: partialTranslations,
    error: error.message,
    isPartial: true
  };
}

/**
 * 翻訳結果の品質をチェック
 * @param translatedText 翻訳されたテキスト
 * @param originalText 元のテキスト
 * @returns 品質チェック結果
 */
export function checkTranslationQuality(
  translatedText: string,
  originalText: string
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // 空の翻訳結果をチェック
  if (!translatedText || translatedText.trim() === '') {
    issues.push('翻訳結果が空です');
    return { isValid: false, issues };
  }
  
  // 元のテキストと同じ場合をチェック（翻訳されていない可能性）
  if (translatedText.trim() === originalText.trim()) {
    issues.push('翻訳結果が元のテキストと同じです');
  }
  
  // 翻訳結果が極端に短い場合をチェック
  if (translatedText.length < originalText.length * 0.3 && originalText.length > 10) {
    issues.push('翻訳結果が元のテキストに比べて極端に短いです');
  }
  
  // 翻訳結果に余分なパターンが含まれていないかチェック
  for (const pattern of EXTENDED_PATTERNS) {
    if (pattern.test(translatedText)) {
      issues.push('翻訳結果に余分なパターンが含まれています');
      break;
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
