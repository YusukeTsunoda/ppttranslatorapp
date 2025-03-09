describe('認証フロー', () => {
  beforeEach(() => {
    // テスト前にCookieをクリア
    cy.clearCookies();
  });

  it('ログインページにアクセスできる', () => {
    cy.visit('/signin');
    cy.contains('PPT Translatorにサインイン').should('be.visible');
  });

  it('無効な認証情報でログインするとエラーが表示される', () => {
    cy.visit('/signin');
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // エラーメッセージが表示されることを確認
    cy.contains('メールアドレスまたはパスワードが正しくありません').should('be.visible');
  });

  it('有効な認証情報でログインするとダッシュボードにリダイレクトされる', () => {
    // テストユーザーの認証情報
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードにリダイレクトされることを確認
    cy.url().should('include', '/translate');
    
    // ユーザー情報が表示されることを確認
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('ログアウトするとサインインページにリダイレクトされる', () => {
    // 先にログイン
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ログアウトボタンをクリック
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // サインインページにリダイレクトされることを確認
    cy.url().should('include', '/signin');
  });

  it('認証が必要なページに未認証でアクセスするとサインインページにリダイレクトされる', () => {
    cy.visit('/translate');
    
    // サインインページにリダイレクトされることを確認
    cy.url().should('include', '/signin');
  });

  it('セッションが有効な間はページ間を移動しても認証状態が維持される', () => {
    // 先にログイン
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードに移動
    cy.visit('/translate');
    cy.url().should('include', '/translate');
    
    // プロフィールページに移動
    cy.visit('/profile');
    cy.url().should('include', '/profile');
    
    // 認証状態が維持されていることを確認
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('新規登録後に自動的にログインされる', () => {
    // ユニークなメールアドレスを生成
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';
    
    cy.visit('/signup');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="email"]').type(uniqueEmail);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードにリダイレクトされることを確認
    cy.url().should('include', '/translate');
    
    // ユーザー情報が表示されることを確認
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });
}); 