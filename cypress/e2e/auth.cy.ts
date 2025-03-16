describe('認証フロー', () => {
  // テスト用のユーザー情報を環境変数から取得
  const testEmail = Cypress.env('TEST_USER_EMAIL') || 'tsunotsunoda@gmail.com';
  const testPassword = Cypress.env('TEST_USER_PASSWORD') || 'Tsuno202502';
  
  beforeEach(() => {
    // テスト前にCookieをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('ログインページにアクセスできる', () => {
    cy.visit('/signin');
    cy.contains('サインイン', { timeout: 5000 }).should('be.visible');
  });

  it('無効な認証情報でログインするとエラーが表示される', () => {
    cy.visit('/signin');
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    // エラーメッセージが表示されることを確認（タイムアウト値を調整）
    // 部分一致で「サインインに失敗」を含むかチェック
    cy.get('[data-testid="signin-error"]', { timeout: 15000 })
      .should('be.visible')
      .and('contain.text', 'サインインに失敗');
  });

  it('有効な認証情報でログインするとダッシュボードにリダイレクトされる', () => {
    // 直接ログイン処理を実装
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードにリダイレクトされることを確認
    // data-testid属性を使用して要素を検索
    cy.get('[data-testid="upload-text"]', { timeout: 20000 }).should('be.visible');
  });

  it('ログアウトするとサインインページにリダイレクトされる', () => {
    // 直接ログイン処理を実装
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードに移動したことを確認
    cy.get('[data-testid="upload-text"]', { timeout: 20000 }).should('be.visible');
    
    // ユーザーメニューが表示されるまで待機
    cy.get('[data-testid="user-menu"]', { timeout: 15000 }).should('be.visible').click();
    
    // ログアウトボタンをクリック
    cy.get('[data-testid="logout-button"]').click();
    
    // サインインページにリダイレクトされることを確認
    cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
  });

  it('認証が必要なページに未認証でアクセスするとサインインページにリダイレクトされる', () => {
    cy.visit('/translate');
    
    // サインインページにリダイレクトされることを確認
    cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
  });

  it('セッションが有効な間はページ間を移動しても認証状態が維持される', () => {
    // 直接ログイン処理を実装
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードに移動したことを確認
    cy.get('[data-testid="upload-text"]', { timeout: 20000 }).should('be.visible');
    
    // プロフィールページに移動
    cy.visit('/profile');
    
    // 認証状態が維持されていることを確認（プロフィールページの内容で確認）
    cy.contains('プロフィール', { timeout: 10000 }).should('be.visible');
  });

  it('新規登録後に自動的にログインされる', () => {
    // ユニークなメールアドレスを生成
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';
    
    // 直接登録処理を実装
    cy.visit('/signup');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="email"]').type(uniqueEmail);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードにリダイレクトされることを確認
    cy.get('[data-testid="upload-text"]', { timeout: 20000 }).should('be.visible');
  });

  it('無効なデータで新規登録するとエラーが表示される', () => {
    // 短すぎるパスワードでテスト
    const name = 'Test User';
    const email = `test-${Date.now()}@example.com`;
    const shortPassword = '123'; // 8文字未満
    
    cy.visit('/signup');
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(shortPassword);
    cy.get('button[type="submit"]').click();
    
    // エラーメッセージが表示されることを確認
    cy.get('[data-testid="signup-error"]', { timeout: 15000 })
      .should('be.visible')
      .and('contain.text', 'アカウントの作成に失敗');
  });
}); 