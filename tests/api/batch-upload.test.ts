import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Prismaのモック
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    batchJob: {
      create: jest.fn().mockResolvedValue({
        id: 'test-job-id',
        userId: 'test-user',
        status: 'PENDING',
        totalFiles: 2,
        processedFiles: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-job-id',
        userId: 'test-user',
        status: 'PENDING',
        totalFiles: 2,
        processedFiles: 0,
        options: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  })),
}));

// next-auth/jwtのモック
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
  }),
}));

// APIロギングのモック
jest.mock('@/lib/utils/api-logging', () => ({
  withAPILogging: (handler: any) => handler,
}));

// app/api/batch-upload/route.tsのインポート
import { POST, GET } from '@/app/api/batch-upload/route';

describe('Batch Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/batch-upload', () => {
    it('認証されていない場合はエラーを返す', async () => {
      // getTokenをnullを返すようにモック
      const { getToken } = require('next-auth/jwt');
      getToken.mockResolvedValueOnce(null);

      const mockReq = new Request('http://localhost:3000/api/batch-upload', {
        method: 'POST',
        body: JSON.stringify({ files: ['file1.pptx', 'file2.pptx'] }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('認証が必要です');
    });

    it('ファイルリストが空の場合はエラーを返す', async () => {
      const mockReq = new Request('http://localhost:3000/api/batch-upload', {
        method: 'POST',
        body: JSON.stringify({ files: [] }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('ファイルが指定されていません');
    });

    it('バッチジョブを正常に作成する', async () => {
      const mockReq = new Request('http://localhost:3000/api/batch-upload', {
        method: 'POST',
        body: JSON.stringify({
          files: ['file1.pptx', 'file2.pptx'],
          options: { targetLang: 'en' },
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobId).toBe('test-job-id');
      expect(data.message).toBe('バッチジョブが登録されました');
      expect(data.estimatedTime).toBe(4); // 2ファイル × 2分
    });

    it('バッチジョブ作成時にエラーが発生した場合は500エラーを返す', async () => {
      // Prismaのcreateメソッドをエラーを投げるようにモック
      const prisma = new PrismaClient();
      prisma.batchJob.create = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      const mockReq = new Request('http://localhost:3000/api/batch-upload', {
        method: 'POST',
        body: JSON.stringify({ files: ['file1.pptx'] }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('サーバーエラーが発生しました');
    });
  });

  describe('GET /api/batch-upload', () => {
    it('ジョブIDが指定されていない場合はエラーを返す', async () => {
      const mockReq = new Request('http://localhost:3000/api/batch-upload') as NextRequest;

      const response = await GET(mockReq);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('ジョブIDが指定されていません');
    });

    it('存在しないジョブIDの場合は404エラーを返す', async () => {
      // findUniqueメソッドをnullを返すようにモック
      const prisma = new PrismaClient();
      prisma.batchJob.findUnique = jest.fn().mockResolvedValueOnce(null);

      const mockReq = new Request('http://localhost:3000/api/batch-upload?jobId=non-existent') as NextRequest;

      const response = await GET(mockReq);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('指定されたジョブが見つかりません');
    });

    it('ジョブの状態を正常に取得する', async () => {
      const mockReq = new Request('http://localhost:3000/api/batch-upload?jobId=test-job-id') as NextRequest;

      const response = await GET(mockReq);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobId).toBe('test-job-id');
      expect(data.status).toBe('PENDING');
      expect(data.progress).toBe(0);
      expect(data.totalFiles).toBe(2);
      expect(data.processedFiles).toBe(0);
    });

    it('ジョブ取得時にエラーが発生した場合は500エラーを返す', async () => {
      // findUniqueメソッドをエラーを投げるようにモック
      const prisma = new PrismaClient();
      prisma.batchJob.findUnique = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      const mockReq = new Request('http://localhost:3000/api/batch-upload?jobId=test-job-id') as NextRequest;

      const response = await GET(mockReq);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('サーバーエラーが発生しました');
    });
  });
}); 