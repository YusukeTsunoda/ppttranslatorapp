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
