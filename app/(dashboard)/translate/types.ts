// セッション関連の型定義
export interface CustomSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  expires: string;
}

export type SessionStatus = 'authenticated' | 'loading' | 'unauthenticated';

// テキスト位置情報の型定義
export interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 画像サイズ情報の型定義
export interface ImageSize {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  containerWidth?: number;
  containerHeight?: number;
}

export interface TextItem {
  text: string;
  position: TextPosition; // x, y, width, height を必ず含む
}

export interface TranslationItem {
  text: string;
  position: TextPosition;
}

export interface Slide {
  index: number;
  imageUrl: string;
  texts: TextItem[];
  translations?: TranslationItem[];
}

// プレビュー用のスライドデータ型定義
export interface SlideData {
  index: number;
  imageUrl: string;
  texts: TextItem[];
  translations?: TranslationItem[];
}

// 翻訳モデルの型定義
export interface TranslationModel {
  value: string;
  label: string;
  description: string;
  premium: boolean;
}
