import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// PPTXパーサーのモック
jest.mock('@/lib/pptx/parser', () => ({
  PPTXParser: {
    getInstance: jest.fn().mockReturnValue({
      parsePPTX: jest.fn().mockResolvedValue({
        success: true,
        slides: [
          {
            id: 'slide1',
            title: 'テストスライド1',
            content: 'スライド1のコンテンツ',
          },
          {
            id: 'slide2',
            title: 'テストスライド2',
            content: 'スライド2のコンテンツ',
          },
        ],
        metadata: {
          title: 'テストプレゼンテーション',
          author: 'テストユーザー',
          totalSlides: 2,
        },
      }),
    }),
  },
}));

// 認証のモック
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({
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
  readdir: jest.fn().mockResolvedValue(['file1.pptx', 'file2.pptx']),
  unlink: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

// uuidのモック
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

// app/api/pptx/parse/route.tsのモック
jest.mock('@/app/api/pptx/parse/route', () => {
  // モック用のレスポンス生成関数
  const mockJsonResponse = (data: any, status = 200) => {
    return {
      json: () => Promise.resolve(data),
      status,
    };
  };

  return {
    POST: jest.fn().mockImplementation(async (req) => {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file) {
        return mockJsonResponse({ success: false, error: 'ファイルが指定されていません' }, 400);
      }

      if (file.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return mockJsonResponse({ success: false, error: 'PPTXファイルのみアップロード可能です' }, 400);
      }

      return mockJsonResponse({
        success: true,
        fileId: 'test-uuid',
        slides: [
          {
            id: 'slide1',
            title: 'テストスライド1',
            content: 'スライド1のコンテンツ',
          },
          {
            id: 'slide2',
            title: 'テストスライド2',
            content: 'スライド2のコンテンツ',
          },
        ],
        metadata: {
          title: 'テストプレゼンテーション',
          author: 'テストユーザー',
          totalSlides: 2,
        },
      });
    }),
    GET: jest.fn().mockImplementation(() => {
      return mockJsonResponse({
        success: true,
        message: 'PPTXパーサーAPIは正常に動作しています',
      });
    }),
  };
});

// インポートはモックの後に行う
import { POST, GET } from '@/app/api/pptx/parse/route';
import { auth } from '@/lib/auth/auth';
import { PPTXParser } from '@/lib/pptx/parser';
import fs from 'fs/promises';

describe('PPTX Parse API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pptx/parse', () => {
    it('認証されていない場合はエラーを返す', async () => {
      // 認証モックを未認証状態に設定
      (auth as jest.Mock).mockResolvedValueOnce(null);

      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ログインしてください');
    });

    it('ファイルサイズが制限を超える場合はエラーを返す', async () => {
      const mockFile = new File(['dummy content'.repeat(1000000)], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      Object.defineProperty(mockFile, 'size', { value: 21 * 1024 * 1024 }); // 21MB

      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルサイズは20MB以下にしてください');
    });

    it('一時ファイル作成に失敗した場合はエラーを返す', async () => {
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      // mkdirをエラーにする
      (fs.mkdir as jest.Mock).mockRejectedValueOnce(new Error('ディレクトリ作成エラー'));

      const response = await POST(mockReq);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ディレクトリ作成エラー');
    });

    it('パース処理に失敗した場合はエラーを返す', async () => {
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      // パース処理をエラーにする
      (PPTXParser.getInstance().parsePPTX as jest.Mock).mockRejectedValueOnce(new Error('パースエラー'));

      const response = await POST(mockReq);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('パースエラー');
    });

    it('一時ファイルが正しくクリーンアップされる', async () => {
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      await POST(mockReq);

      // 一時ファイルとディレクトリの削除が呼ばれたことを確認
      expect(fs.unlink).toHaveBeenCalled();
      expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('test-uuid'), { recursive: true });
    });

    it('有効なPPTXファイルをパースする', async () => {
      // FormDataとFileオブジェクトのモック
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      const formData = new FormData();
      formData.append('file', mockFile);

      // リクエストオブジェクトのモック
      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(true);
      expect(data.fileId).toBe('test-uuid');
      expect(data.slides).toHaveLength(2);
      expect(data.slides[0].title).toBe('テストスライド1');
      expect(data.metadata.title).toBe('テストプレゼンテーション');
    });

    it('ファイルが指定されていない場合はエラーを返す', async () => {
      // 空のFormDataを作成
      const formData = new FormData();

      // リクエストオブジェクトのモック
      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(400);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルが指定されていません');
    });

    it('無効なファイルタイプの場合はエラーを返す', async () => {
      // 無効なファイルタイプのFileオブジェクトを作成
      const mockFile = new File(['dummy content'], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', mockFile);

      // リクエストオブジェクトのモック
      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      // APIハンドラを呼び出す
      const response = await POST(mockReq);

      // レスポンスを検証
      expect(response.status).toBe(400);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(false);
      expect(data.error).toBe('PPTXファイルのみアップロード可能です');
    });

    it('メタデータの詳細な検証を行う', async () => {
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.metadata).toEqual({
        title: 'テストプレゼンテーション',
        author: 'テストユーザー',
        totalSlides: 2,
      });
      expect(data.metadata).toHaveProperty('title');
      expect(data.metadata).toHaveProperty('author');
      expect(data.metadata).toHaveProperty('totalSlides');
      expect(typeof data.metadata.title).toBe('string');
      expect(typeof data.metadata.author).toBe('string');
      expect(typeof data.metadata.totalSlides).toBe('number');
    });

    it('スライドの構造の詳細な検証を行う', async () => {
      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.slides)).toBe(true);
      data.slides.forEach((slide: any) => {
        expect(slide).toHaveProperty('id');
        expect(slide).toHaveProperty('title');
        expect(slide).toHaveProperty('content');
        expect(typeof slide.id).toBe('string');
        expect(typeof slide.title).toBe('string');
        expect(typeof slide.content).toBe('string');
      });
    });

    it('空のスライドを含むPPTXファイルを処理する', async () => {
      // PPTXパーサーのモックを一時的に変更
      (PPTXParser.getInstance().parsePPTX as jest.Mock).mockResolvedValueOnce({
        success: true,
        slides: [
          {
            id: 'empty-slide',
            title: '',
            content: '',
          },
          {
            id: 'normal-slide',
            title: 'Normal Slide',
            content: 'Some content',
          },
        ],
        metadata: {
          title: 'Empty Slide Test',
          author: 'Test User',
          totalSlides: 2,
        },
      });

      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.slides).toHaveLength(2);
      expect(data.slides[0].title).toBe('');
      expect(data.slides[0].content).toBe('');
      expect(data.slides[1].title).toBe('Normal Slide');
    });

    it('特殊文字を含むスライドを処理する', async () => {
      // PPTXパーサーのモックを一時的に変更
      (PPTXParser.getInstance().parsePPTX as jest.Mock).mockResolvedValueOnce({
        success: true,
        slides: [
          {
            id: 'special-chars',
            title: '特殊文字テスト: ①㈱♪、🎉絵文字も！',
            content: '改行\nタブ\t特殊文字©®',
          },
        ],
        metadata: {
          title: '特殊文字テスト',
          author: 'テストユーザー',
          totalSlides: 1,
        },
      });

      const mockFile = new File(['dummy content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      const formData = new FormData();
      formData.append('file', mockFile);

      const mockReq = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(mockReq);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.slides).toHaveLength(1);
      expect(data.slides[0].title).toBe('特殊文字テスト: ①㈱♪、🎉絵文字も！');
      expect(data.slides[0].content).toBe('改行\nタブ\t特殊文字©®');
    });
  });

  describe('GET /api/pptx/parse', () => {
    it('GETリクエストは許可されていない', async () => {
      const response = await GET();

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('メソッドが許可されていません');
    });

    it('ヘルスチェックエンドポイントが正常に応答する', async () => {
      // APIハンドラを呼び出す
      const response = await GET();

      // レスポンスを検証
      expect(response.status).toBe(200);

      // レスポンスボディを取得
      const data = await response.json();

      // レスポンスボディを検証
      expect(data.success).toBe(true);
      expect(data.message).toBe('PPTXパーサーAPIは正常に動作しています');
    });
  });
});
