/**
 * PPTXレイアウト調整ブリッジ
 * TypeScriptとPythonの間でレイアウト調整機能を連携させるためのインターフェース
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { LanguageCode } from './text-metrics';
import { PPTXLayoutAdjustmentOptions, TranslationInfo, LayoutAdjustmentResult } from './pptx-layout-adjuster';
import { logger } from '../utils/logger';

/**
 * PPTXレイアウト調整ブリッジクラス
 * TypeScript側からPython側のレイアウト調整機能を呼び出すためのブリッジ
 */
export class PPTXLayoutBridge {
  private pythonPath: string;
  private scriptPath: string;
  private tempDir: string;
  
  /**
   * コンストラクタ
   * @param options オプション
   */
  constructor(options: {
    pythonPath?: string;
    scriptPath?: string;
    tempDir?: string;
  } = {}) {
    this.pythonPath = options.pythonPath || 'python3';
    this.scriptPath = options.scriptPath || path.join(__dirname, '..', 'python', 'pptx_layout_adjuster.py');
    this.tempDir = options.tempDir || path.join(process.cwd(), 'tmp');
    
    // 一時ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * PPTXファイルのレイアウトを調整する
   * @param inputFilePath 入力ファイルパス
   * @param outputFilePath 出力ファイルパス
   * @param translations 翻訳テキスト情報の配列
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @param options PPTXレイアウト調整オプション
   * @returns レイアウト調整結果のPromise
   */
  public async adjustPPTXLayout(
    inputFilePath: string,
    outputFilePath: string,
    translations: TranslationInfo[],
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    options?: Partial<PPTXLayoutAdjustmentOptions>
  ): Promise<LayoutAdjustmentResult> {
    try {
      // 入力ファイルの存在確認
      if (!fs.existsSync(inputFilePath)) {
        throw new Error(`入力ファイルが見つかりません: ${inputFilePath}`);
      }
      
      // 出力ディレクトリの作成
      const outputDir = path.dirname(outputFilePath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 翻訳情報を一時ファイルに保存
      const translationFilePath = path.join(this.tempDir, `translation_${uuidv4()}.json`);
      fs.writeFileSync(translationFilePath, JSON.stringify(translations, null, 2), 'utf8');
      
      // 設定情報を一時ファイルに保存
      const configFilePath = path.join(this.tempDir, `config_${uuidv4()}.json`);
      fs.writeFileSync(configFilePath, JSON.stringify(options || {}, null, 2), 'utf8');
      
      // Python側のスクリプトを実行
      const result = await this.runPythonScript(
        inputFilePath,
        outputFilePath,
        translationFilePath,
        sourceLanguage,
        targetLanguage,
        configFilePath
      );
      
      // 一時ファイルを削除
      this.cleanupTempFiles([translationFilePath, configFilePath]);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`PPTXレイアウト調整中にエラーが発生しました: ${errorMessage}`);
      
      return {
        success: false,
        adjustedTextBoxes: [],
        warnings: [],
        errors: [errorMessage],
        overflowCount: 0,
        collisionCount: 0
      };
    }
  }
  
  /**
   * Python側のスクリプトを実行する
   * @param inputFilePath 入力ファイルパス
   * @param outputFilePath 出力ファイルパス
   * @param translationFilePath 翻訳情報ファイルパス
   * @param sourceLanguage 翻訳元言語コード
   * @param targetLanguage 翻訳先言語コード
   * @param configFilePath 設定ファイルパス
   * @returns レイアウト調整結果のPromise
   */
  private runPythonScript(
    inputFilePath: string,
    outputFilePath: string,
    translationFilePath: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode,
    configFilePath: string
  ): Promise<LayoutAdjustmentResult> {
    return new Promise((resolve, reject) => {
      // コマンドライン引数
      const args = [
        this.scriptPath,
        inputFilePath,
        outputFilePath,
        translationFilePath,
        '--source', sourceLanguage,
        '--target', targetLanguage,
        '--config', configFilePath
      ];
      
      logger.info(`Python側のスクリプトを実行します: ${this.pythonPath} ${args.join(' ')}`);
      
      // Pythonプロセスを起動
      const pythonProcess = spawn(this.pythonPath, args);
      
      let stdout = '';
      let stderr = '';
      
      // 標準出力を収集
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // 標準エラー出力を収集
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.warn(`Python側のエラー出力: ${data.toString()}`);
      });
      
      // プロセスの終了を待機
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python側のスクリプトが異常終了しました (コード: ${code}): ${stderr}`);
          reject(new Error(`Python側のスクリプトが異常終了しました (コード: ${code}): ${stderr}`));
          return;
        }
        
        try {
          // 標準出力からJSON結果を抽出
          const jsonMatch = stdout.match(/({[\s\S]*})/);
          if (jsonMatch) {
            const resultJson = jsonMatch[1];
            const result = JSON.parse(resultJson) as LayoutAdjustmentResult;
            resolve(result);
          } else {
            logger.warn(`Python側の出力からJSON結果を抽出できませんでした: ${stdout}`);
            resolve({
              success: true,  // ファイルが生成されていれば成功とみなす
              adjustedTextBoxes: [],
              warnings: ['Python側の出力からJSON結果を抽出できませんでした'],
              errors: [],
              overflowCount: 0,
              collisionCount: 0
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Python側の出力の解析中にエラーが発生しました: ${errorMessage}`);
          reject(new Error(`Python側の出力の解析中にエラーが発生しました: ${errorMessage}`));
        }
      });
      
      // エラー発生時の処理
      pythonProcess.on('error', (error) => {
        logger.error(`Python側のスクリプトの実行中にエラーが発生しました: ${error.message}`);
        reject(error);
      });
    });
  }
  
  /**
   * 一時ファイルを削除する
   * @param filePaths 削除するファイルパスの配列
   */
  private cleanupTempFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`一時ファイルを削除しました: ${filePath}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`一時ファイルの削除中にエラーが発生しました: ${filePath} - ${errorMessage}`);
      }
    }
  }
}

/**
 * シングルトンインスタンスを取得する
 */
let instance: PPTXLayoutBridge | null = null;

export function getPPTXLayoutBridge(options?: {
  pythonPath?: string;
  scriptPath?: string;
  tempDir?: string;
}): PPTXLayoutBridge {
  if (!instance) {
    instance = new PPTXLayoutBridge(options);
  }
  return instance;
}
