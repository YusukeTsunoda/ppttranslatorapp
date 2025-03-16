# E2Eテスト実装ガイド

## 概要

このドキュメントでは、PPT Translator アプリケーションのエンドツーエンド（E2E）テストの実装方法について説明します。E2Eテストは、ユーザーの視点からアプリケーション全体の機能を検証するために使用されます。

## テスト環境のセットアップ

### 必要なパッケージ

E2Eテストには以下のパッケージを使用しています：

- Cypress: E2Eテストフレームワーク（最新バージョン）
- cypress-file-upload: ファイルアップロードをテストするためのプラグイン

### インストール方法

```bash
# Cypressのインストール
npm install --save-dev cypress

# ファイルアップロードプラグインのインストール
npm install --save-dev cypress-file-upload
```

### 環境変数の設定

テストで使用する環境変数は `cypress.config.ts` で設定されています。テスト用のユーザー認証情報などを環境変数として設定することで、テストの柔軟性を高めています。

```typescript
// cypress.config.ts
env: {
  NEXT_PUBLIC_API_URL: 'http://localhost:3003/api',
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'password123'
}
```

ローカル環境で特定の環境変数を設定する場合は、`.env.local` ファイルを作成して設定することができます：

```
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
```

## テストの実行方法

### 開発モードでの実行

Cypressを対話モードで開き、ブラウザでテストを実行します：

```bash
npx cypress open
```

### ヘッドレスモードでの実行

CIなどの自動化環境で実行する場合は、ヘッドレスモードを使用します：

```bash
# すべてのテストを実行
npx cypress run

# 特定のテストファイルを実行
npx cypress run --spec "cypress/e2e/auth.cy.ts"
```

## テストの構造

### ディレクトリ構造

```
cypress/
├── e2e/                  # テストファイル
│   ├── auth.cy.ts        # 認証関連のテスト
│   └── translate-flow.cy.ts  # 翻訳フロー関連のテスト
├── fixtures/             # テストデータ
│   └── sample.pptx       # テスト用のPPTXファイル
├── support/              # サポートファイル
│   └── e2e.ts            # グローバル設定とカスタムコマンド
├── downloads/            # ダウンロードされたファイルの保存先
├── reports/              # テスト結果レポート
└── results/              # Mochawesomeレポート出力先
```

### テストファイルの構造

各テストファイルは以下の構造に従っています：

```typescript
describe('テストスイート名', () => {
  // テスト前の準備
  before(() => {
    // 全テスト実行前に1回だけ実行される処理
  });

  // 各テスト前の準備
  beforeEach(() => {
    // 各テスト実行前に毎回実行される処理
    // 例: ログイン処理など
  });

  // テストケース
  it('テストケース名', () => {
    // テストの実装
  });

  // テスト後のクリーンアップ
  afterEach(() => {
    // 各テスト実行後に毎回実行される処理
    // 例: ログアウト処理など
  });

  // 全テスト後のクリーンアップ
  after(() => {
    // 全テスト実行後に1回だけ実行される処理
  });
});
```

## テスト実装のガイドライン

### 1. セレクタの優先順位

要素の選択には以下の優先順位でセレクタを使用してください：

1. `data-testid` 属性（最優先）
2. ラベルやテキスト内容
3. クラス名やID（最終手段）

例：
```typescript
// 良い例
cy.get('[data-testid="login-button"]').click();

// 次善の例
cy.contains('ログイン').click();

// 避けるべき例
cy.get('.btn-primary').click();
```

### 2. 待機と非同期処理

非同期処理を扱う際は、明示的なタイムアウト値を設定してください：

```typescript
// 要素が表示されるまで待機
cy.get('[data-testid="user-menu"]', { timeout: 10000 }).should('be.visible');

// テキストが含まれるまで待機
cy.contains('ファイルをアップロード', { timeout: 15000 }).should('be.visible');
```

### 3. テストデータの管理

テストデータは `fixtures` ディレクトリに配置し、テスト間で共有できるようにしてください：

```typescript
// ファイルの読み込み
cy.fixture('sample.pptx', 'binary').then(Cypress.Blob.binaryStringToBlob)
  .then(fileContent => {
    // ファイルを使用した処理
  });
```

### 4. 認証処理の共通化

認証処理など、複数のテストで共通して使用する処理はカスタムコマンドとして実装してください：

```typescript
// support/e2e.ts でカスタムコマンドを定義
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/signin');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/translate', { timeout: 15000 });
  cy.get('[data-testid="user-menu"]', { timeout: 15000 }).should('be.visible');
});

// テストファイルでカスタムコマンドを使用
cy.login('test@example.com', 'password123');
```

### 5. APIモックの活用

外部APIに依存するテストでは、APIレスポンスをモックして安定したテスト環境を構築してください：

```typescript
// APIリクエストをモック
cy.intercept('POST', '/api/upload', {
  statusCode: 200,
  body: mockSlideData
}).as('uploadRequest');

// リクエストが完了するまで待機
cy.wait('@uploadRequest', { timeout: 30000 });
```

## 最新のテスト実装状況

### 認証テスト (`auth.cy.ts`)

現在、以下のテストケースが実装されています：

1. ログインページへのアクセス
2. 無効な認証情報でのログイン試行
3. 有効な認証情報でのログイン
4. ログアウト機能
5. 認証が必要なページへの未認証アクセス
6. セッション維持の確認
7. 新規登録機能
8. 無効なデータでの新規登録試行

### 翻訳フローテスト (`translate-flow.cy.ts`)

現在、以下のテストケースが実装されています：

1. 翻訳ページへのアクセス
2. PPTファイルのアップロードと翻訳
3. 翻訳テキストの編集
4. 翻訳済みPPTのダウンロード

## 既知の問題と対処法

### 1. 認証関連の問題

認証テストで問題が発生する場合は、以下の対策を実施してください：

- `data-testid="signin-error"` 属性が正しく設定されていることを確認
- 実際のエラーメッセージテキストとテストの期待値が一致していることを確認
- NextAuth.jsの設定を確認し、認証後のリダイレクト処理が正しく機能していることを確認

### 2. ポート番号の不一致問題

アプリケーションが異なるポートで起動している場合は、以下の対策を実施してください：

```typescript
// cypress.config.ts を修正して動的なポート検出を実装
setupNodeEvents(on, config) {
  // 実際のアプリケーションポートを検出する処理
  const port = process.env.PORT || 3000;
  config.baseUrl = `http://localhost:${port}`;
  return config;
}
```

### 3. テストデータの問題

テストデータに関する問題を解決するには：

- 実際のスライドとテキストを含む有効なPPTXテストファイルを作成
- テスト実行前にテスト環境が正しく設定されていることを確認
- `cypress/fixtures` ディレクトリが存在することを確認

## 改善計画

### 短期的な改善項目（1-2週間）

1. UI要素への `data-testid` 属性の追加
   - サインインフォームの各要素
   - 翻訳ページの各UI要素
   - エラーメッセージ表示要素

2. テスト環境の安定化
   - 動的なポート検出機能の実装
   - タイムアウト値の最適化
   - テスト用のリセット機能の実装

### 中期的な改善項目（2-4週間）

1. テストカバレッジの拡充
   - エラーケースのテスト追加
   - 異なる言語間の翻訳テスト
   - ユーザー設定変更のテスト

2. テスト実行の自動化
   - GitHub Actionsでの自動テスト設定
   - テスト結果レポートの自動生成

### 長期的な改善項目（1-2ヶ月）

1. パフォーマンステストの追加
   - 大きなPPTファイルでの処理時間測定
   - 同時リクエスト処理のテスト

2. ビジュアルリグレッションテストの導入
   - UIコンポーネントの視覚的な変更を検出
   - レスポンシブデザインのテスト

## 参考リソース

- [Cypress 公式ドキュメント](https://docs.cypress.io/)
- [cypress-file-upload プラグイン](https://github.com/abramenal/cypress-file-upload)
- [Mochawesome レポーター](https://github.com/adamgruber/mochawesome)