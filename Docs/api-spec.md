# API仕様書

## 概要

このドキュメントでは、翻訳APIの仕様について説明します。APIは主に翻訳処理、ユーザー管理、システムモニタリングの機能を提供します。

## 認証

すべてのAPIリクエストには認証が必要です。認証は以下のいずれかの方法で行います：

1. セッショントークン（Webアプリケーション用）
2. APIキー（外部サービス連携用）

### APIキー認証

APIキーは`Authorization`ヘッダーに以下の形式で指定します：

```
Authorization: Bearer <api-key>
```

## エンドポイント

### 翻訳API

#### POST /api/translate

PowerPointファイルの翻訳を実行します。

**リクエスト**

- Content-Type: `multipart/form-data`

**パラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|----|------|
| file | File | ○ | 翻訳対象のPowerPointファイル |
| sourceLanguage | string | ○ | 翻訳元言語コード（例：'en', 'ja'） |
| targetLanguage | string | ○ | 翻訳先言語コード（例：'en', 'ja'） |
| options | object | × | 翻訳オプション |

**options オブジェクト**

| フィールド | 型 | デフォルト値 | 説明 |
|------------|----|----|------|
| preserveFormatting | boolean | true | 書式設定を保持するかどうか |
| translateHiddenSlides | boolean | false | 非表示スライドを翻訳するかどうか |
| translateNotes | boolean | true | ノートを翻訳するかどうか |
| translateAltText | boolean | true | 代替テキストを翻訳するかどうか |

**レスポンス**

成功時（200 OK）：
```json
{
  "id": "translation-job-id",
  "status": "success",
  "downloadUrl": "https://example.com/download/translated-file.pptx",
  "statistics": {
    "slideCount": 10,
    "wordCount": 500,
    "processingTime": 5000
  }
}
```

エラー時（4xx/5xx）：
```json
{
  "error": {
    "code": "error_code",
    "message": "エラーメッセージ",
    "details": {}
  }
}
```

#### GET /api/translate/{id}

翻訳ジョブのステータスを取得します。

**パラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|----|------|
| id | string | ○ | 翻訳ジョブID |

**レスポンス**

成功時（200 OK）：
```json
{
  "id": "translation-job-id",
  "status": "processing|success|failed",
  "progress": 75,
  "statistics": {
    "processedSlides": 7,
    "totalSlides": 10,
    "estimatedTimeRemaining": 2000
  }
}
```

### モニタリングAPI

#### GET /api/monitoring/metrics

システムメトリクスを取得します。

**レスポンス**

成功時（200 OK）：
```json
{
  "memory": {
    "heapUsed": 1000000,
    "heapTotal": 2000000,
    "external": 500000,
    "arrayBuffers": 100000
  },
  "cpu": {
    "user": 0.5,
    "system": 0.3,
    "percentage": 80
  },
  "requests": {
    "total": 1000,
    "success": 950,
    "failed": 50,
    "latency": 200
  },
  "translations": {
    "total": 500,
    "success": 480,
    "failed": 20,
    "averageProcessingTime": 5000
  },
  "cache": {
    "hits": 800,
    "misses": 200,
    "size": 1000000
  }
}
```

#### GET /api/monitoring/alerts

アラート情報を取得します。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|------------|----|----|------|
| severity | string | × | アラートの重要度でフィルタリング（'info', 'warning', 'error', 'critical'） |
| from | number | × | 開始タイムスタンプ（ミリ秒） |
| to | number | × | 終了タイムスタンプ（ミリ秒） |

**レスポンス**

成功時（200 OK）：
```json
{
  "alerts": [
    {
      "id": "alert-id",
      "ruleId": "high-memory-usage",
      "message": "メモリ使用量警告: メモリ使用量が閾値を超過",
      "severity": "warning",
      "timestamp": 1647123456789,
      "metrics": {
        "memory": {
          "heapUsed": 1800000,
          "heapTotal": 2000000
        }
      }
    }
  ]
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| invalid_request | リクエストパラメータが不正 |
| unauthorized | 認証エラー |
| forbidden | 権限エラー |
| not_found | リソースが見つからない |
| rate_limit_exceeded | レート制限超過 |
| internal_error | 内部エラー |
| service_unavailable | サービス一時停止中 |

## レート制限

APIには以下のレート制限が適用されます：

- 無料プラン：100リクエスト/時間
- プロプラン：1000リクエスト/時間
- エンタープライズプラン：カスタム設定可能

レート制限の情報は以下のレスポンスヘッダーで確認できます：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647123456
``` 