# API Routes ガイドライン

このプロジェクトでは、Next.jsのApp Router APIルート（Route Handlers）を使用してAPIを実装しています。API競合を避け、一貫したAPIデザインを維持するために、以下のガイドラインを遵守してください。

## 基本方針

1. **App Router APIルートのみを使用**
   - 新しいAPIエンドポイントは必ず`app/api/`ディレクトリ内に実装
   - Pages Router (`pages/api/`)は使用しない

2. **API競合の防止**
   - API競合が発生した場合はApp Router（Route Handler）に一本化
   - 既存のPages RouterベースのAPIは段階的にApp Routerに移行

3. **ルーティング構造**
   - RESTful原則に従い、リソースベースのパス構造を採用
   - 例: `/api/users/[id]/profile`, `/api/translations/[id]/status`

## Route Handlerの実装ガイド

### 基本構造

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAPILogging } from '@/lib/utils/api-logging';

// ダイナミックレンダリングを使用（SSRモード）
export const dynamic = 'force-dynamic';

// APIハンドラ実装
async function handler(req: NextRequest) {
  try {
    // 実装...
    return NextResponse.json({ success: true, data: {...} });
  } catch (error) {
    return NextResponse.json(
      { error: 'エラーメッセージ' },
      { status: 500 }
    );
  }
}

// エクスポート（ログ機能付き）
export const GET = withAPILogging(handler, 'resource-name');
export const POST = withAPILogging(postHandler, 'resource-name');
// その他必要なHTTPメソッド...
```

### 認証・認可

- すべてのAPIエンドポイントは適切な認証・認可処理を実装
- NextAuthのセッショントークンまたはAPIキーを使用した認証を実装

```typescript
import { getToken } from 'next-auth/jwt';

// トークン認証
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
if (!token || !token.sub) {
  return NextResponse.json(
    { error: '認証が必要です' },
    { status: 401 }
  );
}

// 権限チェック（例: 管理者のみ）
if (token.role !== 'ADMIN') {
  return NextResponse.json(
    { error: '権限がありません' },
    { status: 403 }
  );
}
```

### レスポンス形式の標準化

- すべてのレスポンスは一貫したJSON形式を使用
- 成功時は`{ success: true, data: {...} }`
- エラー時は`{ error: 'エラーメッセージ' }`
- ページネーションには`{ data: [...], pagination: { total, page, pageSize, pages } }`

### エラーハンドリング

- 明示的なエラーハンドリングを実装
- 適切なHTTPステータスコードを使用
- 開発環境ではエラー詳細を含め、本番環境では一般的なエラーメッセージのみを返す

## API移行ガイド

既存のPages RouterベースのAPIをApp Routerに移行する手順：

1. App Router (`app/api/`)内に同等の機能を持つRoute Handlerを実装
2. 両方のAPIを短期間並行稼働させ、クライアント側の移行をサポート
3. クライアント側の更新完了後、Pages Router版のAPIを廃止
4. 移行完了後、Pages Routerディレクトリを削除

## パフォーマンス最適化

- 不必要なデータベースクエリを避ける
- 大きなレスポンスはストリーミングまたはページネーションを使用
- キャッシュ戦略を適切に設定（`revalidate`オプションなど）
- Long-runningな処理はバックグラウンドジョブに移行

## API文書化

- 各APIエンドポイントは`docs/api-reference.md`に文書化
- リクエスト・レスポンスの例、パラメータ、認証要件などを明記 