# バックエンド設計仕様書

## 技術スタック

### コアテクノロジー
- **サーバーフレームワーク**: Next.js App Router（API Routes）
- **言語**: TypeScript 5.0（strict mode）
- **ORM**: Prisma 6.0
- **データベース**: PostgreSQL 15.0
- **認証**: NextAuth.js 4.0 / JWT
- **ファイル処理**: Sharp, JSZip, python-pptx
- **AI/ML**: Claude API (Anthropic)

### インフラストラクチャ
- **ホスティング**: Vercel
- **ストレージ**: AWS S3 / Supabase Storage
- **キャッシュ**: Redis（予定）
- **CDN**: Vercel Edge Network
- **CI/CD**: GitHub Actions

### 外部サービス連携
- **決済**: Stripe API
- **メール送信**: Resend
- **分析**: Vercel Analytics
- **モニタリング**: Sentry（予定）

## アーキテクチャ設計

### レイヤードアーキテクチャ
```
API Routes (Controllers)
    ↓
Service Layer
    ↓
Repository Layer
    ↓
Data Access Layer (Prisma)
```

### ディレクトリ構造
```
app/
├── api/                      # APIエンドポイント
│   ├── auth/                 # 認証関連API
│   ├── translate/            # 翻訳API
│   ├── files/                # ファイル管理API
│   ├── teams/                # チーム管理API
│   ├── subscriptions/        # サブスクリプションAPI
│   ├── webhooks/             # Webhookハンドラー
│   └── ...

lib/
├── api/                      # APIクライアント
├── auth/                     # 認証関連処理
│   ├── auth-options.ts       # NextAuth設定
│   ├── jwt-helpers.ts        # JWT処理
│   └── permissions.ts        # 権限管理
├── db/                       # データベース関連
│   ├── schema/               # スキーマ定義
│   ├── migrations/           # マイグレーション
│   ├── repositories/         # リポジトリパターン実装
│   └── prisma.ts             # Prismaクライアント
├── services/                 # ビジネスロジック
│   ├── translation-service.ts
│   ├── file-service.ts
│   ├── team-service.ts
│   └── ...
├── utils/                    # ユーティリティ
│   ├── validation.ts         # バリデーション
│   ├── error-handling.ts     # エラーハンドリング
│   ├── logging.ts            # ロギング
│   └── ...
├── pptx/                     # PPTXファイル処理
│   ├── parser.ts             # パーサー
│   ├── generator.ts          # ジェネレーター
│   └── image-processor.ts    # 画像処理
├── storage/                  # ストレージ連携
│   ├── s3.ts                 # S3クライアント
│   ├── local-storage.ts      # ローカルストレージ
│   └── file-manager.ts       # ファイル管理
└── external/                 # 外部サービス連携
    ├── claude.ts             # Claude API
    ├── stripe.ts             # Stripe API
    └── resend.ts             # Resend API

prisma/
├── schema.prisma             # データベーススキーマ
├── migrations/               # マイグレーションファイル
└── seed.ts                   # シードデータ

middleware.ts                 # グローバルミドルウェア
```

## API設計

### RESTful API原則
- **リソース指向**: 名詞ベースのエンドポイント
- **適切なHTTPメソッド**: GET, POST, PUT, DELETE
- **ステータスコード**: 適切なHTTPステータスコード
- **クエリパラメータ**: フィルタリング、ページネーション、ソート
- **バージョニング**: APIバージョン管理

### エンドポイント設計
```
/api/auth/*                  # 認証関連
/api/files                   # ファイル管理
/api/files/:id               # 特定ファイル操作
/api/files/:id/slides        # スライド管理
/api/slides/:id/texts        # テキスト管理
/api/translate               # 翻訳処理
/api/translations            # 翻訳履歴
/api/teams                   # チーム管理
/api/teams/:id/members       # メンバー管理
/api/teams/:id/invitations   # 招待管理
/api/subscriptions           # サブスクリプション管理
/api/webhooks/stripe         # Stripeウェブフック
```

### レスポンス形式
```typescript
// 成功レスポンス
{
  success: true,
  data: { ... },  // レスポンスデータ
  meta?: { ... }  // メタデータ（ページネーション情報など）
}

// エラーレスポンス
{
  success: false,
  error: {
    code: string,      // エラーコード
    message: string,   // ユーザー向けメッセージ
    details?: any      // 詳細情報（開発環境のみ）
  }
}
```

### PPTXパースAPIの仕様変更
- 各スライド・テキストごとに、座標・サイズ情報（position: { x, y, width, height }）を含めて返却する。
- 例:
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
        }
      ]
    }
  ]
}
```

## 認証・認可

### 認証フロー
- **JWT認証**: アクセストークンと更新トークン
- **OAuth/OIDC**: Google, GitHub, Microsoftなど
- **メール/パスワード**: bcryptによるハッシュ化
- **MFA**: TOTP, メール確認コード

### 認可戦略
- **RBAC**: ロールベースアクセス制御
  - Admin: 全権限
  - Owner: チーム管理権限
  - Member: 基本操作権限
  - Guest: 閲覧のみ権限
- **リソースベース**: 所有リソースへのアクセス制御
- **ポリシーベース**: 複雑な条件に基づく権限

### セッション管理
- **セッションストレージ**: データベース / Redis
- **トークン有効期限**: アクセストークン（15分）、更新トークン（7日）
- **セッション無効化**: ログアウト、パスワード変更時

## データベース設計

### スキーマ設計原則
- **正規化**: 適切な正規化レベル
- **インデックス**: パフォーマンス最適化
- **リレーション**: 適切な外部キー制約
- **カスケード**: 依存関係の自動処理

### マイグレーション戦略
- **バージョン管理**: マイグレーションファイル
- **ロールバック**: 安全な戻し方法
- **シード**: テストデータ、初期データ

### クエリ最適化
- **N+1問題の回避**: 適切なJOIN、includeの使用
- **インデックス活用**: クエリパターンに基づく設計
- **クエリキャッシュ**: 頻繁なクエリのキャッシュ

## ファイル処理

### ストレージ戦略
- **一時ストレージ**: アップロード処理中
- **永続ストレージ**: 処理済みファイル
- **CDN配信**: 静的アセット

### ファイル処理パイプライン
1. **アップロード**: マルチパートアップロード
2. **バリデーション**: ファイルタイプ、サイズ、セキュリティチェック
3. **処理**: 解析、変換、最適化
4. **保存**: 永続ストレージへの保存
5. **配信**: 署名付きURL、CDN

### セキュリティ対策
- **ウイルススキャン**: アップロードファイルの検査
- **コンテンツ検証**: ファイル形式の検証
- **アクセス制御**: 署名付きURL、有効期限
- **暗号化**: 保存データの暗号化

## エラーハンドリング

### エラー分類
- **クライアントエラー**: 400系
  - 400: 不正なリクエスト
  - 401: 未認証
  - 403: 権限不足
  - 404: リソース未発見
  - 422: バリデーションエラー
- **サーバーエラー**: 500系
  - 500: 内部サーバーエラー
  - 502: 外部サービスエラー
  - 503: サービス利用不可

### エラー処理戦略
- **集中管理**: グローバルエラーハンドラー
- **構造化**: 一貫したエラーオブジェクト
- **ログ記録**: 詳細なエラー情報の記録
- **ユーザーフレンドリー**: 適切なエラーメッセージ

## パフォーマンス最適化

### キャッシュ戦略
- **データキャッシュ**: Redis / Memcached
- **クエリキャッシュ**: 頻繁なクエリ結果
- **CDN**: 静的アセット

### 非同期処理
- **バックグラウンドジョブ**: 長時間実行タスク
- **キュー**: タスクキュー（Bull / BullMQ）
- **Webhook**: 非同期イベント通知

### データベース最適化
- **インデックス**: 適切なインデックス設計
- **コネクションプール**: 効率的な接続管理
- **クエリ最適化**: 実行計画分析

## モニタリングとロギング

### ログ戦略
- **構造化ログ**: JSON形式
- **ログレベル**: ERROR, WARN, INFO, DEBUG, TRACE
- **コンテキスト**: リクエストID、ユーザーID
- **集約**: 中央ログ管理（ELK Stack / Datadog）

### メトリクス
- **システムメトリクス**: CPU, メモリ, ディスク
- **アプリケーションメトリクス**: レスポンス時間, エラー率
- **ビジネスメトリクス**: ユーザーアクティビティ, 変換率

### アラート
- **閾値ベース**: メトリクス閾値超過
- **異常検知**: 通常パターンからの逸脱
- **エスカレーション**: 重要度に応じた通知ルート

## セキュリティ対策

### 入力検証
- **スキーマ検証**: Zodによる型安全な検証
- **サニタイズ**: XSS対策
- **レート制限**: ブルートフォース対策

### データ保護
- **転送時暗号化**: TLS 1.3
- **保存時暗号化**: AES-256
- **機密情報管理**: 環境変数, シークレット管理

### 脆弱性対策
- **依存関係スキャン**: npm audit
- **セキュリティヘッダー**: CSP, HSTS
- **OWASP対策**: Top 10脆弱性対策

## デプロイメント戦略

### CI/CD
- **自動テスト**: 単体, 統合, E2E
- **静的解析**: ESLint, TypeScript
- **自動デプロイ**: GitHub Actions + Vercel

### 環境分離
- **開発環境**: 開発者用
- **ステージング環境**: テスト用
- **本番環境**: エンドユーザー用

### ロールバック
- **バージョン管理**: デプロイメントバージョン
- **即時ロールバック**: 問題発生時
- **ブルー/グリーンデプロイ**: ゼロダウンタイム