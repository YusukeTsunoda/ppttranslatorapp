import { NextRequest, NextResponse } from 'next/server';
import { mockPrisma } from './db';
import { createAuthError, createValidationError } from './error';

export const createMockRequest = (method: string, body?: any, headers?: HeadersInit): NextRequest => {
  const req = new NextRequest(new URL('http://localhost:3000'), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
  return req;
};

export const createMockResponse = (status = 200, data?: any) => {
  return NextResponse.json(data, { status });
};

export const mockAuthMiddleware = jest.fn().mockImplementation((req: NextRequest) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw createAuthError('認証が必要です');
  }
  return { userId: 'test-user-id', role: 'USER' };
});

export const mockValidateBody = jest.fn().mockImplementation((body: any, schema: any) => {
  if (!body) {
    throw createValidationError('リクエストボディが必要です');
  }
  return body;
}); 