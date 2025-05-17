import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth/auth';
import { PPTXParser } from '@/lib/pptx/parser';

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
    
    // 認証モックのデフォルト設定
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'test-user' }
    });

    // PPTXParserモックのデフォルト設定
    (PPTXParser.getInstance as jest.Mock).mockReturnValue({
      parsePPTX: jest.fn().mockResolvedValue({
        success: true,
        slides: [
          { index: 1, texts: [{ text: 'Hello World' }] }
        ]
      })
    });

    // fsモックのデフォルト設定
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);

    // pathモックのデフォルト設定
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  describe('POST /api/pptx/parse', () => {
<<<<<<< HEAD
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
=======
    it('正常なPPTXファイルを解析できる', async () => {
      // テスト用のファイルデータを作成
      const file = new File(['test content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
>>>>>>> c58ec68 (実装途中)
      });

      // FormDataの作成
      const formData = new FormData();
      formData.append('file', file);

      // リクエストの作成
      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      // APIエンドポイントを呼び出し
      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.slides).toHaveLength(1);
      expect(data.slides[0].texts[0].text).toBe('Hello World');
    });

    it('認証されていない場合は401エラーを返す', async () => {
      // 認証モックをnullに設定
      (auth as jest.Mock).mockResolvedValueOnce(null);

      const file = new File(['test content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ログインしてください');
    });

    it('ファイルが指定されていない場合は400エラーを返す', async () => {
      const formData = new FormData();
      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルが指定されていません');
    });

    it('不正なファイルタイプの場合は400エラーを返す', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });
      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('PPTXファイルのみアップロード可能です');
    });

<<<<<<< HEAD
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
=======
    it('ファイルサイズが大きすぎる場合は400エラーを返す', async () => {
      const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
      const formData = new FormData();
      formData.append('file', largeFile);

      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('ファイルサイズは20MB以下にしてください');
    });

    it('パース処理でエラーが発生した場合は500エラーを返す', async () => {
      // PPTXParserのモックをエラーを投げるように設定
      (PPTXParser.getInstance as jest.Mock).mockReturnValue({
        parsePPTX: jest.fn().mockRejectedValue(new Error('パースエラー'))
      });

      const file = new File(['test content'], 'test.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
      const formData = new FormData();
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'POST',
        body: formData
      });

      const response = await POST(req as unknown as NextRequest);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('パースエラー');
>>>>>>> c58ec68 (実装途中)
    });
  });

  describe('GET /api/pptx/parse', () => {
<<<<<<< HEAD
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
=======
    it('GETリクエストは405エラーを返す', async () => {
      const req = new Request('http://localhost:3000/api/pptx/parse', {
        method: 'GET'
      });
>>>>>>> c58ec68 (実装途中)

      const response = await GET(req as unknown as NextRequest);
      expect(response.status).toBe(405);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('メソッドが許可されていません');
    });
  });
});
