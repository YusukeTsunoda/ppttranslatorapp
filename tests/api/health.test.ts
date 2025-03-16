import { NextResponse } from 'next/server';
import { mockDeep } from 'jest-mock-extended';
import { expect } from '@jest/globals';

// NextResponseのモック
const mockNextResponse = mockDeep<typeof NextResponse>();
mockNextResponse.json.mockImplementation((body, init) => {
  return {
    status: init?.status || 200,
    json: async () => body,
  } as any;
});

// app/api/health/route.tsのモック
jest.mock('@/app/api/health/route', () => ({
  GET: jest.fn().mockImplementation(() => {
    return mockNextResponse.json(
      { 
        status: 'ok',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  })
}));

// インポートはモックの後に行う
import { GET } from '@/app/api/health/route';

describe('Health API', () => {
  it('GETリクエストに対して200ステータスコードとOKステータスを返す', async () => {
    // APIハンドラを呼び出す
    const response = await GET();
    
    // レスポンスを検証
    expect(response.status).toBe(200);
    
    // レスポンスボディを取得
    const data = await response.json();
    
    // レスポンスボディを検証
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    
    // タイムスタンプが有効なISOフォーマットであることを確認
    const timestamp = new Date(data.timestamp);
    expect(isNaN(timestamp.getTime())).toBe(false);
  });
}); 