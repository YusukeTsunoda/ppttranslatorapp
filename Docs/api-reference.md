# API リファレンス

## 目次

1. [認証API](#認証api)
2. [ユーザーAPI](#ユーザーapi)
3. [翻訳API](#翻訳api)
4. [バッチ処理API](#バッチ処理api)
5. [管理者API](#管理者api)
6. [統計API](#統計api)
7. [エラーハンドリング](#エラーハンドリング)

## 共通仕様

### リクエストヘッダー

```
Content-Type: application/json
Authorization: Bearer <token>  // 認証が必要なエンドポイントの場合
```

### レスポンス形式

1. **成功時**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

2. **エラー時**
```json
{
  "error": "ERROR_CODE",
  "message": "エラーメッセージ",
  "details": { ... },  // オプショナル
  "timestamp": "2024-04-15T12:34:56Z"
}
```

3. **ページネーション**
```json
{
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "pages": 5
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

## バッチ処理API

### バッチアップロード

**エンドポイント**: `POST /api/batch-upload`  
**認証**: 必須  
**Content-Type**: `multipart/form-data`

**リクエスト**:
```
files[]: File[]  // 複数のPPTXファイル
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_xxxxx",
    "accepted": 2,
    "rejected": 0,
    "timestamp": "2024-04-15T12:34:56Z"
  }
}
```

### バッチジョブ状態取得

**エンドポイント**: `GET /api/batch-upload/status/:jobId`  
**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "status": "PROCESSING",  // PENDING, PROCESSING, COMPLETED, FAILED
    "progress": 1,
    "total": 2,
    "completedFiles": ["file1.pptx"],
    "pendingFiles": ["file2.pptx"],
    "error": null,
    "timestamp": "2024-04-15T12:34:56Z"
  }
}
```

## 管理者API

### ユーザー管理

#### ユーザー一覧取得

**エンドポイント**: `GET /api/admin/users`  
**認証**: 必須（ADMINロールのみ）  
**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `sort`: ソートフィールド（例: "createdAt"）
- `order`: ソート順（"asc" or "desc"）
- `search`: 検索キーワード
- `role`: ロールでフィルタ（"USER" or "ADMIN"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "user@example.com",
        "name": "User Name",
        "role": "USER",
        "createdAt": "2024-04-15T12:34:56Z",
        "lastLoginAt": "2024-04-15T12:34:56Z"
      }
    ]
  },
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "pages": 5
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

#### ユーザー作成

**エンドポイント**: `POST /api/admin/users`  
**認証**: 必須（ADMINロールのみ）

**リクエスト**:
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "USER",
  "password": "initialPassword123"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "new_user_id",
      "email": "newuser@example.com",
      "name": "New User",
      "role": "USER",
      "createdAt": "2024-04-15T12:34:56Z"
    }
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

#### ユーザー更新

**エンドポイント**: `PUT /api/admin/users/:id`  
**認証**: 必須（ADMINロールのみ）

**リクエスト**:
```json
{
  "name": "Updated Name",
  "role": "ADMIN"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "Updated Name",
      "role": "ADMIN",
      "updatedAt": "2024-04-15T12:34:56Z"
    }
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

#### ユーザー削除

**エンドポイント**: `DELETE /api/admin/users/:id`  
**認証**: 必須（ADMINロールのみ）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "ユーザーを削除しました",
    "userId": "deleted_user_id"
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

### 統計API

#### 利用統計取得

**エンドポイント**: `GET /api/admin/statistics`  
**認証**: 必須（ADMINロールのみ）  
**クエリパラメータ**:
- `from`: 開始日（YYYY-MM-DD）
- `to`: 終了日（YYYY-MM-DD）
- `type`: 統計タイプ（"daily", "weekly", "monthly"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "translations": {
      "total": 1000,
      "series": [
        {
          "date": "2024-04-15",
          "count": 50,
          "credits": 100
        }
      ]
    },
    "users": {
      "total": 100,
      "active": 80,
      "new": 5
    },
    "credits": {
      "consumed": 1000,
      "remaining": 5000
    }
  },
  "timestamp": "2024-04-15T12:34:56Z"
}
```

#### 統計エクスポート

**エンドポイント**: `GET /api/admin/statistics/export`  
**認証**: 必須（ADMINロールのみ）  
**クエリパラメータ**: 同上

**レスポンス**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="statistics_2024-04-15.csv"
```

## エラーコード

| コード | 説明 |
|--------|------|
| `UNAUTHORIZED` | 認証が必要です |
| `FORBIDDEN` | アクセス権限がありません |
| `NOT_FOUND` | リソースが見つかりません |
| `VALIDATION_ERROR` | リクエストデータが無効です |
| `RATE_LIMIT_EXCEEDED` | レート制限を超えました |
| `DATABASE_ERROR` | データベースエラーが発生しました |
| `API_ERROR` | APIエラーが発生しました |
| `NETWORK_ERROR` | ネットワークエラーが発生しました |
| `UNKNOWN_ERROR` | 不明なエラーが発生しました |

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