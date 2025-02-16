# アプリケーションのルーティング構造

このドキュメントでは、アプリケーションのルーティング構造とレイアウト設計について説明します。

## ルートグループ

アプリケーションは以下の2つのメインルートグループに分かれています：

### 1. (marketing)
マーケティング関連のページ用のグループです。サイドバーのないシンプルなレイアウトを使用します。

**含まれるページ：**
- `/` - トップページ
  - アプリケーションの紹介
  - 主要機能の説明
  - 「今すぐ始める」と「料金プラン」へのリンク
- `/pricing` - 料金プランページ
  - 料金プランの詳細
  - プラン比較
  - 申し込みフォーム
- `/blog` - ブログ（予定）
- `/docs` - ドキュメント（予定）

### 2. (dashboard)
アプリケーションの主要機能を提供するページ群です。サイドバー付きの機能的なレイアウトを使用します。

**含まれるページ：**
- `/translate` - PowerPoint翻訳機能
  - ファイルアップロード
  - 翻訳設定
  - 翻訳結果の表示
- `/history` - 翻訳履歴
- `/profile` - プロフィール設定
- `/settings` - アプリケーション設定
- `/integrations` - API連携設定

## ディレクトリ構造

```
app/
├── (marketing)/
│   ├── layout.tsx      # マーケティングページ用のレイアウト
│   ├── page.tsx        # トップページ
│   └── pricing/
│       └── page.tsx    # プライシングページ
└── (dashboard)/
    └── translate/
        └── page.tsx    # 翻訳機能ページ
```

## レイアウトの詳細

### (marketing)レイアウト
- シンプルで魅力的なデザイン
- ヘッダーのみの最小限のナビゲーション
- コンテンツにフォーカスした構成

### (dashboard)レイアウト
- 機能的なUIデザイン
- サイドバーによる効率的なナビゲーション
- ユーザー情報やステータスの表示

# ルーティング設定

## 認証
- `/sign-in` - ログインページ
- `/sign-up` - 新規登録ページ
- `/reset-password` - パスワードリセット
- `/api/auth/[...nextauth]` - NextAuth.js認証エンドポイント

## API エンドポイント
### ファイル関連
- `POST /api/upload` - PPTXファイルアップロード
- `GET /api/slides/[path]` - スライド画像取得
- `POST /api/pptx/generate` - 翻訳済みPPTX生成

### 翻訳関連
- `POST /api/translate` - テキスト翻訳
- `POST /api/translate/batch` - 一括翻訳（予定）

### 決済関連
- `POST /api/checkout` - Stripeチェックアウトセッション作成
- `POST /api/webhooks/stripe` - Stripeウェブフック
- `GET /api/subscriptions` - サブスクリプション情報取得

### チーム管理
- `GET /api/teams` - チーム一覧取得
- `POST /api/teams` - チーム作成
- `PUT /api/teams/[id]` - チーム情報更新
- `POST /api/teams/[id]/invite` - チームメンバー招待

### アクティビティログ
- `GET /api/activity-logs` - アクティビティログ取得
