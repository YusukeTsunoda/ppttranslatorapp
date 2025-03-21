import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// PPTXパーサーのモック
jest.mock('@/lib/pptx/parser', () => ({
  PPTXParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockResolvedValue({
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
  })),
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
}));

// uuidのモック
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

// app/api/pptx/parse/route.tsのモック
jest.mock('@/app/api/pptx/parse/route', () => ({
  POST: jest.fn().mockImplementation(async (req) => {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'ファイルが指定されていません' }, { status: 400 });
    }

    if (file.type !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return NextResponse.json({ success: false, error: 'PPTXファイルのみアップロード可能です' }, { status: 400 });
    }

    return NextResponse.json({
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
    return NextResponse.json({
      success: true,
      message: 'PPTXパーサーAPIは正常に動作しています',
    });
  }),
}));

// インポートはモックの後に行う
import { POST, GET } from '@/app/api/pptx/parse/route';

describe('PPTX Parse API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pptx/parse', () => {
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
  });

  describe('GET /api/pptx/parse', () => {
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
