/**
 * フォントマッピングユーティリティ
 * 言語間のフォント差異を解決し、適切なフォントを選択するためのヘルパー関数
 */

// 言語コード
type LanguageCode = 'en' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar' | string;

// フォントスタック（フォールバック順）
interface FontStack {
  primary: string[];  // 第一選択フォント
  fallback: string[]; // フォールバックフォント
}

// 言語別のフォントマッピング
const languageFonts: Record<LanguageCode, FontStack> = {
  // 英語
  'en': {
    primary: ['Arial', 'Calibri', 'Helvetica', 'Verdana'],
    fallback: ['Tahoma', 'Segoe UI', 'Roboto', 'sans-serif']
  },
  // 日本語
  'ja': {
    primary: ['Meiryo', 'MS PGothic', 'Hiragino Kaku Gothic Pro', 'Noto Sans JP'],
    fallback: ['Yu Gothic', 'Osaka', 'Apple Gothic', 'sans-serif']
  },
  // 中国語（簡体字）
  'zh': {
    primary: ['Microsoft YaHei', 'SimHei', 'Noto Sans SC', 'PingFang SC'],
    fallback: ['WenQuanYi Micro Hei', 'Heiti SC', 'sans-serif']
  },
  // 韓国語
  'ko': {
    primary: ['Malgun Gothic', 'Gulim', 'Noto Sans KR', 'Apple SD Gothic Neo'],
    fallback: ['Dotum', 'Batang', 'sans-serif']
  },
  // ロシア語
  'ru': {
    primary: ['Arial', 'Calibri', 'Tahoma', 'Verdana'],
    fallback: ['Segoe UI', 'Roboto', 'sans-serif']
  },
  // アラビア語
  'ar': {
    primary: ['Arial', 'Tahoma', 'Times New Roman', 'Traditional Arabic'],
    fallback: ['Simplified Arabic', 'Segoe UI', 'sans-serif']
  }
};

// デフォルトのフォントスタック
const defaultFontStack: FontStack = {
  primary: ['Arial', 'Calibri', 'Helvetica'],
  fallback: ['Segoe UI', 'Tahoma', 'sans-serif']
};

/**
 * 言語に適したフォントを取得
 * @param language 言語コード
 * @returns 適切なフォントスタック
 */
export function getFontStackForLanguage(language: LanguageCode): FontStack {
  return languageFonts[language] || defaultFontStack;
}

/**
 * 特定の言語に最適なフォントを選択
 * @param language 言語コード
 * @param preferredFont ユーザーが希望するフォント（オプション）
 * @returns 最適なフォント名
 */
export function getBestFontForLanguage(language: LanguageCode, preferredFont?: string): string {
  const fontStack = getFontStackForLanguage(language);
  
  // ユーザー指定のフォントがあり、それが言語に適している場合は使用
  if (preferredFont) {
    if (fontStack.primary.includes(preferredFont) || fontStack.fallback.includes(preferredFont)) {
      return preferredFont;
    }
  }
  
  // 最適なフォントを返す
  return fontStack.primary[0];
}

/**
 * フォントサイズを言語に合わせて最適化
 * @param fontSize 元のフォントサイズ
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns 最適化されたフォントサイズ
 */
export function optimizeFontSize(
  fontSize: number,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): number {
  // CJK言語（中国語、日本語、韓国語）のフォントサイズ調整係数
  const CJKLanguages = ['ja', 'zh', 'ko'];
  const isCJKSource = CJKLanguages.includes(sourceLanguage);
  const isCJKTarget = CJKLanguages.includes(targetLanguage);
  
  // CJK → 非CJKの場合、フォントサイズを小さく
  if (isCJKSource && !isCJKTarget) {
    return Math.max(fontSize * 0.9, 8); // 最小8pt
  }
  
  // 非CJK → CJKの場合、フォントサイズを大きく
  if (!isCJKSource && isCJKTarget) {
    return fontSize * 1.1;
  }
  
  // アラビア語は少し大きめに
  if (targetLanguage === 'ar') {
    return fontSize * 1.05;
  }
  
  return fontSize;
}

/**
 * テキストボックスのサイズを言語と内容に基づいて調整
 * @param text テキスト内容
 * @param currentWidth 現在の幅
 * @param currentHeight 現在の高さ
 * @param sourceLanguage 原文の言語
 * @param targetLanguage 翻訳先の言語
 * @returns 調整後のサイズ {width, height}
 */
export function adjustTextBoxSize(
  text: string,
  currentWidth: number,
  currentHeight: number,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): { width: number; height: number } {
  // 言語別の平均文字幅（相対値）
  const languageCharWidths: Record<string, number> = {
    'en': 1.0,   // 基準
    'ja': 1.2,   // 英語より約20%広い
    'zh': 1.2,   // 英語より約20%広い
    'ko': 1.15,  // 英語より約15%広い
    'ru': 1.05,  // 英語より約5%広い
    'ar': 1.1    // 英語より約10%広い
  };
  
  // デフォルト値
  const sourceWidth = languageCharWidths[sourceLanguage] || 1.0;
  const targetWidth = languageCharWidths[targetLanguage] || 1.0;
  
  // 文字数による調整係数の計算
  const sourceLength = sourceLanguage === 'ja' || sourceLanguage === 'zh' || sourceLanguage === 'ko'
    ? text.length * 1.5  // CJK言語は1文字で複数の英数字幅を取る
    : text.length;
  
  // 必要に応じて幅を調整
  const widthRatio = targetWidth / sourceWidth;
  let newWidth = currentWidth;
  
  // 極端に大きくならないように制限
  if (widthRatio > 1.1) {
    newWidth = Math.min(currentWidth * 1.1, currentWidth * widthRatio);
  } else if (widthRatio < 0.9) {
    newWidth = Math.max(currentWidth * 0.9, currentWidth * widthRatio);
  }
  
  // 高さは内容に応じて自動調整されるべきだが、
  // 最低限の高さは確保する
  const newHeight = currentHeight;
  
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
}

/**
 * 特定の言語に対するテキスト方向を取得
 * @param language 言語コード
 * @returns テキスト方向 ('ltr' または 'rtl')
 */
export function getTextDirection(language: LanguageCode): 'ltr' | 'rtl' {
  // RTL（右から左）言語
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(language) ? 'rtl' : 'ltr';
} 