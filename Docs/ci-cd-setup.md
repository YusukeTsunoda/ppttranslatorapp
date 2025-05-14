# CI/CD パイプライン セットアップガイド

このリポジトリはGitHub Actionsを使用した継続的インテグレーション/継続的デリバリー（CI/CD）パイプラインを実装しています。このドキュメントでは、パイプラインの設定方法と使用方法について説明します。

## 概要

CI/CDパイプラインは以下の主要なステップで構成されています：

1. **コード検証**: リント、型チェック、テスト実行
2. **ビルド**: アプリケーションのビルド
3. **デプロイ**: Vercelへの自動デプロイ（mainブランチのみ）

## 前提条件

- GitHub リポジトリにアクセス権があること
- Vercelアカウントとデプロイ権限
- （オプション）通知用のSlackワークスペースとウェブフック

## シークレットの設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください：

- `VERCEL_TOKEN`: Vercel APIトークン
- `SLACK_WEBHOOK`: Slack通知用のウェブフックURL（オプション）

## ワークフローの構成

`.github/workflows/ci-cd.yml` ファイルには、CI/CDパイプラインの設定が含まれています。このファイルは以下のジョブを定義しています：

### 1. lint-and-test

コードの品質検証とテストを実行します：

- ESLintによるコード検証
- Jestによるユニットテスト
- テストレポートの生成

### 2. build

アプリケーションをビルドし、ビルドアーティファクトを生成します。

### 3. deploy

mainブランチへのマージ時に、Vercelへの自動デプロイを実行します。

## 手動ワークフロー実行

GitHub の Actions タブから手動でワークフローを実行することも可能です。これは、特定の変更を検証したい場合に便利です。

## テストレポート

テスト実行後、以下の場所にレポートが生成されます：

- Jest テストレポート: `reports/jest-report.html`
- JUnit XML レポート: `reports/junit.xml`
- Cypressレポート: `cypress/reports/report.html`

これらのレポートはGitHub Actionsの実行結果からアーティファクトとしてダウンロードできます。

## 通知

デプロイの成功または失敗時に、設定されたSlackチャンネルに通知が送信されます。通知を受け取るには、`SLACK_WEBHOOK` シークレットを設定してください。

## トラブルシューティング

CI/CDパイプラインで問題が発生した場合：

1. GitHub Actionsのログを確認
2. テストが失敗している場合はテストレポートを参照
3. ローカル環境で `npm run build:ci` を実行して問題を再現

## 継続的改善

CI/CDパイプラインは継続的に改善されるべきです。以下の改善点を検討してください：

- テストカバレッジの閾値設定
- パフォーマンステストの追加
- セキュリティスキャンの統合
- デプロイ前の手動承認プロセスの追加

---

詳細な情報については、以下のドキュメントを参照してください：

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Vercel デプロイ ドキュメント](https://vercel.com/docs/deployments/overview)
- [Jest テストフレームワーク](https://jestjs.io/ja/docs/getting-started)
- [Cypress E2Eテスト](https://docs.cypress.io/guides/overview/why-cypress) 