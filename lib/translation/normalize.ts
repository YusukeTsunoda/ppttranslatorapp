/**
 * 翻訳結果を正規化する関数
 * APIからの応答に含まれる余分なテキストを削除します
 */
export function normalizeTranslationResult(translationResult: string): string {
  if (!translationResult) return '';

  let normalized = translationResult;

  // 「Here is the translation from Japanese to English:」などのパターンを削除
  normalized = normalized.replace(/^(Here is the translation from .+ to .+:)(\s*)/i, '');
  
  // 「The text "..." translates to:」のようなパターンを削除
  normalized = normalized.replace(/^(The text ["'].*["'] translates to:)(\s*)/i, '');
  
  // 引用符で囲まれたテキストから引用符を削除
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.substring(1, normalized.length - 1);
  }
  
  // ダブルコロンで終わるパターンを削除
  normalized = normalized.replace(/^(.*:)(\s*)/i, '');
  
  // 先頭と末尾の空白を削除
  normalized = normalized.trim();
  
  return normalized;
}
