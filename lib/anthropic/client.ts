import { Anthropic } from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

    return {
      success: true,
      translatedText: message.content[0].type === 'text' ? message.content[0].text : ''
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '翻訳中にエラーが発生しました'
    };
  }
}
