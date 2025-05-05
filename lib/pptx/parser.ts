import * as fs from 'fs';
import { PythonShell } from 'python-shell';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PPTXParseResult, ParseAPIResponse, SlideContent, TextElement, Position } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PPTXParser {
  private static instance: PPTXParser;
  private pythonScriptPath: string;
  private pythonPath: string;

  private constructor() {
    this.pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_parser.py');
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
  }

  public static getInstance(): PPTXParser {
    if (!PPTXParser.instance) {
      PPTXParser.instance = new PPTXParser();
    }
    return PPTXParser.instance;
  }

  private async ensurePythonScript(): Promise<void> {
    if (!fs.existsSync(this.pythonScriptPath)) {
      throw new Error('Python script not found');
    }

    try {
      await execAsync('python3 --version');
    } catch (error) {
      throw new Error('Python execution error');
    }
  }

  private async checkDependencies(): Promise<void> {
    const checkScriptPath = path.join(process.cwd(), 'tmp', 'check_deps.py');
    const checkScriptContent = `
import sys
try:
    import pptx
    print("pptx OK")
except ImportError:
    print("pptx NOT FOUND")
    sys.exit(1)

try:
    import pdf2image
    print("pdf2image OK")
except ImportError:
    print("pdf2image NOT FOUND")
    sys.exit(1)

try:
    import PIL
    print("PIL OK")
except ImportError:
    print("PIL NOT FOUND")
    sys.exit(1)

print("All dependencies are installed")
`;

    try {
      if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
      }

      fs.writeFileSync(checkScriptPath, checkScriptContent, 'utf8');

      const result = await new Promise<boolean>((resolve, reject) => {
        const pyshell = new PythonShell(checkScriptPath, {
          mode: 'text',
          pythonPath: this.pythonPath,
        });

        let hasError = false;

        pyshell.on('message', (message) => {
          if (message.includes('NOT FOUND')) {
            hasError = true;
          }
        });

        pyshell.on('stderr', (stderr) => {
          hasError = true;
        });

        pyshell.end((err) => {
          try {
            if (fs.existsSync(checkScriptPath)) {
              fs.unlinkSync(checkScriptPath);
            }
          } catch (e) {
            // 一時ファイル削除エラーは無視
          }

          if (err) {
            reject(new Error('Python execution error'));
          } else if (hasError) {
            reject(new Error('Python dependencies missing'));
          } else {
            resolve(true);
          }
        });
      });

      return;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Python execution error');
    }
  }

  public async parsePPTX(inputPath: string, outputDir: string): Promise<PPTXParseResult> {
    try {
      await this.ensurePythonScript();
      await this.checkDependencies();
      const result = await this.executePythonScript(inputPath, outputDir);
      return this.validateAndProcessResult(result, inputPath);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during PPTX parsing');
    }
  }

  private async executePythonScript(inputPath: string, outputDir: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // 出力ディレクトリが存在しない場合は作成
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const options = {
          mode: 'text' as const,
          pythonPath: this.pythonPath,
          args: [
            inputPath,
            outputDir
          ],
        };

        let result: any = null;
        let errorOutput = '';
        let stdoutOutput = '';
        let hasError = false;

        const pyshell = new PythonShell(this.pythonScriptPath, options);

        pyshell.on('message', (message) => {
          stdoutOutput += message + '\n';
          
          try {
            // JSONデータを検出して解析
            if (message.trim().startsWith('{') && message.trim().endsWith('}')) {
              result = JSON.parse(message);
            }
          } catch (e) {
            errorOutput += `JSON解析エラー: ${e}\n`;
          }
        });

        pyshell.on('stderr', (stderr) => {
          errorOutput += stderr + '\n';
          
          // 重要なエラーメッセージを検出
          if (
            stderr.includes('Error') || 
            stderr.includes('Exception') || 
            stderr.includes('Traceback') ||
            stderr.includes('failed') ||
            stderr.includes('not found')
          ) {
            hasError = true;
          }
        });

        pyshell.end((err) => {
          if (err) {
            reject(new Error(`Python実行エラー: ${err.message}\n${errorOutput}`));
          } else if (hasError) {
            reject(new Error(`Pythonスクリプトエラー: ${errorOutput}`));
          } else if (!result) {
            reject(new Error(`Pythonスクリプトから有効な結果が得られませんでした。`));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private validateAndProcessResult(results: any, inputPath: string): PPTXParseResult {
    if (!results || typeof results !== 'object') {
      throw new Error('無効な結果形式: オブジェクトが必要です');
    }

    if (!Array.isArray(results.slides)) {
      throw new Error('無効な結果形式: slides プロパティは配列である必要があります');
    }

    const slides = results.slides.map((slide: any, index: number) => {
      if (!slide || typeof slide !== 'object') {
        throw new Error(`スライド ${index} のデータが無効です`);
      }

      if (!Array.isArray(slide.texts)) {
        throw new Error(`スライド ${index} のテキストデータが無効です`);
      }

      const textElements: TextElement[] = Array.isArray(slide.texts) 
        ? slide.texts.map((text: any, i: number) => {
            let textContent = '';
            let position: Position = { x: 0, y: 0, width: 0, height: 0 };
            
            if (typeof text === 'string') {
              textContent = text;
            } else if (text && typeof text === 'object') {
              textContent = text.text || text.content || '';
              position = text.position || position;
            }
            
            return {
              id: uuidv4(),
              text: textContent,
              position: {
                x: position.x || 0,
                y: position.y || 0,
                width: position.width || 0,
                height: position.height || 0,
              },
            };
          })
        : [];

      return {
        index,
        imagePath: slide.image_path || `slide_${index + 1}.png`,
        textElements,
      };
    });

    const parseResult: PPTXParseResult = {
      slides,
      metadata: {
        totalSlides: slides.length,
        title: path.basename(inputPath, '.pptx'),
        lastModified: new Date().toISOString(),
      },
    };

    return parseResult;
  }

  public extractTexts(parseResult: PPTXParseResult): string[] {
    return parseResult.slides.flatMap((slide) => slide.textElements.map((element) => element.text));
  }

  public getTextWithPositions(parseResult: PPTXParseResult): SlideContent[] {
    return parseResult.slides;
  }
}
