interface TranslationRequest {
  texts: string[];
  sourceLanguage: string;
  targetLanguage: string;
  fileId: string;
  slides?: any[];
  model?: string;
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * 翻訳リクエストのバリデーションを行う
 * @param request 翻訳リクエスト
 * @returns バリデーション結果
 */
export function validateTranslationRequest(request: any): ValidationResult {
  // 必須フィールドの存在チェック
  if (!request.texts) {
    return { isValid: false, error: 'テキストが必要です' };
  }
  if (!request.sourceLanguage) {
    return { isValid: false, error: 'ソース言語が必要です' };
  }
  if (!request.targetLanguage) {
    return { isValid: false, error: 'ターゲット言語が必要です' };
  }
  if (!request.fileId) {
    return { isValid: false, error: 'ファイルIDが必要です' };
  }

  // データ型のチェック
  if (!Array.isArray(request.texts)) {
    return { isValid: false, error: 'textsは配列である必要があります' };
  }
  if (typeof request.sourceLanguage !== 'string') {
    return { isValid: false, error: 'sourceLanguageは文字列である必要があります' };
  }
  if (typeof request.targetLanguage !== 'string') {
    return { isValid: false, error: 'targetLanguageは文字列である必要があります' };
  }
  if (typeof request.fileId !== 'string') {
    return { isValid: false, error: 'fileIdは文字列である必要があります' };
  }

  // 空の値のチェック
  if (request.texts.length === 0) {
    return { isValid: false, error: 'テキストが空です' };
  }
  if (request.texts.some((text: string) => !text || text.trim() === '')) {
    return { isValid: false, error: '空のテキストが含まれています' };
  }
  if (request.sourceLanguage.trim() === '') {
    return { isValid: false, error: 'ソース言語が空です' };
  }
  if (request.targetLanguage.trim() === '') {
    return { isValid: false, error: 'ターゲット言語が空です' };
  }
  if (request.fileId.trim() === '') {
    return { isValid: false, error: 'ファイルIDが空です' };
  }

  return { isValid: true, error: null };
}

/**
 * 翻訳結果から余分なテキストを削除する
 * @param text 翻訳結果のテキスト
 * @returns クリーニング済みのテキスト
 */
export function cleanTranslatedText(text: string): string {
  let cleanedText = text.trim();

  // 余分なパターンを削除
  const patterns = [
    /^Here is the translation from .+ to .+:\s*/i,
    /^Translation:\s*/i,
    /^Translated text:\s*/i,
    /^The translation is:\s*/i,
    /^In English:\s*/i,
    /^In Japanese:\s*/i,
    /^The text "([^"]+)" translates to:\s*/i,
    /^The text "([^"]+)" translates to English as:\s*/i,
    /^The text "([^"]+)" can be translated to English as:\s*/i,
    /^The text "([^"]+)" in English is:\s*/i,
    /^The English translation of "([^"]+)" is:\s*/i,
    /^\"(.+)\"$/,
    /^(.+):$/,
  ];

  // 各パターンにマッチする場合は削除
  patterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });

  return cleanedText.trim();
}

/**
 * 翻訳前のテキストを前処理する
 * @param text 翻訳前のテキスト
 * @returns 前処理済みのテキスト
 */
export function preprocessText(text: string): string {
  return text
    .trim() // 前後の空白を削除
    .replace(/\s+/g, ' ') // 連続する空白を1つに
    .replace(/[\r\n]+/g, '\n'); // 連続する改行を1つに
}

/**
 * 翻訳プロンプトを生成する
 * @param text 翻訳対象のテキスト
 * @param sourceLang ソース言語
 * @param targetLang ターゲット言語
 * @returns 翻訳プロンプト
 */
export function generateTranslationPrompt(text: string, sourceLang: string, targetLang: string): string {
  return `あなたは高品質な翻訳エンジンです。以下のテキストを${sourceLang}から${targetLang}に翻訳してください。
元のテキストの意味を正確に保ちながら、自然な${targetLang}に翻訳してください。
フォーマットや記号は保持し、翻訳のみを行ってください。

テキスト: "${text}"

翻訳:`;
} 