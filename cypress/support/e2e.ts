// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
// import './commands'

// ファイルアップロード用のプラグインを追加
import 'cypress-file-upload';

// カスタムコマンドの定義
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/signin');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/translate', { timeout: 15000 });
  cy.get('[data-testid="user-menu"]', { timeout: 15000 }).should('be.visible');
});

Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.visit('/signup');
  cy.get('input[name="name"]').type(name);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/translate', { timeout: 15000 });
  cy.get('[data-testid="user-menu"]', { timeout: 15000 }).should('be.visible');
});

// テスト実行前のグローバル設定
before(() => {
  // テスト環境の準備
  cy.log('テスト環境を準備しています...');
  cy.task('ensureDir', 'cypress/fixtures');
  cy.task('log', 'テスト環境の準備が完了しました');
});

// テスト実行後のクリーンアップ
after(() => {
  // テスト後のクリーンアップ
  cy.log('テスト環境をクリーンアップしています...');
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.task('log', 'テスト環境のクリーンアップが完了しました');
});

// Cypressのタイプ拡張
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * カスタムコマンド: 指定された認証情報でログインします
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<Element>;
      
      /**
       * カスタムコマンド: 新規ユーザーを登録します
       * @example cy.register('Test User', 'user@example.com', 'password')
       */
      register(name: string, email: string, password: string): Chainable<Element>;
    }
  }
} 