# PowerPoint Translator App

PowerPoint Translator Appは、PowerPointプレゼンテーションの翻訳を自動化するウェブアプリケーションです。このアプリケーションを使用すると、PowerPointファイルをアップロードし、AIを活用した高品質な翻訳を適用して、翻訳されたバージョンをダウンロードすることができます。

## 主な機能

- PowerPointファイルのアップロードとパース
- スライド内のテキスト抽出と翻訳
- 翻訳されたPowerPointファイルの生成
- 翻訳履歴の管理
- ユーザー認証と権限管理
- 多言語サポート

## 技術スタック

### フロントエンド
- Next.js 14
- React 18
- Tailwind CSS
- shadcn/ui
- SWR

### バックエンド
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- NextAuth.js

### インフラストラクチャ
- Vercel (本番環境)
- Supabase (データベース)
- AWS S3 (ファイルストレージ)

## 開発環境のセットアップ

### 前提条件
- Node.js 20.x以上
- npm 9.x以上
- PostgreSQL 15.x以上

### インストール手順

1. リポジトリをクローンする
```bash
git clone https://github.com/yourusername/ppttranslatorapp.git
cd ppttranslatorapp
```

2. 依存関係をインストールする
```bash
npm install
```

3. 環境変数を設定する
```bash
cp .env.example .env.local
```
`.env.local`ファイルを編集して、必要な環境変数を設定してください。

4. データベースをセットアップする
```bash
npx prisma migrate dev
```

5. 開発サーバーを起動する
```bash
npm run dev
```

アプリケーションは`http://localhost:3000`で実行されます。

## 環境変数

アプリケーションを実行するには、以下の環境変数を設定する必要があります：

### 認証関連
- `NEXTAUTH_URL`: NextAuth.jsのURL（開発環境では`http://localhost:3000`）
- `NEXTAUTH_SECRET`: NextAuth.jsのシークレットキー
- `GOOGLE_CLIENT_ID`: GoogleログインのクライアントID
- `GOOGLE_CLIENT_SECRET`: Googleログインのクライアントシークレット

### データベース関連
- `DATABASE_URL`: PostgreSQLデータベースの接続URL

### ファイルストレージ関連
- `AWS_ACCESS_KEY_ID`: AWS S3アクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWS S3シークレットアクセスキー
- `AWS_REGION`: AWS S3リージョン
- `AWS_BUCKET_NAME`: AWS S3バケット名

### 翻訳API関連
- `TRANSLATION_API_KEY`: 翻訳APIのキー
- `TRANSLATION_API_ENDPOINT`: 翻訳APIのエンドポイント

## プロジェクト構造

```
ppttranslatorapp/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx      # マーケティングページ用のレイアウト
│   │   ├── page.tsx        # トップページ
│   │   └── pricing/
│   │       └── page.tsx    # プライシングページ
│   ├── (auth)/
│   │   ├── signin/         # サインインページ
│   │   │   └── page.tsx
│   │   ├── signup/         # サインアップページ
│   │   │   └── page.tsx
│   │   └── reset-password/ # パスワードリセット
│   │       ├── page.tsx
│   │       └── confirm/
│   │           └── page.tsx
│   ├── (dashboard)/
│   │   ├── translate/      # 翻訳機能ページ
│   │   │   ├── page.tsx
│   │   │   └── components/ # 翻訳ページ固有コンポーネント
│   │   ├── activity/       # アクティビティページ
│   │   ├── history/        # 履歴ページ
│   │   ├── profile/        # プロフィールページ
│   │   ├── settings/       # 設定ページ
│   │   │   └── subscription/ # サブスクリプション設定
│   │   ├── checkout/       # 決済ページ
│   │   ├── integrations/   # 連携設定ページ
│   │   └── admin/          # 管理者ページ
│   │       ├── logs/       # ログ管理
│   │       ├── statistics/ # 統計情報
│   │       └── users/      # ユーザー管理
│   ├── api/                # APIエンドポイント
│   │   ├── auth/           # 認証関連API
│   │   │   ├── [...nextauth]/  # NextAuth.js設定
│   │   │   ├── login/      # ログインAPI
│   │   │   ├── signup/     # サインアップAPI
│   │   │   ├── session/    # セッション管理API
│   │   │   └── reset-password/ # パスワードリセットAPI
│   │   ├── pptx/           # PowerPoint関連API
│   │   │   ├── parse/      # PPTXパース処理
│   │   │   └── generate/   # PPTX生成処理
│   │   ├── translate/      # 翻訳処理API
│   │   ├── translations/   # 翻訳データ管理API
│   │   │   └── save/       # 翻訳保存API
│   │   ├── stripe/         # 決済関連API
│   │   │   ├── checkout/   # 決済処理API
│   │   │   └── webhook/    # Stripeウェブフック
│   │   ├── upload/         # ファイルアップロードAPI
│   │   ├── download/       # ファイルダウンロードAPI
│   │   ├── history/        # 履歴管理API
│   │   ├── activity/       # アクティビティ管理API
│   │   ├── user/           # ユーザー管理API
│   │   └── admin/          # 管理者用API
│   ├── layout.tsx          # アプリ全体のレイアウト
│   └── page.tsx            # ルートページ
├── components/             # 共通コンポーネント
│   ├── ui/                 # UIコンポーネント
│   ├── auth/               # 認証関連コンポーネント
│   ├── dashboard/          # ダッシュボード関連コンポーネント
│   ├── forms/              # フォームコンポーネント
│   ├── modals/             # モーダルコンポーネント
│   └── layout/             # レイアウトコンポーネント
├── lib/                    # ユーティリティ関数とヘルパー
│   ├── db/                 # データベース関連
│   │   └── prisma.ts       # Prismaクライアント
│   ├── auth/               # 認証関連
│   ├── api/                # API関連
│   ├── utils/              # ユーティリティ関数
│   ├── pptx/               # PowerPoint処理関連
│   └── translation/        # 翻訳処理関連
├── public/                 # 静的ファイル
│   ├── images/             # 画像ファイル
│   ├── fonts/              # フォントファイル
│   └── favicon.ico         # ファビコン
├── styles/                 # スタイル関連
│   └── globals.css         # グローバルスタイル
├── prisma/                 # Prisma関連
│   ├── schema.prisma       # データベーススキーマ
│   └── migrations/         # マイグレーションファイル
├── middleware.ts           # Next.jsミドルウェア
├── next.config.js          # Next.js設定
├── tailwind.config.js      # Tailwind CSS設定
├── tsconfig.json           # TypeScript設定
├── package.json            # パッケージ設定
└── README.md               # プロジェクト説明
```

## API仕様

### 認証API

#### POST /api/auth/login
ユーザーログイン

リクエスト:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

レスポンス:
```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "token": "jwt_token"
}
```

#### POST /api/auth/signup
ユーザー登録

リクエスト:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

レスポンス:
```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "token": "jwt_token"
}
```

### 翻訳API

#### POST /api/pptx/parse
PowerPointファイルのパース

リクエスト: `multipart/form-data`
- `file`: PowerPointファイル

レスポンス:
```json
{
  "id": "file_id",
  "slides": [
    {
      "id": "slide_id",
      "index": 0,
      "texts": [
        {
          "id": "text_id",
          "content": "テキスト内容",
          "position": { "x": 100, "y": 200 }
        }
      ],
      "image": "slide_image_url"
    }
  ]
}
```

#### POST /api/translate
テキスト翻訳

リクエスト:
```json
{
  "texts": [
    {
      "id": "text_id",
      "content": "翻訳するテキスト"
    }
  ],
  "sourceLanguage": "ja",
  "targetLanguage": "en"
}
```

レスポンス:
```json
{
  "translations": [
    {
      "id": "text_id",
      "original": "翻訳するテキスト",
      "translated": "Text to be translated"
    }
  ]
}
```

#### POST /api/pptx/generate
翻訳済みPowerPointファイルの生成

リクエスト:
```json
{
  "fileId": "file_id",
  "translations": [
    {
      "textId": "text_id",
      "translation": "翻訳されたテキスト"
    }
  ]
}
```

レスポンス:
```json
{
  "downloadUrl": "download_url"
}
```

## テスト

### ユニットテスト
```bash
npm run test
```

### E2Eテスト
```bash
npm run test:e2e
```

## CI/CD

CI/CDを正常に動作させるためには、以下の環境変数をGitHubシークレットに設定する必要があります：

- `VERCEL_TOKEN`: Vercelデプロイトークン
- `VERCEL_ORG_ID`: VercelのOrganization ID
- `VERCEL_PROJECT_ID`: VercelのProject ID
- `DATABASE_URL`: テスト用データベースのURL
- `TEST_USER_EMAIL`: E2Eテスト用のユーザーメールアドレス
- `TEST_USER_PASSWORD`: E2Eテスト用のユーザーパスワード

# バッチ翻訳機能の実装

## 実装内容
- 複数ファイルの一括アップロード
- バックグラウンド処理の実装
- 進捗状況の表示

## フェーズ
1. 設計フェーズ
   - バッチ処理アーキテクチャの設計
   - ジョブキュー管理システムの選定
   - フロントエンドUIの設計
2. 実装フェーズ
   - 複数ファイルアップロード機能の実装
   - バックグラウンド処理システムの実装
   - 進捗状況の管理と表示機能の実装
   - ジョブステータス監視システムの構築
3. テストフェーズ
   - 大量ファイルでの負荷テスト
   - 長時間実行のエラー耐性テスト
   - ユーザーインターフェース使用感テスト

# テキスト抽出の改善

## 実装内容
- 複雑なテキストレイアウトの処理改善
- 特殊文字や多言語テキストのサポート強化
- テキスト順序の正確な保持

## フェーズ
1. 現状の問題分析
   - 複雑なレイアウトでの抽出精度の評価
   - 多言語テキスト対応状況の確認
   - テキスト順序の正確性検証
2. 改善実装
   - テキスト抽出アルゴリズムの改良
   - 特殊文字処理の強化
   - テキスト順序保持のためのロジック改善
   - 多言語テキストサポートの拡充

# クエリパラメータによるサーバーサイドフィルタリング

## 実装内容
- フィルタリングパラメータの設計
- クエリパーサーの設計
- データベースクエリビルダーの実装

## フェーズ
1. 設計フェーズ
   - フィルタリングパラメータの設計
   - クエリパーサーの設計
2. 実装フェーズ
   - クエリパラメータ解析機能の実装
   - データベースクエリビルダーの実装
   - レスポンスフォーマットの最適化
3. セキュリティ強化
   - インジェクション対策の実装
   - パラメータバリデーションの強化
   - アクセス制御の実装
