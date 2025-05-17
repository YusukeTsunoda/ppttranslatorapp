import { POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createPrismaMock, createMockUser, clearAllMocks } from '@/tests/helpers/mockSetup';
import * as uploadHelpers from '@/lib/utils/upload-helpers';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// getTokenのモック
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// upload-helpersのモック
jest.mock('@/lib/utils/upload-helpers', () => ({
  uploadFilesToUserDir: jest.fn(),
  processFiles: jest.fn(),
}));

// console.logのモック
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

const prismaMock = createPrismaMock();
const getTokenMock = getToken as jest.Mock;

describe('POST /api/upload', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  it('should upload file successfully', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
    });

    getTokenMock.mockResolvedValue({
      sub: mockUser.id,
    });

    const mockFile = {
      filepath: path.join('public', 'uploads', mockUser.id, 'test.pptx'),
      originalFilename: 'test.pptx',
      newFilename: '1234567890_test.pptx',
      size: 1024,
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      hash: uuidv4(),
    };

    (uploadHelpers.uploadFilesToUserDir as jest.Mock).mockResolvedValue([
      {},
      { file: mockFile },
    ]);

    (uploadHelpers.processFiles as jest.Mock).mockReturnValue([mockFile]);

    const createdFile = {
      id: mockFile.hash,
      userId: mockUser.id,
      originalName: mockFile.originalFilename,
      storagePath: mockFile.filepath,
      fileSize: mockFile.size,
      mimeType: mockFile.mimetype,
      createdAt: new Date(),
    };

    prismaMock.file.create.mockResolvedValue(createdFile);
    prismaMock.activityLog.create.mockResolvedValue({
      id: 'test-activity-id',
      userId: mockUser.id,
      type: 'FILE_UPLOAD',
      description: '1個のファイルをアップロードしました',
    });

    const formData = new FormData();
    formData.append('file', new Blob(['test file content']), 'test.pptx');

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.files).toHaveLength(1);
    expect(responseBody.files[0]).toEqual({
      id: createdFile.id,
      originalName: createdFile.originalName,
      size: createdFile.fileSize,
      mimeType: createdFile.mimeType,
      createdAt: createdFile.createdAt.toISOString(),
    });

    expect(prismaMock.file.create).toHaveBeenCalledWith({
      data: {
        id: mockFile.hash,
        userId: mockUser.id,
        originalName: mockFile.originalFilename,
        storagePath: mockFile.filepath,
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
      },
    });

    expect(prismaMock.activityLog.create).toHaveBeenCalledWith({
      data: {
        userId: mockUser.id,
        type: 'FILE_UPLOAD',
        description: '1個のファイルをアップロードしました',
        metadata: {
          fileCount: 1,
          fileIds: [createdFile.id],
        },
      },
    });
  });

  it('should return 401 if not authenticated', async () => {
    getTokenMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.append('file', new Blob(['test file content']), 'test.pptx');

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error).toBe('認証が必要です');
  });

  it('should return 400 if no files uploaded', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
    });

    getTokenMock.mockResolvedValue({
      sub: mockUser.id,
    });

    (uploadHelpers.uploadFilesToUserDir as jest.Mock).mockResolvedValue([{}, {}]);
    (uploadHelpers.processFiles as jest.Mock).mockReturnValue([]);

    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('ファイルがアップロードされていません');
  });

  it('should handle upload errors', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
    });

    getTokenMock.mockResolvedValue({
      sub: mockUser.id,
    });

    (uploadHelpers.uploadFilesToUserDir as jest.Mock).mockRejectedValue(
      new Error('Upload failed')
    );

    const formData = new FormData();
    formData.append('file', new Blob(['test file content']), 'test.pptx');

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('ファイルアップロード中にエラーが発生しました');
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const mockUser = createMockUser({
      id: 'test-user-id',
    });

    getTokenMock.mockResolvedValue({
      sub: mockUser.id,
    });

    const mockFile = {
      filepath: path.join('public', 'uploads', mockUser.id, 'test.pptx'),
      originalFilename: 'test.pptx',
      newFilename: '1234567890_test.pptx',
      size: 1024,
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      hash: uuidv4(),
    };

    (uploadHelpers.uploadFilesToUserDir as jest.Mock).mockResolvedValue([
      {},
      { file: mockFile },
    ]);
    (uploadHelpers.processFiles as jest.Mock).mockReturnValue([mockFile]);

    prismaMock.file.create.mockRejectedValue(new Error('Database error'));

    const formData = new FormData();
    formData.append('file', new Blob(['test file content']), 'test.pptx');

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('ファイルアップロード中にエラーが発生しました');
    expect(mockConsoleError).toHaveBeenCalled();
  });
}); 