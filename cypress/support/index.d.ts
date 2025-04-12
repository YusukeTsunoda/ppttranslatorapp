/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * カスタムコマンド: ログイン
     * @example cy.login('user@example.com', 'password')
     */
    login(email: string, password: string): Chainable<Element>
    
    /**
     * カスタムコマンド: 登録
     * @example cy.register('name', 'user@example.com', 'password')
     */
    register(name: string, email: string, password: string): Chainable<Element>
    
    /**
     * カスタムコマンド: 認証をモック
     * @example cy.mockAuthentication()
     */
    mockAuthentication(): Chainable<Element>
    
    /**
     * カスタムコマンド: セッションの保存
     * @example cy.saveSession()
     */
    saveSession(): Chainable<Element>
    
    /**
     * カスタムコマンド: セッションの復元
     * @example cy.restoreSession()
     */
    restoreSession(): Chainable<Element>
  }
}
