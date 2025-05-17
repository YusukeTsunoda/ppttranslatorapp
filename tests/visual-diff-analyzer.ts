/**
 * 視覚的差分分析ツール
 * レイアウト調整前後のPPTXファイルを比較し、視覚的な差分を検出します
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/utils/logger';

// 色差計算用の定数
const LAB_WHITE_POINT = { x: 95.047, y: 100.0, z: 108.883 };

// 視覚的差分分析オプション
interface VisualDiffOptions {
  outputDir: string;            // 出力ディレクトリ
  tempDir: string;              // 一時ディレクトリ
  pythonPath: string;           // Pythonパス
  libreOfficePath: string;      // LibreOfficeパス
  threshold: number;            // 差分検出しきい値（ピクセル単位）
  deltaEThreshold: number;      // 色差しきい値（ΔE）
  generateDiffImages: boolean;  // 差分画像を生成するか
  cleanupTemp: boolean;         // 一時ファイルを削除するか
}

// 視覚的差分分析結果
interface VisualDiffResult {
  success: boolean;              // 成功したか
  originalFile: string;          // 元のファイルパス
  adjustedFile: string;          // 調整後のファイルパス
  diffSummary: {
    totalSlides: number;         // 合計スライド数
    slidesWithDiff: number;      // 差分があるスライド数
    averageDeltaE: number;       // 平均色差（ΔE）
    maxDeltaE: number;           // 最大色差（ΔE）
    diffPercentage: number;      // 差分ピクセルの割合（%）
  };
  slideResults: SlideComparisonResult[]; // スライドごとの比較結果
  diffImagesDir?: string;        // 差分画像ディレクトリ
  reportPath?: string;           // レポートパス
  errors: string[];              // エラーメッセージ
}

// スライド比較結果
interface SlideComparisonResult {
  slideIndex: number;            // スライドインデックス
  hasDiff: boolean;              // 差分があるか
  diffPixelCount: number;        // 差分ピクセル数
  diffPercentage: number;        // 差分ピクセルの割合（%）
  averageDeltaE: number;         // 平均色差（ΔE）
  maxDeltaE: number;             // 最大色差（ΔE）
  originalImagePath: string;     // 元の画像パス
  adjustedImagePath: string;     // 調整後の画像パス
  diffImagePath?: string;        // 差分画像パス
}

// RGBカラー
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// LABカラー
interface LABColor {
  l: number;
  a: number;
  b: number;
}

/**
 * 視覚的差分分析クラス
 */
export class VisualDiffAnalyzer {
  private options: VisualDiffOptions;
  
  /**
   * コンストラクタ
   * @param options 視覚的差分分析オプション
   */
  constructor(options?: Partial<VisualDiffOptions>) {
    // デフォルトオプション
    const defaultOptions: VisualDiffOptions = {
      outputDir: path.join(process.cwd(), 'output', 'visual-diff'),
      tempDir: path.join(process.cwd(), 'tmp'),
      pythonPath: 'python3',
      libreOfficePath: 'soffice',
      threshold: 5,
      deltaEThreshold: 2.0,
      generateDiffImages: true,
      cleanupTemp: true
    };
    
    this.options = { ...defaultOptions, ...options };
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.options.tempDir)) {
      fs.mkdirSync(this.options.tempDir, { recursive: true });
    }
  }
  
  /**
   * PPTXファイルを比較する
   * @param originalFilePath 元のファイルパス
   * @param adjustedFilePath 調整後のファイルパス
   * @returns 視覚的差分分析結果のPromise
   */
  public async comparePPTX(
    originalFilePath: string,
    adjustedFilePath: string
  ): Promise<VisualDiffResult> {
    // 結果オブジェクトを初期化
    const result: VisualDiffResult = {
      success: false,
      originalFile: originalFilePath,
      adjustedFile: adjustedFilePath,
      diffSummary: {
        totalSlides: 0,
        slidesWithDiff: 0,
        averageDeltaE: 0,
        maxDeltaE: 0,
        diffPercentage: 0
      },
      slideResults: [],
      errors: []
    };
    
    try {
      // 入力ファイルの存在確認
      if (!fs.existsSync(originalFilePath)) {
        result.errors.push(`元のファイルが見つかりません: ${originalFilePath}`);
        return result;
      }
      if (!fs.existsSync(adjustedFilePath)) {
        result.errors.push(`調整後のファイルが見つかりません: ${adjustedFilePath}`);
        return result;
      }
      
      // 一時ディレクトリを作成
      const sessionId = uuidv4();
      const tempOriginalDir = path.join(this.options.tempDir, `original_${sessionId}`);
      const tempAdjustedDir = path.join(this.options.tempDir, `adjusted_${sessionId}`);
      const diffImagesDir = path.join(this.options.outputDir, `diff_${sessionId}`);
      
      fs.mkdirSync(tempOriginalDir, { recursive: true });
      fs.mkdirSync(tempAdjustedDir, { recursive: true });
      fs.mkdirSync(diffImagesDir, { recursive: true });
      
      // PPTXファイルをPNG画像に変換
      logger.info('PPTXファイルをPNG画像に変換しています...');
      
      await Promise.all([
        this.convertPPTXtoPNG(originalFilePath, tempOriginalDir),
        this.convertPPTXtoPNG(adjustedFilePath, tempAdjustedDir)
      ]);
      
      // PNG画像を比較
      logger.info('PNG画像を比較しています...');
      
      const originalImages = this.getImageFiles(tempOriginalDir);
      const adjustedImages = this.getImageFiles(tempAdjustedDir);
      
      // スライド数を確認
      const totalSlides = Math.min(originalImages.length, adjustedImages.length);
      result.diffSummary.totalSlides = totalSlides;
      
      if (totalSlides === 0) {
        result.errors.push('比較可能なスライドがありません');
        return result;
      }
      
      // 各スライドを比較
      let totalDeltaE = 0;
      let maxDeltaE = 0;
      let totalDiffPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < totalSlides; i++) {
        const originalImagePath = originalImages[i];
        const adjustedImagePath = adjustedImages[i];
        
        // スライドを比較
        const slideResult = await this.compareImages(
          originalImagePath,
          adjustedImagePath,
          path.join(diffImagesDir, `diff_slide_${i + 1}.png`)
        );
        
        slideResult.slideIndex = i;
        slideResult.originalImagePath = originalImagePath;
        slideResult.adjustedImagePath = adjustedImagePath;
        
        result.slideResults.push(slideResult);
        
        // 差分統計を更新
        if (slideResult.hasDiff) {
          result.diffSummary.slidesWithDiff++;
        }
        
        totalDeltaE += slideResult.averageDeltaE;
        maxDeltaE = Math.max(maxDeltaE, slideResult.maxDeltaE);
        totalDiffPixels += slideResult.diffPixelCount;
        totalPixels += slideResult.diffPercentage > 0 ? 
          Math.round(slideResult.diffPixelCount / (slideResult.diffPercentage / 100)) : 0;
      }
      
      // 差分サマリーを計算
      result.diffSummary.averageDeltaE = totalDeltaE / totalSlides;
      result.diffSummary.maxDeltaE = maxDeltaE;
      result.diffSummary.diffPercentage = totalPixels > 0 ? 
        (totalDiffPixels / totalPixels) * 100 : 0;
      
      // 差分画像ディレクトリを設定
      if (this.options.generateDiffImages) {
        result.diffImagesDir = diffImagesDir;
      }
      
      // レポートを生成
      const reportPath = path.join(this.options.outputDir, `report_${sessionId}.json`);
      fs.writeFileSync(
        reportPath,
        JSON.stringify({
          originalFile: originalFilePath,
          adjustedFile: adjustedFilePath,
          diffSummary: result.diffSummary,
          slideResults: result.slideResults.map(r => ({
            slideIndex: r.slideIndex,
            hasDiff: r.hasDiff,
            diffPixelCount: r.diffPixelCount,
            diffPercentage: r.diffPercentage,
            averageDeltaE: r.averageDeltaE,
            maxDeltaE: r.maxDeltaE
          })),
          timestamp: new Date().toISOString()
        }, null, 2),
        'utf8'
      );
      
      result.reportPath = reportPath;
      
      // 一時ファイルを削除
      if (this.options.cleanupTemp) {
        this.cleanupTempFiles([tempOriginalDir, tempAdjustedDir]);
      }
      
      // 成功フラグを設定
      result.success = true;
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`視覚的差分分析中にエラーが発生しました: ${errorMessage}`);
      logger.error(`視覚的差分分析中にエラーが発生しました: ${errorMessage}`);
      
      return result;
    }
  }
  
  /**
   * PPTXファイルをPNG画像に変換する
   * @param pptxFilePath PPTXファイルパス
   * @param outputDir 出力ディレクトリ
   * @returns Promise<void>
   */
  private async convertPPTXtoPNG(
    pptxFilePath: string,
    outputDir: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // LibreOfficeを使用してPPTXをPNGに変換
      const libreOfficeProcess = spawn(this.options.libreOfficePath, [
        '--headless',
        '--convert-to', 'png',
        '--outdir', outputDir,
        pptxFilePath
      ]);
      
      let stderr = '';
      
      libreOfficeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      libreOfficeProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`LibreOfficeの実行に失敗しました (コード: ${code}): ${stderr}`));
          return;
        }
        
        resolve();
      });
      
      libreOfficeProcess.on('error', (error) => {
        reject(new Error(`LibreOfficeの実行中にエラーが発生しました: ${error.message}`));
      });
    });
  }
  
  /**
   * 画像ファイルを取得する
   * @param directory ディレクトリパス
   * @returns 画像ファイルパスの配列
   */
  private getImageFiles(directory: string): string[] {
    const files = fs.readdirSync(directory)
      .filter(file => file.toLowerCase().endsWith('.png'))
      .map(file => path.join(directory, file))
      .sort();
    
    return files;
  }
  
  /**
   * 画像を比較する
   * @param image1Path 画像1のパス
   * @param image2Path 画像2のパス
   * @param diffImagePath 差分画像のパス（オプション）
   * @returns スライド比較結果のPromise
   */
  private async compareImages(
    image1Path: string,
    image2Path: string,
    diffImagePath?: string
  ): Promise<SlideComparisonResult> {
    // 結果オブジェクトを初期化
    const result: SlideComparisonResult = {
      slideIndex: 0,
      hasDiff: false,
      diffPixelCount: 0,
      diffPercentage: 0,
      averageDeltaE: 0,
      maxDeltaE: 0,
      originalImagePath: image1Path,
      adjustedImagePath: image2Path
    };
    
    try {
      // 画像を読み込む
      const [image1Data, image2Data] = await Promise.all([
        sharp(image1Path).raw().toBuffer({ resolveWithObject: true }),
        sharp(image2Path).raw().toBuffer({ resolveWithObject: true })
      ]);
      
      // 画像サイズを確認
      const width1 = image1Data.info.width;
      const height1 = image1Data.info.height;
      const width2 = image2Data.info.width;
      const height2 = image2Data.info.height;
      
      // サイズが異なる場合はリサイズ
      let buffer1 = image1Data.data;
      let buffer2 = image2Data.data;
      let width = width1;
      let height = height1;
      
      if (width1 !== width2 || height1 !== height2) {
        // 小さい方のサイズに合わせる
        width = Math.min(width1, width2);
        height = Math.min(height1, height2);
        
        // 画像をリサイズ
        if (width1 !== width || height1 !== height) {
          const resized = await sharp(image1Path)
            .resize(width, height)
            .raw()
            .toBuffer();
          buffer1 = resized;
        }
        
        if (width2 !== width || height2 !== height) {
          const resized = await sharp(image2Path)
            .resize(width, height)
            .raw()
            .toBuffer();
          buffer2 = resized;
        }
      }
      
      // ピクセルごとに比較
      let diffPixelCount = 0;
      let totalDeltaE = 0;
      let maxDeltaE = 0;
      
      // 差分画像用のバッファ
      let diffBuffer: Buffer | null = null;
      if (diffImagePath) {
        diffBuffer = Buffer.alloc(width * height * 4);
      }
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          
          // RGB値を取得
          const r1 = buffer1[i];
          const g1 = buffer1[i + 1];
          const b1 = buffer1[i + 2];
          const a1 = buffer1[i + 3];
          
          const r2 = buffer2[i];
          const g2 = buffer2[i + 1];
          const b2 = buffer2[i + 2];
          const a2 = buffer2[i + 3];
          
          // 色差（ΔE）を計算
          const deltaE = this.calculateDeltaE(
            { r: r1, g: g1, b: b1 },
            { r: r2, g: g2, b: b2 }
          );
          
          // しきい値を超える差分があるか
          const hasDiff = deltaE > this.options.deltaEThreshold;
          
          if (hasDiff) {
            diffPixelCount++;
            totalDeltaE += deltaE;
            maxDeltaE = Math.max(maxDeltaE, deltaE);
          }
          
          // 差分画像を生成
          if (diffBuffer) {
            if (hasDiff) {
              // 差分がある場合は赤色で表示
              diffBuffer[i] = 255;
              diffBuffer[i + 1] = 0;
              diffBuffer[i + 2] = 0;
              diffBuffer[i + 3] = 255;
            } else {
              // 差分がない場合は元の画像をグレースケールで表示
              const gray = Math.round((r1 * 0.3 + g1 * 0.59 + b1 * 0.11));
              diffBuffer[i] = gray;
              diffBuffer[i + 1] = gray;
              diffBuffer[i + 2] = gray;
              diffBuffer[i + 3] = 255;
            }
          }
        }
      }
      
      // 差分画像を保存
      if (diffBuffer && diffImagePath) {
        await sharp(diffBuffer, {
          raw: {
            width,
            height,
            channels: 4
          }
        })
          .toFile(diffImagePath);
        
        result.diffImagePath = diffImagePath;
      }
      
      // 結果を設定
      const totalPixels = width * height;
      result.diffPixelCount = diffPixelCount;
      result.diffPercentage = (diffPixelCount / totalPixels) * 100;
      result.hasDiff = diffPixelCount > 0;
      result.averageDeltaE = diffPixelCount > 0 ? totalDeltaE / diffPixelCount : 0;
      result.maxDeltaE = maxDeltaE;
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`画像比較中にエラーが発生しました: ${errorMessage}`);
      
      // エラーの場合はデフォルト値を返す
      return result;
    }
  }
  
  /**
   * RGB値をLAB値に変換する
   * @param rgb RGBカラー
   * @returns LABカラー
   */
  private rgbToLab(rgb: RGBColor): LABColor {
    // RGB値を0～1の範囲に正規化
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;
    
    // sRGBからXYZに変換
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    r *= 100;
    g *= 100;
    b *= 100;
    
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    
    // XYZからLABに変換
    const xr = x / LAB_WHITE_POINT.x;
    const yr = y / LAB_WHITE_POINT.y;
    const zr = z / LAB_WHITE_POINT.z;
    
    const fx = xr > 0.008856 ? Math.pow(xr, 1/3) : (7.787 * xr) + (16/116);
    const fy = yr > 0.008856 ? Math.pow(yr, 1/3) : (7.787 * yr) + (16/116);
    const fz = zr > 0.008856 ? Math.pow(zr, 1/3) : (7.787 * zr) + (16/116);
    
    const l = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    return { l, a, b };
  }
  
  /**
   * 色差（ΔE）を計算する
   * @param rgb1 RGBカラー1
   * @param rgb2 RGBカラー2
   * @returns 色差（ΔE）
   */
  private calculateDeltaE(rgb1: RGBColor, rgb2: RGBColor): number {
    // RGB値をLAB値に変換
    const lab1 = this.rgbToLab(rgb1);
    const lab2 = this.rgbToLab(rgb2);
    
    // ΔE（CIE76）を計算
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }
  
  /**
   * 一時ファイルを削除する
   * @param directories 削除するディレクトリパスの配列
   */
  private cleanupTempFiles(directories: string[]): void {
    for (const directory of directories) {
      try {
        if (fs.existsSync(directory)) {
          // ディレクトリ内のファイルを削除
          const files = fs.readdirSync(directory);
          for (const file of files) {
            fs.unlinkSync(path.join(directory, file));
          }
          
          // ディレクトリを削除
          fs.rmdirSync(directory);
          
          logger.debug(`一時ディレクトリを削除しました: ${directory}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`一時ファイルの削除中にエラーが発生しました: ${directory} - ${errorMessage}`);
      }
    }
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: VisualDiffAnalyzer | null = null;

export function getVisualDiffAnalyzer(options?: Partial<VisualDiffOptions>): VisualDiffAnalyzer {
  if (!instance) {
    instance = new VisualDiffAnalyzer(options);
  } else if (options) {
    // 既存のインスタンスにオプションを適用する方法はないため、
    // オプションが指定された場合は新しいインスタンスを作成
    instance = new VisualDiffAnalyzer(options);
  }
  return instance;
}
