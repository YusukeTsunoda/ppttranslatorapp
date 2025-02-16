# バックエンド仕様

## 使用技術
- Next.js App Router
- Prisma ORM
- PostgreSQL
- NextAuth.js
- Stripe API
- Claude API (Anthropic)
- AWS S3 (ファイルストレージ)

## 主要機能
### ファイル処理
- PPTXファイルの解析
- スライド画像の生成
- テキスト抽出
- 翻訳済みPPTXの生成

### 翻訳処理
- Claude APIを使用したテキスト翻訳
- 翻訳モデルの選択
- 翻訳履歴の管理
- バッチ翻訳処理

### 認証・認可
- NextAuth.jsによるセッション管理
- Google OAuth認証
- メール/パスワード認証
- RBAC（ロールベースアクセス制御）

### 決済処理
- Stripe決済の統合
- サブスクリプション管理
- 支払い履歴管理
- 請求書生成

### チーム管理
- チーム作成・編集
- メンバー招待
- ロール管理
- アクティビティログ

## Architecture
- Next.js API Routes
- RESTful API設計
- Middleware実装

## Authentication
- NextAuth.js
- JWT認証
- セッション管理

## API Endpoints
- /api/auth/*: 認証関連
- /api/subscriptions/*: サブスクリプション管理
- /api/users/*: ユーザー管理
- /api/webhooks/*: Webhookハンドリング

## Security
- CORS設定
- API Rate Limiting
- 環境変数管理