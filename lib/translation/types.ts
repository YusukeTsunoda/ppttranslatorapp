/**
 * 翻訳モジュールで使用する共通型定義
 */

import { Prisma, Language, TranslationStatus } from '@prisma/client';

// Prismaモデルの型定義
export type FileModel = Prisma.FileGetPayload<{}>;
export type UserModel = Prisma.UserGetPayload<{}>;
export type TranslationHistoryModel = Prisma.TranslationHistoryGetPayload<{}>;

// 翻訳リクエスト型
export interface TranslationRequest {
  texts: string[];
  sourceLang: Language;
  targetLang: Language;
  fileId: string;
  fileName?: string;
  slides?: SlideData[];
  model?: string;
}

// バリデーション結果型
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// スライドデータ型
export interface SlideData {
  slideIndex: number;
  texts: SlideTextData[];
  [key: string]: any;
}

// スライドテキストデータ型
export interface SlideTextData {
  index: number;
  text: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: Record<string, any>;
  [key: string]: any;
}

// 構造化された翻訳結果型
export interface StructuredTranslation {
  slideIndex: number;
  texts: {
    index: number;
    originalText: string;
    translatedText: string;
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    style?: Record<string, any>;
  }[];
}

// 翻訳レスポンス型
export interface TranslationResponse {
  success: boolean;
  isPartial: boolean;
  error?: string;
  detail?: string;
  translations: string[];
  translatedSlides: StructuredTranslation[];
  metadata: {
    sourceLang: Language;
    targetLang: Language;
    model: string;
    completedCount: number;
    totalCount: number;
    processingTimeMs: number;
  };
}

// 翻訳履歴データ型
export interface TranslationHistoryData {
  id: string;
  userId: string;
  fileId: string;
  fileName: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  status: TranslationStatus;
  model: string;
  textCount: number;
  translatedCount: number;
  processingTimeMs: number;
  error: string | null;
}

// 翻訳エラーコンテキスト型
export interface TranslationErrorContext {
  userId?: string;
  fileId?: string;
  operation?: string;
  textIndex?: number;
  totalTexts?: number;
  [key: string]: any;
}

// 翻訳品質チェック結果型
export interface TranslationQualityResult {
  isValid: boolean;
  issues: string[];
}

// 部分的な翻訳結果型
export interface PartialTranslationResult {
  translatedSlides: StructuredTranslation[];
  error: string;
  isPartial: boolean;
}
