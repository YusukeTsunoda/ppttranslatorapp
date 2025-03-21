describe('認証フロー', () => {
  // テスト用のユーザー情報を環境変数から取得
  const testEmail = Cypress.env('TEST_USER_EMAIL') || 'tsunotsunoda@gmail.com';
  const testPassword = Cypress.env('TEST_USER_PASSWORD') || 'Tsuno202502';

  beforeEach(() => {
    // テスト前にCookieをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    // テストごとにタイムアウトを設定
    Cypress.config('defaultCommandTimeout', 10000);
  });

  it('ログインページにアクセスできる', () => {
    cy.visit('/signin', { failOnStatusCode: false });
    cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
  });

  it('無効な認証情報でログインするとエラーが表示される', () => {
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('invalid@example.com');
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type('wrongpassword');
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // エラーメッセージが表示されることを確認
    cy.get('[data-testid="signin-error"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'サインインに失敗');
  });

  it('有効な認証情報でログインするとダッシュボードにリダイレクトされる', () => {
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(testEmail);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(testPassword);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // ダッシュボードにリダイレクトされることを確認（いずれかの条件が満たされればOK）
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      } else {
        cy.url({ timeout: 10000 }).should('include', '/translate');
      }
    });
  });

  it('ログアウトするとサインインページにリダイレクトされる', () => {
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(testEmail);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(testPassword);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // ダッシュボードに移動したことを確認
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      } else {
        cy.url({ timeout: 10000 }).should('include', '/translate');
      }
    });

    // ユーザーメニューが表示されるまで待機
    cy.get('[data-testid="user-menu"]', { timeout: 10000 }).should('be.visible').click();

    // ログアウトボタンをクリック
    cy.get('[data-testid="logout-button"]', { timeout: 10000 }).click();

    // サインインページにリダイレクトされることを確認
    cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
  });

  it('認証が必要なページに未認証でアクセスするとサインインページにリダイレクトされる', () => {
    cy.visit('/translate', { failOnStatusCode: false });

    // サインインページにリダイレクトされることを確認
    cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
  });

  it('セッションが有効な間はページ間を移動しても認証状態が維持される', () => {
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(testEmail);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(testPassword);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // ダッシュボードに移動したことを確認
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      } else {
        cy.url({ timeout: 10000 }).should('include', '/translate');
      }
    });

    // プロフィールページに移動
    cy.visit('/profile', { failOnStatusCode: false });

    // 認証状態が維持されていることを確認（プロフィールページの内容で確認）
    cy.contains('プロフィール', { timeout: 10000 }).should('be.visible');
  });

  it('新規登録後に自動的にログインされる', () => {
    // ユニークなメールアドレスを生成
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';

    // 直接登録処理を実装
    cy.visit('/signup', { failOnStatusCode: false });
    cy.get('input[name="name"]', { timeout: 10000 }).should('be.visible').type(name);
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(uniqueEmail);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(password);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // ダッシュボードにリダイレクトされることを確認
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      } else {
        cy.url({ timeout: 10000 }).should('include', '/translate');
      }
    });
  });

  it('無効なデータで新規登録するとエラーが表示される', () => {
    // 短すぎるパスワードでテスト
    const name = 'Test User';
    const email = `test-${Date.now()}@example.com`;
    const shortPassword = '123'; // 8文字未満

    cy.visit('/signup', { failOnStatusCode: false });
    cy.get('input[name="name"]', { timeout: 10000 }).should('be.visible').type(name);
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(email);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(shortPassword);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();

    // エラーメッセージが表示されることを確認
    cy.get('[data-testid="signup-error"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'アカウントの作成に失敗');
  });
});
