import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic/client';

export async function POST() {
  try {
    // 簡単な接続テスト
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Say "connected" if you can read this.'
      }]
    });

    return NextResponse.json({ 
      success: true, 
      message: 'API connection successful' 
    });
  } catch (error) {
    console.error('API test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'API connection failed' 
    }, { status: 500 });
  }
}
