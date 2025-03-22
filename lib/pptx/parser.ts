import * as fs from 'fs';
import { PythonShell, PythonShellError } from 'python-shell';
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
    // スクリプトのパスを設定
    this.pythonScriptPath = path.join(process.cwd(), 'lib', 'python', 'pptx_parser.py');
    // Python実行環境の設定
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
  }

  public static getInstance(): PPTXParser {
    if (!PPTXParser.instance) {
      PPTXParser.instance = new PPTXParser();
    }
    return PPTXParser.instance;
  }

  private async ensurePythonScript(): Promise<void> {
    // Pythonスクリプトの存在を確認
    if (!fs.existsSync(this.pythonScriptPath)) {
      console.error('Python script not found');
      throw new Error('Python script not found');
    }

    // Python実行環境の確認
    try {
      const { stdout } = await execAsync('python3 --version');
      console.log('Python version:', stdout.trim());
    } catch (error) {
      console.error('Python environment check failed:', error);
      throw new Error('Python execution error');
    }
  }

  private async checkDependencies(): Promise<void> {
    const requiredModules = ['pptx', 'pdf2image', 'PIL'];
    const checkScript = `
import sys
missing = []
for module in ${JSON.stringify(requiredModules)}:
    try:
        __import__(module)
    except ImportError:
        missing.append(module)
if missing:
    print(f"Missing modules: {', '.join(missing)}")
    sys.exit(1)
print("All dependencies are installed")
    `;

    try {
      await new Promise<void>((resolve, reject) => {
        const pyshell = new PythonShell('', {
          mode: 'text',
          pythonPath: this.pythonPath,
          pythonOptions: ['-c', checkScript],
        });

        pyshell.on('message', console.log);
        pyshell.on('stderr', (err) => {
          reject(new Error(err));
        });
        pyshell.end((err) => {
          if (err) reject(new Error('Python execution error'));
          else resolve();
        });
      });
    } catch (error) {
      console.error('Dependency check failed:', error);
      throw error instanceof Error ? error : new Error('Python execution error');
    }
  }

  public async parsePPTX(inputPath: string, outputDir: string): Promise<PPTXParseResult> {
    try {
      // Pythonスクリプトと実行環境の確認
      await this.ensurePythonScript();

      // 必要なPythonパッケージの確認
      await this.checkDependencies();

      // PPTXファイルの解析
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
    const options = {
      mode: 'json' as const,
      pythonPath: this.pythonPath,
      pythonOptions: ['-u'],
      scriptPath: path.dirname(this.pythonScriptPath),
      args: [inputPath, outputDir],
    };

    return new Promise<any>((resolve, reject) => {
      const pyshell = new PythonShell(path.basename(this.pythonScriptPath), options);
      let result: any = null;
      let hasError = false;

      pyshell.on('message', (message) => {
        try {
          if (typeof message === 'string') {
            const parsed = JSON.parse(message);
            if (parsed && parsed.slides) {
              result = parsed;
            }
          } else if (message && message.slides) {
            result = message;
          }
        } catch (e) {
          console.error('Failed to parse Python output:', e);
        }
      });

      pyshell.on('stderr', (stderr) => {
        if (
          stderr.includes('Error') ||
          stderr.includes('Exception') ||
          stderr.includes('Traceback')
        ) {
          hasError = true;
          console.error('Python script error:', stderr);
        }
      });

      pyshell.end((err) => {
        if (err) {
          console.error('Python script execution error:', err);
          reject(new Error('Python execution error'));
        } else if (hasError) {
          reject(new Error('Python script error'));
        } else if (!result) {
          reject(new Error('No valid result from Python script'));
        } else {
          resolve(result);
        }
      });
    });
  }

  private validateAndProcessResult(results: any, inputPath: string): PPTXParseResult {
    // スライドデータの検証を強化
    if (!results || typeof results !== 'object') {
      throw new Error('Invalid result format: Expected an object');
    }

    if (!Array.isArray(results.slides)) {
      throw new Error('Invalid result format: slides property must be an array');
    }

    const slides = results.slides.map((slide: any, index: number) => {
      if (!slide || typeof slide !== 'object') {
        throw new Error(`Invalid slide data at index ${index}`);
      }

      if (!Array.isArray(slide.texts)) {
        throw new Error(`Invalid texts data for slide ${index}`);
      }

      if (!Array.isArray(slide.positions)) {
        throw new Error(`Invalid positions data for slide ${index}`);
      }

      if (slide.texts.length !== slide.positions.length) {
        throw new Error(`Mismatch between texts and positions count in slide ${index}`);
      }

      const textElements: TextElement[] = slide.texts.map((text: string, i: number) => {
        if (typeof text !== 'string') {
          throw new Error(`Invalid text data at index ${i} in slide ${index}`);
        }

        const position: Position = slide.positions[i];
        if (!position || typeof position !== 'object') {
          throw new Error(`Invalid position data at index ${i} in slide ${index}`);
        }

        return {
          id: uuidv4(),
          text,
          position: {
            x: position.x || 0,
            y: position.y || 0,
            width: position.width || 0,
            height: position.height || 0
          }
        };
      });

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
