# ディレクトリ構成

以下はPPTTranslatorAppの主要なディレクトリ構造です：

```
/
├── app/                          # Next.jsのアプリケーションディレクトリ
│   ├── api/                      # APIエンドポイント
│   │   ├── auth/                 # 認証関連API
│   │   │   ├── [...nextauth]/    # NextAuth.js設定
│   │   │   ├── reset-password/   # パスワードリセット
│   │   │   └── signup/           # ユーザー登録
│   │   ├── test-db/              # データベース接続テスト
│   │   ├── translate/            # 翻訳API
│   │   ├── translations/         # 翻訳履歴API
│   │   ├── upload/               # ファイルアップロードAPI
│   │   ├── download/             # ファイルダウンロードAPI
│   │   ├── pptx/                 # PPTXファイル処理API
│   │   ├── profile/              # ユーザープロファイルAPI
│   │   ├── subscription/         # サブスクリプション管理API
│   │   ├── stripe/               # Stripe決済API
│   │   ├── anthropic/            # Anthropic AI API
│   │   └── health/               # ヘルスチェックAPI
│   ├── (auth)/                   # 認証関連ページ
│   ├── (dashboard)/              # ダッシュボード関連ページ
│   ├── (marketing)/              # マーケティング関連ページ
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
│   ├── auth/                     # 認証関連処理
│   │   └── auth-options.ts       # NextAuth.js設定
│   ├── db/                       # データベース関連処理
│   │   └── test-connection.ts    # DB接続テスト
│   ├── pptx/                     # PPTXファイル処理
│   ├── utils/                    # 共通ユーティリティ関数
│   ├── payments/                 # 決済処理
│   ├── stripe/                   # Stripe連携
│   ├── email/                    # メール送信
│   ├── supabase/                 # Supabase連携
│   ├── python/                   # Python連携
│   ├── anthropic/                # Anthropic AI連携
│   ├── hooks/                    # カスタムフック
│   ├── prisma.ts                 # Prismaクライアント
│   └── types.ts                  # 共通型定義
├── types/                        # 型定義ファイル
│   ├── next-auth.d.ts            # NextAuth型定義
│   ├── prisma.ts                 # Prisma型定義
│   ├── logger.ts                 # ロガー型定義
│   └── pptx-parser.d.ts          # PPTX解析型定義
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # データベーススキーマ
│   ├── seed.ts                   # シードデータ
│   └── migrations/               # マイグレーションファイル
├── public/                       # 静的ファイル
├── scripts/                      # ユーティリティスクリプト
│   └── check-users.ts            # ユーザー確認スクリプト
├── python_backend/               # Python処理バックエンド
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

### 配置ルール
- UIコンポーネント → `components/ui/`
- APIエンドポイント → `app/api/[endpoint]/route.ts`
- 共通処理 → `lib/utils/`
- 認証関連 → `lib/auth/`
- データベース処理 → `lib/db/`
- 型定義 → `types/`
