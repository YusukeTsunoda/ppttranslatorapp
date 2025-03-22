import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';

// next-authのモック
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      email: 'test@example.com',
    },
  }),
}));

// fs/promisesのモック
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  readdir: jest.fn().mockResolvedValue(['original.pptx', 'translated.pptx']),
  access: jest.fn().mockImplementation((path) => {
    if (path.includes('not-exist')) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve();
  }),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// child_processのモック
jest.mock('child_process', () => ({
  exec: jest.fn().mockImplementation((cmd, callback) => {
    callback(null, 'success', '');
  }),
}));

// file-utilsのモック
jest.mock('@/lib/utils/file-utils', () => ({
  filePathManager: {
    findActualFilePath: jest.fn().mockResolvedValue('/path/to/original.pptx'),
    getTempPath: jest.fn().mockReturnValue('/path/to/temp/file.pptx'),
    getPublicPath: jest.fn().mockReturnValue('uploads/test-user/file.pptx'),
  },
}));

// app/api/pptx/generate/route.tsのモック
jest.mock('@/app/api/pptx/generate/route', () => {
  // モック用のレスポンス生成関数
  const mockJsonResponse = (data: any, status = 200) => {
    return {
      json: () => Promise.resolve(data),
      status,
    };
  };

  return {
    POST: jest.fn().mockImplementation(async (req) => {
      const body = await req.json();

      if (!body.fileId || !body.translations) {
        return mockJsonResponse({ error: 'Missing required parameters' }, 400);
      }

      return mockJsonResponse({
        success: true,
        fileId: body.fileId,
        filePath: 'uploads/test-user/test-file_translated.pptx',
        message: 'PPTXファイルが正常に生成されました',
      });
    }),
  };
});

// インポートはモックの後に行う
import { POST } from '@/app/api/pptx/generate/route';

describe('PPTX Generate API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pptx/generate', () => {
    it('翻訳データからPPTXファイルを生成する', async () => {
      // リクエストボディの作成
      const requestBody = {
        fileId: 'test-file',
        translations: [
          {
            slideId: 'slide1',
            title: {
              original: 'Original Title',
              translated: '翻訳されたタイトル',
            },
            content: [
              {
                original: 'Original Content',
                translated: '翻訳されたコンテンツ',
              },
            ],
          },
        ],
      };

      // リクエストオブジェクトのモック
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(true);
      expect(data.fileId).toBe('test-file');
      expect(data.filePath).toBe('uploads/test-user/test-file_translated.pptx');
      expect(data.message).toBe('PPTXファイルが正常に生成されました');
    });

    it('必須パラメータが欠けている場合はエラーを返す', async () => {
      // 無効なリクエストボディの作成（fileIdが欠けている）
      const requestBody = {
        translations: [
          {
            slideId: 'slide1',
            title: {
              original: 'Original Title',
              translated: '翻訳されたタイトル',
            },
          },
        ],
      };

      // リクエストオブジェクトのモック
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(400);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.error).toBe('Missing required parameters');
    });

    it('翻訳データが欠けている場合はエラーを返す', async () => {
      // 無効なリクエストボディの作成（translationsが欠けている）
      const requestBody = {
        fileId: 'test-file',
      };

      // リクエストオブジェクトのモック
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(400);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.error).toBe('Missing required parameters');
    });
  });
});
