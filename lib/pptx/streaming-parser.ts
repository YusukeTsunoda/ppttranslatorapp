/**
 * ストリーミング処理に対応したPPTXパーサー
 * メモリ効率と処理速度を向上させるために、ファイル全体をメモリに読み込まずに
 * ストリーミング処理を行う実装です。
 * 
 * 最適化ポイント：
 * 1. Worker Threads APIを使用した並列処理
 * 2. ストリーミングI/Oによる効率的なファイル処理
 * 3. バッファプールによるメモリ最適化
 */
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // エラーIDの生成に使用
import * as os from 'os';
import { PythonShell } from 'python-shell';
import * as crypto from 'crypto';
import { WorkerPool } from './worker-pool';
import { StreamingIO, BufferPool } from './streaming-io';
import { performance } from 'perf_hooks'; // パフォーマンス計測用
import { PPTXParseResult, ParseOptions as BaseParseOptions, SlideContent, Metadata } from './types';

// ParseOptionsを拡張してキャッシュ関連のオプションと並列処理オプションを追加
interface ParseOptions extends BaseParseOptions {
  skipCache?: boolean;
  forceReparse?: boolean;
  maxParallelProcesses?: number;
}

const fsPromises = fs.promises;

// キャッシュエントリの型
interface CacheEntry {
  result: PPTXParseResult;
  timestamp: number;
  fileHash: string;
}

// 構造化されたエラー情報の型
interface StructuredError {
  id: string;
  timestamp: number;
  method: string;
  message: string;
  stack?: string | undefined;
  context?: string | null | undefined;
  systemInfo: {
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    platform: string;
    arch: string;
  };
  recovered: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// エラー分析結果の型
interface ErrorAnalysis {
  totalErrors: number;
  recoveredErrors: number;
  errorsBySeverity: Record<string, number>;
  errorsByMethod: Record<string, number>;
  mostFrequentErrors: { message: string; count: number }[];
  lastError?: StructuredError | undefined;
}



/**
 * ストリーミング処理に対応したPPTXパーサークラス
 */
export class StreamingPPTXParser {
  // クラスプロパティを確定的に初期化し、型エラーを回避する
  private pythonPath: string = 'python3'; // デフォルト値を直接設定
  private scriptPath: string = path.join(__dirname, '..', '..', 'python', 'pptx_parser.py');
  private cacheExpirationTime: number = 3600 * 24; // 24時間
  private parserCache: Map<string, CacheEntry> = new Map();
  private cacheDir: string = path.join(os.tmpdir(), 'pptx-parser-cache');
  private batchSize: number = 10; // 一度に処理するスライド数
  
  // 並列処理関連
  private maxWorkers: number = Math.max(1, Math.min(os.cpus().length - 1, 4)); // CPUコア数 - 1を上限に
  private workerScriptPath: string = path.join(__dirname, 'pptx-worker.js');
  private workerPool: WorkerPool | null = null;
  
  // メモリ最適化関連
  private bufferSize: number = 1024 * 1024; // 1MB
  private bufferPool: BufferPool | null = null;
  private streamingIO: StreamingIO | null = null;
  
  // エラーログ
  private errorLog: StructuredError[] = [];
  private errorCount: Record<string, number> = {};
  private maxErrorLogSize: number = 100;

  /**
   * コンストラクタ
   * @param options オプション
   */
  constructor(options: {
    pythonPath?: string;
    scriptPath?: string;
    maxParallelProcesses?: number;
    cacheExpirationTime?: number;
    batchSize?: number;
    maxWorkers?: number;
    bufferSize?: number;
    workerScriptPath?: string;
  } = {}) {
    // クラスプロパティはすでにデフォルト値で初期化されているので、
    // オプションが指定された場合のみ上書きする
    if (options.pythonPath) {
      this.pythonPath = options.pythonPath;
    }
    
    if (options.scriptPath) {
      this.scriptPath = options.scriptPath;
    }
    

    
    if (options.cacheExpirationTime) {
      this.cacheExpirationTime = options.cacheExpirationTime;
    }
    
    if (options.batchSize) {
      this.batchSize = options.batchSize;
    }
    
    if (options.maxWorkers) {
      this.maxWorkers = options.maxWorkers;
    }
    
    if (options.bufferSize) {
      this.bufferSize = options.bufferSize;
    }
    
    if (options.workerScriptPath) {
      this.workerScriptPath = options.workerScriptPath;
    }
    
    // バッファプールを初期化
    this.bufferPool = new BufferPool(this.bufferSize, 10); // 10個のバッファを事前に確保
    
    // ストリーミングI/Oを初期化
    this.streamingIO = new StreamingIO();
  }
  
  /**
   * 並列処理用のワーカープールを初期化
   */
  private initializeWorkerPool(): void {
    if (this.workerPool) {
      return; // すでに初期化されている場合は何もしない
    }
    
    try {
      this.workerPool = new WorkerPool(this.workerScriptPath, this.maxWorkers);
      console.log(`ワーカープールを初期化しました（最大ワーカー数: ${this.maxWorkers}）`);
    } catch (error) {
      console.error('ワーカープールの初期化に失敗しました:', error);
      this.logError('initializeWorkerPool', error, null, 'medium', false);
    }
  }
  
  /**
   * 並列処理を使用してスライドを解析
   * @param inputPath 入力ファイルパス
   * @param outputDir 出力ディレクトリ
   * @param slideCount スライド数
   * @returns 解析結果の配列
   */
  private async parseSlidesConcurrently(
    inputPath: string,
    outputDir: string,
    slideCount: number
  ): Promise<SlideContent[]> {
    // ワーカープールを初期化
    this.initializeWorkerPool();
    
    if (!this.workerPool) {
      throw new Error('ワーカープールの初期化に失敗しました');
    }
    
    // 結果を格納する配列
    const results: SlideContent[] = new Array(slideCount);
    
    // バッチサイズごとに処理
    for (let i = 0; i < slideCount; i += this.batchSize) {
      // バッチのサイズを計算
      const batchEnd = Math.min(i + this.batchSize, slideCount);
      const batch = Array.from({ length: batchEnd - i }, (_, j) => i + j);
      
      // バッチ内のスライドを並列処理
      const batchPromises = batch.map(slideIndex => {
        // WorkerPoolのrunTaskメソッドを使用
        if (this.workerPool) {
          try {
            // ワーカープールにタスクを送信し、Promiseを取得
            return this.workerPool.runTask('parseSlide', {
              inputPath,
              outputDir,
              slideIndex,
              pythonPath: this.pythonPath,
              scriptPath: this.scriptPath
            }).then(result => {
              // 結果をSlideContent型に変換
              return result as SlideContent;
            }).catch(error => {
              console.error(`スライド解析エラー (${slideIndex}):`, error);
              // エラー時は空のスライドを返す
              return {
                index: slideIndex,
                imageUrl: '',
                textElements: [],
                shapes: [],
                background: {
                  color: '#FFFFFF'
                }
              } as SlideContent;
            });
          } catch (error) {
            console.error(`スライド解析エラー (${slideIndex}):`, error);
            return Promise.resolve({
              index: slideIndex,
              imageUrl: '',
              textElements: [],
              shapes: [],
              background: {
                color: '#FFFFFF'
              }
            } as SlideContent);
          }
        }
        return Promise.resolve({
          index: slideIndex,
          imageUrl: '',
          textElements: [],
          shapes: [],
          background: {
            color: '#FFFFFF'
          }
        } as SlideContent);
      });
      
      // バッチの結果を取得
      const batchResults = await Promise.all(batchPromises);
      
      // 結果を正しい位置に格納
      for (let j = 0; j < batch.length; j++) {
        const index = batch[j];
        const result = batchResults[j];
        if (index !== undefined && index >= 0 && index < slideCount && result) {
          results[index] = result;
        } else if (index !== undefined && index >= 0 && index < slideCount) {
          // 空のスライドを作成
          results[index] = {
            index: index,
            imageUrl: '',
            textElements: [],
            shapes: [],
            background: {
              color: '#FFFFFF'
            }
          };
        }
      }
    }
    
    return results;
  }
  
  /**
   * ファイルのハッシュを計算
   * @param filePath ファイルパス
   * @returns ハッシュ文字列
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileContent = await fsPromises.readFile(filePath);
      const hash = crypto.createHash('md5').update(fileContent).digest('hex');
      return hash;
    } catch (error) {
      console.error(`ファイルハッシュの計算に失敗しました: ${filePath}`, error);
      return '';
    }
  }
  
  /**
   * 依存関係を確認
   */
  private async checkDependencies(): Promise<void> {
    // Pythonがインストールされているか確認
    try {
      const { spawn } = await import('child_process');
      const pythonProcess = spawn(this.pythonPath, ['--version']);
      
      return new Promise<void>((resolve, reject) => {
        pythonProcess.on('error', (error) => {
          console.error('Pythonの実行に失敗しました:', error);
          reject(new Error(`Pythonの実行に失敗しました: ${error.message}`));
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Pythonの実行がコード ${code} で終了しました`));
          }
        });
      });
    } catch (error) {
      console.error('Python依存関係の確認に失敗しました:', error);
      throw error;
    }
  }

  /**
   * キャッシュが有効かどうかを確認
   * @param cache キャッシュエントリ
   * @param fileHash ファイルハッシュ
   * @returns 有効な場合はtrue
   */
  private isCacheValid(cache: CacheEntry, fileHash: string): boolean {
    // キャッシュが存在しない場合は無効
    if (!cache) {
      return false;
    }
    
    // ファイルハッシュが異なる場合は無効
    if (cache.fileHash !== fileHash) {
      return false;
    }
    
    // キャッシュの有効期限を確認
    const now = Date.now();
    const age = now - cache.timestamp;
    
    return age <= this.cacheExpirationTime;
  }

  /**
   * PPTXファイルを解析し、結果を返す
   * @param inputPath 入力ファイルパス
   * @param options 解析オプション
   * @returns 解析結果
   * @throws {Error} ファイルが存在しない場合や解析に失敗した場合
   */
  public async parsePPTX(inputPath: string, options: ParseOptions = {}): Promise<PPTXParseResult> {
    try {
      await this.validateInputFile(inputPath);
      
      // 依存関係のチェック
      await this.checkDependencies();
      
      // キャッシュからの結果取得を試みる
      const cachedResult = await this.tryGetFromCache(inputPath, options);
      if (cachedResult) {
        return cachedResult;
      }
      
      // キャッシュにない場合は解析を実行
      return await this.parseAndCacheResult(inputPath, options);
    } catch (error) {
      // エラーログの記録と詳細なエラーメッセージの生成
      const structuredError = this.logError('parsePPTX', error, inputPath, 'critical', false);
      console.error('エラー情報:', structuredError);
      
      // エラーを再スロー
      if (error instanceof Error) {
        throw new Error(`PPTXファイルの解析に失敗しました: ${error.message}`);
      } else {
        throw new Error(`PPTXファイルの解析中に不明なエラーが発生しました: ${String(error)}`);
      }
    }
  }
  
  /**
   * 入力ファイルの検証
   * @param inputPath 入力ファイルパス
   * @throws {Error} ファイルが存在しない場合やアクセスできない場合
   */
  private async validateInputFile(inputPath: string): Promise<void> {
    // ファイルの存在確認
    if (!fs.existsSync(inputPath)) {
      throw new Error(`ファイルが見つかりません: ${inputPath}`);
    }
    
    // ファイルの読み取り権限を確認
    try {
      await fsPromises.access(inputPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`ファイルにアクセスできません: ${inputPath} - ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // ファイルサイズの確認
    try {
      const stats = await fsPromises.stat(inputPath);
      if (stats.size === 0) {
        throw new Error(`ファイルが空です: ${inputPath}`);
      }
      
      // ファイルサイズのログ出力
      console.log(`ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      throw new Error(`ファイルの状態確認に失敗しました: ${inputPath} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * エラー情報をログに記録する
   * @param method エラーが発生したメソッド名
   * @param error エラーオブジェクト
   * @param context エラーのコンテキスト情報（ファイルパスなど）
   * @param severity エラーの重大度
   * @param recovered 回復処理が行われたか
   * @returns 構造化されたエラー情報
   */
  private logError(
    method: string, 
    error: any, 
    context?: string | null, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recovered: boolean = false
  ): StructuredError {
    // コンソールに出力
    console.error(`Error in ${method}: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    if (context) {
      console.error(`Context: ${context}`);
    }
    
    // メモリ使用量を取得
    const memoryUsage = process.memoryUsage();
    
    // 構造化されたエラー情報を作成
    const structuredError: StructuredError = {
      id: uuidv4(),
      timestamp: Date.now(),
      method,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      systemInfo: {
        nodeVersion: process.version,
        memoryUsage,
        platform: process.platform,
        arch: process.arch
      },
      recovered,
      severity
    };
    
    // エラーログに追加
    this.errorLog.unshift(structuredError);
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.pop(); // 古いエラーを削除
    }
    
    // エラーカウントを更新
    const errorKey = `${method}:${structuredError.message}`;
    this.errorCount[errorKey] = (this.errorCount[errorKey] || 0) + 1;
    
    return structuredError;
  }

/**
 * キャッシュから結果を取得する
 * @param inputPath 入力ファイルパス
 * @param options パースオプション
 * @returns キャッシュされた結果（存在しない場合はnull）
 */
private async tryGetFromCache(inputPath: string, options: ParseOptions): Promise<PPTXParseResult | null> {
  if (options.skipCache) {
    return null;
  }

  try {
    // ファイルハッシュを計算
    const fileHash = await this.calculateFileHash(inputPath);
    
    // キャッシュからデータを取得
    const cacheKey = inputPath;
    const cacheEntry = this.parserCache.get(cacheKey);
    
    // キャッシュの有効性を確認
    if (cacheEntry && this.isCacheValid(cacheEntry, fileHash)) {
      console.log(`キャッシュから結果を取得しました: ${inputPath}`);
      return cacheEntry.result;
    }
    
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`キャッシュから結果を取得できませんでした: ${errorMessage}`);
    return null;
  }
}

/**
 * 結果をキャッシュに保存する
 * @param inputPath 入力ファイルパス
 * @param options パースオプション
 * @returns 解析結果
 */
private async parseAndCacheResult(inputPath: string, options: ParseOptions): Promise<PPTXParseResult> {
  // パフォーマンス計測開始
  const startTime = performance.now();
  
  // ファイルハッシュを計算
  const fileHash = await this.calculateFileHash(inputPath);
  const hashTime = performance.now();
  console.log(`ファイルハッシュ計算時間: ${hashTime - startTime}ms`);
  
  // 一時出力ディレクトリを作成
  const outputDir = path.join(this.cacheDir, path.basename(inputPath, '.pptx'));
  await fsPromises.mkdir(outputDir, { recursive: true });
  
  // バッチサイズを設定（大きなファイルの場合はメモリ使用量を制限）
  const fileSize = (await fsPromises.stat(inputPath)).size;
  const adjustedBatchSize = fileSize > 10 * 1024 * 1024 ? Math.min(this.batchSize, 5) : this.batchSize;
  console.log(`ファイルサイズ: ${fileSize} バイト, バッチサイズ: ${adjustedBatchSize}`);
  
  // ストリーミングI/Oを使用してファイルを処理
  if (!this.streamingIO) {
    this.streamingIO = new StreamingIO(this.bufferSize, 20);
  }
  
  // 入力ファイルを作業ディレクトリにコピー
  const workingFilePath = path.join(outputDir, path.basename(inputPath));
  await this.streamCopyFile(inputPath, workingFilePath);
  const copyTime = performance.now();
  console.log(`ファイルコピー時間: ${copyTime - hashTime}ms`);
  
  // ワーカープールを初期化
  this.initializeWorkerPool();
  
  // Pythonスクリプトを実行して解析（並列処理を活用）
  const result = await this.executePythonScript(inputPath, outputDir);
  const parseTime = performance.now();
  console.log(`解析処理時間: ${parseTime - copyTime}ms`);
  
  // 結果をキャッシュに保存
  if (!options.skipCache) {
    const cacheKey = inputPath;
    this.parserCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      fileHash
    });
  }
  
  const endTime = performance.now();
  console.log(`全体処理時間: ${endTime - startTime}ms`);
  
  return result;
}

/**
 * ファイルをストリーミングでコピー
 * @param sourcePath コピー元パス
 * @param destPath コピー先パス
 */
private async streamCopyFile(sourcePath: string, destPath: string): Promise<void> {
  if (this.streamingIO && this.bufferPool) {
    // バッファプールからバッファを取得してコピーを実行
    const buffer = this.bufferPool.get();
    try {
      await this.streamingIO.copyFileWithBuffer(sourcePath, destPath, buffer);
    } finally {
      // 使用後はバッファをプールに返却
      this.bufferPool.release(buffer);
    }
  } else if (this.streamingIO) {
    await this.streamingIO.copyFile(sourcePath, destPath);
  } else {
    // ストリーミングI/Oが無効な場合は通常のコピー
    await fs.promises.copyFile(sourcePath, destPath);
  }
}

/**
 * Pythonスクリプトを実行する
 * @param inputPath 入力ファイルパス
 * @param outputDir 出力ディレクトリ
 * @returns Pythonスクリプトの実行結果
 */
private async executePythonScript(inputPath: string, outputDir: string): Promise<PPTXParseResult> {
  try {
    // ワーカープールが初期化されているか確認
    if (!this.workerPool) {
      this.initializeWorkerPool();
    }

    // ストリーミングI/Oが初期化されているか確認
    if (!this.streamingIO) {
      this.streamingIO = new StreamingIO(this.bufferSize, 20);
    }

    // スライド数を取得するための予備処理
    const slideCountResult = await this.getSlideCount(inputPath);
    const slideCount = slideCountResult.count;

    console.log(`スライド数: ${slideCount}`);

    // スライド数が0の場合は空の結果を返す
    if (slideCount === 0) {
      return {
        slides: [],
        filename: path.basename(inputPath),
        totalSlides: 0,
        metadata: {
          title: path.basename(inputPath),
          author: 'Unknown',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          lastModifiedBy: 'System',
          revision: 1,
          presentationFormat: 'Unknown'
        }
      };
    }

    // メタデータを取得
    const metadata = await this.getMetadata(inputPath);

    // 並列処理を使用してスライドを解析
    const slides = await this.parseSlidesConcurrently(inputPath, outputDir, slideCount);

    // 結果を適切な形式に変換
    const parseResult: PPTXParseResult = {
      slides,
      filename: path.basename(inputPath),
      totalSlides: slides.length,
      metadata: {
        title: metadata.title || path.basename(inputPath),
        author: metadata.author || 'Unknown',
        created: metadata.created || new Date().toISOString(),
        modified: metadata.modified || new Date().toISOString(),
        lastModifiedBy: metadata.lastModifiedBy || 'System',
        revision: metadata.revision || 1,
        presentationFormat: metadata.presentationFormat || 'Unknown'
      }
    };

    return parseResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error executing Python script:', errorMessage);
    
    // エラーを構造化して記録
    this.logError('executePythonScript', error, inputPath);
    
    // エラーメッセージを詳細化
    if (error instanceof Error) {
      throw new Error(`PPTXパース処理でエラーが発生しました: ${errorMessage}`);
    } else {
      throw new Error(`PPTXパース処理で不明なエラーが発生しました: ${String(error)}`);
    }
  }
}

/**
 * エラー情報を分析する
 * @returns エラー分析結果
 */
public analyzeErrors(): ErrorAnalysis {
  const totalErrors = this.errorLog.length;
  let recoveredErrors = 0;
  const errorsBySeverity: Record<string, number> = {};
  const errorsByMethod: Record<string, number> = {};
  const errorMessages: Record<string, number> = {};
  
  // エラーログを分析
  for (const error of this.errorLog) {
    // 回復されたエラーをカウント
    if (error.recovered) {
      recoveredErrors++;
    }
    
    // 重大度別のエラー数をカウント
    errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    
    // メソッド別のエラー数をカウント
    errorsByMethod[error.method] = (errorsByMethod[error.method] || 0) + 1;
    
    // エラーメッセージ別のカウント
    errorMessages[error.message] = (errorMessages[error.message] || 0) + 1;
  }
  
  // 最も频度の高いエラーを抽出
  const mostFrequentErrors = Object.entries(errorMessages)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalErrors,
    recoveredErrors,
    errorsBySeverity,
    errorsByMethod,
    mostFrequentErrors,
    lastError: this.errorLog.length > 0 ? this.errorLog[0] : undefined
  };
}

  /**
   * エラーログをクリアする
   */
  public clearErrorLog(): void {
    this.errorLog = [];
    this.errorCount = {};
  }
  
  /**
   * エラーログを取得する
   * @param limit 取得するエラーの最大数
   * @returns エラーログ
   */
  public getErrorLog(limit?: number): StructuredError[] {
    if (limit && limit > 0) {
      return this.errorLog.slice(0, limit);
    }
    return [...this.errorLog];
  }

  /**
   * 解析結果からテキストを抽出
   * @param parseResult 解析結果
   * @returns テキストの配列
   */
  public extractTexts(parseResult: PPTXParseResult): string[] {
    if (!parseResult || !parseResult.slides || !Array.isArray(parseResult.slides)) {
      console.warn('無効な解析結果からテキストを抽出しようとしました');
      return [];
    }
    
    return parseResult.slides.flatMap(slide => {
      // テキスト要素が存在しない場合は空配列を返す
      const textElements = slide.textElements || [];
      
      // 空のテキストを除外し、改行や空白を正規化
      return textElements
        .map(element => {
          const text = element.text || '';
          // 空白や特殊文字を正規化
          return text.trim()
            .replace(/\s+/g, ' ')  // 複数の空白を単一の空白に
            .replace(/[\u200B-\u200D\uFEFF]/g, ''); // ゼロ幅スペースや特殊文字を除去
        })
        .filter(text => text.length > 0); // 空の文字列を除外
    });
  }
  
  /**
   * フォールバック処理を含むPPTXファイルの解析
   * 通常の解析が失敗した場合に代替手段を試みる
   * @param inputPath 入力ファイルパス
   * @param options 解析オプション
   * @returns 解析結果（部分的な結果を含む場合もある）
   */
  public async parseWithFallback(inputPath: string, options: ParseOptions = {}): Promise<PPTXParseResult> {
    try {
      // 通常の解析を試みる
      return await this.parsePPTX(inputPath, options);
    } catch (error) {
      // エラーを記録
      const structuredError = this.logError('parseWithFallback', error, inputPath, 'medium', true);
      console.warn(`通常の解析に失敗しました。フォールバック処理を試みます: ${structuredError.message}`);
      
      try {
        // 部分的な結果を作成
        return await this.createPartialResults(inputPath, error);
      } catch (fallbackError) {
        // フォールバックも失敗した場合
        this.logError('parseWithFallback', fallbackError, inputPath, 'high', false);
        
        // 最小限の結果を返す
        return {
          slides: [],
          filename: path.basename(inputPath),
          totalSlides: 0,
          metadata: {
            title: path.basename(inputPath),
            author: 'Unknown',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            lastModifiedBy: 'System',
            revision: 1,
            presentationFormat: 'Unknown'
          },
          error: {
            message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            recoveryAttempted: true,
            recoverySuccessful: false
          }
        };
      }
    }
  }
  
  /**
   * 解析に失敗した場合に部分的な結果を作成する
   * @param inputPath 入力ファイルパス
   * @param originalError 元のエラー
   * @returns 部分的な解析結果
   */
  private async createPartialResults(inputPath: string, originalError: any): Promise<PPTXParseResult> {
    console.log(`部分的な結果を作成しています: ${inputPath}`);
    
    try {
      // パフォーマンス計測開始
      const startTime = performance.now();
      
      // ファイル情報を取得
      const stats = await fsPromises.stat(inputPath);
      const fileInfo = path.parse(inputPath);
      
      // メタデータを作成
      const metadata: Metadata = {
        title: fileInfo.name,
        author: 'Unknown',
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        lastModifiedBy: 'System',
        revision: 1,
        presentationFormat: 'Unknown'
      };
      
      // 簡易的なスライド情報を作成（空のスライド）
      const slides: SlideContent[] = [{
        index: 0,
        imageUrl: '',
        textElements: [],
        shapes: [],
        background: { color: '#FFFFFF' }
      }];
      
      const endTime = performance.now();
      console.log(`部分的な結果の作成時間: ${endTime - startTime}ms`);
      
      // 部分的な結果を返す
      return {
        filename: path.basename(inputPath),
        totalSlides: 1,
        metadata,
        slides,
        error: {
          message: originalError instanceof Error ? originalError.message : String(originalError),
          recoveryAttempted: true,
          recoverySuccessful: true,
          details: '部分的な結果のみ利用可能です。完全な解析は失敗しました。',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      // 部分的な結果の作成にも失敗した場合
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`部分的な結果の作成に失敗しました: ${errorMessage}`);
      
      // エラーを記録
      this.logError('createPartialResults', error, inputPath, 'high', false);
      
      // 最小限の結果を返す
      throw new Error(`部分的な結果の作成に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * スライド数を取得する
   * @param inputPath 入力ファイルパス
   * @returns スライド数とエラー情報
   */
  public async getSlideCount(inputPath: string): Promise<{ count: number; error?: string }> {
    try {
      // パフォーマンス計測開始
      const startTime = performance.now();
      
      // Pythonスクリプトを実行してスライド数を取得
      const options = {
        mode: 'json',
        pythonPath: this.pythonPath,
        pythonOptions: ['-u'],
        scriptPath: path.dirname(this.scriptPath),
        args: [
          '--input', inputPath,
          '--count-only'
        ]
      };

      return new Promise<{ count: number; error?: string }>((resolve) => {
        try {
          // @ts-ignore - PythonShellの型定義の問題を回避
          PythonShell.run(path.basename(this.scriptPath), options, function(err, results) {
            if (err) {
              console.error('スライド数取得に失敗しました:', err);
              resolve({ count: 0, error: err.message });
              return;
            }
            
            if (!results || results.length === 0) {
              resolve({ count: 0, error: 'Pythonスクリプトから結果が返されませんでした' });
              return;
            }
            
            const result = results[results.length - 1];
            resolve({ count: result.slideCount || 0 });

            // パフォーマンス計測終了
            const endTime = performance.now();
            console.log(`スライド数取得時間: ${endTime - startTime}ms`);
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('スライド数取得の初期化に失敗しました:', errorMessage);
          resolve({ count: 0, error: errorMessage });
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { count: 0, error: errorMessage };
    }
  }

  /**
   * メタデータを取得する
   * @param inputPath 入力ファイルパス
   * @returns メタデータ
   */
  public async getMetadata(inputPath: string): Promise<Metadata> {
    try {
      // PythonShellオプションの設定
      const options: any = {
        mode: 'json',
        pythonPath: this.pythonPath,
        pythonOptions: ['-u'],
        scriptPath: path.dirname(this.scriptPath),
        args: [
          '--input', inputPath,
          '--metadata-only'
        ]
      };

      return new Promise<Metadata>((resolve) => {
        try {
          // @ts-ignore - PythonShellの型定義の問題を回避
          PythonShell.run(path.basename(this.scriptPath), options, function(err, results) {
            if (err) {
              console.error('メタデータ取得に失敗しました:', err);
              resolve({
                title: path.basename(inputPath),
                author: 'Unknown',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                lastModifiedBy: 'System',
                revision: 1,
                presentationFormat: 'Unknown'
              });
              return;
            }
            
            if (!results || results.length === 0) {
              resolve({
                title: path.basename(inputPath),
                author: 'Unknown',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                lastModifiedBy: 'System',
                revision: 1,
                presentationFormat: 'Unknown'
              });
              return;
            }
            
            const result = results[results.length - 1];
            resolve(result.metadata || {
              title: path.basename(inputPath),
              author: 'Unknown',
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              lastModifiedBy: 'System',
              revision: 1,
              presentationFormat: 'Unknown'
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('メタデータ取得の初期化に失敗しました:', errorMessage);
          resolve({
            title: path.basename(inputPath),
            author: 'Unknown',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            lastModifiedBy: 'System',
            revision: 1,
            presentationFormat: 'Unknown'
          });
        }
      });
    } catch (error) {
      return {
        title: path.basename(inputPath),
        author: 'Unknown',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        lastModifiedBy: 'System',
        revision: 1,
        presentationFormat: 'Unknown'
      };
    }
  }

  /**
   * 解析結果から位置情報付きテキストを取得
   * @param parseResult 解析結果
   * @returns スライド内容の配列
   */
  public getTextWithPositions(parseResult: PPTXParseResult): SlideContent[] {
    if (!parseResult || !parseResult.slides || !Array.isArray(parseResult.slides)) {
      console.warn('無効な解析結果から位置情報付きテキストを取得しようとしました');
      return [];
    }
    
    // 各スライドのテキスト要素を正規化
    return parseResult.slides.map(slide => {
      // テキスト要素が存在しない場合は空配列を使用
      const textElements = slide.textElements || [];
      
      // テキスト要素の正規化
      const normalizedTextElements = textElements.map(element => {
        // ディープコピーを作成して元のオブジェクトを変更しない
        const normalizedElement = { ...element };
        
        if (normalizedElement.text) {
          // 空白や特殊文字を正規化
          normalizedElement.text = normalizedElement.text.trim()
            .replace(/\s+/g, ' ')  // 複数の空白を単一の空白に
            .replace(/[\u200B-\u200D\uFEFF]/g, ''); // ゼロ幅スペースや特殊文字を除去
        }
        
        return normalizedElement;
      }).filter(element => element.text && element.text.length > 0); // 空のテキスト要素を除外
      
      // 新しいスライドオブジェクトを作成して返す
      return {
        ...slide,
        textElements: normalizedTextElements
      };
    });
  }

}
