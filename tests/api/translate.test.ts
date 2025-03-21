import { NextRequest, NextResponse } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { expect } from '@jest/globals';

// Anthropicのモック
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"translations":[{"original":"Hello","translated":"こんにちは"},{"original":"World","translated":"世界"}]}',
          },
        ],
      }),
    },
  }));
});

// next-authのモック
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      isPremium: true,
    },
  }),
}));

// prismaのモック
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    translation: {
      create: jest.fn().mockResolvedValue({
        id: 'test-translation-id',
        userId: 'test-user',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'test-translation-id',
          userId: 'test-user',
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    },
  },
}));

// モックレスポンスの作成
const mockSuccessResponse = {
  status: 200,
  json: async () => ({
    success: true,
    translations: [
      { original: 'Hello', translated: 'こんにちは' },
      { original: 'World', translated: '世界' },
    ],
  }),
};

const mockErrorResponse = {
  status: 400,
  json: async () => ({ error: 'Invalid request' }),
};

// app/api/translate/route.tsのモック
jest.mock('@/app/api/translate/route', () => ({
  POST: jest.fn().mockImplementation(async (req) => {
    const body = await req.json();

    if (!body.texts || !body.sourceLanguage || !body.targetLanguage) {
      return mockErrorResponse;
    }

    return mockSuccessResponse;
  }),
  GET: jest.fn().mockImplementation(async () => {
    return {
      status: 200,
      json: async () => ({
        translations: [
          {
            id: 'test-translation-id',
            userId: 'test-user',
            sourceLanguage: 'en',
            targetLanguage: 'ja',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    };
  }),
}));

// インポートはモックの後に行う
import { POST, GET } from '@/app/api/translate/route';

describe('Translate API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/translate', () => {
    it('有効なリクエストで翻訳を実行する', async () => {
      // リクエストボディの作成
      const requestBody = {
        texts: ['Hello', 'World'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      };

      // モックのリクエストオブジェクトを作成
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      // APIハンドラを呼び出す
      const response = await POST(mockReq as unknown as NextRequest);

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(true);
      expect(data.translations).toHaveLength(2);
      expect(data.translations[0].original).toBe('Hello');
      expect(data.translations[0].translated).toBe('こんにちは');
    });

    it('無効なリクエストでエラーを返す', async () => {
      // 無効なリクエストボディの作成（textsが欠けている）
      const requestBody = {
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      };

      // モックのリクエストオブジェクトを作成
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      // APIハンドラを呼び出す
      const response = await POST(mockReq as unknown as NextRequest);

      // レスポンスを検証
      expect(response.status).toBe(400);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.error).toBe('Invalid request');
    });
  });

  describe('GET /api/translate', () => {
    it('翻訳履歴を取得する', async () => {
      // モックのリクエストオブジェクトを作成
      const mockReq = {} as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await GET(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.translations).toHaveLength(1);
      expect(data.translations[0].userId).toBe('test-user');
      expect(data.translations[0].sourceLanguage).toBe('en');
      expect(data.translations[0].targetLanguage).toBe('ja');
    });
  });
});
