import { NextRequest, NextResponse } from 'next/server';

// Next.jsのAPIルートとレスポンスに関する型定義
declare module 'next/server' {
  interface NextResponse {
    /**
     * レスポンスボディをJSONとして取得するメソッド
     */
    json(): Promise<any>;
    
    /**
     * レスポンスのステータスコード
     */
    status: number;
    
    /**
     * レスポンスのヘッダー
     */
    headers: Headers;
  }

  /**
   * NextResponseのjsonメソッドの型定義
   */
  namespace NextResponse {
    function json(
      body: any,
      init?: { status?: number; headers?: HeadersInit; statusText?: string }
    ): NextResponse;
    
    function redirect(url: string | URL, init?: { status?: number }): NextResponse;
    
    function rewrite(url: string | URL, init?: { status?: number }): NextResponse;
    
    function next(init?: { status?: number; headers?: HeadersInit }): NextResponse;
  }
}

// APIハンドラー関数の型定義
declare global {
  /**
   * GETリクエストハンドラーの型定義
   */
  type GETHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * POSTリクエストハンドラーの型定義
   */
  type POSTHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * PUTリクエストハンドラーの型定義
   */
  type PUTHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * DELETEリクエストハンドラーの型定義
   */
  type DELETEHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * PATCHリクエストハンドラーの型定義
   */
  type PATCHHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * OPTIONSリクエストハンドラーの型定義
   */
  type OPTIONSHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
  
  /**
   * HEADリクエストハンドラーの型定義
   */
  type HEADHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;
}

export {};
