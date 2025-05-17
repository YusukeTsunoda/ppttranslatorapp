/**
 * レイアウト補正を行うユーティリティクラス
 * テキストボックスの自動リサイズや言語別オフセットパラメータの適用などの機能を提供します。
 */

import * as path from 'path';
import { LanguageCode } from './text-metrics';
import { getTextMetricsAnalyzer } from './text-metrics';
import { getFontMetricsManager } from './font-metrics';
import { logger } from '../utils/logger';

// レイアウト調整オプション
export interface LayoutAdjustmentOptions {
  enableAutoResize: boolean;      // テキストボックスの自動リサイズを有効にするか
  resizeStrategy: 'width' | 'height' | 'both'; // リサイズ戦略
  maxWidthExpansion: number;      // 最大幅拡大率
  maxHeightExpansion: number;     // 最大高さ拡大率
  applyFontMapping: boolean;      // フォントマッピングを適用するか
  applyLanguageOffset: boolean;   // 言語別オフセットを適用するか
  detectCollisions: boolean;      // 衝突検出を行うか
  safetyMargin: number;           // 安全マージン
}

// テキストボックス情報
export interface TextBoxInfo {
  id: string;                     // テキストボックスID
  text: string;                   // テキスト内容
  x: number;                      // X座標
  y: number;                      // Y座標
  width: number;                  // 幅
  height: number;                 // 高さ
  fontName?: string;              // フォント名
  fontSize?: number;              // フォントサイズ
  fontColor?: string;             // フォント色
  alignment?: string;             // テキスト配置
  vertical?: boolean;             // 縦書きかどうか
  rtl?: boolean;                  // 右から左への書字方向かどうか
  zOrder?: number;                // Z順序
}

// 調整後のテキストボックス情報
export interface AdjustedTextBoxInfo extends TextBoxInfo {
  originalWidth: number;          // 元の幅
  originalHeight: number;         // 元の高さ
  originalX: number;              // 元のX座標
  originalY: number;              // 元のY座標
  originalFontName?: string;      // 元のフォント名
  adjustmentRatio: number;        // 調整率
  overflowDetected: boolean;      // オーバーフロー検出フラグ
  collisionDetected: boolean;     // 衝突検出フラグ
}

/**
 * レイアウト補正を行うクラス
 */
export class LayoutAdjuster {
  private options: LayoutAdjustmentOptions;
  
  // デフォルトのレイアウト調整オプション
  private static DEFAULT_OPTIONS: LayoutAdjustmentOptions = {
    enableAutoResize: true,
    resizeStrategy: 'both',
    maxWidthExpansion: 1.5,
    maxHeightExpansion: 1.5,
    applyFontMapping: true,
    applyLanguageOffset: true,
    detectCollisions: true,
    safetyMargin: 0.1
  };
  
  // 言語別のオフセットパラメータ
  private static LANGUAGE_OFFSETS: Record<LanguageCode, { x: number; y: number }> = {
    'ja': { x: 0, y: 0 },      // 日本語（基準）
    'en': { x: 0, y: 0 },      // 英語
    'zh': { x: 0, y: 0 },      // 中国語
    'ko': { x: 0, y: 0 },      // 韓国語
    'fr': { x: 0, y: 0 },      // フランス語
    'de': { x: 0, y: 0 },      // ドイツ語
    'es': { x: 0, y: 0 },      // スペイン語
    'it': { x: 0, y: 0 },      // イタリア語
    'ru': { x: 0, y: 0 },      // ロシア語
    'ar': { x: 5, y: 0 },      // アラビア語（右から左への言語なので、X方向にオフセット）
    'th': { x: 0, y: 2 },      // タイ語（アセンダー/ディセンダーが多いのでY方向にオフセット）
    'vi': { x: 0, y: 0 }       // ベトナム語
  };
  
  /**
   * コンストラクタ
   * @param options レイアウト調整オプション
   */
  constructor(options?: Partial<LayoutAdjustmentOptions>) {
    this.options = { ...LayoutAdjuster.DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * テキストボックスのレイアウトを調整する
   * @param textBoxes テキストボックス情報の配列
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @returns 調整後のテキストボックス情報の配列
   */
  public adjustLayout(
    textBoxes: TextBoxInfo[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): AdjustedTextBoxInfo[] {
    // テキストメトリクスアナライザーとフォントメトリクスマネージャーを取得
    const textMetricsAnalyzer = getTextMetricsAnalyzer();
    const fontMetricsManager = getFontMetricsManager();
    
    // フォント互換性マップを取得
    const fontMap = this.options.applyFontMapping
      ? fontMetricsManager.getFontCompatibilityMap(sourceLanguage, targetLanguage)
      : {};
    
    // 調整後のテキストボックス情報を格納する配列
    const adjustedTextBoxes: AdjustedTextBoxInfo[] = [];
    
    // 各テキストボックスを調整
    for (const textBox of textBoxes) {
      // 元の情報を保存
      const adjusted: AdjustedTextBoxInfo = {
        ...textBox,
        originalWidth: textBox.width,
        originalHeight: textBox.height,
        originalX: textBox.x,
        originalY: textBox.y,
        originalFontName: textBox.fontName,
        adjustmentRatio: 1.0,
        overflowDetected: false,
        collisionDetected: false
      };
      
      // フォントマッピングを適用
      if (this.options.applyFontMapping && textBox.fontName && fontMap[textBox.fontName]) {
        adjusted.fontName = fontMap[textBox.fontName];
        
        // フォントメトリクスの差異を計算
        const metricsDiff = fontMetricsManager.calculateMetricsDifference(
          textBox.fontName,
          adjusted.fontName
        );
        
        // フォントサイズを調整（必要な場合）
        if (textBox.fontSize) {
          adjusted.fontSize = textBox.fontSize * Math.sqrt(metricsDiff.heightRatio);
        }
      }
      
      // テキストボックスのサイズを調整
      if (this.options.enableAutoResize) {
        // テキスト長変動に基づくサイズ調整
        const adjustedSize = textMetricsAnalyzer.adjustTextBoxSize(
          textBox.width,
          textBox.height,
          sourceLanguage,
          targetLanguage,
          this.options.safetyMargin
        );
        
        // リサイズ戦略に基づいて適用
        if (this.options.resizeStrategy === 'width' || this.options.resizeStrategy === 'both') {
          adjusted.width = Math.min(
            adjustedSize.width,
            textBox.width * this.options.maxWidthExpansion
          );
        }
        
        if (this.options.resizeStrategy === 'height' || this.options.resizeStrategy === 'both') {
          adjusted.height = Math.min(
            adjustedSize.height,
            textBox.height * this.options.maxHeightExpansion
          );
        }
        
        // 調整率を計算
        adjusted.adjustmentRatio = (adjusted.width * adjusted.height) / (textBox.width * textBox.height);
        
        // オーバーフロー検出
        const expansionRatio = textMetricsAnalyzer.getExpansionRatio(
          sourceLanguage,
          targetLanguage,
          true
        );
        
        if (adjusted.adjustmentRatio < expansionRatio) {
          adjusted.overflowDetected = true;
        }
      }
      
      // 言語別オフセットを適用
      if (this.options.applyLanguageOffset) {
        const sourceOffset = LayoutAdjuster.LANGUAGE_OFFSETS[sourceLanguage] || { x: 0, y: 0 };
        const targetOffset = LayoutAdjuster.LANGUAGE_OFFSETS[targetLanguage] || { x: 0, y: 0 };
        
        // 相対オフセットを計算
        const relativeOffset = {
          x: targetOffset.x - sourceOffset.x,
          y: targetOffset.y - sourceOffset.y
        };
        
        // 縦書きの場合はX/Y軸を入れ替え
        if (textBox.vertical) {
          adjusted.x += relativeOffset.y;
          adjusted.y += relativeOffset.x;
        } else {
          adjusted.x += relativeOffset.x;
          adjusted.y += relativeOffset.y;
        }
        
        // RTL（右から左）の場合は特別な処理
        if (textBox.rtl) {
          // RTLの場合、X座標は右端を基準にするため、幅の変化分だけX座標を調整
          const widthDiff = adjusted.width - textBox.width;
          adjusted.x -= widthDiff;
        }
      }
      
      adjustedTextBoxes.push(adjusted);
    }
    
    // 衝突検出と回避
    if (this.options.detectCollisions) {
      this.detectAndResolveCollisions(adjustedTextBoxes);
    }
    
    return adjustedTextBoxes;
  }
  
  /**
   * 衝突検出と回避を行う
   * @param textBoxes 調整後のテキストボックス情報の配列
   */
  private detectAndResolveCollisions(textBoxes: AdjustedTextBoxInfo[]): void {
    // Z順序でソート
    textBoxes.sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));
    
    // 各テキストボックスについて衝突を検出
    for (let i = 0; i < textBoxes.length; i++) {
      const box1 = textBoxes[i];
      
      for (let j = i + 1; j < textBoxes.length; j++) {
        const box2 = textBoxes[j];
        
        // 衝突を検出
        if (this.checkCollision(box1, box2)) {
          box1.collisionDetected = true;
          box2.collisionDetected = true;
          
          // 衝突回避（シンプルな方法：少し移動する）
          this.resolveCollision(box1, box2);
        }
      }
    }
  }
  
  /**
   * 2つのテキストボックス間の衝突を検出する
   * @param box1 テキストボックス1
   * @param box2 テキストボックス2
   * @returns 衝突している場合はtrue
   */
  private checkCollision(box1: AdjustedTextBoxInfo, box2: AdjustedTextBoxInfo): boolean {
    // 境界ボックスの交差を検出
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }
  
  /**
   * 衝突を回避する
   * @param box1 テキストボックス1
   * @param box2 テキストボックス2
   */
  private resolveCollision(box1: AdjustedTextBoxInfo, box2: AdjustedTextBoxInfo): void {
    // Z順序が大きい方を移動（上に表示される要素）
    const boxToMove = (box1.zOrder || 0) > (box2.zOrder || 0) ? box1 : box2;
    
    // 重なりの量を計算
    const overlapX = Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x);
    const overlapY = Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y);
    
    // X方向とY方向のどちらに移動するか決定（より小さい重なりの方向に移動）
    if (overlapX < overlapY) {
      // X方向に移動
      if (boxToMove.x < (boxToMove === box1 ? box2.x : box1.x)) {
        boxToMove.x -= overlapX + 5; // 少し余裕を持たせる
      } else {
        boxToMove.x += overlapX + 5;
      }
    } else {
      // Y方向に移動
      if (boxToMove.y < (boxToMove === box1 ? box2.y : box1.y)) {
        boxToMove.y -= overlapY + 5;
      } else {
        boxToMove.y += overlapY + 5;
      }
    }
  }
  
  /**
   * オプションを更新する
   * @param options 新しいオプション
   */
  public updateOptions(options: Partial<LayoutAdjustmentOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 現在のオプションを取得する
   * @returns 現在のオプション
   */
  public getOptions(): LayoutAdjustmentOptions {
    return { ...this.options };
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: LayoutAdjuster | null = null;

export function getLayoutAdjuster(options?: Partial<LayoutAdjustmentOptions>): LayoutAdjuster {
  if (!instance) {
    instance = new LayoutAdjuster(options);
  } else if (options) {
    instance.updateOptions(options);
  }
  return instance;
}
