# Deployment Documentation

## Hosting
- Vercelでのデプロイ
- 環境変数設定
- ドメイン設定

## CI/CD
- GitHub Actions
- 自動デプロイ設定
- テスト自動化

# デプロイメント手順

## 必要な環境変数
```env
# データベース
DATABASE_URL=

# 認証
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

# Anthropic
ANTHROPIC_API_KEY=
```

## デプロイメントフロー
1. Vercelにデプロイ
2. 環境変数の設定
3. データベースのマイグレーション
4. Stripeウェブフックの設定
5. AWS S3バケットの設定
6. ドメインの設定
7. SSL証明書の設定

## CI/CD
- GitHub Actionsによる自動デプロイ
- テストの自動実行
- コードの静的解析
- セキュリティスキャン

## モニタリング
- Vercel Analytics
- Sentry
- AWS CloudWatch
- Stripe Dashboard