# CI/CD設定手順書

## 1. GitHub Actionsの設定

### 1.1 ワークフローファイルの配置
`.github/workflows/test.yml`が既に作成済みです。このファイルには以下の設定が含まれています：
- Node.jsのセットアップ
- 依存関係のキャッシュ
- テストの実行
- カバレッジレポートの生成
- Codecovへのレポートアップロード

### 1.2 環境変数の設定
以下の環境変数をGitHubリポジトリのSecretsに設定する必要があります：

1. `CODECOV_TOKEN`
   - Codecovダッシュボードから取得
   - GitHubリポジトリの Settings > Secrets and variables > Actions で設定
   - Name: `CODECOV_TOKEN`
   - Value: Codecovから取得したトークン

2. その他の必要な環境変数
   - `DATABASE_URL`
   - `RESEND_API_KEY`
   - `NEXTAUTH_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

## 2. Codecovの設定

### 2.1 Codecovとの連携
1. [Codecov](https://codecov.io/)にアクセス
2. GitHubアカウントでサインイン
3. リポジトリを選択して連携
4. トークンを取得

### 2.2 codecov.ymlの設定
```yaml
coverage:
  status:
    project:
      default:
        target: 80%    # 目標カバレッジ
        threshold: 1%  # 許容される変動幅
    patch:
      default:
        target: 80%    # 新規コードの目標カバレッジ
        threshold: 1%  # 許容される変動幅

ignore:
  - "tests/**/*"      # テストファイルは除外
  - "**/*.d.ts"       # 型定義ファイルは除外
```

## 3. テスト実行の最適化

### 3.1 Jest設定の調整
`jest.config.js`で以下の設定を行っています：
- 並列実行の最適化
- キャッシュの有効化
- タイムアウト設定
- カバレッジレポートの設定

### 3.2 テスト実行時間の監視
1. GitHub Actionsのワークフローで実行時間を記録
2. 定期的に実行時間をレビュー
3. 必要に応じて以下を調整：
   - 並列実行数
   - テストのグループ化
   - キャッシュ戦略

## 4. 運用手順

### 4.1 プルリクエスト時
1. テストの自動実行
2. カバレッジレポートの自動生成
3. Codecovによるカバレッジ変更の確認

### 4.2 定期的なメンテナンス
1. テスト実行時間の確認と最適化
2. カバレッジレポートの分析
3. テストケースの見直しと追加

### 4.3 トラブルシューティング
1. テスト失敗時の対応
   - ログの確認
   - 環境変数の確認
   - キャッシュのクリア
2. カバレッジ低下時の対応
   - 影響範囲の特定
   - テストケースの追加
   - コードの改善

---

詳細な情報については、以下のドキュメントを参照してください：

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Vercel デプロイ ドキュメント](https://vercel.com/docs/deployments/overview)
- [Jest テストフレームワーク](https://jestjs.io/ja/docs/getting-started)
- [Cypress E2Eテスト](https://docs.cypress.io/guides/overview/why-cypress) 