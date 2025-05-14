/**
 * PPTXのテキストレイアウト調整ヘルパー関数
 * フォントサイズ、位置、寸法の計算を行い、異なる言語間でのテキスト位置ずれを補正
 */

import { getBestFontForLanguage, optimizeFontSize, adjustTextBoxSize } from '@/lib/utils/fontMapping';
import { TextElement } from './types';

/**
 * 翻訳テキストの表示サイズを計算する
 * @param originalText 原文テキスト
 * @param translatedText 翻訳テキスト
 * @param originalFontInfo 原文のフォント情報
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns 調整されたフォント情報
 */
export function calculateAdjustedTextStyle(
  originalText: string,
  translatedText: string,
  originalFontInfo: any,
  sourceLanguage: string = 'en',
  targetLanguage: string = 'ja'
): any {
  // フォント情報のディープコピー
  const adjustedFontInfo = {...originalFontInfo};
  
  // フォントサイズの調整
  if (adjustedFontInfo.size) {
    adjustedFontInfo.size = optimizeFontSize(
      adjustedFontInfo.size,
      sourceLanguage,
      targetLanguage
    );
  }
  
  // 最適なフォントの選択
  adjustedFontInfo.name = getBestFontForLanguage(
    targetLanguage,
    originalFontInfo.name
  );
  
  return adjustedFontInfo;
}

/**
 * テキスト要素の位置とサイズを調整
 * @param element テキスト要素
 * @param originalText 原文テキスト
 * @param translatedText 翻訳テキスト
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns 調整されたテキスト要素
 */
export function adjustTextElement(
  element: TextElement,
  originalText: string,
  translatedText: string,
  sourceLanguage: string = 'en',
  targetLanguage: string = 'ja'
): TextElement {
  // テキスト要素のディープコピー
  const adjustedElement = {...element};
  
  // ポジションの調整
  if (adjustedElement.position) {
    const { width, height } = adjustedElement.position;
    
    // サイズの調整
    const adjustedSize = adjustTextBoxSize(
      translatedText,
      width,
      height,
      sourceLanguage,
      targetLanguage
    );
    
    // 調整されたサイズをセット
    adjustedElement.position = {
      ...adjustedElement.position,
      width: adjustedSize.width,
      height: adjustedSize.height
    };
  }
  
  // フォント情報があれば調整
  if (adjustedElement.fontInfo) {
    adjustedElement.fontInfo = calculateAdjustedTextStyle(
      originalText,
      translatedText,
      adjustedElement.fontInfo,
      sourceLanguage,
      targetLanguage
    );
  }
  
  return adjustedElement;
}

/**
 * 翻訳前後のテキスト長比率に基づいてスケーリング係数を計算
 * @param originalText 原文テキスト
 * @param translatedText 翻訳テキスト
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns スケーリング係数
 */
export function calculateTextScalingFactor(
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string
): number {
  // テキスト長の比率
  const lengthRatio = translatedText.length / Math.max(1, originalText.length);
  
  // 言語による補正係数
  const languageFactors: {[key: string]: number} = {
    'en': 1.0,   // 英語（基準）
    'ja': 0.5,   // 日本語（英語の約半分の文字数で同じ情報量）
    'zh': 0.5,   // 中国語
    'ko': 0.6,   // 韓国語
    'ru': 0.8,   // ロシア語
    'de': 0.9,   // ドイツ語
    'fr': 0.9,   // フランス語
    'es': 0.9,   // スペイン語
  };
  
  const sourceFactor = languageFactors[sourceLanguage] || 1.0;
  const targetFactor = languageFactors[targetLanguage] || 1.0;
  
  // 言語間の係数比
  const languageRatio = targetFactor / sourceFactor;
  
  // 最終的なスケーリング係数を計算
  let scalingFactor = lengthRatio * languageRatio;
  
  // 係数の上限と下限を設定
  scalingFactor = Math.min(Math.max(scalingFactor, 0.8), 1.5);
  
  return scalingFactor;
}

/**
 * 翻訳スライドのテキスト要素全体のレイアウトを最適化
 * @param textElements テキスト要素の配列
 * @param originalTexts 原文テキストの配列
 * @param translatedTexts 翻訳テキストの配列
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns 調整されたテキスト要素の配列
 */
export function optimizeSlideTextLayout(
  textElements: TextElement[],
  originalTexts: string[],
  translatedTexts: string[],
  sourceLanguage: string,
  targetLanguage: string
): TextElement[] {
  // すべてのテキスト要素を調整
  return textElements.map((element, index) => {
    if (index < originalTexts.length && index < translatedTexts.length) {
      return adjustTextElement(
        element,
        originalTexts[index],
        translatedTexts[index],
        sourceLanguage,
        targetLanguage
      );
    }
    return element;
  });
} 