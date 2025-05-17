/// <reference types="node" />

// グローバル型定義
declare global {
  // HeadersInit型がグローバルに認識されるようにする
  type HeadersInit = Headers | Record<string, string> | [string, string][] | string[][];
}

// 既存のNodeJS名前空間を拡張する場合もあるので追加
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    // 他の環境変数の型をここに追加できます
    [key: string]: string | undefined;
  }
}

export {}; 