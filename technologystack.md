# 技術スタック

## コア技術
- TypeScript: ^5.0.0
- Node.js: ^20.0.0  
- **AIモデル: claude-3-sonnet-20240229 (Anthropic Messages API)**

## フロントエンド
- Next.js: ^14.2.24
- React: ^18.0.0
- React DOM: ^18.0.0
- Tailwind CSS: ^3.3.0
- shadcn/ui (Radix UI コンポーネント)
  - @radix-ui/react-avatar: ^1.0.0
  - @radix-ui/react-dropdown-menu: ^2.0.0
  - @radix-ui/react-label: ^2.0.0
  - @radix-ui/react-slot: ^1.0.0
  - @radix-ui/react-toast: ^1.0.0
- SWR: ^2.3.2 (データフェッチング)
- Lucide React: ^0.294.0 (アイコン)

## バックエンド
- Next.js API Routes
- NextAuth.js: ^4.24.7 (認証)
- Prisma ORM: ^6.4.0
- PostgreSQL (データベース)
- Supabase: ^2.49.1 (ストレージ)
- Stripe: ^13.0.0 (決済)
- Resend: ^4.1.2 (メール送信)
- Anthropic AI SDK: ^0.36.3
- JSZip: ^3.10.1 (PPTXファイル処理)
- pptx-parser: ^1.1.7-beta.9
- Python-Shell: ^5.0.0 (Python連携)

## セキュリティ
- bcrypt: ^5.1.1 (パスワードハッシュ化)
- jsonwebtoken: ^9.0.2 (JWT認証)
- zod: ^3.24.2 (データバリデーション)

## 開発ツール
- ESLint: ^9.21.0
- Jest: ^29.0.0 (テスト)
- Cypress: ^13.17.0 (E2Eテスト)
- Prisma CLI: ^6.4.0
- ts-node: ^10.0.0
- PostCSS: ^8.4.31
- Autoprefixer: ^10.4.16

## デプロイ
- Vercel (ホスティング)

---

# 主要機能
- **PPTXファイル翻訳**: PowerPointファイルのスライド内容を翻訳
- **AIによる高品質翻訳**: Anthropic Claude AIを使用した自然な翻訳
- **ユーザー認証**: NextAuth.jsによるセキュアな認証システム
- **サブスクリプション管理**: Stripeによる決済処理
- **ファイル管理**: Supabaseによるファイルストレージ
- **レスポンシブUI**: モバイルからデスクトップまで対応したインターフェース
