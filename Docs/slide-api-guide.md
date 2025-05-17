# スライドAPI ガイド

## 概要

スライドAPIは、PowerPointプレゼンテーションから生成されたスライド画像を取得するためのエンドポイントを提供します。このAPIは、認証されたユーザーのみがアクセスでき、スライドの表示やプレビューに使用されます。

## API仕様

### スライド画像の取得

**エンドポイント**: `GET /api/slides/{fileId}/slides/{imageName}`

**認証**: 必須

**パスパラメータ**:
- `fileId`: スライドが属するファイルのID
- `imageName`: 取得するスライド画像の名前（例: `1.png`、`2.png`など）

**クエリパラメータ**:
- `width`: 画像の最大幅（オプション）
- `height`: 画像の最大高さ（オプション）
- `quality`: 画像の品質（オプション、1-100の範囲）

**レスポンス**:
- Content-Type: `image/png`（または適切な画像形式）
- ステータスコード: 200 OK

**エラーレスポンス**:
```json
{
  "error": "ERROR_CODE",
  "message": "エラーメッセージ",
  "timestamp": "2024-04-15T12:34:56Z"
}
```

**エラーコード**:
- `UNAUTHORIZED`: 認証が必要です
- `NOT_FOUND`: ファイルが見つかりません
- `BAD_REQUEST`: 無効なパス形式です
- `INTERNAL_SERVER_ERROR`: サーバーエラーが発生しました

### 旧形式のパスサポート（リダイレクト）

**エンドポイント**: `GET /api/slides/{fileId}/{imageName}`

**認証**: 必須

**パスパラメータ**:
- `fileId`: スライドが属するファイルのID
- `imageName`: 取得するスライド画像の名前（例: `slide_1.png`、`slide_2.png`など）

**動作**:
- 新形式のパス `/api/slides/{fileId}/slides/{imageName}` にリダイレクトします
- ステータスコード: 307 Temporary Redirect
- 認証情報は保持されます

## 使用例

### フロントエンド（React）での使用例

```tsx
// スライド画像を表示するコンポーネント
const SlideImage = ({ fileId, slideNumber }) => {
  // 画像のURLを構築
  const imageUrl = `/api/slides/${fileId}/slides/${slideNumber}.png`;
  
  return (
    <img 
      src={imageUrl} 
      alt={`スライド ${slideNumber}`}
      crossOrigin="anonymous" // 認証情報を含めるために必要
      className="max-w-full"
    />
  );
};

// fetch APIを使用して画像を取得する例
const fetchSlideImage = async (fileId, slideNumber) => {
  try {
    const response = await fetch(`/api/slides/${fileId}/slides/${slideNumber}.png`, {
      credentials: 'include' // 認証情報を含める
    });
    
    if (!response.ok) {
      throw new Error('画像の取得に失敗しました');
    }
    
    // Blobとして画像を取得
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
  } catch (error) {
    console.error('スライド画像の取得エラー:', error);
    return null;
  }
};
```

### 旧形式から新形式への移行ガイド

#### 移行の背景

スライドAPIのパス形式が以下のように変更されました：

- **旧形式**: `/api/slides/{fileId}/{imageName}`
- **新形式**: `/api/slides/{fileId}/slides/{imageName}`

この変更は、APIの一貫性を向上させ、ファイルパス構造をより論理的にするために行われました。

#### 移行手順

1. **フロントエンドコードの更新**:
   すべてのスライド画像URLを新形式に更新します。

   ```diff
   - const imageUrl = `/api/slides/${fileId}/${slideNumber}.png`;
   + const imageUrl = `/api/slides/${fileId}/slides/${slideNumber}.png`;
   ```

2. **画像名の形式変更**:
   旧形式では `slide_1.png` のような形式でしたが、新形式では単に `1.png` となります。

   ```diff
   - const imageName = `slide_${slideNumber}.png`;
   + const imageName = `${slideNumber}.png`;
   ```

3. **後方互換性**:
   旧形式のURLは引き続き機能しますが、新形式にリダイレクトされます。ただし、パフォーマンスを最適化するために、できるだけ早く新形式に移行することをお勧めします。

## ベストプラクティス

1. **認証情報の含め方**:
   - fetchリクエストには必ず `credentials: 'include'` を含めてください
   - img要素には `crossOrigin="anonymous"` 属性を追加してください

2. **エラーハンドリング**:
   - 画像の読み込みエラーに対処するためのフォールバックを実装してください
   - 認証エラーが発生した場合は、ログインページにリダイレクトするなどの処理を行ってください

3. **パフォーマンス最適化**:
   - 画像の遅延ロードを実装して、初期ロード時間を短縮してください
   - 必要に応じて、width/heightパラメータを使用して画像サイズを最適化してください

4. **キャッシュの活用**:
   - ブラウザキャッシュを活用するために、Cache-Controlヘッダーを適切に設定してください
   - 同じスライド画像を複数回リクエストする場合は、クライアント側でキャッシュを実装してください
