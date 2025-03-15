# Python実装とDockerによるVercelデプロイ計画

## 目標
現在のNext.jsアプリケーションをPythonで実装し、Dockerコンテナ化してVercelにデプロイする

## 実装手順

### 1. Pythonバックエンドの構築
- [x] FastAPIフレームワークを使用したバックエンドの構築
- [x] 必要なPythonパッケージの整理とrequirements.txtの作成
- [x] PPTXパーサー機能のPython実装への移行
- [x] PPTXジェネレーター機能のPython実装への移行
- [ ] 認証機能のPython実装への移行
- [x] ファイルアップロード/ダウンロード機能の実装
- [x] エラーハンドリングの実装

### 2. Dockerコンテナ化
- [x] Dockerfileの作成
- [x] docker-compose.ymlの更新
- [ ] 開発環境用のコンテナ設定
- [x] 本番環境用のコンテナ設定
- [ ] 環境変数の管理方法の整備

### 3. フロントエンドとの連携
- [x] APIエンドポイントの整備
- [x] CORS設定の実装
- [ ] フロントエンドからのAPI呼び出し方法の調整
- [ ] 認証トークンの受け渡し方法の実装

### 4. Vercelデプロイ準備
- [x] Vercel.jsonの更新
- [x] Serverless Functionsの設定
- [ ] 環境変数の設定
- [ ] ビルドスクリプトの調整

### 5. デプロイとテスト
- [ ] ローカル環境でのテスト
- [ ] Vercelへのデプロイ
- [ ] デプロイ後の動作確認
- [ ] パフォーマンステスト

## 技術スタック
- バックエンド: Python 3.9+, FastAPI
- コンテナ化: Docker, docker-compose
- デプロイ: Vercel
- 依存パッケージ: python-pptx, Pillow, pdf2image

## デプロイ手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd ppttranslatorapp
```

2. Dockerイメージをビルド
```bash
cd python_backend
docker build -t ppt-translator-api .
```

3. ローカルでテスト実行
```bash
docker run -p 3000:3000 ppt-translator-api
```

4. Vercelにデプロイ
```bash
vercel
```

5. 環境変数の設定
Vercelダッシュボードで以下の環境変数を設定:
- `PORT`: 3000
- `ALLOWED_ORIGINS`: フロントエンドのURL（カンマ区切りで複数指定可能）

---

# タスクリスト

## 優先度: 高
- [ ] マウスクリックが動作しない問題の修正
- [ ] 翻訳履歴機能の実装
- [x] チーム管理機能の実装
- [x] アクティビティログの実装
- [x] エラーハンドリングの改善
- [ ] パフォーマンス最適化
- [x] E2Eテスト基盤の整備
  - [x] 認証テストの実装（サインイン/サインアップフロー）
  - [x] 翻訳フローのE2Eテスト実装
  - [x] テスト用UIセレクタの追加（data-testid属性）
  - [x] 有効なテストデータの準備
  - [x] テスト環境のポート番号一貫性確保

## 優先度: 中
- [ ] ダークモードの実装
- [ ] バッチ翻訳機能の実装
- [x] プロフィール編集機能の実装
- [ ] API連携機能の実装
- [ ] 請求書生成機能の実装
- [ ] 統計・分析機能の実装

## 優先度: 低
- [ ] ブログ機能の実装
- [x] ドキュメント機能の実装
- [ ] 多言語対応の拡充
- [ ] カスタムテーマ機能
- [ ] APIドキュメントの整備
- [ ] E2Eテストの拡充

## バグ修正
- [ ] ログイン後のイベント伝播問題
- [x] ファイルアップロード時のエラー処理
  - [x] ファイルタイプの検証強化
  - [x] ファイルサイズの制限（20MB）
  - [x] アップロード中のUI状態管理
  - [x] エラーメッセージの改善
  - [x] ドラッグ＆ドロップのビジュアルフィードバック
- [ ] 翻訳テキストの位置ずれ
- [x] セッション切れの処理改善
- [ ] メモリリークの対応
- [x] 認証フローのリダイレクト問題
  - [x] サインイン後に `/translate` ページに正しくリダイレクトされる問題を修正
  - [x] 認証エラーメッセージが正しく表示される問題を修正
  - [x] セッション状態の一貫性確保

## 技術的負債
- [x] NextAuth.js v5への移行
- [x] 型定義の整備
- [x] コンポーネントのリファクタリング
- [x] テストカバレッジの向上
- [x] ログ出力の統一

## セキュリティ対策
- [x] CSRF対策の強化
- [x] レート制限の実装
- [x] ファイルアクセス制御の改善
- [x] セッション管理の強化
- [x] 監査ログの拡充

## セッション管理の改善
- [x] リフレッシュトークン処理の実装
  - [x] トークンの有効期限監視
  - [x] 自動更新機能
  - [x] エラーハンドリング
- [x] セッション状態の一元管理
  - [x] カスタムフック `useAuth` の実装
  - [x] NextAuthとの統合
  - [x] 状態管理の最適化
- [x] エラーハンドリングの強化
  - [x] エラータイプの定義
  - [x] 統一的なエラー処理
  - [x] ユーザーフレンドリーなエラー表示
- [x] セキュリティ強化
  - [x] CSRF対策
  - [x] セッションハイジャック対策
  - [x] Cookieセキュリティ設定
- [x] テスト実装
  - [x] ユニットテスト
  - [x] 統合テスト
  - [x] E2Eテスト
- [ ] ドキュメント作成
  - [ ] 開発者向けドキュメント
  - [ ] APIドキュメント
  - [ ] セキュリティドキュメント

## E2Eテスト改善計画
- [x] 認証テストの実装
  - [x] テスト用のユーザーアカウント設定
  - [x] 認証情報の環境変数化
  - [x] サインイン後のリダイレクト問題の解決
  - [x] エラーメッセージ検証の改善
  - [x] 実際のUIテキストとテスト期待値の同期
  - [x] サインインエラー要素のdata-testid属性の追加
  - [x] 認証フローのリダイレクト問題の調査と修正
- [x] テストデータの準備
  - [x] サンプルPPTXファイルの作成
  - [x] テスト用データベースシードスクリプトの実装
  - [x] テスト環境のリセット機能
  - [x] 有効なPPTXテストファイルの作成（実際のスライドとテキストを含む）
  - [x] テストデータの自動生成スクリプトの実装
- [x] テスト環境の安定化
  - [x] タイムアウト値の最適化
  - [x] 非同期処理の待機時間調整
  - [x] テスト実行の並列化設定
  - [x] ポート番号の一貫性確保（3000, 3001, 3002の混在問題）
  - [x] テスト実行前のアプリケーション状態リセット機能
  - [x] ネットワークリクエストの待機戦略の改善
- [x] UI要素の識別子追加
  - [x] 残りのコンポーネントにdata-testid属性を追加
  - [x] テスト用のセレクタ定義の統一
  - [x] アクセシビリティ属性の活用
  - [x] サインインフォームの各要素にdata-testid追加
  - [x] 翻訳ページの各UI要素にdata-testid追加
  - [x] エラーメッセージ表示要素にdata-testid追加
- [x] 段階的テスト実装
  - [x] 認証フローテストの完成
  - [x] ファイルアップロードテストの実装
  - [x] 翻訳処理テストの実装
  - [x] ダウンロードテストの実装
  - [x] 各テストケースの独立性確保（テスト間の依存関係排除）
  - [x] 失敗時のリトライ戦略の改善
- [ ] CI/CD統合
  - [ ] GitHub Actionsでのテスト自動化
  - [ ] テスト結果レポートの生成
  - [ ] テストカバレッジの計測
  - [ ] テスト失敗時のスクリーンショット保存と分析
  - [ ] テスト実行時間の最適化
- [ ] テスト実行環境の整備
  - [ ] Docker環境でのE2Eテスト実行設定
  - [ ] テスト用の独立したデータベース環境の構築
  - [ ] 本番環境に影響を与えないテスト実行の仕組み
  - [ ] テスト実行のログ収集と分析機能
- [ ] テストコードの品質向上
  - [ ] テストコードのリファクタリング
  - [ ] 共通処理のユーティリティ関数化
  - [ ] テストケースのドキュメント化
  - [ ] テストコードのレビュープロセス確立

## データベース改善
- [x] ENUM型の導入
  - [x] ユーザーロール
  - [x] サブスクリプションステータス
  - [x] ファイルステータス
  - [x] 言語コード
- [x] インデックスの最適化
  - [x] 検索頻度の高いカラムの特定
  - [x] 複合インデックスの設計
  - [x] インデックスのパフォーマンス計測
- [x] トリガーの実装
  - [x] updated_at自動更新
  - [x] 監査ログ自動記録
  - [x] 古いデータの自動アーカイブ
- [ ] RLS（Row Level Security）の実装
  - [ ] テーブルごとのポリシー設定
  - [ ] ロールベースのアクセス制御
  - [ ] 監査ログの自動記録

## Supabase連携
### Phase 1: 基本設定とデータベース移行
- [ ] Supabase プロジェクトのセットアップ
  - [ ] プロジェクト作成
  - [ ] 環境変数の設定
  - [ ] Vercelとの連携設定

- [ ] データベーススキーマの移行
  - [ ] ENUMの定義
    - [ ] ActivityAction
    - [ ] SubscriptionStatus
    - [ ] FileStatus
    - [ ] LanguageCode
    - [ ] UserRole
  - [ ] テーブルの作成
    - [ ] users
    - [ ] teams
    - [ ] team_members
    - [ ] subscriptions
    - [ ] activity_logs
    - [ ] files
    - [ ] slides
    - [ ] texts
    - [ ] translations
    - [ ] translation_memory
    - [ ] glossary
  - [ ] リレーションの設定
  - [ ] インデックスの作成
  - [ ] RLSポリシーの設定

### Phase 2: 認証・認可の実装
- [ ] Supabase Auth設定
  - [ ] メール認証の設定
  - [ ] Google認証の設定
  - [ ] パスワードリセットフロー
  - [ ] 招待フロー
- [ ] RLSポリシーの実装
  - [ ] チームベースのアクセス制御
  - [ ] ロールベースの権限管理
  - [ ] ファイルアクセス制御

### Phase 3: ストレージ実装
- [ ] Supabase Storageバケットの設定
  - [ ] PPTXファイル用バケット
  - [ ] スライド画像用バケット
  - [ ] 一時ファイル用バケット
- [ ] ストレージポリシーの設定
  - [ ] アップロード制限
  - [ ] アクセス制御
  - [ ] 有効期限設定
- [ ] ファイル管理機能の実装
  - [ ] アップロード処理
  - [ ] ダウンロード処理
  - [ ] 一時URL生成
  - [ ] 自動クリーンアップ

### Phase 4: リアルタイム機能実装
- [ ] Supabase Realtimeの設定
  - [ ] チャンネル設定
  - [ ] イベント定義
- [ ] リアルタイム更新の実装
  - [ ] 翻訳状態の同期
  - [ ] チーム活動の同期
  - [ ] ファイル処理状態の同期
- [ ] プレゼンス機能の実装
  - [ ] オンラインステータス
  - [ ] 同時編集管理

### Phase 5: Edge Functions実装
- [ ] Webhook処理の実装
  - [ ] Stripe Webhook
  - [ ] ファイル処理Webhook
- [ ] バッチ処理の実装
  - [ ] 定期クリーンアップ
  - [ ] 使用統計集計
  - [ ] バックアップ処理
- [ ] カスタムAPI実装
  - [ ] 翻訳処理API
  - [ ] ファイル変換API
  - [ ] 統計レポートAPI

### Phase 6: パフォーマンスとモニタリング
- [ ] キャッシュ戦略の実装
  - [ ] クエリキャッシュ
  - [ ] ストレージキャッシュ
  - [ ] Edge Caching
- [ ] モニタリングの設定
  - [ ] パフォーマンスモニタリング
  - [ ] エラー監視
  - [ ] 使用量監視
- [ ] バックアップと復旧
  - [ ] 自動バックアップ
  - [ ] ポイントインタイム復旧
  - [ ] 障害復旧手順

### Phase 7: デプロイメントとCI/CD
- [ ] Vercelデプロイメント設定
  - [ ] 環境変数設定
  - [ ] ビルド設定
  - [ ] デプロイメントフック
- [ ] CI/CDパイプライン構築
  - [ ] テスト自動化
  - [ ] デプロイ自動化
  - [ ] マイグレーション自動化

# PPTXファイル処理エラーの原因と解決策

## 現在のエラー

```
Error: Loading presentation from: /Users/yusuketsunoda/Documents/cursor/ppttranslatorapp/tmp/users/cm7j3hlru0000q9p52ircao6q/uploads/1740485731542_q09harqiie_original.pptx
Error: Package not found at '/Users/yusuketsunoda/Documents/cursor/ppttranslatorapp/tmp/users/cm7j3hlru0000q9p52ircao6q/uploads/1740485731542_q09harqiie_original.pptx'
```

このエラーは、Python の `python-pptx` ライブラリが指定されたパスにあるPPTXファイルを開けないことを示しています。「Package not found」というエラーは、ファイルが見つからないか、ファイル形式が正しくないことを意味します。

## エラーの根本原因

このエラーが発生している根本的な原因は、**クライアントとサーバー間のリクエストデータの不一致**です。具体的には以下の問題があります：

1. **クライアント側の変更**: `app/(dashboard)/translate/page.tsx` の `handleDownload` 関数で、リクエストデータの形式が変更されました。
   ```javascript
   // 変更後のリクエストデータ
   const requestData = {
     fileId, // ファイルIDのみを送信
     slides: slides.map(slide => ({
       index: slide.index,
       texts: slide.texts.map((text: any, index: number) => ({
         text: text.text,
         translation: (
           editedTranslations[`${slide.index}-${index}`] || 
           slide.translations?.[index]?.text || 
           text.text
         ).trim()
       }))
     }))
   };
   ```

2. **サーバー側の期待**: `app/api/download/route.ts` では、異なる形式のリクエストデータを期待しています。
   ```javascript
   const { originalFilePath, slides } = body;
   
   // リクエストデータの検証
   if (!originalFilePath || !slides || !Array.isArray(slides)) {
     console.error("無効なリクエストデータ:", {
       hasOriginalFilePath: !!originalFilePath,
       hasSlides: !!slides,
       slidesIsArray: Array.isArray(slides),
       userId: session.user.id,
       timestamp: new Date().toISOString()
     });
     return NextResponse.json({
       error: 'Invalid request data',
       details: 'リクエストデータが不正です',
       timestamp: new Date().toISOString()
     }, { status: 400 });
   }
   ```

3. **不一致の結果**: クライアントは `fileId` を送信していますが、サーバーは `originalFilePath` を期待しているため、サーバー側の検証で「リクエストデータが不正です」というエラーが発生しています。

## 処理フロー図

```
【現在の問題のあるフロー】
1. クライアント側: fileIdとslidesを含むリクエストデータを送信
   ↓
2. サーバー側: originalFilePathとslidesを期待
   ↓
3. サーバー側: originalFilePathが存在しないため検証エラー
   ↓
4. サーバー側: 「リクエストデータが不正です」エラーを返す
```

```
【修正後のあるべきフロー】
1. クライアント側: fileIdとslidesを含むリクエストデータを送信
   ↓
2. サーバー側: fileIdからoriginalFilePathを構築
   ↓
3. サーバー側: 実際のファイルパスを検索
   ↓
4. サーバー側: Pythonスクリプトを実行して翻訳済みPPTXを生成
   ↓
5. クライアント側: 生成されたファイルをダウンロード
```

## 必要な修正

### 1. サーバー側の修正 (`app/api/download/route.ts`)

```javascript
// リクエストボディを取得
const body = await req.json();
const { fileId, slides } = body; // originalFilePathの代わりにfileIdを受け取る

// リクエストデータの検証
if (!fileId || !slides || !Array.isArray(slides)) {
  console.error("無効なリクエストデータ:", {
    hasFileId: !!fileId,
    hasSlides: !!slides,
    slidesIsArray: Array.isArray(slides),
    userId: session.user.id,
    timestamp: new Date().toISOString()
  });
  return NextResponse.json({
    error: 'Invalid request data',
    details: 'リクエストデータが不正です',
    timestamp: new Date().toISOString()
  }, { status: 400 });
}

// fileIdから元のファイルパスを構築
const originalFilePath = filePathManager.getTempPath(session.user.id, fileId, 'original');
```

### 2. クライアント側とサーバー側の整合性確保

クライアント側とサーバー側で一貫したデータ形式を使用するために、以下の点に注意する必要があります：

1. リクエストとレスポンスの形式を明確に文書化する
2. 変更を行う場合は、クライアント側とサーバー側を同時に更新する
3. APIエンドポイントのテストを実施して、互換性を確認する

### 3. エラーハンドリングの強化

サーバー側でより詳細なエラーメッセージを提供し、クライアント側でそれを適切に表示することで、問題の診断と解決を容易にします：

```javascript
// サーバー側
return NextResponse.json({
  error: 'Invalid request data',
  details: `リクエストデータが不正です。必要なフィールド: fileId=${!!fileId}, slides=${!!slides}`,
  expectedFormat: { fileId: "string", slides: "array" },
  receivedFormat: { fileId: typeof fileId, slides: typeof slides },
  timestamp: new Date().toISOString()
}, { status: 400 });

// クライアント側
if (!response.ok) {
  const errorData = await response.json();
  console.error("詳細なエラー情報:", errorData);
  throw new Error(errorData.details || errorData.error || 'ダウンロードに失敗しました');
}
```

# 今後の実装計画

## 優先度: 最高
1. **PPTXファイル処理エラーの修正**
   - クライアント側とサーバー側のリクエスト形式の不一致を解消
   - ファイルパス管理の一貫性確保
   - エラーハンドリングの強化

2. **ユニットテストの修正**
   - `tests/setup.ts` の構文エラー修正
   - Jest設定の見直し
   - TypeScriptの型定義問題の解決

3. **CI/CD統合**
   - GitHub Actionsでのテスト自動化
   - テスト結果レポートの生成
   - テストカバレッジの計測

4. **テスト実行環境の整備**
   - Docker環境でのE2Eテスト実行設定
   - テスト用の独立したデータベース環境の構築

## 優先度: 高
1. **パフォーマンス最適化**
   - 大きなファイルの処理速度改善
   - 画像処理の最適化
   - クライアント側のレンダリング最適化

2. **翻訳履歴機能の実装**
   - 過去の翻訳履歴の保存
   - 翻訳メモリの活用
   - ユーザー別の翻訳履歴管理

3. **ドキュメント作成**
   - 開発者向けドキュメント
   - APIドキュメント
   - セキュリティドキュメント

## 優先度: 中
1. **バッチ翻訳機能の実装**
   - 複数ファイルの一括翻訳
   - バックグラウンド処理
   - 進捗状況の表示

2. **API連携機能の実装**
   - 外部翻訳APIとの連携
   - WebhookによるイベントトリガーのサポートS
   - APIキー管理

3. **統計・分析機能の実装**
   - 翻訳量の統計
   - 使用頻度の高い単語の分析
   - ユーザー活動の分析

## 優先度: 低
1. **多言語対応の拡充**
   - サポート言語の追加
   - 言語固有の翻訳ルールの実装
   - 多言語UIの改善

2. **カスタムテーマ機能**
   - ユーザー別のテーマ設定
   - カラーパレットのカスタマイズ
   - テーマの保存と共有

## UI/UX改善
- [ ] ダークモードの実装
- [ ] レスポンシブデザインの改善
- [ ] アクセシビリティの向上
- [ ] 多言語対応の拡充

## フロントエンド機能改善
- [x] ファイルアップロード機能の強化
  - [x] ドラッグ＆ドロップサポート
  - [x] ファイル形式バリデーション
  - [x] ファイルサイズ制限
  - [x] アップロード進捗表示
  - [x] エラーハンドリング
- [ ] 翻訳プレビュー機能の改善
- [ ] バッチ処理機能の実装
- [ ] エクスポート機能の拡充

