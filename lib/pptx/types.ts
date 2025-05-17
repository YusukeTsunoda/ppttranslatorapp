/**
 * PPTXファイルの解析結果を表す型定義
 */

// スライド内のテキスト要素の位置情報
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
}

// フォント情報
export interface Font {
  name: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  superscript: boolean;
  subscript: boolean;
  characterSpacing: number;
  kerning: boolean;
}

// テキストスタイル情報
export interface TextStyle {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number;
  indentation?: number;
  direction?: 'ltr' | 'rtl';
  bulletStyle?: {
    type: 'number' | 'bullet' | 'custom';
    format?: string;
    startAt?: number;
  };
}

// ハイパーリンク情報
export interface Hyperlink {
  url: string;
  tooltip?: string;
}

// アニメーション情報
export interface Animation {
  type: string;
  duration: number;
  delay: number;
  trigger: 'onClick' | 'withPrevious' | 'afterPrevious';
}

// スライド内の個々のテキスト要素
export interface TextElement {
  id: string;
  text: string;
  position: Position;
  type: 'title' | 'subtitle' | 'body' | 'header' | 'footer' | 'text';
  font: Font;
  style?: TextStyle;
  hyperlink?: Hyperlink;
  animation?: Animation;
}

// シェイプ情報
export interface Shape {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  radius?: number; // 円の場合
  points?: { x: number; y: number }[]; // 多角形の場合
}

// 背景情報
export interface Background {
  color: string;
  image: string | null;
  pattern: {
    type: string;
    foreColor: string;
    backColor: string;
  } | null;
  gradient: {
    type: 'linear' | 'radial';
    stops: Array<{
      position: number;
      color: string;
    }>;
    angle?: number;
  } | null;
  transparency: number;
}

// メタデータ情報
export interface Metadata {
  title: string;
  author: string;
  created: string;
  modified: string;
  company: string;
  version: string;
  lastModifiedBy: string;
  revision: number;
  subject: string;
  keywords: string[];
  category: string;
  description: string;
  language: string;
  presentationFormat: string;
  createdApplication: string;
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
  index: number;
  imageUrl: string;
  textElements: TextElement[];
  shapes: Shape[];
  background: Background;
}

// フロントエンド互換のスライド情報
export interface SlideContentFrontend {
  index: number;
  texts: TextElement[];
  imageUrl: string;
  translations?: TextElement[];
}

// PPTXファイル全体の解析結果
export interface PPTXParseResult {
  filename: string;
  totalSlides: number;
  metadata: Metadata;
  slides: SlideContent[];
}

// APIレスポンスの型
export interface ParseAPIResponse {
  success: boolean;
  data?: PPTXParseResult;
  error?: string;
  warnings?: string[];
}

// パース処理のオプション
export interface ParseOptions {
  forceReparse?: boolean;
  extractImages?: boolean;
  imageFormat?: 'png' | 'jpeg';
  imageQuality?: number;
  maxConcurrentProcesses?: number;
  cacheTimeout?: number;
  memoryThreshold?: number;
}
