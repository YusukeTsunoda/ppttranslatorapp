/**
 * フォントメトリクス情報を管理するユーティリティクラス
 * 言語ごとの推奨フォントとそのメトリクス情報を提供します。
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { LanguageCode } from './text-metrics';

// フォントファミリータイプ
export type FontFamilyType = 
  'serif' | 'sans-serif' | 'monospace' | 'cursive' | 'fantasy' | 'system-ui';

// フォント情報
export interface FontInfo {
  name: string;           // フォント名
  family: FontFamilyType; // フォントファミリー
  fallbacks: string[];    // フォールバックフォント
  metrics: {
    averageCharWidth: number;  // 平均文字幅（相対値）
    capHeight: number;         // 大文字の高さ（相対値）
    xHeight: number;           // 小文字xの高さ（相対値）
    descender: number;         // 下降部の深さ（相対値）
    ascender: number;          // 上昇部の高さ（相対値）
    lineGap: number;           // 行間（相対値）
  };
  supportedScripts: string[];  // サポートする文字体系（'Latin', 'Cyrillic', 'CJK'など）
  verticalWritingSupport: boolean; // 縦書きサポートの有無
}

// 言語ごとの推奨フォント情報
export type LanguageFontMap = Record<LanguageCode, FontInfo[]>;

/**
 * フォントメトリクス情報を管理するクラス
 */
export class FontMetricsManager {
  private fontDataPath: string;
  private fontData: LanguageFontMap;
  
  // デフォルトのフォント情報
  private static DEFAULT_FONTS: LanguageFontMap = {
    'ja': [
      {
        name: 'Meiryo',
        family: 'sans-serif',
        fallbacks: ['Hiragino Sans', 'Yu Gothic', 'MS Gothic', 'sans-serif'],
        metrics: {
          averageCharWidth: 1.0,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'CJK'],
        verticalWritingSupport: true
      },
      {
        name: 'MS Mincho',
        family: 'serif',
        fallbacks: ['Hiragino Mincho ProN', 'Yu Mincho', 'serif'],
        metrics: {
          averageCharWidth: 1.0,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'CJK'],
        verticalWritingSupport: true
      }
    ],
    'en': [
      {
        name: 'Arial',
        family: 'sans-serif',
        fallbacks: ['Helvetica', 'Verdana', 'sans-serif'],
        metrics: {
          averageCharWidth: 0.6,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'Cyrillic', 'Greek'],
        verticalWritingSupport: false
      },
      {
        name: 'Times New Roman',
        family: 'serif',
        fallbacks: ['Georgia', 'serif'],
        metrics: {
          averageCharWidth: 0.55,
          capHeight: 0.7,
          xHeight: 0.45,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'Cyrillic', 'Greek'],
        verticalWritingSupport: false
      }
    ],
    'zh': [
      {
        name: 'SimSun',
        family: 'serif',
        fallbacks: ['SimHei', 'Microsoft YaHei', 'serif'],
        metrics: {
          averageCharWidth: 1.0,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'CJK'],
        verticalWritingSupport: true
      }
    ],
    'ko': [
      {
        name: 'Malgun Gothic',
        family: 'sans-serif',
        fallbacks: ['Gulim', 'Dotum', 'sans-serif'],
        metrics: {
          averageCharWidth: 1.0,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.2,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'Hangul', 'CJK'],
        verticalWritingSupport: true
      }
    ],
    'ar': [
      {
        name: 'Arial',
        family: 'sans-serif',
        fallbacks: ['Tahoma', 'sans-serif'],
        metrics: {
          averageCharWidth: 0.6,
          capHeight: 0.7,
          xHeight: 0.5,
          descender: 0.3,
          ascender: 0.8,
          lineGap: 0.2
        },
        supportedScripts: ['Latin', 'Arabic'],
        verticalWritingSupport: false
      }
    ]
  } as LanguageFontMap;
  
  /**
   * コンストラクタ
   * @param dataPath フォントデータを保存するパス
   */
  constructor(dataPath?: string) {
    this.fontDataPath = dataPath || path.join(__dirname, '../../data/font-metrics.json');
    this.fontData = this.loadFontData();
  }
  
  /**
   * フォントデータを読み込む
   * @returns フォントデータ
   */
  private loadFontData(): LanguageFontMap {
    try {
      if (fs.existsSync(this.fontDataPath)) {
        const data = fs.readFileSync(this.fontDataPath, 'utf8');
        return JSON.parse(data) as LanguageFontMap;
      }
    } catch (error) {
      logger.warn(`フォントデータの読み込みに失敗しました: ${error}`);
    }
    
    // データファイルがない場合はデフォルト値を返す
    return { ...FontMetricsManager.DEFAULT_FONTS };
  }
  
  /**
   * フォントデータを保存する
   */
  private saveFontData(): void {
    try {
      const dirPath = path.dirname(this.fontDataPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(
        this.fontDataPath,
        JSON.stringify(this.fontData, null, 2),
        'utf8'
      );
    } catch (error) {
      logger.error(`フォントデータの保存に失敗しました: ${error}`);
    }
  }
  
  /**
   * 言語の推奨フォント情報を取得する
   * @param language 言語コード
   * @param family フォントファミリー（指定しない場合はすべて）
   * @returns フォント情報の配列
   */
  public getRecommendedFonts(language: LanguageCode, family?: FontFamilyType): FontInfo[] {
    const fonts = this.fontData[language] || [];
    
    if (family) {
      return fonts.filter(font => font.family === family);
    }
    
    return fonts;
  }
  
  /**
   * フォント互換性マップを取得する
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @returns フォント互換性マップ（翻訳元フォント名 -> 翻訳先フォント名）
   */
  public getFontCompatibilityMap(
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Record<string, string> {
    const sourceFonts = this.getRecommendedFonts(sourceLanguage);
    const targetFonts = this.getRecommendedFonts(targetLanguage);
    
    const compatibilityMap: Record<string, string> = {};
    
    // 各ソースフォントに対して最適なターゲットフォントを見つける
    sourceFonts.forEach(sourceFont => {
      // 同じファミリーのフォントを優先
      const sameFamily = targetFonts.filter(f => f.family === sourceFont.family);
      
      if (sameFamily.length > 0) {
        compatibilityMap[sourceFont.name] = sameFamily[0].name;
      } else if (targetFonts.length > 0) {
        // 同じファミリーがなければ最初のフォントを使用
        compatibilityMap[sourceFont.name] = targetFonts[0].name;
      } else {
        // ターゲット言語のフォントがない場合はソースフォントをそのまま使用
        compatibilityMap[sourceFont.name] = sourceFont.name;
      }
    });
    
    return compatibilityMap;
  }
  
  /**
   * フォントメトリクスの差異を計算する
   * @param sourceFont 翻訳元フォント名
   * @param targetFont 翻訳先フォント名
   * @returns メトリクス差異（相対値）
   */
  public calculateMetricsDifference(
    sourceFont: string,
    targetFont: string
  ): { widthRatio: number; heightRatio: number } {
    // フォント情報を検索
    let sourceFontInfo: FontInfo | undefined;
    let targetFontInfo: FontInfo | undefined;
    
    // すべての言語のフォントを検索
    Object.values(this.fontData).forEach(fonts => {
      fonts.forEach(font => {
        if (font.name === sourceFont) {
          sourceFontInfo = font;
        }
        if (font.name === targetFont) {
          targetFontInfo = font;
        }
      });
    });
    
    // フォント情報が見つからない場合はデフォルト値を返す
    if (!sourceFontInfo || !targetFontInfo) {
      return { widthRatio: 1.0, heightRatio: 1.0 };
    }
    
    // 幅と高さの比率を計算
    const widthRatio = targetFontInfo.metrics.averageCharWidth / sourceFontInfo.metrics.averageCharWidth;
    const heightRatio = targetFontInfo.metrics.capHeight / sourceFontInfo.metrics.capHeight;
    
    return { widthRatio, heightRatio };
  }
  
  /**
   * フォント情報を追加または更新する
   * @param language 言語コード
   * @param fontInfo フォント情報
   */
  public updateFontInfo(language: LanguageCode, fontInfo: FontInfo): void {
    if (!this.fontData[language]) {
      this.fontData[language] = [];
    }
    
    // 既存のフォント情報を検索
    const index = this.fontData[language].findIndex(f => f.name === fontInfo.name);
    
    if (index >= 0) {
      // 既存のフォント情報を更新
      this.fontData[language][index] = { ...fontInfo };
    } else {
      // 新しいフォント情報を追加
      this.fontData[language].push({ ...fontInfo });
    }
    
    // データを保存
    this.saveFontData();
  }
  
  /**
   * すべてのフォント情報を取得する
   * @returns 言語ごとのフォント情報
   */
  public getAllFontData(): LanguageFontMap {
    return { ...this.fontData };
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: FontMetricsManager | null = null;

export function getFontMetricsManager(dataPath?: string): FontMetricsManager {
  if (!instance) {
    instance = new FontMetricsManager(dataPath);
  }
  return instance;
}
