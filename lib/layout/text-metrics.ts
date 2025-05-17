/**
 * テキスト長変動の分析と調整を行うユーティリティクラス
 * 言語ごとのテキスト長変動を測定し、レイアウト調整のためのパラメータを提供します。
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// 言語コード
export type LanguageCode = 
  'ja' | 'en' | 'zh' | 'ko' | 'fr' | 'de' | 'es' | 'it' | 'ru' | 'ar' | 'th' | 'vi';

// 言語ペア（翻訳元言語と翻訳先言語）
export type LanguagePair = {
  source: LanguageCode;
  target: LanguageCode;
};

// テキスト長変動データ
export interface TextExpansionData {
  averageExpansionRatio: number;  // 平均拡大率
  standardDeviation: number;      // 標準偏差
  confidenceInterval95: {         // 95%信頼区間
    min: number;
    max: number;
  };
  sampleSize: number;             // サンプルサイズ
  lastUpdated: string;            // 最終更新日時
}

// 言語ペアごとのテキスト長変動データ
export type TextExpansionMap = Record<string, TextExpansionData>;

/**
 * テキスト長変動の分析と調整を行うクラス
 */
export class TextMetricsAnalyzer {
  private expansionDataPath: string;
  private expansionData: TextExpansionMap;
  
  // デフォルトの拡大率（言語ペアごとのデータがない場合に使用）
  private static DEFAULT_EXPANSION_RATIOS: Record<string, number> = {
    'ja-en': 1.3,   // 日本語→英語: 約30%拡大
    'en-ja': 0.8,   // 英語→日本語: 約20%縮小
    'ja-zh': 0.9,   // 日本語→中国語: 約10%縮小
    'zh-ja': 1.1,   // 中国語→日本語: 約10%拡大
    'en-fr': 1.15,  // 英語→フランス語: 約15%拡大
    'en-de': 1.35,  // 英語→ドイツ語: 約35%拡大
    'en-es': 1.25,  // 英語→スペイン語: 約25%拡大
    'en-ru': 1.3,   // 英語→ロシア語: 約30%拡大
    'en-ar': 1.25,  // 英語→アラビア語: 約25%拡大
    'default': 1.2  // デフォルト: 20%の余裕を見る
  };
  
  /**
   * コンストラクタ
   * @param dataPath テキスト長変動データを保存するパス
   */
  constructor(dataPath?: string) {
    this.expansionDataPath = dataPath || path.join(__dirname, '../../data/text-expansion.json');
    this.expansionData = this.loadExpansionData();
  }
  
  /**
   * テキスト長変動データを読み込む
   * @returns テキスト長変動データ
   */
  private loadExpansionData(): TextExpansionMap {
    try {
      if (fs.existsSync(this.expansionDataPath)) {
        const data = fs.readFileSync(this.expansionDataPath, 'utf8');
        return JSON.parse(data) as TextExpansionMap;
      }
    } catch (error) {
      logger.warn(`テキスト長変動データの読み込みに失敗しました: ${error}`);
    }
    
    // データファイルがない場合は空のオブジェクトを返す
    return {};
  }
  
  /**
   * テキスト長変動データを保存する
   */
  private saveExpansionData(): void {
    try {
      const dirPath = path.dirname(this.expansionDataPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(
        this.expansionDataPath,
        JSON.stringify(this.expansionData, null, 2),
        'utf8'
      );
    } catch (error) {
      logger.error(`テキスト長変動データの保存に失敗しました: ${error}`);
    }
  }
  
  /**
   * 言語ペアのキーを生成する
   * @param source 翻訳元言語コード
   * @param target 翻訳先言語コード
   * @returns 言語ペアキー
   */
  private getLanguagePairKey(source: LanguageCode, target: LanguageCode): string {
    return `${source}-${target}`;
  }
  
  /**
   * テキスト長変動データを更新する
   * @param source 翻訳元言語コード
   * @param target 翻訳先言語コード
   * @param sourceTexts 翻訳元テキストの配列
   * @param targetTexts 翻訳先テキストの配列
   */
  public updateExpansionData(
    source: LanguageCode,
    target: LanguageCode,
    sourceTexts: string[],
    targetTexts: string[]
  ): void {
    if (sourceTexts.length !== targetTexts.length) {
      throw new Error('翻訳元テキストと翻訳先テキストの数が一致しません');
    }
    
    if (sourceTexts.length === 0) {
      return;
    }
    
    const pairKey = this.getLanguagePairKey(source, target);
    const ratios: number[] = [];
    
    // 各テキストペアの拡大率を計算
    for (let i = 0; i < sourceTexts.length; i++) {
      const sourceLength = sourceTexts[i].length;
      const targetLength = targetTexts[i].length;
      
      if (sourceLength > 0) {
        const ratio = targetLength / sourceLength;
        ratios.push(ratio);
      }
    }
    
    if (ratios.length === 0) {
      return;
    }
    
    // 平均拡大率を計算
    const sum = ratios.reduce((acc, ratio) => acc + ratio, 0);
    const averageRatio = sum / ratios.length;
    
    // 標準偏差を計算
    const squaredDiffs = ratios.map(ratio => Math.pow(ratio - averageRatio, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / ratios.length;
    const stdDev = Math.sqrt(variance);
    
    // 95%信頼区間を計算（正規分布を仮定）
    const z = 1.96; // 95%信頼区間のz値
    const marginOfError = z * (stdDev / Math.sqrt(ratios.length));
    
    const newData: TextExpansionData = {
      averageExpansionRatio: averageRatio,
      standardDeviation: stdDev,
      confidenceInterval95: {
        min: Math.max(0.1, averageRatio - marginOfError), // 最小値は0.1に制限
        max: averageRatio + marginOfError
      },
      sampleSize: ratios.length,
      lastUpdated: new Date().toISOString()
    };
    
    // 既存のデータがある場合は重み付き平均で更新
    if (this.expansionData[pairKey]) {
      const existing = this.expansionData[pairKey];
      const totalSamples = existing.sampleSize + newData.sampleSize;
      
      const weightedAvg = (
        (existing.averageExpansionRatio * existing.sampleSize) +
        (newData.averageExpansionRatio * newData.sampleSize)
      ) / totalSamples;
      
      // 標準偏差の結合（近似）
      const combinedVariance = (
        (existing.sampleSize * Math.pow(existing.standardDeviation, 2)) +
        (newData.sampleSize * Math.pow(newData.standardDeviation, 2)) +
        (existing.sampleSize * newData.sampleSize * Math.pow(existing.averageExpansionRatio - newData.averageExpansionRatio, 2) / totalSamples)
      ) / totalSamples;
      
      const combinedStdDev = Math.sqrt(combinedVariance);
      const combinedMarginOfError = z * (combinedStdDev / Math.sqrt(totalSamples));
      
      this.expansionData[pairKey] = {
        averageExpansionRatio: weightedAvg,
        standardDeviation: combinedStdDev,
        confidenceInterval95: {
          min: Math.max(0.1, weightedAvg - combinedMarginOfError),
          max: weightedAvg + combinedMarginOfError
        },
        sampleSize: totalSamples,
        lastUpdated: new Date().toISOString()
      };
    } else {
      this.expansionData[pairKey] = newData;
    }
    
    // データを保存
    this.saveExpansionData();
  }
  
  /**
   * 言語ペアの拡大率を取得する
   * @param source 翻訳元言語コード
   * @param target 翻訳先言語コード
   * @param useMaxConfidence 95%信頼区間の最大値を使用するか（デフォルトはfalse）
   * @returns 拡大率
   */
  public getExpansionRatio(
    source: LanguageCode,
    target: LanguageCode,
    useMaxConfidence = false
  ): number {
    const pairKey = this.getLanguagePairKey(source, target);
    
    // データがある場合はそれを使用
    if (this.expansionData[pairKey]) {
      const data = this.expansionData[pairKey];
      return useMaxConfidence ? data.confidenceInterval95.max : data.averageExpansionRatio;
    }
    
    // 逆方向のデータがある場合は逆数を使用
    const reversePairKey = this.getLanguagePairKey(target, source);
    if (this.expansionData[reversePairKey]) {
      const data = this.expansionData[reversePairKey];
      const ratio = 1 / (useMaxConfidence ? data.confidenceInterval95.min : data.averageExpansionRatio);
      return ratio;
    }
    
    // デフォルト値を使用
    if (TextMetricsAnalyzer.DEFAULT_EXPANSION_RATIOS[pairKey]) {
      return TextMetricsAnalyzer.DEFAULT_EXPANSION_RATIOS[pairKey];
    }
    
    // 最終的にはデフォルト値を返す
    return TextMetricsAnalyzer.DEFAULT_EXPANSION_RATIOS.default;
  }
  
  /**
   * テキストボックスのサイズを調整する
   * @param width 元の幅
   * @param height 元の高さ
   * @param source 翻訳元言語コード
   * @param target 翻訳先言語コード
   * @param safetyMargin 安全マージン（デフォルトは10%）
   * @returns 調整後のサイズ
   */
  public adjustTextBoxSize(
    width: number,
    height: number,
    source: LanguageCode,
    target: LanguageCode,
    safetyMargin = 0.1
  ): { width: number; height: number } {
    const expansionRatio = this.getExpansionRatio(source, target, true);
    const adjustedRatio = expansionRatio * (1 + safetyMargin);
    
    // 幅と高さの両方を調整（面積が拡大率に比例するように）
    const areaRatio = Math.sqrt(adjustedRatio);
    
    return {
      width: width * areaRatio,
      height: height * areaRatio
    };
  }
  
  /**
   * すべての言語ペアのテキスト長変動データを取得する
   * @returns テキスト長変動データ
   */
  public getAllExpansionData(): TextExpansionMap {
    return { ...this.expansionData };
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: TextMetricsAnalyzer | null = null;

export function getTextMetricsAnalyzer(dataPath?: string): TextMetricsAnalyzer {
  if (!instance) {
    instance = new TextMetricsAnalyzer(dataPath);
  }
  return instance;
}
