// tests/types/file-utils.d.ts
// file-utils.tsの型定義拡張

declare module '@/lib/utils/file-utils' {
  // ファイルタイプの定義
  export type FileType = 'original' | 'translated';
  
  // リトライオプションの型定義
  export interface RetryOptions {
    maxRetries: number;
    delay: number;
    onError?: (error: Error, attempt: number) => void;
  }
  
  // ディレクトリパスの型定義
  export interface DirectoryPaths {
    uploadDir: string;
    slidesDir: string;
  }
}
