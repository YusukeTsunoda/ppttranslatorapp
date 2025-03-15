import { PythonShell, PythonShellError } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  PPTXParseResult,
  ParseAPIResponse,
  SlideContent,
  TextElement,
  Position
} from './types';

export class PPTXParser {
  private static instance: PPTXParser;
  private pythonScriptPath: string;

  private constructor() {
    // スクリプトのパスを設定
    this.pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_parser.py');
  }

  public static getInstance(): PPTXParser {
    if (!PPTXParser.instance) {
      PPTXParser.instance = new PPTXParser();
    }
    return PPTXParser.instance;
  }

  private async ensurePythonScript(): Promise<void> {
    try {
      await fs.access(this.pythonScriptPath);
    } catch (error) {
      console.error('Python script not found:', this.pythonScriptPath);
      throw new Error('Python script not found');
    }
  }

  public async parsePPTX(filePath: string, outputDir: string): Promise<PPTXParseResult> {
    await this.ensurePythonScript();

    const options = {
      mode: 'json' as const,
      pythonPath: process.env.VERCEL ? 'python3' : 'python3',
      pythonOptions: ['-u'],
      scriptPath: path.dirname(this.pythonScriptPath),
      args: [filePath, outputDir]
    };

    try {
      const results = await new Promise<any>((resolve, reject) => {
        const pyshell = new PythonShell(path.basename(this.pythonScriptPath), options);
        
        let result: any = null;
        let rawOutput = ''; 
        
        pyshell.on('message', (message) => {
          if (typeof message === 'object') {
            if (message.slides) {
              result = message;
            } else {
              // スライドデータがない場合のエラー（最低限の出力）
              console.error('スライドデータエラー: slidesプロパティが見つかりません');
            }
          } else {
            try {
              // 文字列の場合はJSONパースを試みる
              const parsed = JSON.parse(message);
              if (parsed && parsed.slides) {
                result = parsed;
                return;
              }
            } catch (e: any) {
              // JSON解析エラー時のみ出力
              console.error(`JSON解析エラー: ${e.message}`);
              rawOutput = message;
            }
          }
        });

        pyshell.on('stderr', (stderr) => {
          // 重要なエラー情報のみをフィルタリング
          if (stderr.includes('Error') || stderr.includes('Exception') || stderr.includes('Traceback') || stderr.includes('failed')) {
            console.error(`Python stderr: ${stderr}`);
          }
        });

        pyshell.on('error', (err) => {
          console.error('Python実行エラー:', err);
          reject(err);
        });

        pyshell.end((err) => {
          if (err) {
            console.error('Python実行終了エラー:', err);
            reject(err);
            return;
          }
          
          if (!result) {
            if (rawOutput) {
              console.error('Pythonからの出力をJSONとして解析できません');
              reject(new Error('Pythonスクリプトの出力をJSONとして解析できません'));
            } else {
              reject(new Error('Pythonスクリプトから出力がありません'));
            }
            return;
          }
          
          resolve(result);
        });
      });

      // スライドデータの検証を強化
      if (!results || !results.slides || !Array.isArray(results.slides)) {
        console.error('スライドデータエラー: 不正な形式です');
        throw new Error('スライドデータの形式が不正です');
      }

      if (results.slides.length === 0) {
        console.error('スライドデータエラー: スライドが0件です');
        throw new Error('スライドが検出されませんでした');
      }

      // Pythonスクリプトからの戻り値を適切な形式に変換
      const slides = results.slides;
      
      const parseResult: PPTXParseResult = {
        slides: slides.map((slide: any, index: number) => {
          // テキスト要素を適切な形式に変換
          const texts: TextElement[] = Array.isArray(slide.texts)
            ? slide.texts.map((text: any, textIndex: number) => {
                // テキスト要素の型チェックと変換を改善
                let content = '';
                let position: Position = { x: 0, y: 0, width: 0, height: 0 };
                
                if (typeof text === 'string') {
                  content = text;
                } else if (typeof text === 'object') {
                  // text.textまたはtext.contentを取得
                  content = typeof text.text === 'string' ? text.text : 
                           (typeof text.content === 'string' ? text.content : '');
                  
                  // 位置情報の取得
                  if (text.position && typeof text.position === 'object') {
                    position = {
                      x: typeof text.position.x === 'number' ? text.position.x : 0,
                      y: typeof text.position.y === 'number' ? text.position.y : 0,
                      width: typeof text.position.width === 'number' ? text.position.width : 0,
                      height: typeof text.position.height === 'number' ? text.position.height : 0
                    };
                  }
                }
                
                // スタイル情報の取得
                const style = text && typeof text === 'object' && text.style ? text.style : {};
                
                return {
                  id: `text_${index}_${textIndex}`,
                  content,
                  position,
                  style
                };
              })
            : [];
          
          return {
            id: `slide_${index}`,
            index: slide.index ?? index,
            texts,
            image_path: slide.image_path || `slide_${index + 1}.png`,
            layout: {
              masterLayout: 'default',
              elements: []
            }
          };
        }),
        metadata: {
          totalSlides: slides.length,
          title: path.basename(filePath, '.pptx'),
          lastModified: new Date().toISOString()
        }
      };

      return parseResult;
    } catch (error: any) {
      console.error('PPTX解析エラー:', error.message);
      throw error;
    }
  }

  public extractTexts(parseResult: PPTXParseResult): string[] {
    return parseResult.slides.flatMap(slide => 
      slide.texts.map(text => text.content)
    );
  }

  public getTextWithPositions(parseResult: PPTXParseResult): SlideContent[] {
    return parseResult.slides;
  }
}
