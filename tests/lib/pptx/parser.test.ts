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
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file data')),
}));

jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
  basename: jest.fn().mockImplementation((path, ext) => (ext ? 'test' : 'pptx_parser.py')),
}));

// PythonShellモック
jest.mock('python-shell', () => {
  const mockStream = {
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    pipe: jest.fn(),
    unpipe: jest.fn(),
  };

  const defaultImplementation = {
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'message') {
        callback(
          JSON.stringify({
            slides: [
              {
                index: 0,
                image_path: 'slide_1.png',
                texts: ['テストテキスト1'],
                positions: [{ x: 100, y: 100, width: 200, height: 50 }],
              },
            ],
          }),
        );
      }
      return { on: jest.fn() };
    }),
    end: jest.fn().mockImplementation((callback) => {
      callback(null);
    }),
    scriptPath: '',
    command: 'python3',
    mode: 'json',
    formatter: null,
    pythonPath: 'python3',
    pythonOptions: [],
    scriptArgs: [],
    stdoutParser: jest.fn(),
    stderrParser: jest.fn(),
    terminated: false,
    childProcess: null,
    parser: jest.fn(),
    stdin: mockStream,
    stdout: mockStream,
    stderr: mockStream,
    exitSignal: null,
    exitCode: 0,
    stderrHasEnded: false,
    stdoutHasEnded: false,
    send: jest.fn(),
    kill: jest.fn(),
    terminate: jest.fn(),
    _remaining: '',
    _endCallback: null,
    parseError: null,
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    emit: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    eventNames: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
  } as unknown as PythonShell;

  return {
    PythonShell: jest.fn().mockImplementation(() => defaultImplementation),
  };
});

jest.mock('child_process', () => {
  const mockExec = jest.fn().mockImplementation((cmd, callback) => {
    if (cmd === 'python3 --version') {
      callback(null, { stdout: 'Python 3.11.0\n' });
    } else {
      callback(null, { stdout: 'All dependencies are installed\n' });
    }
  });
  return {
    exec: mockExec,
    promisify: jest.fn().mockImplementation((fn) => {
      return () => Promise.resolve({ stdout: 'Python 3.11.0\n' });
    }),
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
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      expect(result).toBeDefined();
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].textElements[0].text).toBe('テストテキスト1');
      expect(result.slides[0].imagePath).toBe('slide_1.png');
    });

    it('Pythonスクリプトが見つからない場合はエラーを投げる', async () => {
      // fs.existsSyncを一時的にfalseを返すように設定
      const existsSyncMock = jest
        .fn()
        .mockReturnValueOnce(false) // 最初の呼び出しでfalse
        .mockReturnValue(true); // その後の呼び出しではtrue
      (fs.existsSync as jest.Mock).mockImplementation(existsSyncMock);

      await expect(parser.parsePPTX('test.pptx', '/tmp')).rejects.toThrow('Python script not found');
      expect(existsSyncMock).toHaveBeenCalled();
    });

    it('Pythonスクリプトの実行エラーを適切に処理する', async () => {
      // fs.existsSyncがtrueを返すように設定
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        removeListener: jest.fn(),
        pipe: jest.fn(),
        unpipe: jest.fn(),
      };

      // PythonShellのモックを一時的にエラーを返すように設定
      const errorImplementation = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'stderr') {
            callback('Python execution error');
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(new Error('Python execution error'));
        }),
        scriptPath: '',
        command: 'python3',
        mode: 'json',
        formatter: null,
        pythonPath: 'python3',
        pythonOptions: [],
        scriptArgs: [],
        stdoutParser: jest.fn(),
        stderrParser: jest.fn(),
        terminated: false,
        childProcess: null,
        parser: jest.fn(),
        stdin: mockStream,
        stdout: mockStream,
        stderr: mockStream,
        exitSignal: null,
        exitCode: 1,
        stderrHasEnded: true,
        stdoutHasEnded: true,
        send: jest.fn(),
        kill: jest.fn(),
        terminate: jest.fn(),
        _remaining: '',
        _endCallback: null,
        parseError: null,
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        emit: jest.fn(),
        listenerCount: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        eventNames: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
      } as unknown as PythonShell;

      jest.mocked(PythonShell).mockImplementationOnce(() => errorImplementation);

      await expect(parser.parsePPTX('test.pptx', '/tmp')).rejects.toThrow('Python execution error');
    });

    it('複雑なスライドレイアウトを正しく解析する', async () => {
      // fs.existsSyncがtrueを返すように設定
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // 複雑なレイアウトのモックデータを設定
      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              slides: [{
                index: 0,
                image_path: 'slide_1.png',
                texts: [
                  {
                    text: 'タイトル',
                    type: 'title',
                    position: { x: 100, y: 50, width: 400, height: 100 },
                    font: { name: 'Arial', size: 44, color: '#000000' }
                  },
                  {
                    text: '本文テキスト',
                    type: 'body',
                    position: { x: 100, y: 200, width: 300, height: 150 },
                    font: { name: 'MS Gothic', size: 24, color: '#333333' }
                  }
                ],
                shapes: [
                  { type: 'rectangle', x: 50, y: 30, width: 500, height: 140 },
                  { type: 'circle', x: 450, y: 200, radius: 50 }
                ],
                background: { color: '#FFFFFF', image: null }
              }]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      expect(result).toBeDefined();
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].textElements).toHaveLength(2);
      expect(result.slides[0].textElements[0].text).toBe('タイトル');
      expect(result.slides[0].textElements[0].type).toBe('title');
      expect(result.slides[0].textElements[0].position).toEqual({ x: 100, y: 50, width: 400, height: 100 });
      expect(result.slides[0].shapes).toHaveLength(2);
      expect(result.slides[0].background).toEqual({ color: '#FFFFFF', image: null });
    });

    it('メタデータを正しく抽出する', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              metadata: {
                title: 'テストプレゼンテーション',
                author: 'テストユーザー',
                created: '2024-03-20T10:00:00Z',
                modified: '2024-03-21T15:30:00Z',
                company: 'テスト株式会社',
                version: '1.0',
                lastModifiedBy: '更新者',
                revision: 5,
                subject: 'テストサブジェクト',
                keywords: ['キーワード1', 'キーワード2'],
                category: 'テストカテゴリ',
                description: 'テスト説明',
                language: 'ja-JP',
                presentationFormat: 'widescreen',
                createdApplication: 'Microsoft PowerPoint'
              },
              slides: [{
                index: 0,
                image_path: 'slide_1.png',
                texts: ['テストテキスト1'],
                positions: [{ x: 100, y: 100, width: 200, height: 50 }]
              }]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.title).toBe('テストプレゼンテーション');
      expect(result.metadata.author).toBe('テストユーザー');
      expect(result.metadata.created).toBe('2024-03-20T10:00:00Z');
      expect(result.metadata.modified).toBe('2024-03-21T15:30:00Z');
      expect(result.metadata.company).toBe('テスト株式会社');
      expect(result.metadata.version).toBe('1.0');
      expect(result.metadata.lastModifiedBy).toBe('更新者');
      expect(result.metadata.revision).toBe(5);
      expect(result.metadata.subject).toBe('テストサブジェクト');
      expect(result.metadata.keywords).toEqual(['キーワード1', 'キーワード2']);
      expect(result.metadata.category).toBe('テストカテゴリ');
      expect(result.metadata.description).toBe('テスト説明');
      expect(result.metadata.language).toBe('ja-JP');
      expect(result.metadata.presentationFormat).toBe('widescreen');
      expect(result.metadata.createdApplication).toBe('Microsoft PowerPoint');
    });

    it('特殊なテキスト形式を正しく処理する', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              slides: [{
                index: 0,
                image_path: 'slide_1.png',
                texts: [
                  {
                    text: '太字とイタリック',
                    type: 'body',
                    position: { x: 100, y: 100, width: 200, height: 50 },
                    font: { name: 'Arial', size: 24, bold: true, italic: true }
                  },
                  {
                    text: '下線付きテキスト',
                    type: 'body',
                    position: { x: 100, y: 150, width: 200, height: 50 },
                    font: { name: 'Arial', size: 24, underline: true }
                  },
                  {
                    text: 'カラーテキスト',
                    type: 'body',
                    position: { x: 100, y: 200, width: 200, height: 50 },
                    font: { name: 'Arial', size: 24, color: '#FF0000' }
                  }
                ]
              }]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      expect(result.slides[0].textElements).toHaveLength(3);
      expect(result.slides[0].textElements[0].font.bold).toBe(true);
      expect(result.slides[0].textElements[0].font.italic).toBe(true);
      expect(result.slides[0].textElements[1].font.underline).toBe(true);
      expect(result.slides[0].textElements[2].font.color).toBe('#FF0000');
    });

    it('大量のスライドを含むPPTXを正しく処理する', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockSlides = Array.from({ length: 50 }, (_, i) => ({
        index: i,
        image_path: `slide_${i + 1}.png`,
        texts: [`スライド${i + 1}のテキスト`],
        positions: [{ x: 100, y: 100, width: 200, height: 50 }]
      }));

      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({ slides: mockSlides }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      expect(result.slides).toHaveLength(50);
      expect(result.slides[49].textElements[0].text).toBe('スライド50のテキスト');
      expect(result.slides[49].imagePath).toBe('slide_50.png');
    });

    it('無効なファイル形式を適切に処理する', async () => {
      // PythonShellのモックを一時的にエラーを返すように設定
      (PythonShell as jest.Mock).mockImplementation(() => ({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'stderr') {
            callback('Invalid file format: File is not a valid PPTX file');
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(new Error('Invalid file format'));
        })
      }));

      await expect(parser.parsePPTX('invalid.pptx', '/tmp')).rejects.toThrow('Invalid file format');
    });

    it('破損したファイルを適切に処理する', async () => {
      // PythonShellのモックを一時的にエラーを返すように設定
      (PythonShell as jest.Mock).mockImplementation(() => ({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'stderr') {
            callback('Corrupted PPTX file: Unable to read file structure');
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(new Error('Corrupted PPTX file'));
        })
      }));

      await expect(parser.parsePPTX('corrupted.pptx', '/tmp')).rejects.toThrow('Corrupted PPTX file');
    });

    it('特殊なレイアウトを含むスライドを正しく処理する', async () => {
      const specialLayoutData = {
        slides: [
          {
            index: 0,
            image_path: 'slide_1.png',
            texts: [
              {
                text: '縦書きテキスト',
                position: { x: 50, y: 50, width: 100, height: 400 },
                type: 'vertical',
                paragraphs: [{ font: { name: 'MS Mincho', size: 24, color: '#000000' } }]
              },
              {
                text: '回転テキスト',
                position: { x: 200, y: 100, width: 200, height: 50 },
                type: 'rotated',
                rotation: 45,
                paragraphs: [{ font: { name: 'Arial', size: 20, color: '#333333' } }]
              },
              {
                text: 'テーブルセル',
                position: { x: 300, y: 200, width: 100, height: 50 },
                type: 'table_cell',
                table_info: { row: 0, col: 0 },
                paragraphs: [{ font: { name: 'MS Gothic', size: 16, color: '#666666' } }]
              }
            ]
          }
        ]
      };

      // PythonShellのモックを一時的に変更
      (PythonShell as jest.Mock).mockImplementation(() => ({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify(specialLayoutData));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(null);
        })
      }));

      const result = await parser.parsePPTX('special_layout.pptx', '/tmp');

      // 特殊なレイアウト要素を検証
      expect(result.slides[0].textElements).toHaveLength(3);
      
      // 縦書きテキストを検証
      const verticalText = result.slides[0].textElements[0];
      expect(verticalText.text).toBe('縦書きテキスト');
      expect(verticalText.type).toBe('vertical');
      expect(verticalText.position.height).toBe(400);
      expect(verticalText.fontInfo.name).toBe('MS Mincho');

      // 回転テキストを検証
      const rotatedText = result.slides[0].textElements[1];
      expect(rotatedText.text).toBe('回転テキスト');
      expect(rotatedText.type).toBe('rotated');
      expect(rotatedText.rotation).toBe(45);

      // テーブルセルを検証
      const tableCell = result.slides[0].textElements[2];
      expect(tableCell.text).toBe('テーブルセル');
      expect(tableCell.type).toBe('table_cell');
      expect(tableCell.table_info).toEqual({ row: 0, col: 0 });
    });

    it('複雑なテキストスタイルを正しく処理する', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              slides: [{
                index: 0,
                image_path: 'slide_1.png',
                texts: [
                  {
                    text: '太字とイタリック',
                    type: 'body',
                    position: { x: 100, y: 100, width: 200, height: 50 },
                    font: {
                      name: 'Arial',
                      size: 24,
                      color: '#FF0000',
                      bold: true,
                      italic: true,
                      underline: false,
                      strikethrough: false,
                      superscript: false,
                      subscript: false,
                      characterSpacing: 1.2,
                      kerning: true
                    },
                    style: {
                      alignment: 'center',
                      lineSpacing: 1.5,
                      indentation: 20,
                      direction: 'ltr',
                      bulletStyle: {
                        type: 'bullet',
                        format: '•'
                      }
                    }
                  }
                ]
              }]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      const textElement = result.slides[0].textElements[0];
      expect(textElement.font.bold).toBe(true);
      expect(textElement.font.italic).toBe(true);
      expect(textElement.font.color).toBe('#FF0000');
      expect(textElement.font.characterSpacing).toBe(1.2);
      expect(textElement.style?.alignment).toBe('center');
      expect(textElement.style?.lineSpacing).toBe(1.5);
      expect(textElement.style?.indentation).toBe(20);
      expect(textElement.style?.bulletStyle?.type).toBe('bullet');
    });

    it('シェイプと背景を正しく処理する', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockPythonShell = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'message') {
            callback(JSON.stringify({
              slides: [{
                index: 0,
                image_path: 'slide_1.png',
                shapes: [
                  {
                    type: 'RECTANGLE',
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 150,
                    rotation: 45,
                    fillColor: '#FF0000',
                    strokeColor: '#000000',
                    strokeWidth: 2,
                    opacity: 0.8
                  },
                  {
                    type: 'OVAL',
                    x: 300,
                    y: 200,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    fillColor: '#0000FF',
                    strokeColor: '#000000',
                    strokeWidth: 1,
                    opacity: 1,
                    radius: 50
                  }
                ],
                background: {
                  color: '#FFFFFF',
                  image: null,
                  pattern: null,
                  gradient: {
                    type: 'linear',
                    stops: [
                      { position: 0, color: '#FF0000' },
                      { position: 1, color: '#0000FF' }
                    ],
                    angle: 45
                  },
                  transparency: 0.1
                }
              }]
            }));
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => callback(null))
      };

      (PythonShell as jest.Mock).mockImplementation(() => mockPythonShell);

      const result = await parser.parsePPTX('test.pptx', '/tmp');

      const slide = result.slides[0];
      expect(slide.shapes).toHaveLength(2);
      
      // 四角形の検証
      const rectangle = slide.shapes[0];
      expect(rectangle.type).toBe('RECTANGLE');
      expect(rectangle.rotation).toBe(45);
      expect(rectangle.fillColor).toBe('#FF0000');
      expect(rectangle.opacity).toBe(0.8);

      // 円の検証
      const circle = slide.shapes[1];
      expect(circle.type).toBe('OVAL');
      expect(circle.radius).toBe(50);
      expect(circle.fillColor).toBe('#0000FF');

      // 背景の検証
      const background = slide.background;
      expect(background.color).toBe('#FFFFFF');
      expect(background.gradient?.type).toBe('linear');
      expect(background.gradient?.stops).toHaveLength(2);
      expect(background.transparency).toBe(0.1);
    });
  });

  describe('extractTexts', () => {
    it('パース結果からテキストを抽出する', () => {
      const mockParseResult = {
        slides: [
          {
            index: 0,
            textElements: [
              {
                id: 'text_0_0',
                text: 'テキスト1',
                position: { x: 0, y: 0, width: 0, height: 0 },
              },
              {
                id: 'text_0_1',
                text: 'テキスト2',
                position: { x: 0, y: 0, width: 0, height: 0 },
              },
            ],
            imagePath: 'slide_1.png',
          },
        ],
        metadata: {
          totalSlides: 1,
          title: 'test',
          lastModified: new Date().toISOString(),
        },
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
        index: 0,
        textElements: [
          { id: 'text_0_0', text: 'テキスト1', position: { x: 100, y: 100, width: 200, height: 50 } },
          { id: 'text_0_1', text: 'テキスト2', position: { x: 100, y: 200, width: 200, height: 50 } },
        ],
        imagePath: 'slide_1.png',
      };

      const mockParseResult = {
        slides: [mockSlide],
        metadata: {
          totalSlides: 1,
          title: 'test',
          lastModified: new Date().toISOString(),
        },
      };

      const result = parser.getTextWithPositions(mockParseResult);

      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
      expect(result[0].textElements).toHaveLength(2);
      expect(result[0].textElements[0].text).toBe('テキスト1');
      expect(result[0].textElements[1].text).toBe('テキスト2');
      expect(result[0].textElements[0].position.x).toBe(100);
    });
  });
});
