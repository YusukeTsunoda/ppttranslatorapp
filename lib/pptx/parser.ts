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

  // スライド処理を並列実行するための補助関数
  private async processSlidesBatch(slides: any[], outputDir: string): Promise<SlideContent[]> {
    // CPUコア数に基づいて適切なバッチサイズを設定
    const batchSize = Math.max(1, Math.ceil(slides.length / this.maxConcurrentProcesses));
    const batches = [];
    
    // スライドをバッチに分割
    for (let i = 0; i < slides.length; i += batchSize) {
      batches.push(slides.slice(i, i + batchSize));
    }
    
    // 各バッチを並列処理
    const results = await Promise.all(
      batches.map(async (batch) => {
        return batch.map((slide: any, index: number) => {
          const slideIndex = slide.index;
          const imageUrl = `/api/slides/${path.basename(outputDir)}/slides/${slideIndex + 1}.png`;
          
          return {
            index: slideIndex,
            imageUrl,
            textElements: slide.texts.map((textObj: any) => ({
              id: `text-${slideIndex}-${uuidv4().substring(0, 8)}`,
              text: textObj.text,
              position: textObj.position,
              type: textObj.type || 'text',
              fontInfo: textObj.paragraphs?.[0]?.font || {}
            }))
          };
        });
      })
    );
    
    // 結果を平坦化して返す
    return results.flat();
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

  private validateAndProcessResult(result: any, inputPath: string): PPTXParseResult {
    if (!result || !result.slides || !Array.isArray(result.slides)) {
      throw new Error('Invalid result format from Python script');
    }

    return {
      filename: path.basename(inputPath),
      totalSlides: result.slides.length,
      metadata: result.metadata || {},
      slides: result.slides.map((slide: any, index: number) => ({
        index,
        imageUrl: slide.imageUrl,
        textElements: (slide.texts || []).map((textObj: any) => ({
          id: `text-${index}-${uuidv4().substring(0, 8)}`,
          text: textObj.text,
          position: textObj.position,
          type: textObj.type || 'text',
          fontInfo: textObj.paragraphs?.[0]?.font || {}
        }))
      }))
    };
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
