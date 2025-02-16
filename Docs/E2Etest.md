# E2Eテスト仕様書

## テスト概要
PPT翻訳アプリケーションの主要機能とユーザーフローを検証するためのE2Eテスト仕様です。

## テスト環境
- テストフレームワーク: Cypress
- ブラウザ: Chrome
- テスト環境: 開発環境

## テストシナリオ

### 1. 認証フロー
#### 1.1 サインアップ
- 新規ユーザー登録フォームの表示確認
- 必須フィールドの入力チェック
- パスワード要件の検証
- 登録成功時のリダイレクト確認
- エラーメッセージの表示確認

#### 1.2 ログイン
- ログインフォームの表示確認
- 認証情報の検証
- ログイン成功時のリダイレクト確認
- エラーメッセージの表示確認

#### 1.3 ログアウト
- ログアウト機能の動作確認
- セッション終了の確認
- ログアウト後のリダイレクト確認

### 2. チーム管理
#### 2.1 チーム作成
- チーム作成フォームの表示確認
- 必須フィールドの入力チェック
- チーム作成成功時の確認
- エラーメッセージの表示確認

#### 2.2 メンバー管理
- メンバー招待機能の確認
- メンバーリストの表示確認
- メンバー削除機能の確認
- 権限変更機能の確認

### 3. ファイル操作
#### 3.1 ファイルアップロード
- ファイル選択機能の確認
- アップロード進捗の表示確認
- サポートされているファイル形式の確認
- エラーハンドリングの確認

#### 3.2 翻訳機能
- 翻訳オプションの選択確認
- 翻訳処理の進捗表示確認
- 翻訳結果の表示確認
- エラーメッセージの表示確認

#### 3.3 ダウンロード
- 翻訳済みファイルのダウンロード確認
- ファイル形式の確認
- エラーハンドリングの確認

### 4. 課金・サブスクリプション
#### 4.1 プラン選択
- 料金プランの表示確認
- プラン選択フローの確認
- 支払い情報入力フォームの確認

#### 4.2 支払い処理
- Stripe Checkoutの表示確認
- 支払い処理の確認
- 支払い成功/失敗時の挙動確認

#### 4.3 サブスクリプション管理
- 現在のプラン表示確認
- プラン変更機能の確認
- 解約フローの確認

### 5. アカウント設定
#### 5.1 プロフィール更新
- プロフィール編集フォームの表示確認
- 情報更新の確認
- バリデーションの確認

#### 5.2 パスワード変更
- パスワード変更フォームの表示確認
- 現在のパスワード確認
- 新パスワードの要件確認
- 更新成功の確認

## テストデータ
```typescript
export const testUsers = {
  newUser: {
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test User'
  },
  existingUser: {
    email: 'existing@example.com',
    password: 'Password123!',
    name: 'Existing User'
  }
};

export const testTeams = {
  newTeam: {
    name: 'Test Team',
    role: 'owner'
  }
};

export const testFiles = {
  validPPT: 'test-presentation.pptx',
  invalidFile: 'invalid-file.txt'
};
```

## 実行環境設定
```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000
  }
});
``` 