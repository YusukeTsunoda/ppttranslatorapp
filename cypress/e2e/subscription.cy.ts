import { testUsers } from '../fixtures/testData';

describe('課金・サブスクリプション', () => {
  describe('プラン選択', () => {
    beforeEach(() => {
      cy.login('test@example.com', 'password123');
    });

    it('料金プランページが表示されること', () => {
      cy.visit('/pricing');
      cy.contains('料金プラン').should('be.visible');
      cy.get('[data-testid="plan-card"]').should('have.length', 3);
    });

    it('プランを選択して支払い画面に進めること', () => {
      cy.visit('/pricing');
      cy.get('[data-testid="plan-card-pro"]').within(() => {
        cy.contains('選択する').click();
      });
      cy.url().should('include', '/checkout');
    });
  });

  describe('支払い処理', () => {
    beforeEach(() => {
      cy.login('test@example.com', 'password123');
    });

    it('支払い情報を入力して処理を完了できること', () => {
      cy.visit('/checkout');
      cy.get('input[name="cardNumber"]').type('4242424242424242');
      cy.get('input[name="cardExpiry"]').type('1234');
      cy.get('input[name="cardCvc"]').type('123');
      cy.get('button[type="submit"]').click();
      cy.contains('支払いが完了しました').should('be.visible');
    });
  });

  describe('サブスクリプション管理', () => {
    it('現在のプラン情報が表示されること', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-testid="current-plan"]').should('be.visible');
    });

    it('プランをアップグレードできること', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-testid="upgrade-plan-button"]').click();
      cy.get('[data-testid="confirm-upgrade-button"]').click();
      cy.contains('プランがアップグレードされました').should('be.visible');
    });

    it('プランをキャンセルできること', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-testid="cancel-subscription-button"]').click();
      cy.get('[data-testid="confirm-cancellation-button"]').click();
      cy.contains('サブスクリプションがキャンセルされました').should('be.visible');
    });
  });
}); 