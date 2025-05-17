import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/upload/route';
import { FileStatus, UserRole } from '@prisma/client';
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
const mockFilesData = [
  {
    id: 'file-1',
    userId: 'test-user-id',
    originalName: 'presentation.pptx',
    storagePath: '/uploads/test-user/presentation.pptx',
    fileSize: 1024 * 1024, // 1MB
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    status: FileStatus.READY,
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01'),
    Slide: [
      { _count: {} },
      { _count: {} },
      { _count: {} }
    ],
    TranslationHistory: [
      {
        id: 'history-1',
        status: 'COMPLETED',
        sourceLang: 'en',
        targetLang: 'ja',
        creditsUsed: 10,
        createdAt: new Date('2023-05-01')
      }
    ]
  },
  {
    id: 'file-2',
    userId: 'test-user-id',
    originalName: 'document.pptx',
    storagePath: '/uploads/test-user/document.pptx',
    fileSize: 512 * 1024, // 512KB
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    status: FileStatus.READY,
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2023-06-15'),
    Slide: [
      { _count: {} },
      { _count: {} }
    ],
    TranslationHistory: [
      {
        id: 'history-2',
        status: 'COMPLETED',
        sourceLang: 'ja',
        targetLang: 'en',
        creditsUsed: 5,
        createdAt: new Date('2023-06-15')
      }
    ]
  },
  {
    id: 'file-3',
    userId: 'test-user-id',
    originalName: 'proposal.pptx',
    storagePath: '/uploads/test-user/proposal.pptx',
    fileSize: 768 * 1024, // 768KB
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    status: FileStatus.PROCESSING,
    createdAt: new Date('2023-07-20'),
    updatedAt: new Date('2023-07-20'),
    Slide: [],
    TranslationHistory: []
  }
];

// モックのセットアップ
jest.spyOn(authModule, 'getServerSession').mockResolvedValue(mockSession as any);

// Prismaクライアントのモック
const mockPrisma = {
  file: {
    count: jest.fn().mockResolvedValue(3),
    findMany: jest.fn().mockResolvedValue(mockFilesData)
  },
  $transaction: jest.fn().mockImplementation(async (queries) => {
    const results = [];
    for (const query of queries) {
      if (typeof query === 'function') {
        results.push(await query(mockPrisma));
      } else {
        results.push(await query);
      }
    }
    return results;
  })
};

// グローバルモックの設定
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    FileStatus: {
      PROCESSING: 'PROCESSING',
      READY: 'READY',
      ERROR: 'ERROR'
    },
    UserRole: {
      USER: 'USER',
      ADMIN: 'ADMIN'
    }
  };
});

describe('ファイル一覧API - フィルタリングテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('基本的なクエリでデータを取得できること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload');
    
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
    const req = new NextRequest('http://localhost:3000/api/upload?page=2&limit=1');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(1);
    
    // Prismaクエリの検証
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1, // (page-1) * limit
        take: 1
      })
    );
  });

  it('検索クエリが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?search=presentation');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          originalName: expect.objectContaining({
            contains: 'presentation'
          })
        })
      })
    );
  });

  it('ステータスフィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?status=READY');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'READY'
        })
      })
    );
  });

  it('ファイルサイズフィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?minFileSize=500000&maxFileSize=1000000');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fileSize: expect.objectContaining({
            gte: 500000,
            lte: 1000000
          })
        })
      })
    );
  });

  it('日付範囲フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?startDate=2023-06-01&endDate=2023-07-31');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
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

  it('MIMEタイプフィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?mimeType=presentation');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mimeType: expect.objectContaining({
            contains: 'presentation'
          })
        })
      })
    );
  });

  it('複数フィルターが同時に適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/upload?status=READY&sort=fileSize&order=asc');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'READY'
        }),
        orderBy: {
          fileSize: 'asc'
        }
      })
    );
  });

  it('不正なパラメータでエラーレスポンスが返されること', async () => {
    // リクエスト作成 (不正な値)
    const req = new NextRequest('http://localhost:3000/api/upload?page=invalid&limit=1000');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(400);
    expect(data.error).toBe('クエリパラメータが無効です');
  });

  it('不正なソートフィールドでエラーレスポンスが返されること', async () => {
    // リクエスト作成 (不正なソートフィールド)
    const req = new NextRequest('http://localhost:3000/api/upload?sort=invalidField');
    
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
    const req = new NextRequest('http://localhost:3000/api/upload');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });
}); 