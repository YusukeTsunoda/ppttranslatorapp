# ディレクトリ構成

以下はPPTTranslatorAppの主要なディレクトリ構造です：

```
/
├── app/                          # Next.jsのアプリケーションディレクトリ
│   ├── api/                      # APIエンドポイント
│   │   ├── auth/                 # 認証関連API
│   │   │   ├── [...nextauth]/    # NextAuth.js設定
│   │   │   ├── login/            # ログインAPI
│   │   │   ├── register/         # ユーザー登録API
│   │   │   ├── reset-password/   # パスワードリセットAPI
│   │   │   ├── session/          # セッション管理API
│   │   │   └── signup/           # ユーザー登録API
│   │   ├── activity/             # アクティビティログAPI
│   │   ├── anthropic/            # Anthropic AI API
│   │   ├── download/             # ファイルダウンロードAPI
│   │   ├── health/               # ヘルスチェックAPI
│   │   ├── history/              # 翻訳履歴API
│   │   ├── integrations/         # 外部サービス連携API
│   │   ├── pptx/                 # PPTXファイル処理API
│   │   ├── profile/              # ユーザープロファイルAPI
│   │   ├── slides/               # スライド管理API
│   │   ├── stripe/               # Stripe決済API
│   │   ├── subscription/         # サブスクリプション管理API
│   │   ├── test-db/              # データベース接続テスト
│   │   ├── translate/            # 翻訳API
│   │   ├── translations/         # 翻訳保存API
│   │   └── upload/               # ファイルアップロードAPI
│   ├── (auth)/                   # 認証関連ページ
│   │   ├── reset-password/       # パスワードリセットページ
│   │   ├── signin/               # サインインページ
│   │   └── signup/               # サインアップページ
│   ├── (dashboard)/              # ダッシュボード関連ページ
│   │   ├── activity/             # アクティビティページ
│   │   ├── checkout/             # 決済ページ
│   │   ├── history/              # 履歴ページ
│   │   ├── integrations/         # 連携ページ
│   │   ├── profile/              # プロファイルページ
│   │   ├── settings/             # 設定ページ
│   │   └── translate/            # 翻訳ページ
│   ├── (marketing)/              # マーケティング関連ページ
│   │   └── pricing/              # 料金プランページ
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   ├── providers.tsx             # プロバイダーコンポーネント
│   ├── not-found.tsx             # 404ページ
│   └── favicon.ico               # ファビコン
├── components/                   # 共通コンポーネント
│   ├── ui/                       # 基本UI（button, card等）
│   ├── auth/                     # 認証関連コンポーネント
│   └── activity/                 # アクティビティ関連コンポーネント
├── lib/                          # ユーティリティライブラリ
│   ├── anthropic/                # Anthropic AI連携
│   ├── auth/                     # 認証関連処理
│   ├── db/                       # データベース関連処理
│   │   ├── migrations/           # データベースマイグレーション
│   │   └── prisma.ts             # Prismaクライアント
│   ├── email/                    # メール送信
│   ├── hooks/                    # カスタムフック
│   ├── payments/                 # 決済処理
│   ├── pptx/                     # PPTXファイル処理
│   ├── python/                   # Python連携
│   ├── stripe/                   # Stripe連携
│   ├── supabase/                 # Supabase連携
│   └── utils/                    # 共通ユーティリティ関数
│       ├── activity-logger.ts    # アクティビティログ
│       ├── error-handler.ts      # エラーハンドリング
│       ├── file-utils.ts         # ファイル操作ユーティリティ
│       └── pptx-parser.ts        # PPTXパーサー
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # データベーススキーマ
│   └── migrations/               # マイグレーションファイル
├── public/                       # 静的ファイル
│   ├── static/                   # 静的リソース
│   └── uploads/                  # アップロードファイル
├── scripts/                      # ユーティリティスクリプト
├── python_backend/               # Python処理バックエンド
├── tests/                        # テストファイル
│   ├── auth/                     # 認証テスト
│   ├── hooks/                    # フックテスト
│   └── utils/                    # ユーティリティテスト
├── types/                        # 型定義ファイル
├── cypress/                      # E2Eテスト
├── middleware.ts                 # Next.jsミドルウェア
├── auth.ts                       # 認証設定
├── next.config.js                # Next.js設定
├── tailwind.config.js            # Tailwind CSS設定
├── postcss.config.js             # PostCSS設定
├── tsconfig.json                 # TypeScript設定
├── package.json                  # プロジェクト設定
└── .env.local                    # 環境変数（ローカル開発用）
```

### 主要コンポーネント
- **認証システム**: NextAuth.jsを使用したユーザー認証
- **データベース**: PostgreSQLとPrisma ORMによるデータ管理
- **ファイル処理**: PPTXファイルの解析と生成
- **AI翻訳**: Anthropic APIを使用した翻訳処理
- **決済システム**: Stripeによるサブスクリプション管理
- **ストレージ**: Supabaseによるファイル保存
- **アクティビティログ**: ユーザーアクティビティの記録と管理

### 配置ルール
- UIコンポーネント → `components/ui/`
- APIエンドポイント → `app/api/[endpoint]/route.ts`
- 共通処理 → `lib/utils/`
- 認証関連 → `lib/auth/`
- データベース処理 → `lib/db/`
- 型定義 → `types/`
- テスト → `tests/`
- E2Eテスト → `cypress/`
