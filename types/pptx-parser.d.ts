declare module 'pptx-parser' {
  /**
   * PPTXファイルからテキストを抽出する関数
   * @param buffer PPTXファイルのバッファ
   * @returns 各スライドのテキスト配列
   */
  export function extractRawText(buffer: Buffer): Promise<string[]>;
}
