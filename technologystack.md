# 技術スタック

## コア技術
- TypeScript: ^5.7.3
- Node.js: ^20.0.0  
- **AIモデル: claude-3-sonnet-20240229 (Anthropic Messages API)**

## フロントエンド
- Next.js: ^14.2.24
- React: ^18.3.1
- React DOM: ^18.3.1
- Tailwind CSS: ^3.4.17
- shadcn/ui (Radix UI コンポーネント)
  - @radix-ui/react-avatar: ^1.1.3
  - @radix-ui/react-dropdown-menu: ^2.1.6
  - @radix-ui/react-label: ^2.1.2
  - @radix-ui/react-radio-group: ^1.2.3
  - @radix-ui/react-select: ^1.2.2
  - @radix-ui/react-slot: ^1.1.2
  - @radix-ui/react-switch: ^1.1.3
  - @radix-ui/react-toast: ^1.2.6
- SWR: ^2.3.2 (データフェッチング)
- Lucide React: ^0.294.0 (アイコン)
- class-variance-authority: ^0.7.1
- clsx: ^2.1.1
- tailwind-merge: ^2.6.0
- tailwindcss-animate: ^1.0.7

## バックエンド
- Next.js API Routes
- NextAuth.js: ^4.24.11
- Prisma ORM: ^6.4.0
- PostgreSQL (データベース)
- Supabase: ^2.49.1 (ストレージ)
- Stripe: ^13.11.0 (決済)
- Resend: ^4.1.2 (メール送信)
- Anthropic AI SDK: ^0.36.3
- JSZip: ^3.10.1 (PPTXファイル処理)
- pptx-parser: ^1.1.7-beta.9
- Python-Shell: ^5.0.0 (Python連携)
- xmldom: ^0.6.0 (XML処理)
- uuid: ^11.1.0 (ID生成)
- date-fns: ^4.1.0 (日付処理)

## セキュリティ
- bcrypt: ^5.1.1 (パスワードハッシュ化)
- bcryptjs: ^2.4.3 (パスワードハッシュ化)
- jsonwebtoken: ^9.0.2 (JWT認証)
- zod: ^3.24.2 (データバリデーション)

## 開発ツール
- ESLint: ^9.21.0
- Jest: ^29.7.0 (テスト)
- ts-jest: ^29.2.5 (TypeScriptテスト)
- Cypress: ^13.17.0 (E2Eテスト)
- Prisma CLI: ^6.4.0
- ts-node: ^10.9.2
- PostCSS: ^8.5.2
- Autoprefixer: ^10.4.20
- dotenv: ^16.4.7 (環境変数)
- sharp: ^0.33.5 (画像処理)

## Python依存関係
- python-pptx: ^0.6.21
- lxml: ^5.3.0
- pdf2image: ^1.17.0
- Pillow: ^11.1.0
- XlsxWriter: ^3.2.2

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
- **アクティビティログ**: ユーザーアクションの記録と管理
- **翻訳履歴**: 過去の翻訳履歴の保存と参照
- **クレジット管理**: ユーザーのクレジット残高管理
