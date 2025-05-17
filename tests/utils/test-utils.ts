import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';

// Prismaのモック
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  file: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  translationHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

// ファイルシステムのモック
export const mockFs = {
  ...fs,
  createReadStream: jest.fn(),
  existsSync: jest.fn(),
  promises: {
    ...fs.promises,
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
};

// Next.jsのAPIルートヘルパー
export const createMockRequest = (method: string, body?: any, headers?: HeadersInit): NextRequest => {
  const req = new NextRequest(new URL('http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
  return req;
};

export const createMockResponse = () => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as NextResponse;
}; 