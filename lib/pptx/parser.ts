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
      console.error('Python script not found');
      throw new Error('Python script not found');
    }

    try {
      const { stdout } = await execAsync('python3 --version');
      console.log('Python version:', stdout.trim());
    } catch (error) {
      console.error('Python environment check failed:', error);
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
          console.log(message);
        });

        pyshell.on('stderr', (stderr) => {
          console.error('Python stderr:', stderr);
          hasError = true;
        });

        pyshell.end((err) => {
          try {
            if (fs.existsSync(checkScriptPath)) {
              fs.unlinkSync(checkScriptPath);
            }
          } catch (e) {
            console.error('Failed to delete temp script:', e);
          }

          if (err) {
            console.error('Python script error:', err);
            reject(new Error('Python dependency check failed'));
          } else if (hasError) {
            reject(new Error('Python script reported errors on stderr'));
          } else {
            resolve(true);
          }
        });
      });

      return;
    } catch (error) {
      console.error('Dependency check failed:', error);
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
    console.log('Executing Python script with options:', {
      scriptPath: path.dirname(this.pythonScriptPath),
      scriptName: path.basename(this.pythonScriptPath),
      pythonPath: this.pythonPath,
      inputPath,
      outputDir
    });

    // ディレクトリの存在を確認
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 入力ファイルの存在を確認
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const options = {
      mode: 'json' as const,
      pythonPath: this.pythonPath,
      pythonOptions: ['-u'],
      scriptPath: path.dirname(this.pythonScriptPath),
      args: [inputPath, outputDir],
    };

    return new Promise<any>((resolve, reject) => {
      const scriptFullPath = path.join(options.scriptPath, path.basename(this.pythonScriptPath));
      console.log(`Full script path: ${scriptFullPath}`);
      console.log(`Script exists: ${fs.existsSync(scriptFullPath)}`);

      const pyshell = new PythonShell(path.basename(this.pythonScriptPath), options);
      let result: any = null;
      let hasError = false;
      let errorOutput = '';

      pyshell.on('message', (message) => {
        console.log('Python message:', message);
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
        console.error('Python stderr:', stderr);
        errorOutput += stderr + '\n';
        if (stderr.includes('Error') || stderr.includes('Exception') || stderr.includes('Traceback')) {
          hasError = true;
        }
      });

      pyshell.end((err) => {
        if (err) {
          console.error('Python script execution error:', err);
          console.error('Error output:', errorOutput);
          reject(new Error(`Python execution error: ${err.message}\n${errorOutput}`));
        } else if (hasError) {
          console.error('Python script reported errors on stderr:', errorOutput);
          reject(new Error(`Python script error: ${errorOutput}`));
        } else if (!result) {
          console.error('No valid result from Python script');
          reject(new Error('No valid result from Python script'));
        } else {
          console.log('Python script executed successfully');
          resolve(result);
        }
      });
    });
  }

  private validateAndProcessResult(results: any, inputPath: string): PPTXParseResult {
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
            height: position.height || 0,
          },
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
