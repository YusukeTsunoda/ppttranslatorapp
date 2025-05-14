import { GET } from '@/app/api/history/route';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { Language, TranslationStatus } from '@prisma/client';

// NodeJSでRequestオブジェクトを模倣
global.Request = class MockRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
} as any;

// NextResponseのモック
const originalNextResponse = NextResponse;
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      return {
        status: options?.status || 200,
        json: async () => data,
      };
    }),
  },
}));

// モック
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    translationHistory: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('履歴API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証がない場合は401エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/history');
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: '認証が必要です' });
  });

  it('デフォルトパラメータで履歴を取得できる', async () => {
    // セッションモック
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    // prismaモック
    const mockHistory = [
      {
        id: 'history1',
        createdAt: new Date(),
        file: { originalName: 'test1.pptx' },
      },
      {
        id: 'history2',
        createdAt: new Date(),
        file: { originalName: 'test2.pptx' },
      },
    ];

    (prisma.$transaction as jest.Mock).mockResolvedValue([2, mockHistory]);

    const req = new Request('http://localhost:3000/api/history');
    const response = await GET(req);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data).toHaveLength(2);
    expect(responseData.total).toBe(2);
    expect(responseData.page).toBe(1);
    expect(responseData.limit).toBe(10);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.anything());
  });

  it('クエリパラメータを正しく処理する', async () => {
    // セッションモック
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    // prismaモック
    const mockHistory = [{ id: 'history1', file: { originalName: 'test1.pptx' } }];
    (prisma.$transaction as jest.Mock).mockResolvedValue([1, mockHistory]);

    // クエリパラメータ付きリクエスト
    const req = new Request(
      'http://localhost:3000/api/history?page=2&limit=5&sort=createdAt&order=asc&search=test&startDate=2023-01-01&endDate=2023-12-31&status=COMPLETED&sourceLang=en&targetLang=ja'
    );
    const response = await GET(req);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.page).toBe(2);
    expect(responseData.limit).toBe(5);

    // Prismaトランザクションが正しいパラメータで呼ばれているか確認
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.anything());
  });

  it('無効なページパラメータでは400エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    const req = new Request('http://localhost:3000/api/history?page=invalid');
    const response = await GET(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '無効なページ番号です' });
  });

  it('無効なlimitパラメータでは400エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    const req = new Request('http://localhost:3000/api/history?limit=1000');
    const response = await GET(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '無効な制限数です' });
  });

  it('無効なソートパラメータでは400エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    const req = new Request('http://localhost:3000/api/history?sort=invalidField');
    const response = await GET(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.stringContaining('無効なソートキー') });
  });

  it('無効なorder値では400エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    const req = new Request('http://localhost:3000/api/history?order=invalid');
    const response = await GET(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '無効なソート順序です' });
  });

  it('データベースエラーの場合は500エラーを返す', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('データベースエラー'));

    const req = new Request('http://localhost:3000/api/history');
    const response = await GET(req);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: expect.stringContaining('データベースエラー') });
  });
}); 