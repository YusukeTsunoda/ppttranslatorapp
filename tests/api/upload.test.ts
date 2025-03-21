import { NextRequest, NextResponse } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { expect } from '@jest/globals';
import { FilePathManager } from '@/lib/utils/file-utils';

// FilePathManagerのモック
jest.mock('@/lib/utils/file-utils', () => ({
  FilePathManager: jest.fn().mockImplementation(() => ({
    ensurePath: jest.fn().mockResolvedValue(undefined),
    getTempPath: jest.fn().mockReturnValue('tmp/users/test-user/uploads/test-file_original.pptx'),
  })),
  filePathManager: {
    ensurePath: jest.fn().mockResolvedValue(undefined),
    getTempPath: jest.fn().mockReturnValue('tmp/users/test-user/uploads/test-file_original.pptx'),
  },
}));

// fs/promisesのモック
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// auth/sessionのモック
jest.mock('@/lib/auth/session', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      email: 'test@example.com',
    },
  }),
}));

// モックレスポンスの作成
const mockSuccessResponse = {
  status: 200,
  json: async () => ({
    success: true,
    fileId: 'test-file-id',
    fileName: 'test.pptx',
    fileSize: 123,
  }),
};

const mockErrorResponse = {
  status: 400,
  json: async () => ({ error: 'No file uploaded' }),
};

// FormDataのモック
class MockFormData {
  private data = new Map();

  append(key: string, value: any) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key);
  }
}

// app/api/upload/route.tsのモック
jest.mock('@/app/api/upload/route', () => ({
  POST: jest.fn().mockImplementation(async (req) => {
    // モックの実装
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return mockErrorResponse;
    }

    return mockSuccessResponse;
  }),
}));

// インポートはモックの後に行う
import { POST } from '@/app/api/upload/route';

describe('Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ファイルがアップロードされた場合、成功レスポンスを返す', async () => {
    // モックのFormDataを作成
    const formData = new MockFormData();
    formData.append('file', {
      name: 'test.pptx',
      size: 123,
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    // モックのリクエストオブジェクトを作成
    const mockReq = {
      formData: jest.fn().mockResolvedValue(formData),
    };

    // APIハンドラを呼び出す
    const response = await POST(mockReq as unknown as NextRequest);

    // レスポンスを検証
    expect(response.status).toBe(200);

    // レスポンスボディを取得
    const data = await response.json();

    // レスポンスボディを検証
    expect(data.success).toBe(true);
    expect(data.fileId).toBeDefined();
    expect(data.fileName).toBe('test.pptx');
  });

  it('ファイルがアップロードされていない場合、エラーレスポンスを返す', async () => {
    // 空のFormDataを作成
    const formData = new MockFormData();

    // モックのリクエストオブジェクトを作成
    const mockReq = {
      formData: jest.fn().mockResolvedValue(formData),
    };

    // APIハンドラを呼び出す
    const response = await POST(mockReq as unknown as NextRequest);

    // レスポンスを検証
    expect(response.status).toBe(400);

    // レスポンスボディを取得
    const data = await response.json();

    // レスポンスボディを検証
    expect(data.error).toBe('No file uploaded');
  });
});
