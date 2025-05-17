/// <reference path="../../jest.d.ts" />

import { StreamingPPTXParser } from '@/lib/pptx/streaming-parser';
import fs from 'fs';
import path from 'path';
import { PythonShell } from 'python-shell';
import { PPTXParseResult, SlideContent } from '@/lib/pptx/types';
import { createHash } from 'crypto';

// モックの設定
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  createReadStream: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('mock file data'));
      }
      if (event === 'end') {
        callback();
      }
      return {
        on: jest.fn().mockReturnThis(),
      };
    }),
  })),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file data')),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  dirname: jest.fn().mockReturnValue('/mock/dir'),
  basename: jest.fn().mockImplementation((path) => 'test.pptx'),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mockhash123'),
  }),
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
                textElements: [
                  {
                    id: 'text_0_0',
                    text: 'テストテキスト1',
                    position: { x: 100, y: 100, width: 200, height: 50 },
                  },
                ],
                shapes: [
                  {
                    type: 'RECTANGLE',
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    fillColor: '#FF0000',
                    strokeColor: '#000000',
                    strokeWidth: 1,
                    opacity: 1,
                  },
                ],
                background: {
                  color: '#FFFFFF',
                },
              },
            ],
            metadata: {
              title: 'テストプレゼンテーション',
              author: 'テストユーザー',
              created: '2025-05-17T00:00:00Z',
              modified: '2025-05-17T00:00:00Z',
              lastModifiedBy: 'テストユーザー',
              revision: 1,
              presentationFormat: 'Wide Screen',
            },
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
    promisify: jest.fn().mockImplementation(() => {
      return () => Promise.resolve({ stdout: 'Python 3.11.0\n' });
    }),
  };
});

describe('StreamingPPTXParser', () => {
  let parser: StreamingPPTXParser;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = StreamingPPTXParser.getInstance();
  });

  afterEach(() => {
    parser.dispose();
  });

  describe('parsePPTX', () => {
    it('PPTXファイルを正しくパースする', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await parser.parsePPTX('test.pptx');

      expect(result).toBeDefined();
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].textElements[0].text).toBe('テストテキスト1');
      expect(result.slides[0].imagePath).toBe('slide_1.png');
    });

    it('ファイルが存在しない場合はエラーを投げる', async () => {
      // fs.existsSyncがfalseを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(parser.parsePPTX('nonexistent.pptx')).rejects.toThrow('File not found');
    });

    it('キャッシュが機能する', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // 1回目の呼び出し
      const result1 = await parser.parsePPTX('test.pptx');
      expect(result1).toBeDefined();

      // PythonShellのモックをリセット
      jest.mocked(PythonShell).mockClear();

      // 2回目の呼び出し（キャッシュから取得されるはず）
      const result2 = await parser.parsePPTX('test.pptx');
      expect(result2).toBeDefined();

      // キャッシュが使用されたため、PythonShellは呼び出されないはず
      expect(PythonShell).not.toHaveBeenCalled();
    });

    it('forceReparseオプションでキャッシュをバイパスする', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // 1回目の呼び出し
      await parser.parsePPTX('test.pptx');

      // PythonShellのモックをリセット
      jest.mocked(PythonShell).mockClear();

      // forceReparseオプションを使用して2回目の呼び出し
      await parser.parsePPTX('test.pptx', { forceReparse: true });

      // PythonShellが再度呼び出されるはず
      expect(PythonShell).toHaveBeenCalled();
    });
  });

  describe('キャッシュ機能', () => {
    it('clearCacheでキャッシュをクリアする', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // 1回目の呼び出し
      await parser.parsePPTX('test.pptx');

      // キャッシュをクリア
      parser.clearCache();

      // PythonShellのモックをリセット
      jest.mocked(PythonShell).mockClear();

      // 2回目の呼び出し（キャッシュがクリアされているため、PythonShellが呼び出されるはず）
      await parser.parsePPTX('test.pptx');

      // PythonShellが呼び出されるはず
      expect(PythonShell).toHaveBeenCalled();
    });

    it('getCacheStatsでキャッシュ統計を取得する', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // 1回目の呼び出し
      await parser.parsePPTX('test.pptx');

      const stats = parser.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('テキスト抽出', () => {
    it('extractTextsでテキストを抽出する', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await parser.parsePPTX('test.pptx');
      const texts = parser.extractTexts(result);

      expect(texts).toHaveLength(1);
      expect(texts[0]).toBe('テストテキスト1');
    });

    it('getTextWithPositionsでテキストと位置情報を取得する', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await parser.parsePPTX('test.pptx');
      const slideContents = parser.getTextWithPositions(result);

      expect(slideContents).toHaveLength(1);
      expect(slideContents[0].textElements).toHaveLength(1);
      expect(slideContents[0].textElements[0].text).toBe('テストテキスト1');
      expect(slideContents[0].textElements[0].position.x).toBe(100);
    });
  });

  describe('エラー処理', () => {
    it('Pythonスクリプトの実行エラーを適切に処理する', async () => {
      // fs.existsSyncがtrueを返すようにモック
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // PythonShellのモックを一時的にエラーを返すように設定
      const errorImplementation = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'stderr') {
            callback('Python execution error');
          }
          return { on: jest.fn() };
        }),
        end: jest.fn().mockImplementation((callback) => {
          callback(new Error('Python script execution failed'));
        }),
      } as unknown as PythonShell;

      jest.mocked(PythonShell).mockImplementationOnce(() => errorImplementation);

      await expect(parser.parsePPTX('test.pptx')).rejects.toThrow('Python script execution failed');
    });
  });
});
