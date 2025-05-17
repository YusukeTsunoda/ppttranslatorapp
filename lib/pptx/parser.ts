import * as fs from 'fs';
import { PythonShell } from 'python-shell';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PPTXParseResult, ParseAPIResponse, SlideContent, TextElement, Position } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import os from 'os';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

// パーサーキャッシュ
interface ParseCache {
  result: PPTXParseResult;
  timestamp: number;
  fileHash: string;
}

export class PPTXParser {
  private static instance: PPTXParser;
  private pythonScriptPath: string;
  private pythonPath: string;
  private parserCache: Map<string, ParseCache> = new Map();
  // キャッシュの有効期限（1時間）
  private cacheExpirationTime = 60 * 60 * 1000;
  // 同時処理数の制限
  private maxConcurrentProcesses: number;

  private constructor() {
    this.pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_parser.py');
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    // CPUコア数に基づいて同時処理数を設定（最大値を制限）
    this.maxConcurrentProcesses = Math.max(1, Math.min(os.cpus().length - 1, 4));
  }

  public static getInstance(): PPTXParser {
    if (!PPTXParser.instance) {
      PPTXParser.instance = new PPTXParser();
    }
    return PPTXParser.instance;
  }

  // ファイルのハッシュを計算
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const hash = createHash('md5');
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (data) => {
          hash.update(data);
        });
        
        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // キャッシュが有効かチェック
  private isCacheValid(cache: ParseCache, fileHash: string): boolean {
    const now = Date.now();
    // キャッシュが期限内で、ファイルハッシュが一致している場合は有効
    return (
      now - cache.timestamp < this.cacheExpirationTime &&
      cache.fileHash === fileHash
    );
  }

  private async ensurePythonScript(): Promise<void> {
    if (!fs.existsSync(this.pythonScriptPath)) {
      throw new Error(`Python script not found at ${this.pythonScriptPath}`);
    }
  }

  private async checkDependencies(): Promise<void> {
    try {
      // Python環境の確認
      await execAsync(`${this.pythonPath} --version`);
      
      // 依存パッケージのチェック（最小限の確認のみ実施）
      await execAsync(`${this.pythonPath} -c "import python_pptx; import PIL"`);
    } catch (error) {
      console.error('Python dependency check failed:', error);
      throw new Error('Python dependencies are not installed. Please install required packages.');
    }
  }

  private validateAndProcessResult(result: any, inputPath: string): PPTXParseResult {
    if (!result || !result.slides || !Array.isArray(result.slides)) {
      throw new Error('Invalid result format from Python script');
    }

    return {
      filename: path.basename(inputPath),
      totalSlides: result.slides.length,
      metadata: this.processMetadata(result.metadata || {}),
      slides: result.slides.map((slide: any, index: number) => ({
        index,
        imageUrl: slide.imageUrl || slide.image_path,
        textElements: this.processTextElements(slide.texts || [], index),
        shapes: this.processShapes(slide.shapes || []),
        background: this.processBackground(slide.background)
      }))
    };
  }

  private processMetadata(metadata: any): Record<string, any> {
    // メタデータの検証と整形
    const processedMetadata = {
      title: metadata.title || '',
      author: metadata.author || '',
      created: metadata.created || '',
      modified: metadata.modified || '',
      company: metadata.company || '',
      version: metadata.version || '',
      lastModifiedBy: metadata.lastModifiedBy || '',
      revision: metadata.revision || 0,
      subject: metadata.subject || '',
      keywords: metadata.keywords || [],
      category: metadata.category || '',
      description: metadata.description || '',
      language: metadata.language || 'ja-JP',
      presentationFormat: metadata.presentationFormat || 'widescreen',
      createdApplication: metadata.createdApplication || ''
    };

    // 日付形式の検証と変換
    if (processedMetadata.created) {
      try {
        const date = new Date(processedMetadata.created);
        processedMetadata.created = date.toISOString();
      } catch (error) {
        console.warn('Invalid created date format:', error);
      }
    }

    if (processedMetadata.modified) {
      try {
        const date = new Date(processedMetadata.modified);
        processedMetadata.modified = date.toISOString();
      } catch (error) {
        console.warn('Invalid modified date format:', error);
      }
    }

    return processedMetadata;
  }

  private processTextElements(texts: any[], slideIndex: number): TextElement[] {
    return texts.map((textObj: any, index: number) => {
      // テキスト要素の基本情報
      const textElement: TextElement = {
        id: `text-${slideIndex}-${uuidv4().substring(0, 8)}`,
        text: textObj.text || '',
        position: this.processPosition(textObj.position),
        type: textObj.type || 'text',
        font: this.processFont(textObj.font || textObj.paragraphs?.[0]?.font || {})
      };

      // 追加のスタイル情報
      if (textObj.style) {
        textElement.style = {
          alignment: textObj.style.alignment,
          lineSpacing: textObj.style.lineSpacing,
          indentation: textObj.style.indentation,
          direction: textObj.style.direction,
          bulletStyle: textObj.style.bulletStyle
        };
      }

      // ハイパーリンク情報
      if (textObj.hyperlink) {
        textElement.hyperlink = {
          url: textObj.hyperlink.url,
          tooltip: textObj.hyperlink.tooltip
        };
      }

      // アニメーション情報
      if (textObj.animation) {
        textElement.animation = {
          type: textObj.animation.type,
          duration: textObj.animation.duration,
          delay: textObj.animation.delay,
          trigger: textObj.animation.trigger
        };
      }

      return textElement;
    });
  }

  private processPosition(position: any): Position {
    return {
      x: position?.x || 0,
      y: position?.y || 0,
      width: position?.width || 0,
      height: position?.height || 0,
      rotation: position?.rotation || 0,
      zIndex: position?.zIndex || 0
    };
  }

  private processFont(font: any): Record<string, any> {
    return {
      name: font.name || 'Arial',
      size: font.size || 12,
      color: font.color || '#000000',
      bold: font.bold || false,
      italic: font.italic || false,
      underline: font.underline || false,
      strikethrough: font.strikethrough || false,
      superscript: font.superscript || false,
      subscript: font.subscript || false,
      characterSpacing: font.characterSpacing || 0,
      kerning: font.kerning !== undefined ? font.kerning : true
    };
  }

  private processShapes(shapes: any[]): any[] {
    return shapes.map(shape => ({
      type: shape.type,
      x: shape.x || 0,
      y: shape.y || 0,
      width: shape.width || 0,
      height: shape.height || 0,
      rotation: shape.rotation || 0,
      fillColor: shape.fillColor || 'transparent',
      strokeColor: shape.strokeColor || '#000000',
      strokeWidth: shape.strokeWidth || 1,
      opacity: shape.opacity || 1,
      radius: shape.radius, // 円の場合のみ
      points: shape.points // 多角形の場合のみ
    }));
  }

  private processBackground(background: any): Record<string, any> {
    return {
      color: background?.color || '#FFFFFF',
      image: background?.image || null,
      pattern: background?.pattern || null,
      gradient: background?.gradient || null,
      transparency: background?.transparency || 0
    };
  }

  // 大量のスライドを効率的に処理するための最適化
  private async processSlidesBatch(slides: any[], outputDir: string): Promise<SlideContent[]> {
    // バッチサイズを動的に調整
    const optimalBatchSize = Math.max(
      1,
      Math.min(
        Math.ceil(slides.length / this.maxConcurrentProcesses),
        50 // 最大バッチサイズ
      )
    );

    const batches = [];
    for (let i = 0; i < slides.length; i += optimalBatchSize) {
      batches.push(slides.slice(i, i + optimalBatchSize));
    }

    // メモリ使用量を監視
    const memoryThreshold = 0.8; // 80%のメモリ使用率を閾値とする
    const initialMemoryUsage = process.memoryUsage().heapUsed;
    const maxMemory = process.memoryUsage().heapTotal;

    // 各バッチを並列処理
    const results = await Promise.all(
      batches.map(async (batch, batchIndex) => {
        // メモリ使用量をチェック
        const currentMemoryUsage = process.memoryUsage().heapUsed;
        const memoryUsageRatio = currentMemoryUsage / maxMemory;

        if (memoryUsageRatio > memoryThreshold) {
          // メモリ使用量が閾値を超えた場合、ガベージコレクションを促す
          if (global.gc) {
            global.gc();
          }
          // 処理を一時停止して、メモリを解放する時間を設ける
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        return batch.map((slide: any) => {
          const slideIndex = slide.index;
          const imageUrl = `/api/slides/${path.basename(outputDir)}/slides/${slideIndex + 1}.png`;

          return {
            index: slideIndex,
            imageUrl,
            textElements: this.processTextElements(slide.texts || [], slideIndex),
            shapes: this.processShapes(slide.shapes || []),
            background: this.processBackground(slide.background)
          };
        });
      })
    );

    // メモリ使用量の変化をログ
    const finalMemoryUsage = process.memoryUsage().heapUsed;
    const memoryDiff = finalMemoryUsage - initialMemoryUsage;
    console.log(`Memory usage change: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);

    return results.flat().sort((a, b) => a.index - b.index);
  }

  private async executePythonScript(inputPath: string, outputDir: string): Promise<any> {
    try {
      // まず出力ディレクトリを確保
      await fsPromises.mkdir(outputDir, { recursive: true });

      // PythonShellのオプション
      const options = {
        mode: 'json' as const,
        pythonPath: this.pythonPath,
        pythonOptions: ['-u'], // 出力バッファリングを無効化
        scriptPath: path.dirname(this.pythonScriptPath),
        args: [inputPath, outputDir]
      };

      const results = await PythonShell.run(path.basename(this.pythonScriptPath), options);
      if (!results || results.length === 0) {
        throw new Error('No results returned from Python script');
      }

      return results[0];
    } catch (error) {
      console.error('Python script execution failed:', error);
      throw new Error(`Failed to execute Python script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async parsePPTX(inputPath: string, outputDir: string, forceReparse: boolean = false): Promise<PPTXParseResult> {
    try {
      // ファイルハッシュを計算
      const fileHash = await this.calculateFileHash(inputPath);
      const cacheKey = `${path.basename(inputPath)}_${fileHash}`;
      
      // キャッシュをチェック（強制再解析フラグがオフの場合のみ）
      if (!forceReparse && this.parserCache.has(cacheKey)) {
        const cache = this.parserCache.get(cacheKey)!;
        if (this.isCacheValid(cache, fileHash)) {
          // 有効なキャッシュが存在する場合はそれを使用
          console.log(`Using cached parse result for ${path.basename(inputPath)}`);
          return cache.result;
        }
      }
      
      // Python環境の確認
      await this.ensurePythonScript();
      await this.checkDependencies();
      
      // メモリ使用量最適化のため、GCを実行
      if (global.gc) {
        global.gc();
      }
      
      // Python処理の実行（メイン処理）
      const result = await this.executePythonScript(inputPath, outputDir);
      
      // スライドを並列処理
      if (result && result.slides && Array.isArray(result.slides)) {
        console.log(`Processing ${result.slides.length} slides in parallel batches`);
        const processedSlides = await this.processSlidesBatch(result.slides, outputDir);
        result.slides = processedSlides;
      }
      
      // 結果を検証して処理
      const parseResult = this.validateAndProcessResult(result, inputPath);
      
      // キャッシュに保存
      this.parserCache.set(cacheKey, {
        result: parseResult,
        timestamp: Date.now(),
        fileHash
      });
      
      // 古いキャッシュのクリーンアップ
      this.cleanupCache();
      
      return parseResult;
    } catch (error) {
      console.error('PPTX parsing error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during PPTX parsing');
    } finally {
      // 明示的にメモリ解放を促す
      if (global.gc) {
        global.gc();
      }
    }
  }

  // 古いキャッシュエントリをクリーンアップ
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.parserCache.entries()) {
      if (now - cache.timestamp > this.cacheExpirationTime) {
        this.parserCache.delete(key);
      }
    }
  }

  // キャッシュを完全にクリア
  public clearCache(): void {
    this.parserCache.clear();
    console.log('Parser cache cleared');
  }

  public extractTexts(parseResult: PPTXParseResult): string[] {
    return parseResult.slides.flatMap((slide) => slide.textElements.map((element) => element.text));
  }

  public getTextWithPositions(parseResult: PPTXParseResult): SlideContent[] {
    return parseResult.slides;
  }
}
