// モックの設定
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock('@/lib/utils/file-utils', () => ({
  filePathManager: {
    findActualFilePath: jest.fn(),
    getAbsolutePath: jest.fn((path) => path),
  },
  logFileOperation: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { promises as fs } from 'fs';
import { filePathManager, logFileOperation } from '@/lib/utils/file-utils';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/download/[userId]/[filename]/route';

describe('/api/download/[userId]/[filename]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // テストユーザーの設定
  const testUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  };

  // テストファイルの設定
  const testFile = {
    id: 'test-file-id',
    name: 'test-file.pptx',
    content: Buffer.from('test file content'),
  };

  it('未認証ユーザーのアクセスを拒否する', async () => {
    // getServerSessionのモックを設定
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const { req } = createMocks({
      method: 'GET',
    });

    const response = await GET(req as unknown as NextRequest, {
      params: {
        userId: testUser.id,
        filename: testFile.name,
      },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('認証が必要です');
  });

  it('他のユーザーのファイルへのアクセスを拒否する', async () => {
    // getServerSessionのモックを設定
    (getServerSession as jest.Mock).mockResolvedValue({
      user: testUser,
    });

    const { req } = createMocks({
      method: 'GET',
    });

    const response = await GET(req as unknown as NextRequest, {
      params: {
        userId: 'other-user-id',
        filename: testFile.name,
      },
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('アクセス権限がありません');
  });

  it('存在しないファイルへのアクセスを404で返す', async () => {
    // getServerSessionのモックを設定
    (getServerSession as jest.Mock).mockResolvedValue({
      user: testUser,
    });

    // filePathManagerのモックを設定
    (filePathManager.findActualFilePath as jest.Mock).mockResolvedValue(null);

    const { req } = createMocks({
      method: 'GET',
    });

    const response = await GET(req as unknown as NextRequest, {
      params: {
        userId: testUser.id,
        filename: 'non-existent-file.pptx',
      },
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('ファイルが見つかりません');
  });

  it('正常なファイルダウンロードを処理する', async () => {
    // getServerSessionのモックを設定
    (getServerSession as jest.Mock).mockResolvedValue({
      user: testUser,
    });

    // filePathManagerのモックを設定
    const testFilePath = '/test/path/test-file.pptx';
    (filePathManager.findActualFilePath as jest.Mock).mockResolvedValue(testFilePath);
    (filePathManager.getAbsolutePath as jest.Mock).mockReturnValue(testFilePath);

    // fs.readFileのモックを設定
    (fs.readFile as jest.Mock).mockResolvedValue(testFile.content);

    const { req } = createMocks({
      method: 'GET',
    });

    const response = await GET(req as unknown as NextRequest, {
      params: {
        userId: testUser.id,
        filename: testFile.name,
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    expect(response.headers.get('Content-Disposition')).toBe(
      `attachment; filename="${testFile.name}"`
    );

    const buffer = await response.arrayBuffer();
    expect(Buffer.from(buffer)).toEqual(testFile.content);

    // logFileOperationが呼び出されたことを確認
    expect(logFileOperation).toHaveBeenCalledWith(testUser.id, 'access', testFile.id, true);
  });

  it('ファイル読み込みエラーを処理する', async () => {
    // getServerSessionのモックを設定
    (getServerSession as jest.Mock).mockResolvedValue({
      user: testUser,
    });

    // filePathManagerのモックを設定
    const testFilePath = '/test/path/test-file.pptx';
    (filePathManager.findActualFilePath as jest.Mock).mockResolvedValue(testFilePath);
    (filePathManager.getAbsolutePath as jest.Mock).mockReturnValue(testFilePath);

    // fs.readFileのモックを設定してエラーを投げる
    const testError = new Error('ファイル読み込みエラー');
    (fs.readFile as jest.Mock).mockRejectedValue(testError);

    const { req } = createMocks({
      method: 'GET',
    });

    const response = await GET(req as unknown as NextRequest, {
      params: {
        userId: testUser.id,
        filename: testFile.name,
      },
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('ファイルのダウンロードに失敗しました');
    expect(data.details).toBe('ファイル読み込みエラー');

    // logFileOperationがエラーで呼び出されたことを確認
    expect(logFileOperation).toHaveBeenCalledWith(testUser.id, 'access', testFile.id, false, testError.message);
  });
}); 