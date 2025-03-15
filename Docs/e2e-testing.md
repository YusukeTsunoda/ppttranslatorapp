# E2Eテスト実装ガイド

## 概要

このドキュメントでは、PPT Translator アプリケーションのエンドツーエンド（E2E）テストの実装方法について説明します。E2Eテストは、ユーザーの視点からアプリケーション全体の機能を検証するために使用されます。

## テスト環境のセットアップ

### 必要なパッケージ

E2Eテストには以下のパッケージを使用しています：

- Cypress: E2Eテストフレームワーク
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
config.env = {
  ...config.env,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'password123'
};
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
└── screenshots/          # テスト失敗時のスクリーンショット
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
  // ログイン処理の実装
});

// テストファイルでカスタムコマンドを使用
cy.login('test@example.com', 'password123');
```

## 既知の問題と対処法

### 1. 認証関連の問題

認証テストで問題が発生する場合は、以下を確認してください：

- テスト用のユーザーアカウントが有効であること
- 環境変数が正しく設定されていること
- セッション管理の仕組みに変更がないこと

### 2. ファイルアップロード関連の問題

ファイルアップロードテストで問題が発生する場合は、以下を確認してください：

- テスト用のファイルが `fixtures` ディレクトリに存在すること
- `cypress-file-upload` プラグインが正しくインストールされていること
- ファイルアップロード処理のタイムアウト値が十分に長いこと

### 3. 非同期処理関連の問題

非同期処理のテストで問題が発生する場合は、以下を確認してください：

- タイムアウト値が適切に設定されていること
- 要素の表示条件が正しいこと
- ネットワークリクエストの完了を適切に待機していること

## CI/CD統合

GitHub Actionsなどのワークフローでテストを自動実行する場合は、以下の設定を参考にしてください：

```yaml
# .github/workflows/e2e-tests.yml
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
      
      - name: Start development server
        run: npm run dev & npx wait-on http://localhost:3000
      
      - name: Run Cypress tests
        uses: cypress-io/github-action@v5
        with:
          browser: chrome
          headless: true
```

## テスト拡充計画

今後、以下のテストを追加する予定です：

1. ユーザー設定の変更テスト
2. チーム管理機能のテスト
3. 翻訳履歴機能のテスト
4. エラー処理のテスト
5. パフォーマンステスト

## 参考リソース

- [Cypress 公式ドキュメント](https://docs.cypress.io/)
- [cypress-file-upload プラグイン](https://github.com/abramenal/cypress-file-upload)
- [Cypress ベストプラクティス](https://docs.cypress.io/guides/references/best-practices) 