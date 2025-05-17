import { NextRequest, NextResponse } from 'next/server';
import { expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

// next-authのモック
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      email: 'test@example.com',
    },
  }),
}));

// fs/promisesのモック
jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue(['test.pptx']),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// child_processのモック
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// filePathManagerのモック
jest.mock('@/lib/utils/file-utils', () => ({
  filePathManager: {
    findActualFilePath: jest.fn().mockResolvedValue('/path/to/test.pptx'),
  },
}));

// app/api/pptx/generate/route.tsのインポート
import { POST } from '@/app/api/pptx/generate/route';

describe('PPTX Generate API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pptx/generate', () => {
    it('認証されていない場合はエラーを返す', async () => {
      // getServerSessionをnullを返すようにモック
      const { getServerSession } = require('next-auth');
      getServerSession.mockResolvedValueOnce(null);

      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test-file',
          translations: [{ text: 'Hello', translation: 'こんにちは' }],
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('必須パラメータが不足している場合はエラーを返す', async () => {
      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Missing required parameters');
    });

    it('元のファイルが見つからない場合は404エラーを返す', async () => {
      // filePathManagerのfindActualFilePathをnullを返すようにモック
      const { filePathManager } = require('@/lib/utils/file-utils');
      filePathManager.findActualFilePath.mockResolvedValueOnce(null);

      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'non-existent',
          translations: [{ text: 'Hello', translation: 'こんにちは' }],
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Original PPTX file not found');
    });

    it('Pythonスクリプトが見つからない場合は500エラーを返す', async () => {
      // fs.accessをエラーを投げるようにモック
      const fs = require('fs/promises');
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));

      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test-file',
          translations: [{ text: 'Hello', translation: 'こんにちは' }],
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Python script not found');
    });

    it('Pythonスクリプトの実行に失敗した場合は500エラーを返す', async () => {
      // execをエラーを投げるようにモック
      const { exec } = require('child_process');
      exec.mockImplementationOnce((cmd, cb) => cb(new Error('Python error')));

      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test-file',
          translations: [{ text: 'Hello', translation: 'こんにちは' }],
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toContain('Failed to generate PPTX');
    });

    it('PPTXファイルを正常に生成する', async () => {
      // execを成功するようにモック
      const { exec } = require('child_process');
      exec.mockImplementationOnce((cmd, cb) => cb(null, { stdout: '{"success":true}' }));

      const mockReq = new Request('http://localhost:3000/api/pptx/generate', {
        method: 'POST',
        body: JSON.stringify({
          fileId: 'test-file',
          translations: [{ text: 'Hello', translation: 'こんにちは' }],
        }),
      }) as NextRequest;

      const response = await POST(mockReq);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.downloadUrl).toBe('/api/download/test-user/test-file_translated.pptx');
    });
  });
});
