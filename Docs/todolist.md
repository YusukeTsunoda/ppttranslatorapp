# タスクリスト

## 優先度: 高
- [ ] マウスクリックが動作しない問題の修正
- [ ] 翻訳履歴機能の実装
- [x] チーム管理機能の実装
- [x] アクティビティログの実装
- [x] エラーハンドリングの改善
- [ ] パフォーマンス最適化

## 優先度: 中
- [ ] ダークモードの実装
- [ ] バッチ翻訳機能の実装
- [x] プロフィール編集機能の実装
- [ ] API連携機能の実装
- [ ] 請求書生成機能の実装
- [ ] 統計・分析機能の実装

## 優先度: 低
- [ ] ブログ機能の実装
- [ ] ドキュメント機能の実装
- [ ] 多言語対応の拡充
- [ ] カスタムテーマ機能
- [ ] APIドキュメントの整備
- [ ] E2Eテストの拡充

## バグ修正
- [ ] ログイン後のイベント伝播問題
- [ ] ファイルアップロード時のエラー処理
- [ ] 翻訳テキストの位置ずれ
- [ ] セッション切れの処理改善
- [ ] メモリリークの対応

## 技術的負債
- [x] NextAuth.js v5への移行
- [x] 型定義の整備
- [x] コンポーネントのリファクタリング
- [ ] テストカバレッジの向上
- [x] ログ出力の統一

## セキュリティ対策
- [x] CSRF対策の強化
- [x] レート制限の実装
- [x] ファイルアクセス制御の改善
- [x] セッション管理の強化
- [x] 監査ログの拡充

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

## 修正できていない理由（ステップバイステップ）

1. **部分的な修正**: 
   - クライアント側（`app/(dashboard)/translate/page.tsx`）のリクエスト形式を変更しましたが、サーバー側（`app/api/download/route.ts`）の対応する変更が行われていません。
   - クライアント側は `fileId` を送信するように変更されましたが、サーバー側は依然として `originalFilePath` を期待しています。

2. **不完全な同期**:
   - 前回の修正で `FilePathManager` クラスを更新し、`findActualFilePath` メソッドを追加しましたが、サーバー側のAPIエンドポイントがこの変更に対応していません。
   - サーバー側のコードは、クライアントから送信される `originalFilePath` を直接使用する前提で書かれています。

3. **テスト不足**:
   - クライアント側とサーバー側の変更が同時に行われなかったため、互換性の問題が発生しています。
   - エンドツーエンドのテストが行われていないため、この不一致が検出されませんでした。

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

## 結論

このエラーは、クライアント側とサーバー側のコードが同期していないことによって発生しています。クライアント側は `fileId` を送信するように変更されましたが、サーバー側は依然として `originalFilePath` を期待しています。この不一致を解決するには、サーバー側のコードを更新して `fileId` を受け取り、それを使用して `originalFilePath` を構築するようにする必要があります。

