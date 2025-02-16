import { PythonShell, PythonShellError } from 'python-shell';
import path from 'path';
import fs from 'fs/promises';
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
      const results = await new Promise<PPTXParseResult>((resolve, reject) => {
        const pyshell = new PythonShell(path.basename(this.pythonScriptPath), options);
        
        let result: any = null;
        
        pyshell.on('message', (message) => {
          result = message;
        });

        pyshell.on('error', (err) => {
          reject(err);
        });

        pyshell.end((err) => {
          if (err) {
            reject(err);
            return;
          }
          if (!result) {
            reject(new Error('No results from Python script'));
            return;
          }
          resolve(result as PPTXParseResult);
        });
      });

      if (!results || !results.slides) {
        throw new Error('Invalid parse result');
      }

      return results;
    } catch (error) {
      console.error('Error parsing PPTX:', error);
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
