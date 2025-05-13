# API リファレンス

## 目次

1. [認証API](#認証api)
   - [サインイン](#サインイン)
   - [サインアウト](#サインアウト)
   - [サインアップ](#サインアップ)
   - [パスワードリセット](#パスワードリセット)
   - [セッション検証](#セッション検証)

2. [ユーザーAPI](#ユーザーapi)
   - [プロフィール取得](#プロフィール取得)
   - [プロフィール更新](#プロフィール更新)
   - [アバター更新](#アバター更新)

3. [翻訳API](#翻訳api)
   - [ファイルアップロード](#ファイルアップロード)
   - [スライド取得](#スライド取得)
   - [翻訳実行](#翻訳実行)
   - [翻訳済みファイルダウンロード](#翻訳済みファイルダウンロード)

4. [エラーハンドリング](#エラーハンドリング)
   - [エラーレスポンスの形式](#エラーレスポンスの形式)
   - [エラーコード](#エラーコード)
   - [エラー処理のベストプラクティス](#エラー処理のベストプラクティス)

5. [認証と認可](#認証と認可)
   - [トークンの仕組み](#トークンの仕組み)
   - [トークン更新](#トークン更新)
   - [アクセス制御](#アクセス制御)

### バッチアップロードAPI

**エンドポイント**: POST /api/batch-upload  
**リクエスト**: multipart/form-data, files[]  
**レスポンス**: { jobId: string, accepted: number, rejected: number }

### APIキー管理API

- GET /api/api-keys
- POST /api/api-keys
- DELETE /api/api-keys/:id

**レスポンス例**:
```json
[
  { "id": "dummy", "key": "xxxx-xxxx", "isActive": true }
]
```

### APIキー使用量監視API

- GET /api/api-keys/usage
- 認証ユーザーのAPIキーごとの使用量（tokenCount, apiCalls, month, year）を返す
- レスポンス例:
```json
[
  { "userId": "user1", "tokenCount": 100, "apiCalls": 10, "month": 4, "year": 2025 }
]
```

### 請求書PDF生成API

- POST /api/invoice/generate
- リクエスト: { userId, amount, items, ... }
- レスポンス: PDFバイナリ

### 請求書メール送信API

- POST /api/invoice/send
- リクエスト: { to, subject, pdfBase64 }
- レスポンス: { success: true, message: string } または { error: string, detail?: string }

### 統計データAPI

- GET /api/statistics
- レスポンス: { dailyTranslations: number[], creditUsage: number[] }

### 統計エクスポートAPI

- GET /api/statistics/export
- レスポンス: CSVファイル（userId,tokenCount,apiCalls,month,year...）

---

## 認証API

認証APIは、ユーザーの認証と認可を管理するためのエンドポイントを提供します。

### サインイン

ユーザーの認証情報を検証し、セッショントークンを発行します。

**エンドポイント**: `POST /api/auth/signin`

**リクエスト**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:

```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "expires": "2023-12-31T23:59:59Z"
}
```

**エラーレスポンス**:

```json
{
  "error": "UNAUTHORIZED",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### サインアウト

現在のセッションを終了し、セッショントークンを無効化します。

**エンドポイント**: `POST /api/auth/signout`

**レスポンス**:

```json
{
  "success": true,
  "message": "サインアウトしました"
}
```

### サインアップ

新しいユーザーアカウントを作成します。

**エンドポイント**: `POST /api/auth/signup`

**リクエスト**:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

**エラーレスポンス**:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "このメールアドレスは既に登録されています",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### パスワードリセット

パスワードリセットリンクをユーザーのメールアドレスに送信します。

**エンドポイント**: `POST /api/auth/reset-password`

**リクエスト**:

```json
{
  "email": "user@example.com"
}
```

**レスポンス**:

```json
{
  "success": true,
  "message": "パスワードリセットリンクを送信しました"
}
```

### セッション検証

現在のセッションの有効性を検証します。

**エンドポイント**: `GET /api/auth/session`

**レスポンス**:

```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "expires": "2023-12-31T23:59:59Z"
}
```

**エラーレスポンス**:

```json
{
  "error": "UNAUTHORIZED",
  "message": "セッションが無効です",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

---

## ユーザーAPI

ユーザーAPIは、ユーザープロフィールの管理に関するエンドポイントを提供します。

### プロフィール取得

現在のユーザーのプロフィール情報を取得します。

**エンドポイント**: `GET /api/profile`

**レスポンス**:

```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

### プロフィール更新

現在のユーザーのプロフィール情報を更新します。

**エンドポイント**: `POST /api/profile/update`

**リクエスト**:

```json
{
  "name": "New Name",
  "email": "new-email@example.com"
}
```

**レスポンス**:

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "New Name",
    "email": "new-email@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

### アバター更新

現在のユーザーのアバター画像を更新します。

**エンドポイント**: `POST /api/profile/avatar`

**リクエスト**:

```
Content-Type: multipart/form-data
---
avatar: [ファイルデータ]
```

**レスポンス**:

```json
{
  "success": true,
  "avatar": "https://example.com/new-avatar.jpg"
}
```

---

## 翻訳API

翻訳APIは、プレゼンテーションファイルの翻訳に関するエンドポイントを提供します。

### ファイルアップロード

翻訳対象のPPTXファイルをアップロードします。

**エンドポイント**: `POST /api/upload`

**リクエスト**:

```
Content-Type: multipart/form-data
---
file: [ファイルデータ]
```

**レスポンス**:

```json
{
  "success": true,
  "fileId": "file_id",
  "fileName": "presentation.pptx",
  "slideCount": 10
}
```

### スライド取得

アップロードしたファイルのスライド情報を取得します。

**エンドポイント**: `GET /api/slides/:fileId`

**レスポンス例**:
```json
{
  "slides": [
    {
      "index": 1,
      "imageUrl": "/api/slides/xxx/slides/1.png",
      "texts": [
        {
          "text": "Welcome to our presentation.",
          "position": { "x": 120, "y": 80, "width": 400, "height": 60 }
        },
        {
          "text": "This is the second text box.",
          "position": { "x": 100, "y": 200, "width": 350, "height": 50 }
        }
      ]
    },
    ...
  ]
}
```

### 翻訳実行

スライドのテキストを翻訳します。

**エンドポイント**: `POST /api/translate`

**リクエスト**:

```json
{
  "fileId": "file_id",
  "sourceLanguage": "ja",
  "targetLanguage": "en",
  "texts": [
    {
      "id": "text_id_1",
      "text": "スライドのタイトル"
    },
    {
      "id": "text_id_2",
      "text": "スライドの内容"
    }
  ]
}
```

**レスポンス**:

```json
{
  "success": true,
  "translations": [
    {
      "id": "text_id_1",
      "text": "Slide Title"
    },
    {
      "id": "text_id_2",
      "text": "Slide Content"
    }
  ]
}
```

### 翻訳済みファイルダウンロード

翻訳済みのPPTXファイルをダウンロードします。

**エンドポイント**: `POST /api/download`

**リクエスト**:

```json
{
  "fileId": "file_id",
  "slides": [
    {
      "index": 1,
      "texts": [
        {
          "text": "スライドのタイトル",
          "translation": "Slide Title"
        },
        {
          "text": "スライドの内容",
          "translation": "Slide Content"
        }
      ]
    },
    // 他のスライド...
  ]
}
```

**レスポンス**:

```
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="translated_presentation.pptx"
---
[ファイルデータ]
```

### サムネイル画像遅延ロード

**エンドポイント例**: `GET /api/slides/:fileId/thumbnail/:index`

- サムネイル画像はリクエスト時にのみ生成・返却
- フロントエンドは `<img loading="lazy">` や IntersectionObserver で遅延ロード
- レスポンス: `Content-Type: image/png` など

### 履歴APIのクエリパラメータ対応

**エンドポイント例**: `GET /api/history?status=COMPLETED&tag=foo&page=1&limit=20`

- クエリでフィルタ・ソート・ページネーション可能
- レスポンス例・パラメータ説明を追記

### クライアントキャッシュ戦略

- SWR/react-query等でAPIレスポンスをキャッシュ
- キャッシュ有効期間や再検証戦略を明記
- 例: `useSWR('/api/history', fetcher, { revalidateOnFocus: true })`

---

## エラーハンドリング

APIは、一貫したエラーレスポンスの形式を提供し、クライアントがエラーを適切に処理できるようにします。

### エラーレスポンスの形式

すべてのエラーレスポンスは、以下の形式に従います：

```json
{
  "error": "ERROR_CODE",
  "message": "エラーメッセージ",
  "details": {
    // エラーの詳細情報（オプション）
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### エラーコード

APIは、以下のエラーコードを使用します：

| エラーコード | HTTPステータス | 説明 |
|------------|--------------|------|
| `UNAUTHORIZED` | 401 | 認証が必要です |
| `FORBIDDEN` | 403 | アクセス権限がありません |
| `NOT_FOUND` | 404 | リソースが見つかりません |
| `VALIDATION_ERROR` | 400 | リクエストデータが無効です |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限を超えました |
| `DATABASE_ERROR` | 500 | データベースエラーが発生しました |
| `API_ERROR` | 500 | APIエラーが発生しました |
| `NETWORK_ERROR` | 500 | ネットワークエラーが発生しました |
| `UNKNOWN_ERROR` | 500 | 不明なエラーが発生しました |

### エラー処理のベストプラクティス

クライアント側でのエラー処理のベストプラクティスは以下の通りです：

1. **エラーコードに基づいて処理する**：エラーコードに基づいて適切な処理を行います。例えば、`UNAUTHORIZED`の場合はログインページにリダイレクトするなど。

2. **ユーザーフレンドリーなメッセージを表示する**：APIから返されるエラーメッセージをそのまま表示するのではなく、ユーザーフレンドリーなメッセージに変換して表示します。

3. **リトライ戦略を実装する**：一時的なエラー（ネットワークエラーなど）の場合は、自動的にリトライする仕組みを実装します。

4. **エラーログを記録する**：エラーが発生した場合は、デバッグ情報としてエラーログを記録します。

```javascript
// エラー処理の例
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'データの取得に失敗しました');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    // エラーに応じた処理
    if (error.message.includes('認証')) {
      // 認証エラーの処理
      router.push('/signin');
    } else {
      // その他のエラーの処理
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive',
      });
    }
    return null;
  }
}
```

---

## 認証と認可

APIは、JWTベースの認証と認可を使用して、セキュアなアクセス制御を提供します。

### トークンの仕組み

認証プロセスは以下の通りです：

1. ユーザーがサインインすると、サーバーはJWTトークンを生成します。
2. トークンには、ユーザーID、ロール、有効期限などの情報が含まれます。
3. トークンはHTTP Cookieとして保存され、すべてのAPIリクエストに自動的に含まれます。
4. サーバーは、リクエストごとにトークンを検証し、ユーザーの認証状態を確認します。

### トークン更新

トークンの有効期限が近づくと、自動的に更新されます：

1. トークンの有効期限が15分未満になると、サーバーは新しいトークンを発行します。
2. 新しいトークンは、元のトークンと同じユーザー情報を持ちますが、有効期限が延長されます。
3. クライアントは、トークンの更新を意識する必要はありません。すべては自動的に処理されます。

### アクセス制御

APIは、ロールベースのアクセス制御を実装しています：

1. 各ユーザーには、`USER`、`ADMIN`などのロールが割り当てられます。
2. 各APIエンドポイントには、アクセスに必要なロールが定義されています。
3. ユーザーが必要なロールを持っていない場合、`FORBIDDEN`エラーが返されます。

```javascript
// アクセス制御の例
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  // 認証チェック
  if (!session) {
    return NextResponse.json({
      error: 'UNAUTHORIZED',
      message: '認証が必要です',
      timestamp: new Date().toISOString()
    }, { status: 401 });
  }
  
  // ロールチェック
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({
      error: 'FORBIDDEN',
      message: 'この操作を実行する権限がありません',
      timestamp: new Date().toISOString()
    }, { status: 403 });
  }
  
  // 認証・認可が成功した場合の処理
  // ...
}
```

## 2024年4月 パフォーマンス最適化・テスト拡充 着手

- PPTXファイル処理の速度・メモリ効率改善（API/フロント）
- 画像サムネイルの遅延ロードAPI設計
- クエリパラメータによるサーバーサイドフィルタリング
- クライアントキャッシュ活用
- テストカバレッジ向上（API・UI・E2E）

## /api/batch-upload

### POST
- multipart/form-dataでpptxファイルをアップロード
- formidable等でパースし、public/uploads/配下に保存予定
- DBにはuserId, status, files（相対パスのみ）, progress, totalを登録
- 現状: multipart未対応（501エラー返却）

#### レスポンス例
```
{
  "jobId": "xxxx",
  "accepted": 1,
  "rejected": 0
}
```

### GET
- クエリ: jobId
- 指定jobの進捗・状態を返す

#### レスポンス例
```
{
  "status": "PENDING",
  "progress": 0,
  "total": 1,
  "error": null
}
``` 