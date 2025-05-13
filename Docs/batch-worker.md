# バッチワーカー

このプロジェクトでは、大量のファイル処理や時間のかかるタスクをバックグラウンドで実行するためのバッチ処理システムを実装しています。

## 概要

バッチ処理システムは以下のコンポーネントで構成されています：

1. **バッチワーカー**：バックグラウンドで動作し、キュー内のジョブを処理
2. **モニタリングツール**：実行中のジョブの状態を監視・管理
3. **ランチャー**：ワーカープロセスの起動・停止を制御

すべてのコンポーネントはTypeScript/TSXで実装されており、React Inkを使用したターミナルUIを提供しています。

## バッチワーカーの機能

- ジョブキューの監視とタスク実行
- 処理状況のリアルタイム更新
- 中断された処理の再開
- エラーハンドリングとリトライ機能
- 処理結果のデータベース保存

## 実行方法

### バッチワーカーの起動

```bash
# TypeScriptバージョン
npm run batch-worker

# または
yarn batch-worker
```

### モニタリングツールの起動

```bash
# TSXバージョン（ターミナルUI）
npm run batch-monitor

# または
yarn batch-monitor
```

### ランチャーの起動

```bash
# TSXバージョン（対話式UI）
npm run batch-launcher

# または
yarn batch-launcher
```

## バッチジョブの作成

APIを通じてバッチジョブをキューに登録できます：

```typescript
// クライアント側
const response = await fetch('/api/batch-upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    files: [
      { path: '/path/to/file1.pptx', options: { /* ... */ } },
      { path: '/path/to/file2.pptx', options: { /* ... */ } },
    ],
    options: {
      sourceLang: 'ja',
      targetLang: 'en',
      // その他のオプション
    }
  }),
});

const { jobId } = await response.json();
```

## ジョブステータスの確認

登録したジョブのステータスを確認するには：

```typescript
const response = await fetch(`/api/batch-upload?jobId=${jobId}`);
const { status, progress, results } = await response.json();
```

## データモデル

バッチジョブはPrismaスキーマで以下のように定義されています：

```prisma
model BatchJob {
  id              String      @id @default(cuid())
  userId          String
  status          BatchStatus @default(PENDING)
  totalFiles      Int         @default(0)
  processedFiles  Int         @default(0)
  failedFiles     Int         @default(0)
  options         Json?       // 処理オプション
  results         Json?       // 処理結果の概要
  errorDetails    Json?       // エラー情報
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  startedAt       DateTime?
  completedAt     DateTime?
}

enum BatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

## 開発ガイド

### 新しいバッチ処理タイプの追加

1. `scripts/batch-worker.ts`に新しい処理ロジックを追加
2. ジョブタイプに応じた処理を実装
3. エラーハンドリングとリトライロジックを追加

### UIコンポーネントの拡張

1. `scripts/batch-worker-monitor.tsx`または`scripts/batch-worker-launcher.tsx`を編集
2. React Inkコンポーネントを追加・修正

## 注意事項

- バッチワーカーは長時間実行されるプロセスのため、サーバーリソースを考慮する必要があります
- 処理中のジョブが多すぎる場合は、並列実行数を制限してください
- 重要なジョブは適切なログ記録と監視を設定してください
- TSXスクリプトを実行するには、`tsx`パッケージが必要です 