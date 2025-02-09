/**
 * PPTXファイルの解析結果を表す型定義
 */

// スライド内のテキスト要素の位置情報
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

// テキスト要素のスタイル情報
export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

// スライド内の個々のテキスト要素
export interface TextElement {
  id: string;
  content: string;
  position: Position;
  style?: TextStyle;
}

// レイアウト要素（シェイプ、プレースホルダーなど）
export interface LayoutElement {
  type: string;
  position: Position;
  placeholder?: string;
}

// スライドのレイアウト情報
export interface LayoutInfo {
  masterLayout: string;
  elements: LayoutElement[];
}

// 1枚のスライドの全情報
export interface SlideContent {
  id: string;
  index: number;
  texts: TextElement[];
  layout: LayoutInfo;
}

// PPTXファイル全体の解析結果
export interface PPTXParseResult {
  slides: SlideContent[];
  metadata: {
    totalSlides: number;
    title?: string;
    author?: string;
    lastModified?: string;
  };
}

// APIレスポンスの型
export interface ParseAPIResponse {
  success: boolean;
  data?: PPTXParseResult;
  error?: string;
}
