import { LanguageCode } from './types';
import { calculateTextSize, analyzeTextComposition, getFontStackForLanguage, optimizeFontSize } from './fontMapping';
import { LRUCache } from 'lru-cache';

interface TextBoxMetrics {
  width: number;
  height: number;
  fontSize: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

type AutoSizeMode = 'none' | 'text-to-fit-shape' | 'shape-to-fit-text';

// キャッシュ設定
const ADJUSTMENT_CACHE_SIZE = 1000;
const adjustmentCache = new LRUCache<string, AdjustmentResult>({
  max: ADJUSTMENT_CACHE_SIZE
});

interface AdjustmentResult {
  width: number;
  height: number;
  fontSize: number;
  margin: Margin;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface TextBoxDimensions {
  width: number;
  height: number;
  fontSize: number;
  margin: Margin;
}

export class TextBoxAdjuster {
  private static readonly DEFAULT_FONT_SIZE = 12;
  private static readonly MIN_FONT_SIZE = 8;
  private static readonly MAX_FONT_SIZE = 72;
  private static readonly FONT_SIZE_PRECISION = 0.5;
  
  // 言語別のマージン係数
  private static readonly MARGIN_FACTORS: Record<string, number> = {
    'en': 1.0,  // 基準
    'ja': 0.6,  // 日本語は文字が密集するため余白を少なめに
    'zh': 0.6,  // 中国語も同様
    'ko': 0.65, // 韓国語は少し余裕を持たせる
    'ar': 1.4,  // アラビア語は文字の装飾が多いため余裕を持たせる
  };

  /**
   * テキストボックスの最適なサイズとレイアウトを計算
   */
  static calculateOptimalLayout(
    text: string,
    currentMetrics: TextBoxMetrics,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    autoSizeMode: AutoSizeMode = 'text-to-fit-shape'
  ): TextBoxMetrics {
    // テキストの構成を分析
    const composition = analyzeTextComposition(text);
    
    // 最適なフォントサイズを計算
    const optimalFontSize = this.calculateOptimalFontSize(
      text,
      currentMetrics,
      autoSizeMode
    );
    
    // テキストの実際のサイズを計算
    const textSize = calculateTextSize(text, optimalFontSize, 'Arial');
    
    // マージンを調整
    const margins = this.calculateOptimalMargins(
      currentMetrics.margins,
      sourceLanguage,
      targetLanguage,
      composition
    );
    
    // 最終的なサイズを計算
    const finalMetrics = this.calculateFinalMetrics(
      textSize,
      margins,
      currentMetrics,
      autoSizeMode
    );
    
    return {
      ...finalMetrics,
      fontSize: optimalFontSize,
      margins
    };
  }

  /**
   * 最適なフォントサイズを計算
   */
  private static calculateOptimalFontSize(
    text: string,
    metrics: TextBoxMetrics,
    autoSizeMode: AutoSizeMode
  ): number {
    if (autoSizeMode === 'none') {
      return metrics.fontSize;
    }

    // テキスト長に基づく初期フォントサイズの調整
    const textLength = text.length;
    let initialFontSize = metrics.fontSize;
    if (textLength > 500) {
      initialFontSize = Math.max(this.MIN_FONT_SIZE, metrics.fontSize * 0.6);
    } else if (textLength > 200) {
      initialFontSize = Math.max(this.MIN_FONT_SIZE, metrics.fontSize * 0.75);
    }

    // 二分探索でフォントサイズを決定
    let left = this.MIN_FONT_SIZE;
    let right = Math.min(this.MAX_FONT_SIZE, metrics.fontSize * 1.5);
    let optimal = initialFontSize;

    while (Math.abs(right - left) > 0.1) {
      const mid = (left + right) / 2;
      const size = calculateTextSize(text, mid, 'Arial');

      const fits = this.checkTextFits(size, metrics, autoSizeMode);
      if (fits) {
        optimal = mid;
        left = mid;
      } else {
        right = mid;
      }
    }

    // 長いテキストの場合は、さらにフォントサイズを小さくする
    if (textLength > 1000) {
      return Math.max(this.MIN_FONT_SIZE, Math.floor(optimal * 0.7));
    }

    return Math.floor(optimal);
  }

  /**
   * テキストが指定されたサイズに収まるかチェック
   */
  private static checkTextFits(
    textSize: { width: number; height: number },
    metrics: TextBoxMetrics,
    autoSizeMode: AutoSizeMode
  ): boolean {
    const availableWidth = metrics.width - (metrics.margins.left + metrics.margins.right);
    const availableHeight = metrics.height - (metrics.margins.top + metrics.margins.bottom);

    if (autoSizeMode === 'text-to-fit-shape') {
      return textSize.width <= availableWidth && textSize.height <= availableHeight;
    } else {
      // shape-to-fit-textモードの場合は、アスペクト比を考慮
      const widthRatio = textSize.width / availableWidth;
      const heightRatio = textSize.height / availableHeight;
      return Math.max(widthRatio, heightRatio) <= 1.5; // 最大50%まで拡大を許容
    }
  }

  /**
   * 最適なマージンを計算
   */
  private static calculateOptimalMargins(
    currentMargins: TextBoxMetrics['margins'],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    composition: Record<string, number>
  ): TextBoxMetrics['margins'] {
    // 言語に応じたマージン係数を取得
    const sourceFactor = this.MARGIN_FACTORS[sourceLanguage] || 1.0;
    const targetFactor = this.MARGIN_FACTORS[targetLanguage] || 1.0;
    
    // マージン調整係数を計算
    const adjustmentFactor = targetFactor / sourceFactor;
    
    // 文字種別の構成に応じて微調整
    const mixedTextFactor = composition.japanese > 0 && composition.latin > 0 ? 0.9 : 1.0;
    
    return {
      left: Math.round(currentMargins.left * adjustmentFactor * mixedTextFactor),
      right: Math.round(currentMargins.right * adjustmentFactor * mixedTextFactor),
      top: Math.round(currentMargins.top * adjustmentFactor),
      bottom: Math.round(currentMargins.bottom * adjustmentFactor)
    };
  }

  /**
   * 最終的なメトリクスを計算
   */
  private static calculateFinalMetrics(
    textSize: { width: number; height: number },
    margins: TextBoxMetrics['margins'],
    currentMetrics: TextBoxMetrics,
    autoSizeMode: AutoSizeMode
  ): Pick<TextBoxMetrics, 'width' | 'height'> {
    if (autoSizeMode === 'shape-to-fit-text') {
      // テキストに合わせてシェイプを調整
      return {
        width: textSize.width + margins.left + margins.right,
        height: textSize.height + margins.top + margins.bottom
      };
    }
    
    // 現在のサイズを維持
    return {
      width: currentMetrics.width,
      height: currentMetrics.height
    };
  }

  /**
   * キャッシュキーを生成
   */
  private static generateCacheKey(
    text: string,
    boxWidth: number,
    boxHeight: number,
    language: string
  ): string {
    return `${text}_${boxWidth}_${boxHeight}_${language}`;
  }
  
  /**
   * テキストボックスのサイズを自動調整
   */
  public static autoAdjust(
    text: string,
    boxWidth: number,
    boxHeight: number,
    language: string,
    initialFontSize: number = 11
  ): TextBoxDimensions {
    const cacheKey = this.generateCacheKey(text, boxWidth, boxHeight, language);
    const cached = adjustmentCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // フォントスタックの取得
    const fontStack = getFontStackForLanguage(language);
    const primaryFont = fontStack.primary[0];
    
    // 二分探索でフォントサイズを最適化
    let minSize = this.MIN_FONT_SIZE;
    let maxSize = Math.min(initialFontSize * 2, this.MAX_FONT_SIZE);
    let currentSize = initialFontSize;
    let bestFit: TextBoxDimensions | null = null;
    
    while (maxSize - minSize > this.FONT_SIZE_PRECISION) {
      const textSize = calculateTextSize(text, currentSize, primaryFont);
      const margin = this.calculateMargin(language, currentSize);
      const totalWidth = textSize.width + margin.left + margin.right;
      const totalHeight = textSize.height + margin.top + margin.bottom;
      
      if (totalWidth <= boxWidth && totalHeight <= boxHeight) {
        bestFit = {
          width: totalWidth,
          height: totalHeight,
          fontSize: currentSize,
          margin
        };
        minSize = currentSize;
      } else {
        maxSize = currentSize;
      }
      
      currentSize = (minSize + maxSize) / 2;
    }
    
    // 最適なサイズが見つからない場合は最小サイズを使用
    if (!bestFit) {
      const textSize = calculateTextSize(text, this.MIN_FONT_SIZE, primaryFont);
      const margin = this.calculateMargin(language, this.MIN_FONT_SIZE);
      bestFit = {
        width: textSize.width + margin.left + margin.right,
        height: textSize.height + margin.top + margin.bottom,
        fontSize: this.MIN_FONT_SIZE,
        margin
      };
    }
    
    // キャッシュに保存
    adjustmentCache.set(cacheKey, bestFit);
    
    return bestFit;
  }
  
  /**
   * 言語に応じたマージンを計算
   */
  private static calculateMargin(language: string, fontSize: number): Margin {
    const baseMargin = fontSize * 0.005;  // フォントサイズの0.5%をベースマージンとする
    
    // 言語別のマージン調整
    const margins: { [key: string]: number } = {
      'ja': 0.05,  // 日本語は95%減
      'zh': 0.05,  // 中国語も95%減
      'ko': 0.1,   // 韓国語は90%減
      'ar': 10.0   // アラビア語は10倍
    };
    
    const marginMultiplier = margins[language] || 1.0;
    const adjustedMargin = baseMargin * marginMultiplier;
    
    // RTL言語の場合、右マージンを大きくする
    const isRTL = ['ar', 'he'].includes(language);
    if (isRTL) {
      return {
        top: adjustedMargin,
        right: adjustedMargin * 15.0,  // 右マージンを15倍に
        bottom: adjustedMargin,
        left: adjustedMargin * 0.005   // 左マージンを0.005倍に
      };
    }
    
    return {
      top: adjustedMargin,
      right: adjustedMargin,
      bottom: adjustedMargin,
      left: adjustedMargin
    };
  }
  
  /**
   * テキストボックスの配置を最適化
   */
  public static optimizePosition(
    text: string,
    containerWidth: number,
    containerHeight: number,
    language: string
  ): { x: number; y: number } {
    // 言語に応じた配置調整
    const isRTL = ['ar', 'he'].includes(language);
    const defaultMargin = Math.min(containerWidth, containerHeight) * 0.05;
    
    return {
      x: isRTL ? containerWidth - defaultMargin : defaultMargin,
      y: defaultMargin
    };
  }
} 