# LLM駆動開発のための追加情報

## 1. LLM駆動開発のベストプラクティス

### 1.1 プロンプトエンジニアリング
- **明確な指示**: 具体的なタスク、期待される出力、制約条件を明示
- **コンテキスト提供**: 必要な背景情報、既存コード、関連ファイルの参照
- **段階的開発**: 複雑な機能を小さなステップに分解
- **フィードバックループ**: 生成されたコードのレビューと修正指示
- **プロンプトテンプレート**: 一貫性のある指示形式の確立

### 1.2 コード生成戦略
- **スケルトンファースト**: 全体構造を先に生成し、詳細を後から埋める
- **テスト駆動**: テストコードを先に生成し、実装を後から行う
- **インクリメンタル開発**: 小さな機能単位で生成・テスト・統合
- **リファクタリング**: 生成されたコードの最適化と標準化
- **ドキュメント同時生成**: コードとドキュメントを同時に生成

### 1.3 エラー処理と修正
- **エラーパターン認識**: 共通するエラーパターンの識別
- **デバッグ指示**: エラー情報の適切な提供方法
- **修正サイクル**: エラー→分析→修正→検証のサイクル確立
- **エラーログ管理**: 発生したエラーとその解決策の記録
- **予防的アプローチ**: 一般的なエラーを事前に防ぐ設計パターン

## 2. Vercel特化情報

### 2.1 Vercelデプロイメント最適化
- **ビルド設定**: 効率的なビルド設定とキャッシュ戦略
  ```json
  {
    "buildCommand": "next build",
    "outputDirectory": ".next",
    "installCommand": "npm ci",
    "framework": "nextjs"
  }
  ```
- **環境変数管理**: 環境ごとの変数設定と暗号化
- **プレビュー環境**: ブランチごとのプレビューデプロイメント活用
- **デプロイメントフック**: GitHubとの連携と自動デプロイ
- **モニタリング**: Vercel Analyticsと統合したパフォーマンス監視

### 2.2 Vercelエッジ機能活用
- **ミドルウェア最適化**: 認証、リダイレクト、地域制限などの実装
  ```typescript
  // middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  
  export function middleware(request: NextRequest) {
    // 認証チェック、リダイレクト、ヘッダー追加などの処理
    const token = request.cookies.get('token');
    
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
  }
  
  export const config = {
    matcher: ['/dashboard/:path*', '/api/:path*'],
  };
  ```
- **エッジキャッシュ**: ISRとエッジキャッシュの組み合わせ
- **地域最適化**: エッジロケーションを活用した配信最適化
- **サーバーレス関数**: API Routesの最適化とタイムアウト対策
- **Vercel KV/Blob/Postgres**: Vercel統合データサービスの活用

### 2.3 Next.js App Router最適化
- **ルートグループ**: 効率的なルート構造の設計
- **サーバーコンポーネント**: 適切なサーバー/クライアントコンポーネントの分離
- **ストリーミング**: Suspenseを活用したUI表示の最適化
- **部分レンダリング**: 必要な部分のみを再レンダリングする設計
- **メタデータAPI**: SEO最適化とソーシャルシェア対応

## 3. Supabase特化情報

### 3.1 Supabase認証システム
- **Row Level Security (RLS)**: 適切なポリシー設定
  ```sql
  -- ユーザーは自分のデータのみアクセス可能
  CREATE POLICY "ユーザーは自分のデータのみ参照可能" 
  ON public.user_data
  FOR SELECT
  USING (auth.uid() = user_id);
  
  -- チームメンバーはチームデータにアクセス可能
  CREATE POLICY "チームメンバーはチームデータ参照可能" 
  ON public.team_data
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id = team_data.team_id
    )
  );
  ```
- **JWTカスタム要求**: ロールや権限の埋め込み
- **OAuth連携**: ソーシャルログインの設定と管理
- **多要素認証**: TOTP設定とリカバリーコード管理
- **セッション管理**: セッションの有効期限と更新戦略

### 3.2 Supabaseリアルタイム機能
- **リアルタイムサブスクリプション**: 効率的なチャネル設計
  ```typescript
  // リアルタイムサブスクリプションの例
  const channel = supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'translations',
        filter: `file_id=eq.${fileId}`
      },
      (payload) => {
        // リアルタイム更新の処理
        updateTranslations(payload.new);
      }
    )
    .subscribe();
  
  // クリーンアップ
  return () => {
    supabase.removeChannel(channel);
  };
  ```
- **プレゼンス**: オンラインユーザー管理
- **ブロードキャスト**: 全ユーザーへの通知
- **メッセージキュー**: 非同期処理のためのキュー実装
- **競合解決**: 同時編集の衝突解決戦略

### 3.3 Supabaseストレージ最適化
- **セキュリティルール**: バケットとファイルのアクセス制御
  ```typescript
  // ストレージポリシーの例
  const { data, error } = await supabase
    .storage
    .from('slides')
    .upload(`${userId}/${fileId}/${slideId}.png`, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/png'
    });
  ```
- **CDN統合**: エッジキャッシュとCDN配信
- **画像変換**: 画像リサイズと最適化
- **アップロード制限**: ファイルサイズと種類の制限
- **バージョニング**: ファイルバージョン管理

### 3.4 Supabase Functions
- **エッジ関数**: サーバーレス関数の最適化
- **スケジュールタスク**: 定期実行ジョブの設定
- **Webhook処理**: 外部サービス連携
- **バックグラウンド処理**: 長時間実行タスクの管理
- **エラーハンドリング**: 関数実行エラーの処理と再試行

## 4. LLM連携アーキテクチャ

### 4.1 LLM API統合
- **APIラッパー**: 一貫したインターフェースの提供
  ```typescript
  // LLM APIラッパーの例
  export class TranslationService {
    private apiKey: string;
    private baseUrl: string;
    
    constructor(apiKey: string, baseUrl: string) {
      this.apiKey = apiKey;
      this.baseUrl = baseUrl;
    }
    
    async translateText(
      text: string, 
      sourceLang: string, 
      targetLang: string,
      context?: string
    ): Promise<string> {
      try {
        const response = await fetch(`${this.baseUrl}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            text,
            sourceLang,
            targetLang,
            context
          })
        });
        
        if (!response.ok) {
          throw new Error(`Translation API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.translation;
      } catch (error) {
        console.error('Translation failed:', error);
        throw error;
      }
    }
    
    // バッチ翻訳、キャッシュ管理などの追加メソッド
  }
  ```
- **レート制限対応**: スロットリングと再試行ロジック
- **コンテキスト管理**: 効率的なコンテキスト提供
- **プロンプトテンプレート**: 再利用可能なテンプレート
- **フォールバック戦略**: APIエラー時の代替処理

### 4.2 LLMキャッシュと最適化
- **結果キャッシュ**: 翻訳結果のキャッシュ戦略
- **バッチ処理**: 複数リクエストの一括処理
- **ストリーミングレスポンス**: 段階的な結果表示
- **コスト最適化**: トークン使用量の最小化
- **モデル選択**: 用途に応じた適切なモデル選択

### 4.3 LLM品質管理
- **品質評価**: 翻訳品質の自動評価
- **ヒューマンレビュー**: 人間によるレビューワークフロー
- **フィードバックループ**: ユーザーフィードバックの収集と反映
- **ドメイン適応**: 特定分野向けの最適化
- **バイアス検出**: 不適切な出力の検出と修正

## 5. エラー防止戦略

### 5.1 開発時エラー防止
- **型安全性**: 厳格なTypeScript設定
  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true,
      "noImplicitReturns": true,
      "noFallthroughCasesInSwitch": true,
      "forceConsistentCasingInFileNames": true
    }
  }
  ```
- **静的解析**: ESLint, Prettier, TypeScriptの厳格な設定
- **自動テスト**: CI/CDでの自動テスト実行
- **コード生成テンプレート**: 一貫性のあるコード生成
- **コードレビュー**: 自動化されたコードレビュー

### 5.2 実行時エラー防止
- **入力検証**: Zodによる厳格なスキーマ検証
  ```typescript
  // 入力検証の例
  import { z } from 'zod';

  const TranslationRequestSchema = z.object({
    text: z.string().min(1).max(10000),
    sourceLang: z.enum(['ja', 'en', 'zh', 'ko']),
    targetLang: z.enum(['ja', 'en', 'zh', 'ko']),
    fileId: z.string().uuid().optional(),
    preserveFormatting: z.boolean().default(true),
  });

  export type TranslationRequest = z.infer<typeof TranslationRequestSchema>;

  // APIルートでの使用
  export async function POST(req: Request) {
    try {
      const body = await req.json();
      const validatedData = TranslationRequestSchema.parse(body);
      
      // 検証済みデータで処理を続行
      const result = await translateService.translate(validatedData);
      return Response.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          { success: false, error: { code: 'VALIDATION_ERROR', details: error.format() } },
          { status: 400 }
        );
      }
      
      console.error('Translation error:', error);
      return Response.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
        { status: 500 }
      );
    }
  }
  ```
- **エラーバウンダリ**: React Error Boundaryの活用
- **グレースフルデグラデーション**: 部分的な機能低下の許容
- **リトライメカニズム**: 一時的なエラーの自動リトライ
- **サーキットブレーカー**: 障害の連鎖防止

### 5.3 インフラストラクチャエラー防止
- **ヘルスチェック**: サービス健全性の定期確認
- **自動スケーリング**: 負荷に応じた自動スケーリング
- **リソース制限**: 適切なリソース上限設定
- **障害注入テスト**: 意図的な障害発生テスト
- **ディザスタリカバリ**: 障害からの復旧計画

## 6. パフォーマンス最適化

### 6.1 フロントエンド最適化
- **バンドル分析**: ウェブパックバンドルアナライザーの活用
- **コード分割**: 動的インポートとルートベース分割
- **画像最適化**: next/imageとWebP/AVIF形式
- **Web Vitals**: Core Web Vitalsの継続的モニタリング
- **プリフェッチ**: 予測ナビゲーションのプリフェッチ

### 6.2 バックエンド最適化
- **クエリ最適化**: データベースクエリの最適化
- **キャッシュ階層**: 多層キャッシュ戦略
- **非同期処理**: バックグラウンドジョブとキュー
- **コネクションプーリング**: データベース接続の効率管理
- **マイクロキャッシュ**: 短期間の結果キャッシュ

### 6.3 データベース最適化
- **インデックス設計**: 適切なインデックス設計
- **クエリプランニング**: 実行計画の分析と最適化
- **データパーティショニング**: 大規模テーブルの分割
- **読み取り/書き込み分離**: 負荷分散パターン
- **バッチ処理**: 一括操作の最適化

## 7. 開発ワークフロー

### 7.1 開発環境セットアップ
- **ローカル開発環境**: Docker Composeによる環境構築
  ```yaml
  # docker-compose.yml
  version: '3.8'
  services:
    postgres:
      image: postgres:15
      ports:
        - "5432:5432"
      environment:
        POSTGRES_PASSWORD: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: app_development
      volumes:
        - postgres-data:/var/lib/postgresql/data
    
    supabase:
      image: supabase/supabase-local
      depends_on:
        - postgres
      ports:
        - "8000:8000"
      environment:
        POSTGRES_PASSWORD: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: app_development
        JWT_SECRET: super-secret-jwt-token-for-local-dev
    
    redis:
      image: redis:alpine
      ports:
        - "6379:6379"
      volumes:
        - redis-data:/data
  
  volumes:
    postgres-data:
    redis-data:
  ```
- **環境変数管理**: .env.localと.env.exampleの活用
- **依存関係管理**: パッケージバージョンの固定
- **デバッグ設定**: VSCodeデバッグ構成
- **ホットリロード**: 開発効率向上のための設定

### 7.2 CI/CD設定
- **GitHub Actions**: 自動テストとデプロイ
  ```yaml
  # .github/workflows/ci.yml
  name: CI/CD Pipeline
  
  on:
    push:
      branches: [main, develop]
    pull_request:
      branches: [main, develop]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Setup Node.js
          uses: actions/setup-node@v3
          with:
            node-version: '18'
            cache: 'npm'
        - name: Install dependencies
          run: npm ci
        - name: Lint
          run: npm run lint
        - name: Type check
          run: npm run type-check
        - name: Test
          run: npm test
    
    deploy:
      needs: test
      if: github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Deploy to Vercel
          uses: amondnet/vercel-action@v20
          with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
            vercel-args: '--prod'
  ```
- **ブランチ戦略**: Gitflow or GitHub Flow
- **プルリクエストテンプレート**: 標準化されたPRプロセス
- **自動化テスト**: 単体、統合、E2Eテストの自動実行
- **デプロイプレビュー**: PRごとのプレビュー環境

### 7.3 モニタリングと分析
- **エラートラッキング**: Sentryによるエラー監視
- **パフォーマンスモニタリング**: Vercel Analyticsの活用
- **ユーザー行動分析**: イベントトラッキング
- **ログ集約**: 構造化ログとログ検索
- **アラート設定**: 重要な問題の通知設定

## 8. ドキュメント管理

### 8.1 技術ドキュメント
- **アーキテクチャ図**: システム構成の視覚化
- **API仕様**: OpenAPI/Swaggerによる定義
- **コンポーネントカタログ**: Storybookの活用
- **開発ガイド**: 新規開発者向けガイド
- **トラブルシューティング**: 一般的な問題と解決策

### 8.2 LLM指示ドキュメント
- **プロンプトライブラリ**: 再利用可能なプロンプト集
- **コード生成ガイドライン**: 一貫したコード生成のための指針
- **エラーパターン集**: 一般的なエラーと解決策
- **リファクタリング指示**: コード改善のためのガイド
- **テスト生成テンプレート**: テストコード生成のためのテンプレート

## 進捗・現状
- バッチアップロードAPI/進捗API: API本実装・E2E検証中
- APIキー外部連携: API設計中・近日実装予定
- 請求書メール送信: API設計中・近日実装予定
- 統計エクスポート: API設計中・近日実装予定
- RLS/監査ログ: API設計中・近日実装予定 