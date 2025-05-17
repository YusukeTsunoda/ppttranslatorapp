import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/history/route';
import { translationPrisma } from '@/lib/db/prisma';
import { Language, TranslationStatus, UserRole } from '@prisma/client';
import * as authModule from 'next-auth';

// モックセッション
const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.USER
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// テスト用データ
const mockHistoryData = [
  {
    id: 'history-1',
    userId: 'test-user-id',
    fileId: 'file-1',
    creditsUsed: 10,
    sourceLang: Language.en,
    targetLang: Language.ja,
    model: 'gpt-4',
    pageCount: 5,
    fileSize: 1024 * 1024,
    status: TranslationStatus.COMPLETED,
    processingTime: 2000,
    tags: ['report', 'business'],
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01'),
    file: {
      originalName: 'business-report.pptx'
    }
  },
  {
    id: 'history-2',
    userId: 'test-user-id',
    fileId: 'file-2',
    creditsUsed: 5,
    sourceLang: Language.ja,
    targetLang: Language.en,
    model: 'gpt-3.5',
    pageCount: 2,
    fileSize: 512 * 1024,
    status: TranslationStatus.COMPLETED,
    processingTime: 1000,
    tags: ['presentation', 'tech'],
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2023-06-15'),
    file: {
      originalName: 'tech-presentation.pptx'
    }
  },
  {
    id: 'history-3',
    userId: 'test-user-id',
    fileId: 'file-3',
    creditsUsed: 0,
    sourceLang: Language.en,
    targetLang: Language.fr,
    model: 'gpt-4',
    pageCount: 3,
    fileSize: 768 * 1024,
    status: TranslationStatus.FAILED,
    processingTime: 0,
    tags: ['proposal', 'business'],
    createdAt: new Date('2023-07-20'),
    updatedAt: new Date('2023-07-20'),
    file: {
      originalName: 'project-proposal.pptx'
    }
  }
];

// モックのセットアップ
jest.spyOn(authModule, 'getServerSession').mockResolvedValue(mockSession as any);

describe('履歴API - フィルタリングテスト', () => {
  beforeEach(() => {
    // Prismaのモックをセットアップ
    translationPrisma.translationHistory.findMany = jest.fn().mockResolvedValue(mockHistoryData);
    translationPrisma.translationHistory.count = jest.fn().mockResolvedValue(3);
    translationPrisma.$transaction = jest.fn().mockImplementation(async (queries) => {
      const results = [];
      for (const query of queries) {
        if (typeof query === 'function') {
          results.push(await query(translationPrisma));
        } else {
          results.push(await query);
        }
      }
      return results;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('基本的なクエリでデータを取得できること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(3);
    expect(data.total).toBe(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  it('ページネーションパラメータが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?page=2&limit=1');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(1);
    
    // Prismaクエリの検証
    expect(translationPrisma.$transaction).toHaveBeenCalled();
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1, // (page-1) * limit
        take: 1
      })
    );
  });

  it('検索クエリが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?search=business');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          file: expect.objectContaining({
            originalName: expect.objectContaining({
              contains: 'business'
            })
          })
        })
      })
    );
  });

  it('日付範囲フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?startDate=2023-06-01&endDate=2023-07-31');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        })
      })
    );
  });

  it('ステータスフィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?status=COMPLETED');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED'
        })
      })
    );
  });

  it('言語フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?sourceLang=en&targetLang=ja');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceLang: 'en',
          targetLang: 'ja'
        })
      })
    );
  });

  it('複数フィルターが同時に適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history?status=COMPLETED&sourceLang=en&sort=pageCount&order=asc');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(translationPrisma.translationHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
          sourceLang: 'en'
        }),
        orderBy: {
          pageCount: 'asc'
        }
      })
    );
  });

  it('不正なパラメータでエラーレスポンスが返されること', async () => {
    // リクエスト作成 (不正な値)
    const req = new NextRequest('http://localhost:3000/api/history?page=invalid&limit=1000');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(400);
    expect(data.error).toBe('クエリパラメータが無効です');
  });

  it('不正なソートフィールドでエラーレスポンスが返されること', async () => {
    // リクエスト作成 (不正なソートフィールド)
    const req = new NextRequest('http://localhost:3000/api/history?sort=invalidField');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(400);
    expect(data.error).toBe('クエリパラメータが無効です');
  });

  it('認証されていない場合に401エラーが返されること', async () => {
    // 未認証状態をモック
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce(null);
    
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/history');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });
}); 