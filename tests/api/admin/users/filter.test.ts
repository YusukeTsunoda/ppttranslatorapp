import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/users/route';
import { UserRole } from '@prisma/client';
import * as authModule from 'next-auth';

// 管理者セッション
const mockAdminSession = {
  user: {
    id: 'admin-user-id',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.ADMIN
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// 一般ユーザーセッション
const mockUserSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.USER
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// テスト用データ
const mockUsersData = [
  {
    id: 'user-1',
    name: 'Test User 1',
    email: 'user1@example.com',
    emailVerified: new Date('2023-01-01'),
    image: 'https://example.com/user1.jpg',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    credits: 100,
    role: UserRole.USER,
    _count: {
      File: 5,
      TranslationHistory: 10,
      ActivityLog: 20
    }
  },
  {
    id: 'user-2',
    name: 'Test User 2',
    email: 'user2@example.com',
    emailVerified: null,
    image: null,
    createdAt: new Date('2023-02-15'),
    updatedAt: new Date('2023-02-15'),
    credits: 50,
    role: UserRole.USER,
    _count: {
      File: 2,
      TranslationHistory: 5,
      ActivityLog: 10
    }
  },
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    emailVerified: new Date('2022-12-01'),
    image: 'https://example.com/admin.jpg',
    createdAt: new Date('2022-12-01'),
    updatedAt: new Date('2022-12-01'),
    credits: 500,
    role: UserRole.ADMIN,
    _count: {
      File: 10,
      TranslationHistory: 20,
      ActivityLog: 50
    }
  }
];

// モックデータ：クレジット統計
const mockCreditStats = {
  _sum: { creditsUsed: 150 },
  _avg: { creditsUsed: 15 },
  _count: 10
};

// モックデータ：最近のアクティビティ
const mockRecentActivity = {
  type: 'FILE_UPLOAD',
  description: 'ファイルをアップロードしました',
  createdAt: new Date('2023-07-01')
};

// Prismaクライアントのモック
const mockPrisma = {
  user: {
    count: jest.fn().mockResolvedValue(3),
    findMany: jest.fn().mockResolvedValue(mockUsersData)
  },
  translationHistory: {
    aggregate: jest.fn().mockResolvedValue(mockCreditStats)
  },
  activityLog: {
    findFirst: jest.fn().mockResolvedValue(mockRecentActivity),
    create: jest.fn().mockResolvedValue({})
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
jest.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma
}));

describe('管理者用ユーザー一覧API - フィルタリングテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトでは管理者でログインしている状態
    jest.spyOn(authModule, 'getServerSession').mockResolvedValue(mockAdminSession as any);
  });

  it('基本的なクエリでデータを取得できること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.total).toBe(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
    
    // アクティビティログの記録確認
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'admin-user-id',
          type: 'ADMIN_USER_LIST'
        })
      })
    );
  });

  it('ページネーションパラメータが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?page=2&limit=1');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(1);
    
    // Prismaクエリの検証
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1, // (page-1) * limit
        take: 1
      })
    );
  });

  it('検索クエリが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?search=admin');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({
                contains: 'admin'
              })
            }),
            expect.objectContaining({
              email: expect.objectContaining({
                contains: 'admin'
              })
            })
          ])
        })
      })
    );
  });

  it('ロールフィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?role=ADMIN');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: 'ADMIN'
        })
      })
    );
  });

  it('クレジット範囲フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?minCredits=50&maxCredits=200');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          credits: expect.objectContaining({
            gte: 50,
            lte: 200
          })
        })
      })
    );
  });

  it('日付範囲フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?startDate=2023-01-01&endDate=2023-03-01');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
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

  it('メール確認状態フィルターが正しく適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?emailVerified=true');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          emailVerified: expect.objectContaining({
            not: null
          })
        })
      })
    );
  });

  it('複数フィルターが同時に適用されること', async () => {
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users?role=USER&sort=credits&order=desc');
    
    // API実行
    const response = await GET(req);
    
    // 検証
    expect(response.status).toBe(200);
    
    // Prismaクエリの検証
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: 'USER'
        }),
        orderBy: {
          credits: 'desc'
        }
      })
    );
  });

  it('不正なパラメータでエラーレスポンスが返されること', async () => {
    // リクエスト作成 (不正な値)
    const req = new NextRequest('http://localhost:3000/api/admin/users?page=invalid&limit=1000');
    
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
    const req = new NextRequest('http://localhost:3000/api/admin/users');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('一般ユーザーが管理者APIにアクセスすると403エラーが返されること', async () => {
    // 一般ユーザーセッションをモック
    jest.spyOn(authModule, 'getServerSession').mockResolvedValueOnce(mockUserSession as any);
    
    // リクエスト作成
    const req = new NextRequest('http://localhost:3000/api/admin/users');
    
    // API実行
    const response = await GET(req);
    const data = await response.json();
    
    // 検証
    expect(response.status).toBe(403);
    expect(data.error).toBe('アクセス権限がありません');
  });
}); 