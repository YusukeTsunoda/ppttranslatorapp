/**
 * ストリーミング処理に対応したPPTXパーサー
 * メモリ効率と処理速度を向上させるために、ファイル全体をメモリに読み込まずに
 * ストリーミング処理を行う実装です。
 */
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // エラーIDの生成に使用
import { promisify } from 'util';
import { exec } from 'child_process';
import * as os from 'os';
import { PythonShell } from 'python-shell';
// cryptoモジュールは不要なので削除
import { PPTXParseResult, ParseOptions as BaseParseOptions, SlideContent, Metadata } from './types';

// ParseOptionsを拡張してキャッシュ関連のオプションを追加
interface ParseOptions extends BaseParseOptions {
  skipCache?: boolean;
}
import { PPTXCacheHelper, createPPTXCacheHelper, PPTXCacheOptions } from './cache-helper';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

// キャッシュエントリの型
interface CacheEntry {
  result: PPTXParseResult;
  timestamp: number;
  fileHash: string;
}

// 構造化されたエラー情報の型
interface StructuredError {
  id: string;           // エラーID（UUID）
  timestamp: number;    // エラー発生時刻
  method: string;       // エラーが発生したメソッド
  message: string;      // エラーメッセージ
  stack?: string | undefined;       // スタックトレース（あれば）
  context?: string | null | undefined; // コンテキスト情報（ファイルパスなど）
  systemInfo: {         // システム情報
    nodeVersion: string;  // Node.jsバージョン
    memoryUsage: number;  // メモリ使用量（MB）
    platform: string;     // プラットフォーム
    arch: string;         // アーキテクチャ
  };
  recovered: boolean;   // 回復処理が行われたか
  severity: 'low' | 'medium' | 'high' | 'critical'; // エラーの重大度
}

// エラー分析結果の型
interface ErrorAnalysis {
  totalErrors: number;                 // 全エラー数
  recoveredErrors: number;             // 回復処理されたエラー数
  errorsBySeverity: Record<string, number>; // 重大度別エラー数
  errorsByMethod: Record<string, number>;   // メソッド別エラー数
  mostFrequentErrors: Array<{            // 最も频度の高いエラー
    message: string;                      // エラーメッセージ
    count: number;                        // 発生回数
  }>;
  lastError?: StructuredError | undefined; // 最後に発生したエラー
}

/**
 * ストリーミング処理に対応したPPTXパーサークラス
 */
export class StreamingPPTXParser {
  // クラスプロパティを確定的に初期化し、型エラーを回避する
  private pythonPath: string = 'python3'; // デフォルト値を直接設定
  private scriptPath: string = path.join(__dirname, '..', '..', 'python', 'pptx_parser.py');
  private outputDir: string = path.join(os.tmpdir(), 'pptx-parser-output');
  private cacheExpirationTime: number = 1000 * 60 * 60; // 1時間
  private batchSize: number = 10; // 一度に処理するスライド数
  private cacheHelper: PPTXCacheHelper;
  private parserCache: Map<string, CacheEntry> = new Map();
  
  // エラー情報の収集と分析のためのプロパティ
  private errorLog: StructuredError[] = [];
  private maxErrorLogSize: number = 100; // エラーログの最大保持数
  private errorCount: Record<string, number> = {}; // エラーメッセージ別の発生回数
  
  private static instance: StreamingPPTXParser;

  /**
   * コンストラクタ
   * @param options オプション
   */
  constructor(options: {
    pythonPath?: string;
    scriptPath?: string;
    outputDir?: string;
    maxParallelProcesses?: number;
    cacheExpirationTime?: number;
    batchSize?: number;
    cacheOptions?: PPTXCacheOptions;
  } = {}) {
    // クラスプロパティはすでにデフォルト値で初期化されているので、
    // オプションが指定された場合のみ上書きする
    if (options.pythonPath) {
      this.pythonPath = options.pythonPath;
    }
    
    if (options.scriptPath) {
      this.scriptPath = options.scriptPath;
    }
    
    if (options.outputDir) {
      this.outputDir = options.outputDir;
    }
    
    if (options.cacheExpirationTime !== undefined) {
      this.cacheExpirationTime = options.cacheExpirationTime;
    }
    
    if (options.batchSize !== undefined) {
      this.batchSize = options.batchSize;
    }
    
    // 出力ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    // キャッシュヘルパーを初期化
    const cacheDir = path.join(this.outputDir, 'cache');
    const defaultCacheOptions: PPTXCacheOptions = {
      cacheDir,
      ttl: this.cacheExpirationTime,
      maxMemoryEntries: 20,
      maxDiskEntries: 100,
      useDiskCache: true,
      prefix: 'pptx_cache',
      cleanupInterval: 30 * 60 * 1000 // 30分
    };
    
    this.cacheHelper = createPPTXCacheHelper({
      ...defaultCacheOptions,
      ...options.cacheOptions
    });
  }
  
  /**
   * シングルトンインスタンスを取得
   * @returns StreamingPPTXParserのインスタンス
   */
  public static getInstance(options?: {
    pythonPath?: string;
    scriptPath?: string;
    outputDir?: string;
    cacheExpirationTime?: number;
    batchSize?: number;
    cacheOptions?: PPTXCacheOptions;
  }): StreamingPPTXParser {
    if (!StreamingPPTXParser.instance) {
      StreamingPPTXParser.instance = new StreamingPPTXParser(options || {});
    }
    return StreamingPPTXParser.instance;
  }



  /**
   * Python依存関係のチェック
   * @throws {Error} Python依存関係のチェックに失敗した場合
   */
  private async checkDependencies(): Promise<void> {
    // 型安全性を確保するために、クラスプロパティの値をローカル変数に保存
    // クラスプロパティはデフォルト値で初期化されているので、型エラーは発生しない
    const pythonPath = this.pythonPath;
    
    try {
      // Pythonのバージョンチェック
      try {
        const { stdout } = await execAsync(`${pythonPath} --version`);
        const versionMatch = stdout.match(/Python (\d+)\.(\d+)\.(\d+)/);
        
        if (versionMatch && versionMatch[1] && versionMatch[2] && versionMatch[3]) {
          const major = parseInt(versionMatch[1], 10);
          const minor = parseInt(versionMatch[2], 10);
          
          if (major < 3 || (major === 3 && minor < 7)) {
            throw new Error(`Python 3.7以上が必要です。検出されたバージョン: ${stdout.trim()}`);
          }
          
          console.log(`Using Python ${major}.${minor}.${versionMatch[3]}`);
        } else {
          console.warn(`Pythonバージョンの解析に失敗しました: ${stdout.trim()}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Pythonの実行に失敗しました: ${error.message}。Pythonがインストールされていることを確認してください。`);
        }
        throw error;
      }
      
      // 必要なPythonパッケージのチェック
      const requiredPackages = ['python-pptx', 'Pillow', 'numpy'];
      const missingPackages: string[] = [];
      const packageErrors: Record<string, string> = {};
      
      for (const pkg of requiredPackages) {
        try {
          // ハイフンをアンダースコアに変換（Pythonモジュール名の規則に合わせる）
          const pkgName = pkg.replace('-', '_');
          const importCmd = `import ${pkgName}`;
          const cmd = `${pythonPath} -c "${importCmd}"`;
          // ここではpythonPathは必ずstring型であることが保証されている
          await execAsync(cmd);
          console.log(`Package ${pkg} is installed.`);
        } catch (error) {
          console.warn(`Required Python package not found: ${pkg}`);
          missingPackages.push(pkg);
          packageErrors[pkg] = error instanceof Error ? error.message : String(error);
        }
      }
      
      if (missingPackages.length > 0) {
        const missingPackagesStr = missingPackages.join(', ');
        console.warn(`Missing Python packages: ${missingPackagesStr}`);
        
        // 詳細なエラー情報をログに出力
        for (const pkg of missingPackages) {
          console.warn(`Error details for ${pkg}: ${packageErrors[pkg]}`);
        }
        
        // インストール手順の表示
        const installInstructions = [
          '以下の手順でPython依存パッケージをインストールしてください:',
          '1. 仮想環境の作成と有効化:',
          '   python3 -m venv venv',
          '   source venv/bin/activate  # Linuxの場合',
          '   .\\venv\\Scripts\\activate  # Windowsの場合',
          `2. 必要なパッケージのインストール:`,
          `   pip install ${missingPackagesStr}`,
          '3. インストール後、アプリケーションを再起動してください。'
        ].join('\n');
        
        console.warn(installInstructions);
        
        // テストモードの場合はエラーをスキップ
        if (process.env['NODE_ENV'] === 'test') {
          console.warn('Running in test mode, skipping dependency check.');
          return;
        }
        
        throw new Error(`Python依存パッケージが不足しています: ${missingPackagesStr}\n${installInstructions}`);
      }
    } catch (error) {
      if (process.env['NODE_ENV'] === 'test') {
        console.warn('Running in test mode, skipping dependency check error:', error);
        return;
      }
      
      console.error('Failed to check Python dependencies:', error);
      
      if (error instanceof Error) {
        throw error; // すでに詳細なエラーメッセージが含まれている場合はそのまま再スロー
      } else {
        throw new Error('Python依存関係のチェックに失敗しました。Python 3.7以上と必要なパッケージがインストールされていることを確認してください。');
      }
    }
  }

  /**
   * ファイルのハッシュを計算
   * @param filePath ファイルパス
   * @returns ハッシュ文字列
   * @throws {Error} ファイルが存在しないか、アクセスできない場合
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      throw new Error(`ファイルが存在しません: ${filePath}`);
    }
    
    try {
      return this.cacheHelper.calculateFileHash(filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`ファイルハッシュの計算に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * キャッシュが有効かどうかを確認
   * @param cache キャッシュエントリ
   * @param fileHash ファイルハッシュ
   * @returns 有効な場合はtrue
   */
  private isCacheValid(cache: CacheEntry | null | undefined, fileHash: string): boolean {
    if (!cache) {
      return false;
    }
    
    const now = Date.now();
    const isExpired = now - cache.timestamp > this.cacheExpirationTime;
    const isHashMatch = cache.fileHash === fileHash;
    
    // キャッシュが期限切れでなく、ハッシュが一致する場合は有効
    return !isExpired && isHashMatch;
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
    
    // システム情報を取得
    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100; // MB単位
    
    // エラー情報を構造化
    const structuredError: StructuredError = {
      id: uuidv4(), // 一意のエラーIDを生成
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

// 重複しているisCacheValidメソッドを削除

/**
 * 結果をキャッシュに保存する
 * @param inputPath 入力ファイルパス
 * @param options パースオプション
 * @returns 解析結果
 */
private async parseAndCacheResult(inputPath: string, options: ParseOptions): Promise<PPTXParseResult> {
  // ファイルハッシュを計算
  const fileHash = await this.calculateFileHash(inputPath);
  
  // 一時出力ディレクトリを作成
  const outputDir = path.join(this.outputDir, path.basename(inputPath, '.pptx'));
  await fsPromises.mkdir(outputDir, { recursive: true });
  
  // バッチサイズを設定（大きなファイルの場合はメモリ使用量を制限）
  const fileSize = (await fsPromises.stat(inputPath)).size;
  const adjustedBatchSize = fileSize > 10 * 1024 * 1024 ? Math.min(this.batchSize, 5) : this.batchSize;
  console.log(`ファイルサイズ: ${fileSize} バイト, バッチサイズ: ${adjustedBatchSize}`);
  
  // Pythonスクリプトを実行して解析
  const result = await this.executePythonScript(inputPath, outputDir);
  
  // 結果をキャッシュに保存
  if (!options.skipCache) {
    const cacheKey = inputPath;
    this.parserCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      fileHash
    });
  }
  
  return result;
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
      lastError: this.errorLog.length > 0 ? this.errorLog[0] : undefined as StructuredError | undefined
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
      // ファイル情報を取得
      const stats = await fsPromises.stat(inputPath);
      const fileInfo = path.parse(inputPath);
      
      // 最小限のメタデータを作成
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
   * Pythonスクリプトを実行する
   * @param inputPath 入力ファイルパス
   * @param outputDir 出力ディレクトリ
   * @returns Pythonスクリプトの実行結果
   */
  private async executePythonScript(inputPath: string, outputDir: string): Promise<PPTXParseResult> {
    try {
      // PythonShellオプションの設定
      const options: any = {
        mode: 'json',
        pythonPath: this.pythonPath,
        pythonOptions: ['-u'], // 出力をバッファリングしない
        scriptPath: path.dirname(this.scriptPath),
        args: [
          '--input', inputPath,
          '--output', outputDir,
        ]
      };

      // スクリプトの実行
      return new Promise<PPTXParseResult>((resolve, reject) => {
        try {
          // PythonShellの型エラーを回避するために引数を調整
          // @ts-ignore - PythonShellの型定義の問題を回避
          PythonShell.run(path.basename(this.scriptPath), options, function(err, results) {
            if (err) {
              console.error('Pythonスクリプトの実行に失敗しました:', err);
              reject(err);
              return;
            }
            
            if (!results || results.length === 0) {
              reject(new Error('Pythonスクリプトから結果が返されませんでした'));
              return;
            }
            
            // 最後の結果を取得（JSONオブジェクト）
            const result = results[results.length - 1];
            
            // 結果を適切な形式に変換
            const parseResult: PPTXParseResult = {
              slides: result.slides || [],
              filename: path.basename(inputPath),
              totalSlides: result.slides ? result.slides.length : 0,
              metadata: {
                title: result.metadata?.title || path.basename(inputPath),
                author: result.metadata?.author || 'Unknown',
                created: result.metadata?.created || new Date().toISOString(),
                modified: result.metadata?.modified || new Date().toISOString(),
                lastModifiedBy: result.metadata?.lastModifiedBy || 'System',
                revision: result.metadata?.revision || 1,
                presentationFormat: result.metadata?.presentationFormat || 'Unknown'
              }
            };
            
            resolve(parseResult);
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Error initializing Python shell:', errorMessage);
          reject(new Error(`Pythonシェルの初期化に失敗しました: ${errorMessage}`));
        }
      });
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
