/// <reference path="../../jest.d.ts" />

import { PPTXParser } from '@/lib/pptx/parser';
import fs from 'fs';
import path from 'path';
import { PythonShell } from 'python-shell';
import { SlideContent } from '@/lib/pptx/types';

// モックの設定
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file data')),
}));

jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
  basename: jest.fn().mockImplementation((path, ext) => ext ? 'test' : 'pptx_parser.py')
}));

// PythonShellモック
jest.mock('python-shell', () => {
  return {
    PythonShell: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              slides: [
                {
                  index: 0,
                  image_path: 'slide_1.png',
                  texts: ['テストテキスト1'],
                  positions: [{ x: 100, y: 100, width: 200, height: 50 }]
                }
              ]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(null);
        })
      };
    })
  };
});

describe('PPTXパーサー', () => {
  let parser: PPTXParser;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = PPTXParser.getInstance();
  });

  describe('parsePPTX', () => {
    it('PPTXファイルを正しくパースする', async () => {
      // PythonShellのモックを設定
      (PythonShell as any).mockImplementation(() => {
        return {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'message') {
              callback({
                slides: [
                  {
                    index: 0,
                    image_path: 'slide_1.png',
                    texts: ['テストテキスト1'],
                    positions: [{ x: 100, y: 100, width: 200, height: 50 }]
                  }
                ]
              });
            }
            return { on: jest.fn() };
          }),
          end: jest.fn().mockImplementation((callback) => {
            callback(null);
          })
        };
      });

      const result = await parser.parsePPTX('test.pptx', '/tmp');
      
      expect(result).toBeDefined();
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].texts[0].content).toBe('テストテキスト1');
      expect(result.slides[0].image_path).toBe('slide_1.png');
    });

    it('Pythonスクリプトが見つからない場合はエラーを投げる', async () => {
      // fs.accessがエラーを投げるようにモック
      const mockAccess = jest.fn().mockRejectedValueOnce(new Error('ENOENT'));
      (fs.promises.access as jest.Mock).mockImplementation(mockAccess);
      
      // PythonShellのモックをリセット
      (PythonShell as any).mockReset();
      
      // エラーを投げるように設定
      (PythonShell as any).mockImplementation(() => {
        throw new Error('Python script not found');
      });
      
      await expect(parser.parsePPTX('test.pptx', '/tmp'))
        .rejects
        .toThrow('Python script not found');
    });

    it('Pythonスクリプトの実行エラーを適切に処理する', async () => {
      // PythonShellのモックをエラーを返すように設定
      (PythonShell as any).mockImplementation(() => {
        return {
          on: jest.fn().mockImplementation((event, callback) => {
            if (event === 'error') {
              callback(new Error('Python execution error'));
            }
            return { on: jest.fn() };
          }),
          end: jest.fn().mockImplementation((callback) => {
            callback(new Error('Python execution error'));
          })
        };
      });
      
      await expect(parser.parsePPTX('test.pptx', '/tmp'))
        .rejects
        .toThrow('Python execution error');
    });
  });

  describe('extractTexts', () => {
    it('パース結果からテキストを抽出する', () => {
      const mockParseResult = {
        slides: [
          {
            id: 'slide_0',
            index: 0,
            texts: [
              { id: 'text_0_0', content: 'テキスト1', position: { x: 0, y: 0, width: 0, height: 0 } },
              { id: 'text_0_1', content: 'テキスト2', position: { x: 0, y: 0, width: 0, height: 0 } }
            ],
            layout: { masterLayout: 'default', elements: [] },
            image_path: 'slide_1.png'
          }
        ],
        metadata: {
          totalSlides: 1,
          title: 'test',
          lastModified: new Date().toISOString()
        }
      };
      
      const result = parser.extractTexts(mockParseResult);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('テキスト1');
      expect(result[1]).toBe('テキスト2');
    });
  });

  describe('getTextWithPositions', () => {
    it('パース結果からテキストと位置情報を取得する', () => {
      const mockSlide: SlideContent = {
        id: 'slide_0',
        index: 0,
        texts: [
          { id: 'text_0_0', content: 'テキスト1', position: { x: 100, y: 100, width: 200, height: 50 } },
          { id: 'text_0_1', content: 'テキスト2', position: { x: 100, y: 200, width: 200, height: 50 } }
        ],
        layout: { masterLayout: 'default', elements: [] },
        image_path: 'slide_1.png'
      };
      
      const mockParseResult = {
        slides: [mockSlide],
        metadata: {
          totalSlides: 1,
          title: 'test',
          lastModified: new Date().toISOString()
        }
      };
      
      const result = parser.getTextWithPositions(mockParseResult);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('slide_0');
      expect(result[0].texts).toHaveLength(2);
      expect(result[0].texts[0].content).toBe('テキスト1');
      expect(result[0].texts[1].content).toBe('テキスト2');
      expect(result[0].texts[0].position.x).toBe(100);
    });
  });
});
