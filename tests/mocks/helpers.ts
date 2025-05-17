// tests/mocks/helpers.ts
// テスト用のモックヘルパー関数

import { NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

/**
 * モックファイルを作成するヘルパー関数
 * @param name ファイル名
 * @param size ファイルサイズ（バイト）
 * @param type MIMEタイプ
 * @param lastModified 最終更新日時
 * @returns File オブジェクト
 */
export function createMockFile(
  name: string,
  size: number,
  type: string,
  lastModified: Date = new Date()
): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'lastModified', { value: lastModified.getTime() });
  return file;
}

/**
 * モックPPTXファイルを作成するヘルパー関数
 * @param name ファイル名（デフォルト: test.pptx）
 * @param size ファイルサイズ（デフォルト: 1024バイト）
 * @returns File オブジェクト
 */
export function createMockPPTXFile(name: string = 'test.pptx', size: number = 1024): File {
  return createMockFile(
    name,
    size,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

/**
 * モックユーザーセッションを作成するヘルパー関数
 * @param overrides セッション情報のオーバーライド
 * @returns Session オブジェクト
 */
/**
 * モックユーザーセッションを作成するヘルパー関数
 * @param overrides セッション情報のオーバーライド
 * @returns Session オブジェクト
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  // 拡張されたSession型を使用するために型アサーションを使用
  return {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: 'user',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後
    ...overrides,
  } as Session;
}

/**
 * モックJWTトークンを作成するヘルパー関数
 * @param overrides JWTトークン情報のオーバーライド
 * @returns JWT オブジェクト
 */
export function createMockJWT(overrides: Partial<JWT> = {}): JWT {
  return {
    name: 'Test User',
    email: 'test@example.com',
    sub: 'user-123',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24時間後
    jti: 'mock-jwt-id',
    ...overrides,
  };
}

/**
 * モックAPIレスポンスを作成するヘルパー関数
 * @param data レスポンスデータ
 * @param status HTTPステータスコード
 * @returns NextResponse オブジェクト
 */
export function createMockAPIResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status }) as NextResponse;
}

/**
 * モックエラーレスポンスを作成するヘルパー関数
 * @param message エラーメッセージ
 * @param type エラータイプ
 * @param status HTTPステータスコード
 * @returns NextResponse オブジェクト
 */
export function createMockErrorResponse(
  message: string,
  type: string = 'UNKNOWN',
  status: number = 500
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        type,
      },
    },
    { status }
  ) as NextResponse;
}

/**
 * モックスライドデータを作成するヘルパー関数
 * @param count スライド数
 * @returns スライドデータの配列
 */
export function createMockSlides(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    index: i,
    title: `Slide ${i + 1}`,
    content: `Content for slide ${i + 1}`,
    imageUrl: `/api/slides/test-file-id/slides/slide_${i + 1}.png`,
    texts: [
      {
        id: `text-${i}-1`,
        content: `テキスト ${i + 1}-1`,
        x: 100,
        y: 100,
        width: 300,
        height: 50,
      },
      {
        id: `text-${i}-2`,
        content: `テキスト ${i + 1}-2`,
        x: 100,
        y: 200,
        width: 300,
        height: 50,
      },
    ],
  }));
}

/**
 * モック翻訳結果を作成するヘルパー関数
 * @param sourceTexts 元のテキスト配列
 * @param targetLanguage 翻訳先言語
 * @returns 翻訳結果オブジェクト
 */
export function createMockTranslation(sourceTexts: string[], targetLanguage: string = 'en') {
  const translations = sourceTexts.map((text, index) => {
    // 簡易的な翻訳シミュレーション
    let translated = '';
    if (targetLanguage === 'en') {
      translated = `Translated text ${index + 1}: ${text}`;
    } else if (targetLanguage === 'zh') {
      translated = `翻译文本 ${index + 1}: ${text}`;
    } else {
      translated = `Translation ${index + 1}: ${text}`;
    }
    
    return {
      sourceText: text,
      translatedText: translated,
    };
  });
  
  return {
    success: true,
    translations,
    targetLanguage,
  };
}

/**
 * 非同期処理の待機ヘルパー関数
 * @param ms 待機時間（ミリ秒）
 * @returns Promise
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * テスト用のモックストリームレスポンスを作成
 * @param chunks 送信するチャンク配列
 * @param options オプション設定
 * @returns ReadableStream
 */
export function createMockStream(
  chunks: string[],
  options: { delay?: number; error?: Error } = {}
): ReadableStream {
  const { delay = 10, error } = options;
  
  return new ReadableStream({
    async start(controller) {
      if (error) {
        controller.error(error);
        return;
      }
      
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
        if (delay > 0) {
          await wait(delay);
        }
      }
      controller.close();
    },
  });
}

/**
 * ファイルパスを新形式に変換するヘルパー関数
 * @param userId ユーザーID
 * @param fileId ファイルID
 * @returns 新形式のファイルパス
 */
export function getNewFormatPath(userId: string, fileId: string): string {
  return `/tmp/users/${userId}/${fileId}/slides`;
}

/**
 * ファイルパスを旧形式に変換するヘルパー関数（テスト用）
 * @param userId ユーザーID
 * @param fileId ファイルID
 * @returns 旧形式のファイルパス
 */
export function getOldFormatPath(userId: string, fileId: string): string {
  return `/tmp/users/${userId}/slides/${fileId}`;
}
