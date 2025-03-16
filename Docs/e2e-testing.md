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

### セレクタの優先順位

テスト対象の要素を選択する際は、以下の優先順位でセレクタを使用してください：

1. `data-testid` 属性（最優先）
2. アクセシビリティ属性（`aria-*`）
3. セマンティックなHTML要素（`button`, `input`など）
4. クラス名やID（最終手段）

例：
```typescript
// 良い例
cy.get('[data-testid="login-button"]').click();

// 避けるべき例
cy.get('.btn-primary').click();
```

### data-testid属性の命名規則

`data-testid` 属性は以下の命名規則に従って付与してください：

- 単語はハイフン（-）で区切る
- 機能名-要素タイプの形式を基本とする
- 同じタイプの要素が複数ある場合は、末尾に識別子を付ける

例：
```
data-testid="login-button"
data-testid="user-menu"
data-testid="translation-text"
data-testid="slide-preview"
```

### 主要なdata-testid属性一覧

アプリケーションの主要な要素には以下の `data-testid` 属性が付与されています：

#### 認証関連
- `user-menu`: ユーザーメニューボタン
- `logout-button`: ログアウトボタン

#### 翻訳フロー関連
- `upload-text`: アップロードテキスト
- `upload-area`: ファイルドロップエリア
- `slide-preview`: スライドプレビュー
- `translating-indicator`: 翻訳中インジケーター
- `translation-text`: 翻訳テキスト表示
- `save-translation-button`: 翻訳保存ボタン
- `download-button`: ダウンロードボタン
- `downloading-indicator`: ダウンロード中インジケーター

### 待機戦略

テストの安定性を向上させるために、以下の待機戦略を使用してください：

1. **明示的な待機**: 特定の要素が表示されるまで待機
   ```typescript
   cy.get('[data-testid="slide-preview"]', { timeout: 30000 }).should('be.visible');
   ```

2. **ネットワークリクエストの待機**: APIリクエストの完了を待機
   ```typescript
   cy.intercept('POST', '/api/upload').as('uploadRequest');
   cy.wait('@uploadRequest', { timeout: 30000 });
   ```

3. **状態変化の待機**: 要素の状態変化を待機
   ```typescript
   cy.get('[data-testid="translating-indicator"]')
     .should('exist')
     .then(() => {
       cy.get('[data-testid="translating-indicator"]', { timeout: 60000 })
         .should('not.exist');
     });
   ```

### テスト間の独立性

各テストは独立して実行できるようにしてください。テスト間で状態を共有しないことで、テストの信頼性と再現性が向上します。

```typescript
// 良い例: 各テストで独立してログイン処理を行う
const login = () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.visit('/signin');
  cy.get('input[name="email"]').type(testUser.email);
  cy.get('input[name="password"]').type(testUser.password);
  cy.get('button[type="submit"]').click();
};

it('テスト1', () => {
  login();
  // テスト内容
});

it('テスト2', () => {
  login();
  // テスト内容
});
```

### モックの使用

外部依存性をモックすることで、テストの安定性と速度を向上させることができます。

```typescript
// APIレスポンスをモック
cy.intercept('POST', '/api/upload', {
  statusCode: 200,
  body: mockSlideData,
  delay: 1000
}).as('uploadRequest');
```

## 既知の問題と対処法

### タイムアウトエラー

問題: 要素が表示されるまでのタイムアウトエラー

対処法:
- タイムアウト値を増やす: `{ timeout: 30000 }`
- 要素が確実に表示されるまでの前提条件を確認する
- ネットワークリクエストの完了を待機してから要素を検索する

### ファイルアップロードの問題

問題: ファイルアップロードが安定しない

対処法:
- `{ force: true }` オプションを使用する
- ファイルの存在を事前に確認する
- アップロードAPIをモックする

### ランダムな失敗

問題: 同じテストが時々失敗する

対処法:
- 待機戦略を改善する
- テスト間の独立性を確保する
- 明示的なアサーションを追加する

## CI/CD統合

### GitHub Actionsでの実行

GitHub Actionsでテストを実行するワークフロー例：

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start application
        run: npm run dev & npx wait-on http://localhost:3002
      
      - name: Run Cypress tests
        uses: cypress-io/github-action@v5
        with:
          browser: chrome
          headless: true
```

## トラブルシューティング

### テスト実行時の一般的な問題

1. **アプリケーションが起動していない**
   - 解決策: テスト実行前にアプリケーションが起動していることを確認してください。

2. **環境変数が正しく設定されていない**
   - 解決策: `.env.local` ファイルで環境変数が正しく設定されていることを確認してください。

3. **テストデータが存在しない**
   - 解決策: `cypress/fixtures` ディレクトリにテストデータが存在することを確認してください。

4. **セレクタが変更された**
   - 解決策: アプリケーションのコードが変更された場合は、テスト内のセレクタも更新してください。

## 参考リソース

- [Cypress 公式ドキュメント](https://docs.cypress.io/)
- [Cypressベストプラクティス](https://docs.cypress.io/guides/references/best-practices)
- [cypress-file-upload プラグイン](https://github.com/abramenal/cypress-file-upload)