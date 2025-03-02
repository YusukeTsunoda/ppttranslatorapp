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

    console.log(`Parsing PPTX file: ${filePath}`);
    console.log(`Output directory: ${outputDir}`);

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
        
        pyshell.on('message', (message) => {
          console.log('Received message from Python script:', typeof message);
          result = message;
        });

        pyshell.on('stderr', (stderr) => {
          console.log('Python stderr:', stderr);
        });

        pyshell.on('error', (err) => {
          console.error('Python shell error:', err);
          reject(err);
        });

        pyshell.end((err) => {
          if (err) {
            console.error('Python shell end error:', err);
            reject(err);
            return;
          }
          if (!result) {
            reject(new Error('No results from Python script'));
            return;
          }
          resolve(result);
        });
      });

      console.log('Python script results:', JSON.stringify(results).substring(0, 200) + '...');

      // Pythonスクリプトからの戻り値を適切な形式に変換
      const slides = Array.isArray(results) ? results : [];
      
      const parseResult: PPTXParseResult = {
        slides: slides.map((slide: any, index: number) => {
          // テキスト要素を適切な形式に変換
          const texts: TextElement[] = (slide.texts || []).map((text: any, textIndex: number) => {
            const position: Position = text.position || { x: 0, y: 0, width: 0, height: 0 };
            
            return {
              id: `text_${index}_${textIndex}`,
              content: text.text || '',
              position: position,
              style: {}
            };
          });
          
          return {
            id: `slide_${index}`,
            index: slide.index || index,
            texts: texts,
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
