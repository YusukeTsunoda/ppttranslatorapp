describe('Magic Link Authentication', () => {
  const testEmail = 'test@example.com';

  beforeEach(() => {
    cy.visit('/signin');
  });

  it('should show error for invalid email', () => {
    cy.get('input[type="email"]').type('invalid-email');
    cy.get('button[type="submit"]').click();
    cy.contains('有効なメールアドレスを入力してください').should('be.visible');
  });

  it('should handle magic link request flow', () => {
    // メールアドレス入力とマジックリンク要求
    cy.get('input[type="email"]').type(testEmail);
    cy.get('button[type="submit"]').click();

    // 成功メッセージの確認
    cy.contains('マジックリンクを送信しました').should('be.visible');
    cy.contains('メールをご確認ください').should('be.visible');

    // check-emailページへのリダイレクト確認
    cy.url().should('include', '/auth/check-email');
  });

  it('should handle magic link verification flow', () => {
    // 検証ページへの直接アクセス（トークンなし）
    cy.visit('/auth/verify');
    cy.contains('トークンが見つかりません').should('be.visible');
    cy.url().should('include', '/signin');

    // 無効なトークンでの検証
    cy.visit('/auth/verify?token=invalid-token');
    cy.contains('認証に失敗しました').should('be.visible');
    cy.url().should('include', '/signin');

    // 有効なトークンでの検証（モック）
    cy.intercept('POST', '/api/auth/verify-magic-link', {
      statusCode: 200,
      body: {
        success: true,
        accessToken: 'mock-token',
        user: {
          id: '1',
          email: testEmail,
          name: 'Test User',
          role: 'user',
        },
      },
    }).as('verifyToken');

    cy.visit('/auth/verify?token=valid-token');
    cy.wait('@verifyToken');
    cy.contains('サインインしました').should('be.visible');
    cy.url().should('include', '/dashboard');

    // アクセストークンの保存確認
    cy.window().then((win) => {
      expect(win.localStorage.getItem('accessToken')).to.eq('mock-token');
    });
  });
}); 