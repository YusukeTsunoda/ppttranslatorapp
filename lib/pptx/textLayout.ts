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
 * マージン調整の基本設定
 */
const MARGIN_CONFIG = {
  baseMargin: 0.01, // フォントサイズの1%をベースマージンとする
  languageFactors: {
    'en': 1.0,   // 英語（基準）
    'ja': 0.1,   // 日本語（90%減）
    'zh': 0.1,   // 中国語（90%減）
    'ko': 0.2,   // 韓国語（80%減）
    'ar': 8.0,   // アラビア語
    'he': 8.0,   // ヘブライ語
  },
  rtlConfig: {
    languages: ['ar', 'he'],
    rightMarginMultiplier: 10.0,
    leftMarginMultiplier: 0.01
  }
};

/**
 * マージンを計算する
 */
function calculateMargin(
  fontSize: number,
  sourceLanguage: string,
  targetLanguage: string,
  isRTL: boolean = false
): { 
  marginLeft: number, 
  marginRight: number,
  marginTop: number,
  marginBottom: number 
} {
  const baseMargin = fontSize * MARGIN_CONFIG.baseMargin;
  const sourceFactor = MARGIN_CONFIG.languageFactors[sourceLanguage] || 1.0;
  const targetFactor = MARGIN_CONFIG.languageFactors[targetLanguage] || 1.0;
  
  // 基本マージンを計算
  let margin = baseMargin * (targetFactor / sourceFactor);
  
  // RTL言語の場合、左右のマージンを調整
  if (isRTL) {
    return {
      marginLeft: margin * MARGIN_CONFIG.rtlConfig.leftMarginMultiplier,
      marginRight: margin * MARGIN_CONFIG.rtlConfig.rightMarginMultiplier,
      marginTop: margin,
      marginBottom: margin
    };
  }
  
  return {
    marginLeft: margin,
    marginRight: margin,
    marginTop: margin,
    marginBottom: margin
  };
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
  const adjustedElement = {...element};
  
  if (adjustedElement.position) {
    const fontSize = adjustedElement.fontInfo?.size || 12; // デフォルトフォントサイズ
    const isRTL = MARGIN_CONFIG.rtlConfig.languages.includes(targetLanguage);
    
    // マージンを計算
    const margins = calculateMargin(fontSize, sourceLanguage, targetLanguage, isRTL);
    
    // 位置とサイズを調整
    adjustedElement.position = {
      ...adjustedElement.position,
      ...margins
    };
    
    // サイズの調整
    const { width, height } = adjustTextBoxSize(
      translatedText,
      adjustedElement.position.width,
      adjustedElement.position.height,
      sourceLanguage,
      targetLanguage
    );
    
    adjustedElement.position.width = width;
    adjustedElement.position.height = height;
  }
  
  // フォント情報の調整
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