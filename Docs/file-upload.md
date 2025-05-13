# ファイルアップロード機能

このプロジェクトでは、ファイルアップロード処理にformidable v3.5.xを使用しています。

## 概要

formidableライブラリはNode.js環境でファイルアップロードを処理するための堅牢なライブラリです。主な特徴：

- マルチパートフォームデータの解析
- ファイルストリーム処理（メモリ効率が良い）
- 大きなファイルのサポート
- ファイルタイプやサイズの検証
- カスタマイズ可能なファイル名とパス
- プログレッシブパーシング

## 型定義

formidableのバージョン3.5.x向けに、カスタム型定義を提供しています：

```typescript
// @/types/formidable.d.ts
import * as formidable from 'formidable';

declare module 'formidable' {
  // File型の拡張
  export interface File {
    filepath: string;
    originalFilename: string | null;
    newFilename: string;
    mimetype: string | null;
    size: number;
    hashAlgorithm: false | 'sha1' | 'md5' | 'sha256';
    hash?: string;
    // ...
  }
  
  // その他の型定義
  // ...
}
```

## 基本的な使い方

### ユーティリティ関数

プロジェクト内では以下のユーティリティ関数を使用できます：

```typescript
import { parseForm, uploadFilesToUserDir, processFiles } from '@/lib/utils/upload-helpers';
```

### ファイルのアップロード処理

```typescript
// API Routeでの使用例
import { NextRequest, NextResponse } from 'next/server';
import { uploadFilesToUserDir, processFiles } from '@/lib/utils/upload-helpers';

// formidableはEdgeランタイムでは動作しないのでNode.jsランタイムを指定
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ユーザーID（認証から取得）
    const userId = 'user123';
    
    // ファイルをパース
    const [fields, files] = await uploadFilesToUserDir(req as any, userId);
    
    // 処理されたファイル情報を取得
    const uploadedFiles = processFiles(files);
    
    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('アップロードエラー:', error);
    return NextResponse.json({ error: 'アップロード失敗' }, { status: 500 });
  }
}
```

### 高度なオプション設定

```typescript
import { parseForm } from '@/lib/utils/upload-helpers';

// カスタムオプションを指定
const [fields, files] = await parseForm(req as any, {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  keepExtensions: true,
  hash: 'sha256',
  filename: (name, ext) => `custom_${Date.now()}${ext}`
});
```

## フロントエンドの実装例

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('file', file);
      });
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      console.log('アップロード成功:', data);
      
      // 成功時の処理
    } catch (error) {
      console.error('アップロードエラー:', error);
      // エラー時の処理
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <Button 
        onClick={handleUpload}
        disabled={isUploading || files.length === 0}
      >
        {isUploading ? 'アップロード中...' : 'アップロード'}
      </Button>
    </div>
  );
}
```

## 注意事項

1. **Edge Runtime非対応**: formidableはNode.jsランタイムでのみ動作します。Edge Runtimeでは使用できません。
2. **メモリ使用量**: 大きなファイルを処理する際はメモリ使用量に注意してください。
3. **セキュリティ**: ファイルタイプやサイズの制限、およびファイルパスのサニタイズを適切に行ってください。
4. **ディレクトリ権限**: アップロードディレクトリに適切な書き込み権限があることを確認してください。
5. **クリーンアップ**: 一時ファイルを定期的にクリーンアップする仕組みを実装してください。

## 関連ドキュメント

- [formidable GitHub](https://github.com/node-formidable/formidable)
- [formidable API ドキュメント](https://github.com/node-formidable/formidable/blob/master/API.md)
- [ファイルストレージ設計](./file-storage.md) 