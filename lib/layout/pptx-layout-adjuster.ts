/**
 * PPTXファイルのレイアウト調整を行うクラス
 * 翻訳されたテキストをPPTXファイルに適用する際に、レイアウト調整も同時に行います。
 */

import * as fs from 'fs';
import * as path from 'path';
import { Presentation } from 'pptxgenjs';
import { LanguageCode } from './text-metrics';
import { getLayoutAdjuster, LayoutAdjustmentOptions, TextBoxInfo, AdjustedTextBoxInfo } from './layout-adjuster';
import { logger } from '../utils/logger';

// PPTXレイアウト調整オプション
export interface PPTXLayoutAdjustmentOptions extends LayoutAdjustmentOptions {
  preserveOriginalFile: boolean;   // 元のファイルを保存するか
  generatePreviewImages: boolean;  // プレビュー画像を生成するか
  applyFontEmbedding: boolean;     // フォント埋め込みを適用するか
  generateReport: boolean;         // レポートを生成するか
}

// 翻訳テキスト情報
export interface TranslationInfo {
  slideIndex: number;              // スライドインデックス
  shapeId: string;                 // シェイプID
  originalText: string;            // 元のテキスト
  translatedText: string;          // 翻訳されたテキスト
}

// レイアウト調整結果
export interface LayoutAdjustmentResult {
  success: boolean;                // 成功したか
  adjustedTextBoxes: AdjustedTextBoxInfo[];  // 調整後のテキストボックス情報
  warnings: string[];              // 警告メッセージ
  errors: string[];                // エラーメッセージ
  overflowCount: number;           // オーバーフロー検出数
  collisionCount: number;          // 衝突検出数
  reportPath?: string;             // レポートパス
  previewImagePaths?: string[];    // プレビュー画像パス
}

/**
 * PPTXファイルのレイアウト調整を行うクラス
 */
export class PPTXLayoutAdjuster {
  private options: PPTXLayoutAdjustmentOptions;
  
  // デフォルトのPPTXレイアウト調整オプション
  private static DEFAULT_OPTIONS: PPTXLayoutAdjustmentOptions = {
    enableAutoResize: true,
    resizeStrategy: 'both',
    maxWidthExpansion: 1.5,
    maxHeightExpansion: 1.5,
    applyFontMapping: true,
    applyLanguageOffset: true,
    detectCollisions: true,
    safetyMargin: 0.1,
    preserveOriginalFile: true,
    generatePreviewImages: false,
    applyFontEmbedding: false,
    generateReport: true
  };
  
  /**
   * コンストラクタ
   * @param options PPTXレイアウト調整オプション
   */
  constructor(options?: Partial<PPTXLayoutAdjustmentOptions>) {
    this.options = { ...PPTXLayoutAdjuster.DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * PPTXファイルのレイアウトを調整する
   * @param inputFilePath 入力ファイルパス
   * @param outputFilePath 出力ファイルパス
   * @param translations 翻訳テキスト情報の配列
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @returns レイアウト調整結果
   */
  public async adjustPPTXLayout(
    inputFilePath: string,
    outputFilePath: string,
    translations: TranslationInfo[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<LayoutAdjustmentResult> {
    // 結果オブジェクトを初期化
    const result: LayoutAdjustmentResult = {
      success: false,
      adjustedTextBoxes: [],
      warnings: [],
      errors: [],
      overflowCount: 0,
      collisionCount: 0
    };
    
    try {
      // 入力ファイルの存在確認
      if (!fs.existsSync(inputFilePath)) {
        result.errors.push(`入力ファイルが見つかりません: ${inputFilePath}`);
        return result;
      }
      
      // 出力ディレクトリの作成
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 元のファイルを保存
      if (this.options.preserveOriginalFile) {
        const originalFilePath = path.join(
          outputDir,
          `${path.basename(outputFilePath, '.pptx')}_original.pptx`
        );
        fs.copyFileSync(inputFilePath, originalFilePath);
        logger.info(`元のファイルを保存しました: ${originalFilePath}`);
      }
      
      // PPTXファイルを解析
      logger.info(`PPTXファイルを解析しています: ${inputFilePath}`);
      
      // Python側のスクリプトを呼び出してPPTXファイルを解析・更新
      // ここでは簡略化のため、外部プロセスの呼び出しをシミュレート
      await this.simulateProcessPPTX(
        inputFilePath,
        outputFilePath,
        translations,
        sourceLanguage,
        targetLanguage,
        result
      );
      
      // レポートを生成
      if (this.options.generateReport) {
        const reportPath = path.join(
          outputDir,
          `${path.basename(outputFilePath, '.pptx')}_layout_report.json`
        );
        
        fs.writeFileSync(
          reportPath,
          JSON.stringify({
            inputFile: inputFilePath,
            outputFile: outputFilePath,
            sourceLanguage,
            targetLanguage,
            options: this.options,
            adjustmentResult: {
              totalTextBoxes: result.adjustedTextBoxes.length,
              overflowCount: result.overflowCount,
              collisionCount: result.collisionCount,
              warnings: result.warnings,
              errors: result.errors
            },
            timestamp: new Date().toISOString()
          }, null, 2),
          'utf8'
        );
        
        result.reportPath = reportPath;
        logger.info(`レイアウト調整レポートを生成しました: ${reportPath}`);
      }
      
      // 成功フラグを設定
      result.success = result.errors.length === 0;
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`PPTXレイアウト調整中にエラーが発生しました: ${errorMessage}`);
      logger.error(`PPTXレイアウト調整中にエラーが発生しました: ${errorMessage}`);
      
      return result;
    }
  }
  
  /**
   * PPTXファイルの処理をシミュレートする（実際の実装では外部プロセスを呼び出す）
   * @param inputFilePath 入力ファイルパス
   * @param outputFilePath 出力ファイルパス
   * @param translations 翻訳テキスト情報の配列
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @param result レイアウト調整結果
   */
  private async simulateProcessPPTX(
    inputFilePath: string,
    outputFilePath: string,
    translations: TranslationInfo[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    result: LayoutAdjustmentResult
  ): Promise<void> {
    // 実際の実装では、Python側のスクリプトを呼び出してPPTXファイルを処理する
    // ここではシミュレーションとして、テキストボックス情報を生成
    
    logger.info(`翻訳テキストを適用しています（${translations.length}件）...`);
    
    // テキストボックス情報を生成
    const textBoxes: TextBoxInfo[] = translations.map((translation, index) => ({
      id: translation.shapeId,
      text: translation.translatedText,
      x: 100 + (index % 3) * 200,
      y: 100 + Math.floor(index / 3) * 150,
      width: 180,
      height: 100,
      fontName: 'Arial',
      fontSize: 12,
      alignment: 'left',
      vertical: false,
      rtl: targetLanguage === 'ar',
      zOrder: index
    }));
    
    // レイアウト調整を適用
    const layoutAdjuster = getLayoutAdjuster(this.options);
    const adjustedTextBoxes = layoutAdjuster.adjustLayout(
      textBoxes,
      sourceLanguage,
      targetLanguage
    );
    
    // 結果を設定
    result.adjustedTextBoxes = adjustedTextBoxes;
    
    // オーバーフローと衝突の数をカウント
    result.overflowCount = adjustedTextBoxes.filter(box => box.overflowDetected).length;
    result.collisionCount = adjustedTextBoxes.filter(box => box.collisionDetected).length;
    
    // 警告メッセージを生成
    if (result.overflowCount > 0) {
      result.warnings.push(`${result.overflowCount}件のテキストボックスでオーバーフローを検出しました`);
    }
    
    if (result.collisionCount > 0) {
      result.warnings.push(`${result.collisionCount}件のテキストボックスで衝突を検出しました`);
    }
    
    // 実際の実装では、ここでPythonスクリプトの結果を待ち、outputFilePathにファイルが生成されるのを確認
    // シミュレーションでは、入力ファイルを出力ファイルにコピーして終了
    fs.copyFileSync(inputFilePath, outputFilePath);
    
    logger.info(`PPTXファイルを生成しました: ${outputFilePath}`);
  }
  
  /**
   * オプションを更新する
   * @param options 新しいオプション
   */
  public updateOptions(options: Partial<PPTXLayoutAdjustmentOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 現在のオプションを取得する
   * @returns 現在のオプション
   */
  public getOptions(): PPTXLayoutAdjustmentOptions {
    return { ...this.options };
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: PPTXLayoutAdjuster | null = null;

export function getPPTXLayoutAdjuster(options?: Partial<PPTXLayoutAdjustmentOptions>): PPTXLayoutAdjuster {
  if (!instance) {
    instance = new PPTXLayoutAdjuster(options);
  } else if (options) {
    instance.updateOptions(options);
  }
  return instance;
}
