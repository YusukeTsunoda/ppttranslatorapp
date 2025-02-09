import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  PPTXParseResult,
  ParseAPIResponse,
  SlideContent,
} from './types';

export class PPTXParser {
  private static instance: PPTXParser;
  private pythonScriptPath: string;

  private constructor() {
    // スクリプトのパスを設定
    this.pythonScriptPath = path.join(process.cwd(), 'scripts', 'pptx_parser.py');
  }

  public static getInstance(): PPTXParser {
    if (!PPTXParser.instance) {
      PPTXParser.instance = new PPTXParser();
    }
    return PPTXParser.instance;
  }

  /**
   * PPTXファイルを解析する
   * @param fileBuffer アップロードされたファイルのバッファー
   * @returns 解析結果
   */
  public async parsePPTX(fileBuffer: Buffer): Promise<ParseAPIResponse> {
    try {
      // 一時ファイルのパスを生成
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptx-'));
      const tempFilePath = path.join(tempDir, `${uuidv4()}.pptx`);

      // 一時ファイルにバッファーを書き込む
      await fs.writeFile(tempFilePath, fileBuffer);

      // Pythonスクリプトを実行
      const result = await this.runPythonScript(tempFilePath);

      // 一時ファイルとディレクトリを削除
      await fs.unlink(tempFilePath);
      await fs.rmdir(tempDir);

      return result;
    } catch (error) {
      console.error('PPTXファイルの解析中にエラーが発生しました:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      };
    }
  }

  /**
   * Pythonスクリプトを実行する
   * @param filePath 解析するPPTXファイルのパス
   * @returns Pythonスクリプトの実行結果
   */
  private async runPythonScript(filePath: string): Promise<ParseAPIResponse> {
    return new Promise((resolve, reject) => {
      const options = {
        mode: 'json' as const,
        pythonPath: 'python3',
        pythonOptions: ['-u'], // 出力をバッファリングしない
        scriptPath: path.dirname(this.pythonScriptPath),
        args: [filePath],
      };

      PythonShell.run(path.basename(this.pythonScriptPath), options)
        .then(results => {
          if (results && results.length > 0) {
            const result = results[0] as ParseAPIResponse;
            resolve(result);
          } else {
            reject(new Error('Pythonスクリプトから結果が返されませんでした'));
          }
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  /**
   * スライドのテキストを抽出する
   * @param parseResult 解析結果
   * @returns テキストの配列
   */
  public extractTexts(parseResult: PPTXParseResult): string[] {
    return parseResult.slides.flatMap(slide => 
      slide.texts.map(text => text.content)
    );
  }

  /**
   * スライドの位置情報付きテキストを取得する
   * @param parseResult 解析結果
   * @returns スライドごとのテキスト情報
   */
  public getTextWithPositions(parseResult: PPTXParseResult): SlideContent[] {
    return parseResult.slides;
  }
}
