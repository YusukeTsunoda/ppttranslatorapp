# APIルーティングのログ機能

このシステムでは、すべてのAPIルートのビルド状況と実行状況をログに記録する機能を実装しています。

## 機能概要

1. **ビルド時のAPIルート検出**
   - ビルド中に`app/api`ディレクトリ内のすべてのルートファイルを検出
   - 検出されたAPIルートの一覧をログに出力
   - ビルドIDやビルド環境情報も記録

2. **リクエスト処理のログ記録**
   - 各APIリクエストの開始時にルート名、メソッド、パス、クエリパラメータなどをログに記録
   - リクエスト完了時に処理時間とステータスコードをログに記録
   - エラー発生時は詳細なエラー情報をログに記録

## 使用方法

APIルートにログ機能を適用するには、ハンドラ関数を`withAPILogging`でラップします：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAPILogging } from '@/lib/utils/api-logging';

// APIハンドラ実装
async function handler(req: NextRequest) {
  // 実装...
  return NextResponse.json({ ... });
}

// ログ機能を適用してエクスポート
export const GET = withAPILogging(handler, 'route-name');
```

## ログのフォーマット

### ビルド時のログ
```
=== API Routes Build Info ===
API directory: /path/to/app/api
Detected 12 API routes:
  - app/api/health/route.ts
  - app/api/translate/route.ts
  ...
========================
```

### リクエスト開始時のログ
```
[API:route-name] リクエスト開始: {
  route: "route-name",
  method: "GET",
  path: "/api/route-path",
  query: { ... },
  timestamp: "2023-05-15T12:34:56.789Z"
}
```

### リクエスト完了時のログ
```
[API:route-name] リクエスト完了: {
  route: "route-name",
  method: "GET",
  path: "/api/route-path",
  statusCode: 200,
  duration: "123ms",
  timestamp: "2023-05-15T12:34:56.912Z"
}
```

### エラー発生時のログ
```
[API:route-name] エラー発生: {
  route: "route-name",
  method: "POST",
  path: "/api/route-path",
  error: "エラーメッセージ",
  stack: "エラースタックトレース",
  duration: "45ms",
  timestamp: "2023-05-15T12:34:57.001Z"
}
```

## 注意事項

- 本番環境ではセキュリティ上の理由からエラーの詳細は外部に公開されませんが、ログには記録されます
- パフォーマンスへの影響を最小限に抑えるため、ログレベルに応じてログの詳細度を調整することが可能です
- 機密データ（トークン、パスワードなど）は自動的にログから除外されます 