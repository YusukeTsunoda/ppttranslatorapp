import { Anthropic } from '@anthropic-ai/sdk';

// Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export type TranslationResult = {
  success: boolean;
  translatedText?: string;
  error?: string;
};

export async function translateText(text: string, fromLang: string, toLang: string): Promise<TranslationResult> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate the following text from ${fromLang} to ${toLang}. Maintain the original formatting and professional tone:\n\n${text}`
      }]
    });

    if (!message.content[0] || message.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }

    return {
      success: true,
      translatedText: message.content[0].text
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '翻訳中にエラーが発生しました'
    };
  }
}
