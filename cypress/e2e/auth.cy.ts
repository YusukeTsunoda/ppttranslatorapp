import { testUsers } from '../fixtures/testData';

describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Setup API intercepts
    cy.intercept('POST', '**/api/auth/signup').as('register');
    cy.intercept('POST', '**/api/auth/signin/credentials').as('login');
  });

  it('should show error for invalid signup', () => {
    cy.visit('/sign-up', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.get('h2').should('contain.text', 'アカウント作成');
    
    cy.get('[data-cy="signup-form"]')
      .should('be.visible')
      .within(() => {
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('short');
        cy.get('button[type="submit"]').click();
      });
    
    cy.get('div[role="alert"]')
      .find('.text-red-800')
      .should('contain.text', 'パスワードは8文字以上で入力してください');
  });

  it('should show error for invalid login', () => {
    cy.visit('/sign-in', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.get('h2').should('contain.text', 'サインイン');
    
    cy.get('[data-cy="signin-form"]')
      .should('be.visible')
      .within(() => {
        cy.get('input[name="email"]').type('nonexistent@example.com');
        cy.get('input[name="password"]').type('wrongpassword');
        cy.get('button[type="submit"]').click();
      });
    
    cy.wait('@login');
    cy.get('div[role="alert"]')
      .find('.text-red-800')
      .should('contain.text', 'メールアドレスまたはパスワードが正しくありません');
  });

  it('should successfully register and login', () => {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'testPassword123!';
    
    // サインアップ
    cy.visit('/sign-up', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.get('h2').should('contain.text', 'アカウント作成');
    
    cy.get('[data-cy="signup-form"]')
      .should('be.visible')
      .within(() => {
        cy.get('input[name="email"]').type(testEmail);
        cy.get('input[name="password"]').type(testPassword);
        cy.get('button[type="submit"]').click();
      });
    
    cy.wait('@register').then((interception) => {
      expect(interception.response?.statusCode).to.equal(201);
    });

    cy.location('pathname').should('eq', '/translate');
    
    // ログアウト
    cy.get('button[data-testid="user-menu-button"]')
      .should('be.visible')
      .click();
    cy.get('button[data-testid="logout-button"]')
      .should('be.visible')
      .click();
    
    // サインイン
    cy.visit('/sign-in', { failOnStatusCode: false });
    cy.get('body').should('be.visible');
    cy.get('h2').should('contain.text', 'サインイン');
    
    cy.get('[data-cy="signin-form"]')
      .should('be.visible')
      .within(() => {
        cy.get('input[name="email"]').type(testEmail);
        cy.get('input[name="password"]').type(testPassword);
        cy.get('button[type="submit"]').click();
      });
    
    cy.wait('@login').then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
    });

    cy.location('pathname').should('eq', '/translate');
  });
}); 