# Next.js SaaS Starter

This is a starter template for building a SaaS application using **Next.js** with support for authentication, Stripe integration for payments, and a dashboard for logged-in users.

**Demo: [https://next-saas-start.vercel.app/](https://next-saas-start.vercel.app/)**

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) which connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- Basic RBAC with Owner and Member roles
- Subscription management with Stripe Customer Portal
- Email/password authentication with JWTs stored to cookies
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/nextjs/saas-starter
cd saas-starter
pnpm install
```

## Running Locally

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

Then, run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create the following user and team:

- User: `test@test.com`
- Password: `admin123`

You can, of course, create new users as well through `/sign-up`.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

Optionally, you can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Testing and CI/CD

This project includes comprehensive testing and CI/CD setup using GitHub Actions.

### Running Tests Locally

```bash
# Run Jest unit tests
npm run test

# Run Jest tests with coverage report
npm run test:coverage

# Run Jest tests with HTML report generation
npm run test:report

# Run Cypress E2E tests
npm run cypress:run

# Run Cypress tests with HTML report generation
npm run cypress:report

# Run all tests (lint, unit tests with coverage, and E2E tests)
npm run test:all

# Clean up all report directories
npm run reports:clean

# Create report directories
npm run reports:create-dirs
```

### Test Reports

When running tests, HTML reports are automatically generated in the following locations:

- **Jest Test Report**: `reports/jest-report.html`
- **Coverage Report**: `coverage/lcov-report/index.html`
- **Cypress Test Report**: `cypress/reports/report.html`

These reports provide detailed information about test results, failures, and code coverage.

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

1. **Lint and Test**: Runs ESLint and Jest tests with coverage reports
2. **E2E Tests**: Runs Cypress tests with screenshots and video recording
3. **Build and Deploy**: Builds the Next.js application and deploys to Vercel (on main branch only)

The CI/CD pipeline automatically:
- Generates test coverage reports
- Creates HTML test reports for both Jest and Cypress tests
- Captures and analyzes screenshots on test failures
- Optimizes test execution with caching and parallel runs

To manually trigger the CI/CD workflow, go to the Actions tab in your GitHub repository and select the workflow to run.

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.

## Other Templates

While this template is intentionally minimal and to be used as a learning resource, there are other paid versions in the community which are more full-featured:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev

stripe link is under construction.

# CI/CD構築について

## 概要

GitHub Actionsを使用した自動CI/CDパイプラインを実装しました。このパイプラインは以下の機能を提供します：

- **コード品質チェック**: ESLint、TypeScript型チェック、Prettierによるコードフォーマットチェック
- **自動テスト実行**: ユニットテストとE2Eテストの自動実行
- **テストレポート生成**: 詳細なテスト結果レポートとカバレッジレポートの自動生成
- **ビルド＆デプロイ自動化**: 本番環境へのVercelデプロイの自動化
- **通知機能**: Slackへのデプロイ結果通知

## ワークフローの詳細

### 1. コード品質チェックワークフロー

```yaml
jobs:
  code-quality:
    name: Code Quality Check
    runs-on: ubuntu-latest
    steps:
      - name: Run ESLint
        id: eslint
        run: npm run lint
      - name: TypeScript type check
        id: tsc
        run: npx tsc --noEmit
      - name: Prettier Check
        id: prettier
        run: npx prettier --check "**/*.{js,jsx,ts,tsx}"
```

### 2. テスト自動実行ワークフロー

```yaml
jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - name: Run unit tests with coverage
        id: unit_tests
        run: npm run test:ci
        
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - name: Run Cypress tests
        id: cypress
        uses: cypress-io/github-action@v6
```

### 3. ビルド＆デプロイ自動化

```yaml
jobs:
  build-and-deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    needs: [unit-tests, e2e-tests]
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    steps:
      - name: Build Next.js
        run: npm run build
      - name: Deploy to Vercel
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## スケジュール実行

- **CI/CDパイプライン**: 毎週日曜日の午前0時に自動実行
- **E2Eテスト**: 毎週月曜日と木曜日の午前0時に自動実行

## テストレポート

自動生成される主なレポート：

1. **コード品質レポート**: ESLint、TypeScript、Prettierのチェック結果
2. **ユニットテストレポート**: テスト結果とカバレッジ情報
3. **E2Eテストレポート**: テスト結果、スクリーンショット、ビデオ
4. **失敗分析レポート**: テスト失敗時の詳細分析
5. **実行時間分析**: テスト実行パフォーマンス分析

## 使用方法

### 手動でワークフローを実行

1. GitHubリポジトリの「Actions」タブに移動
2. 実行したいワークフロー（「CI/CD Pipeline」または「E2E Tests」）を選択
3. 「Run workflow」ボタンをクリック
4. 必要に応じてブランチを選択して「Run workflow」をクリック

### テストレポートの確認

1. ワークフロー実行後、「Artifacts」セクションにレポートが表示されます
2. 以下のレポートがダウンロード可能です：
   - `code-quality-report`
   - `test-reports`
   - `cypress-results-{run_id}`
   - `e2e-failures-{run_id}`（テスト失敗時のみ）
   - `test-timing-{run_id}`
   - `test-summary-{run_id}`
   - `deployment-summary`（デプロイ時のみ）

## 環境変数の設定

CI/CDを正常に動作させるためには、以下の環境変数をGitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に設定する必要があります：

- `DATABASE_URL`: データベース接続URL
- `NEXTAUTH_URL`: Next.js認証用URL
- `NEXTAUTH_SECRET`: Next.js認証用シークレット
- `BASE_URL`: アプリケーションのベースURL
- `STRIPE_SECRET_KEY`: Stripe APIキー
- `VERCEL_TOKEN`: Vercelデプロイトークン
- `SLACK_WEBHOOK`: Slack通知用Webhook URL（オプション）
- `TEST_USER_EMAIL`: E2Eテスト用のユーザーメールアドレス
- `TEST_USER_PASSWORD`: E2Eテスト用のユーザーパスワード