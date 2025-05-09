# 本番環境動作確認ガイド

このドキュメントでは、本番環境での認証機能、エラーハンドリング、およびその他の重要なコンポーネントの動作確認方法について説明します。

## 目次

1. [ヘルスチェックエンドポイント](#ヘルスチェックエンドポイント)
2. [動作確認スクリプト](#動作確認スクリプト)
3. [CI/CDパイプラインでの自動確認](#cicdパイプラインでの自動確認)
4. [手動確認手順](#手動確認手順)
5. [トラブルシューティング](#トラブルシューティング)

## ヘルスチェックエンドポイント

アプリケーションには包括的なヘルスチェックエンドポイントが実装されています。このエンドポイントは以下の項目を確認します：

- 環境変数の設定状況
- データベース接続
- 認証システム（JWT）
- エラーハンドリングシステム

### エンドポイント

```
GET /api/health
```

### レスポンス例

```json
{
  "status": "ok",
  "timestamp": "2025-04-05T12:00:00.000Z",
  "environment": "production",
  "components": {
    "environment": {
      "status": "ok"
    },
    "database": {
      "status": "ok",
      "latency": "normal"
    },
    "auth": {
      "status": "ok"
    },
    "errorHandling": {
      "status": "ok"
    }
  },
  "version": "1.0.0",
  "uptime": 3600
}
```

### ステータスコード

- `200`: すべてのコンポーネントが正常に動作
- `299`: 警告あり（一部のコンポーネントに問題があるが、アプリケーションは動作可能）
- `500`: エラーあり（重要なコンポーネントに問題があり、アプリケーションが正常に動作していない）

## 動作確認スクリプト

アプリケーションには本番環境の動作を確認するためのスクリプトが含まれています。

### 使用方法

```bash
# ローカル環境の確認
./scripts/verify-production.sh http://localhost:3000

# 本番環境の確認
./scripts/verify-production.sh https://your-production-url.com
```

このスクリプトは以下を確認します：

1. ヘルスチェックエンドポイントの応答
2. 認証エンドポイントの応答
3. エラーハンドリングの動作

### 出力例

```
==== 本番環境動作確認スクリプト ====

対象環境: http://localhost:3000
実行日時: Sat Apr 5 21:15:30 JST 2025
-------------------------------------

==== ヘルスチェックの実行 ====

ヘルスチェックURL: http://localhost:3000/api/health
✓ ヘルスチェック成功: HTTP 200
全体ステータス: ok
認証ステータス: ok
データベースステータス: ok
エラーハンドリングステータス: ok

詳細情報:
{
  "status": "ok",
  "timestamp": "2025-04-05T12:15:30.000Z",
  "environment": "development",
  ...
}

==== 認証機能の確認 ====

認証チェックURL: http://localhost:3000/api/auth/session
✓ 認証エンドポイント確認成功: HTTP 200
レスポンス: {}

==== エラーハンドリングの確認 ====

存在しないエンドポイント: http://localhost:3000/api/non-existent-endpoint
✓ エラーハンドリング確認成功: HTTP 404
レスポンス: {"error":"Not Found"}

==== 総合結果 ====

✓ 本番環境は正常に動作しています
```

## CI/CDパイプラインでの自動確認

CI/CDパイプラインには、デプロイ後に自動的に本番環境の動作を確認するステップが含まれています。

### ワークフロー

1. コードの品質チェック
2. ユニットテスト
3. E2Eテスト
4. ビルドとデプロイ
5. **本番環境動作確認**
6. 通知

本番環境動作確認ステップでは、以下を確認します：

- ヘルスチェックエンドポイントの応答
- 認証エンドポイントの応答
- 各コンポーネントのステータス

問題が検出された場合、パイプラインは失敗し、通知が送信されます。

## 手動確認手順

本番環境を手動で確認する場合は、以下の手順に従ってください：

1. **ヘルスチェックの確認**
   ```bash
   curl https://your-production-url.com/api/health | jq .
   ```

2. **認証エンドポイントの確認**
   ```bash
   curl https://your-production-url.com/api/auth/session | jq .
   ```

3. **ログインの確認**
   - ブラウザで `/signin` ページにアクセス
   - テストユーザーでログインを試行
   - 正常にダッシュボードにリダイレクトされることを確認

4. **エラーハンドリングの確認**
   - 存在しないページにアクセス（例: `/non-existent-page`）
   - 適切なエラーページが表示されることを確認

## トラブルシューティング

### 環境変数の問題

ヘルスチェックで環境変数に関する警告が表示される場合：

1. `.env.production` ファイルに必要な環境変数がすべて設定されていることを確認
2. デプロイ環境（Vercelなど）の環境変数設定を確認

### データベース接続の問題

データベースステータスがエラーを示す場合：

1. データベース接続文字列が正しいことを確認
2. データベースサーバーが稼働していることを確認
3. ファイアウォール設定を確認

### 認証システムの問題

認証ステータスがエラーを示す場合：

1. `JWT_SECRET` と `NEXTAUTH_SECRET` が設定されていることを確認
2. `NEXTAUTH_URL` が正しく設定されていることを確認

### エラーハンドリングの問題

エラーハンドリングステータスがエラーを示す場合：

1. エラーログを確認
2. エラーハンドリングモジュールが正しく読み込まれていることを確認
