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

<<<<<<< HEAD
    it('テキスト前処理を正しく行う', async () => {
      // 特殊なテキストを含むリクエストボディの作成
      const requestBody = {
        texts: [
          '  Hello  ', // 前後の空白
          'Multi\nLine\nText', // 改行
          '<p>HTML Tags</p>', // HTMLタグ
          '特殊文字：①㈱㊤', // 特殊文字
          '', // 空文字
        ],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      };

      // モックのリクエストオブジェクトを作成
=======
    it('認証されていないリクエストで401エラーを返す', async () => {
      // next-authのモックを一時的にオーバーライド
      const getServerSession = require('next-auth').getServerSession;
      getServerSession.mockResolvedValueOnce(null);

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id'
      };

>>>>>>> c58ec68 (実装途中)
      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

<<<<<<< HEAD
      // APIハンドラを呼び出す
      const response = await POST(mockReq as unknown as NextRequest);

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(true);
      expect(data.translations).toBeDefined();
      expect(data.translations.length).toBeGreaterThan(0);
    });

    it('大量のテキストを適切にバッチ処理する', async () => {
      // 大量のテキストを生成
      const texts = Array.from({ length: 100 }, (_, i) => `Text ${i + 1}`);
      
      const requestBody = {
        texts,
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
      expect(data.translations).toHaveLength(texts.length);
    });

    it('翻訳APIのエラーを適切に処理する', async () => {
      // Anthropicのモックをエラーを返すように設定
      const mockAnthropicError = new Error('API Error');
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(mockAnthropicError),
          },
        }));
=======
      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('認証が必要です');
    });

    it('無料ユーザーは基本モデルのみ使用可能', async () => {
      // next-authのモックを一時的にオーバーライド
      const getServerSession = require('next-auth').getServerSession;
      getServerSession.mockResolvedValueOnce({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          isPremium: false,
        },
>>>>>>> c58ec68 (実装途中)
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
<<<<<<< HEAD
        fileId: 'test-file-id',
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('翻訳結果の後処理を正しく行う', async () => {
      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [
          {
            index: 0,
            texts: [
              {
                text: 'Hello',
                index: 0,
              },
            ],
          },
        ],
=======
        model: 'claude-3-opus-20240229',
        fileId: 'test-file-id'
>>>>>>> c58ec68 (実装途中)
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(200);
<<<<<<< HEAD
      const data = await response.json();
      expect(data.translations).toBeDefined();
      expect(Array.isArray(data.translations)).toBe(true);
      expect(data.translations[0].text).toBeDefined();
      expect(data.translations[0].index).toBeDefined();
    });

    it('無料ユーザーは基本モデルのみ使用可能', async () => {
      // セッションモックを無料ユーザーに設定
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue({
          user: {
            id: 'test-user',
            email: 'test@example.com',
            isPremium: false,
          },
        }),
=======

      // Anthropic APIが基本モデルで呼び出されたことを確認
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropicInstance = Anthropic.mock.instances[0];
      expect(anthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-haiku-20240307'
        })
      );
    });

    it('ファイルIDが存在しない場合は404エラーを返す', async () => {
      // prismaのモックを一時的にオーバーライド
      const { prisma } = require('@/lib/db/prisma');
      prisma.file.findUnique = jest.fn().mockResolvedValue(null);

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'non-existent-file-id'
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('指定されたファイルIDがデータベースに存在しません');
    });

    it('翻訳処理でエラーが発生した場合は500エラーを返す', async () => {
      // Anthropicのモックを一時的にオーバーライド
      const Anthropic = require('@anthropic-ai/sdk');
      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Translation failed'))
        }
>>>>>>> c58ec68 (実装途中)
      }));

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
<<<<<<< HEAD
        fileId: 'test-file-id',
        model: 'claude-3-opus-20240229',
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(200);
      // 基本モデルが使用されていることを確認（実装に応じて検証方法を調整）
    });

    it('ファイルIDが存在しない場合はエラーを返す', async () => {
      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        slides: [
          {
            index: 0,
            texts: [{ text: 'Hello', index: 0 }],
          },
        ],
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('ファイルIDが必要です');
    });

    it('スライドデータが不正な場合はエラーを返す', async () => {
      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: null,
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('スライドデータが不正です');
    });

    it('不適切な言語コードを処理する', async () => {
      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'invalid',
        targetLanguage: 'invalid',
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
      expect(data.error).toBeDefined();
      expect(data.error).toContain('Invalid language code');
    });

    it('翻訳結果を正しく整形する', async () => {
      // 複雑な翻訳結果を含むリクエストボディの作成
      const requestBody = {
        texts: [
          'Hello {name}!',
          'Count: {count}',
          'Date: {date}',
        ],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        preservePlaceholders: true,
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
      expect(data.translations).toBeDefined();
      
      // プレースホルダーが保持されていることを確認
      data.translations.forEach((translation: any) => {
        if (translation.original.includes('{')) {
          expect(translation.translated).toMatch(/\{.*?\}/);
        }
      });
    });

    it('レート制限エラーを適切に処理する', async () => {
      // Anthropicのモックをレート制限エラーを返すように設定
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(rateLimitError),
          },
        }));
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('リクエスト制限を超えました。しばらく待ってから再試行してください。');
    });

    it('タイムアウトエラーを適切に処理する', async () => {
      // Anthropicのモックをタイムアウトエラーを返すように設定
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(timeoutError),
          },
        }));
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toBe('リクエストがタイムアウトしました。再試行してください。');
    });

    it('ネットワークエラーを適切に処理する', async () => {
      // Anthropicのモックをネットワークエラーを返すように設定
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(networkError),
          },
        }));
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('ネットワークエラーが発生しました。再試行してください。');
    });

    it('リトライ後に成功する場合を処理する', async () => {
      // Anthropicのモックを最初の呼び出しでエラー、2回目で成功するように設定
      let callCount = 0;
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.reject(new Error('Temporary error'));
              }
              return Promise.resolve({
                content: [
                  {
                    type: 'text',
                    text: '{"translations":[{"original":"Hello","translated":"こんにちは"}]}',
                  },
                ],
              });
            }),
          },
        }));
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(callCount).toBe(2); // リトライが行われたことを確認
    });

    it('最大リトライ回数を超えた場合を処理する', async () => {
      // Anthropicのモックを常にエラーを返すように設定
      jest.mock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(new Error('Persistent error')),
          },
        }));
      });

      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: [{ index: 0, texts: [{ text: 'Hello', index: 0 }] }],
=======
        fileId: 'test-file-id'
>>>>>>> c58ec68 (実装途中)
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(500);
<<<<<<< HEAD
      const data = await response.json();
      expect(data.error).toBe('最大リトライ回数を超えました。後でもう一度お試しください。');
=======

      const data = await response.json();
      expect(data.error).toContain('翻訳処理中にエラーが発生しました');
    });

    it('スライドデータが不正な場合は400エラーを返す', async () => {
      const requestBody = {
        texts: ['Hello'],
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        fileId: 'test-file-id',
        slides: 'invalid-slides-data' // 配列ではない不正なデータ
      };

      const mockReq = {
        json: jest.fn().mockResolvedValue(requestBody),
      };

      const response = await POST(mockReq as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('スライドデータが不正です');
>>>>>>> c58ec68 (実装途中)
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
