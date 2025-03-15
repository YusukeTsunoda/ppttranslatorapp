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

// スライド関連の型定義
export interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextItem {
  text: string;
  position: TextPosition;
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

// 翻訳モデルの型定義
export interface TranslationModel {
  value: string;
  label: string;
  description: string;
  premium: boolean;
} 