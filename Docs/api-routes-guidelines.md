# API Routes ガイドライン

このプロジェクトでは、Next.jsのApp Router APIルート（Route Handlers）を使用してAPIを実装しています。API競合を避け、一貫したAPIデザインを維持するために、以下のガイドラインを遵守してください。

## 基本方針

1. **App Router APIルートのみを使用**
   - 新しいAPIエンドポイントは必ず`app/api/`ディレクトリ内に実装
   - Pages Router (`pages/api/`)は使用しない
   - 既存のPages RouterベースのAPIは段階的にApp Routerに移行

2. **API競合の防止**
   - API競合が発生した場合はApp Router（Route Handler）に一本化
   - 既存のPages RouterベースのAPIは段階的にApp Routerに移行
   - 移行中は両方のAPIを並行稼働させ、クライアント側の移行をサポート

3. **ルーティング構造**
   - RESTful原則に従い、リソースベースのパス構造を採用
   - 例: `/api/users/[id]/profile`, `/api/translations/[id]/status`
   - クエリパラメータを活用したフィルタリング・ソート・ページネーション

## Route Handlerの実装ガイド

### 基本構造

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAPILogging } from '@/lib/utils/api-logging';
import { AppError, ErrorType, ErrorCodes } from '@/types/error';
import { validateBody } from '@/lib/utils/validation';
import { z } from 'zod';

// ダイナミックレンダリングを使用（SSRモード）
export const dynamic = 'force-dynamic';

// リクエストスキーマの定義
const requestSchema = z.object({
  // スキーマ定義
});

// APIハンドラ実装
async function handler(req: NextRequest) {
  try {
    // バリデーション
    const body = await validateBody(req, requestSchema);

    // 実装...
    return NextResponse.json({ 
      success: true, 
      data: {...},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({
        error: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      }, { status: error.statusCode });
    }

    // 未知のエラー
    return NextResponse.json({
      error: ErrorCodes.UNKNOWN_ERROR,
      message: '予期せぬエラーが発生しました',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// エクスポート（ログ機能付き）
export const GET = withAPILogging(handler, 'resource-name');
export const POST = withAPILogging(postHandler, 'resource-name');
// その他必要なHTTPメソッド...
```

### 認証・認可

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// セッション認証
const session = await getServerSession(authOptions);
if (!session) {
  throw new AppError({
    message: '認証が必要です',
    type: ErrorType.AUTH,
    statusCode: 401,
    code: ErrorCodes.UNAUTHORIZED
  });
}

// 権限チェック
if (session.user.role !== 'ADMIN') {
  throw new AppError({
    message: 'この操作を実行する権限がありません',
    type: ErrorType.FORBIDDEN,
    statusCode: 403,
    code: ErrorCodes.FORBIDDEN
  });
}
```

### レスポンス形式の標準化

1. **成功レスポンス**
```typescript
{
  success: true,
  data: {...},
  timestamp: "2024-04-15T12:34:56Z"
}
```

2. **エラーレスポンス**
```typescript
{
  error: ErrorCodes.ERROR_CODE,
  message: "エラーメッセージ",
  details?: {...},  // オプショナル
  timestamp: "2024-04-15T12:34:56Z"
}
```

3. **ページネーション**
```typescript
{
  data: [...],
  pagination: {
    total: number,
    page: number,
    pageSize: number,
    pages: number
  },
  timestamp: "2024-04-15T12:34:56Z"
}
```

### エラーハンドリング

- `AppError`クラスを使用した統一的なエラーハンドリング
- 適切なHTTPステータスコードとエラーコードの使用
- 開発環境では詳細なエラー情報を、本番環境では一般的なメッセージを返す

```typescript
try {
  // 処理
} catch (error) {
  if (error instanceof AppError) {
    throw error;
  }
  
  // 未知のエラーを適切なAppErrorに変換
  throw new AppError({
    message: '予期せぬエラーが発生しました',
    type: ErrorType.UNKNOWN,
    statusCode: 500,
    code: ErrorCodes.UNKNOWN_ERROR,
    originalError: error
  });
}
```

## テスト実装ガイド

1. **テストファイルの配置**
```
tests/
  api/
    [resource]/
      route.test.ts  // APIルートのテスト
  utils/
    test-helpers.ts  // テストヘルパー関数
    test-utils.ts    // テストユーティリティ
```

2. **テストの基本構造**
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMockRequest, mockPrisma } from '@/tests/utils/test-utils';
import { setupTestDatabase, teardownTestDatabase } from '@/tests/utils/db';

describe('API Route: [resource]', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/[resource]', () => {
    it('should return data successfully', async () => {
      const req = createMockRequest('GET');
      const response = await GET(req);
      expect(response.status).toBe(200);
    });

    it('should handle errors appropriately', async () => {
      // エラーケースのテスト
    });
  });
});
```

## パフォーマンス最適化

1. **データベースクエリの最適化**
   - 必要なフィールドのみを取得
   - 適切なインデックスの使用
   - N+1問題の回避

2. **キャッシュ戦略**
   - レスポンスのキャッシュ設定
   - クライアントサイドのキャッシュ活用
   - 静的生成とISRの適切な使用

3. **大規模データの処理**
   - ストリーミングレスポンスの使用
   - ページネーションの実装
   - バックグラウンドジョブの活用

## API文書化

- 各APIエンドポイントは`docs/api-reference.md`に文書化
- OpenAPI/Swaggerフォーマットでの文書化を検討
- リクエスト・レスポンスの例、認証要件、エラーケースを明記 