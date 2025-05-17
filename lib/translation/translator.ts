import { Language } from '@prisma/client';
import { getAnthropicClient } from '@/lib/api/client';
import { normalizeTranslationResult } from './normalize';

/**
 * テキストを翻訳する関数
 * @param text 翻訳するテキスト
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @param model 使用するモデル（デフォルト: claude-3-sonnet-20241022）
 * @returns 翻訳されたテキスト
 */
export async function translateText(
  text: string,
  sourceLang: Language,
  targetLang: Language,
  model: string = 'claude-3-sonnet-20241022'
): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }

  try {
    // Anthropic APIクライアントを取得
    const client = getAnthropicClient();
    
    // 翻訳プロンプトを作成
    const prompt = createTranslationPrompt(text, sourceLang, targetLang);
    
    // APIリクエストを送信
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.1,
      system: "You are a professional translator. Translate the text accurately while preserving the meaning, tone, and nuance of the original text. Do not add explanations or notes.",
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    // 翻訳結果を取得
    const translationResult = response.content[0].text;
    
    // 翻訳結果を正規化して返す
    return normalizeTranslationResult(translationResult);
  } catch (error) {
    console.error('翻訳エラー:', error);
    throw new Error(`翻訳に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * 複数のテキストを一括翻訳する関数
 * @param texts 翻訳するテキストの配列
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @param model 使用するモデル
 * @returns 翻訳されたテキストの配列
 */
export async function translateTexts(
  texts: string[],
  sourceLang: Language,
  targetLang: Language,
  model: string = 'claude-3-sonnet-20241022'
): Promise<string[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // テキストが少ない場合は一括翻訳
  if (texts.length <= 5 && texts.join(' ').length < 2000) {
    const combinedText = texts.join('\n---\n');
    const translatedCombined = await translateText(combinedText, sourceLang, targetLang, model);
    return translatedCombined.split('\n---\n');
  }

  // テキストが多い場合は並列翻訳
  const promises = texts.map(text => translateText(text, sourceLang, targetLang, model));
  return Promise.all(promises);
}

/**
 * 翻訳プロンプトを作成する関数
 * @param text 翻訳するテキスト
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @returns 翻訳プロンプト
 */
function createTranslationPrompt(
  text: string,
  sourceLang: Language,
  targetLang: Language
): string {
  const languageNames = {
    ja: '日本語',
    en: '英語',
    zh: '中国語',
    ko: '韓国語',
    fr: 'フランス語',
    de: 'ドイツ語',
    es: 'スペイン語',
    it: 'イタリア語',
    ru: 'ロシア語',
    pt: 'ポルトガル語',
  };

  const sourceLanguageName = languageNames[sourceLang] || sourceLang;
  const targetLanguageName = languageNames[targetLang] || targetLang;

  return `以下の${sourceLanguageName}テキストを${targetLanguageName}に翻訳してください。
翻訳のみを出力し、説明や注釈は不要です。

テキスト:
${text}`;
}
