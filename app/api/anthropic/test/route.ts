import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic/client';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST() {
  try {
    const anthropic = getAnthropicClient();
    // 簡単な接続テスト
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Say "connected" if you can read this.'
      }]
    });

    if (!message.content[0] || message.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API connection successful',
      response: message.content[0].text
    });
  } catch (error) {
    console.error('API test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'API connection failed'
    }, { status: 500 });
  }
}
