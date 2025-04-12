describe('翻訳履歴機能', () => {
  // テスト用のユーザー情報を環境変数から取得
  const testEmail = Cypress.env('TEST_USER_EMAIL') || 'tsunotsunoda@gmail.com';
  const testPassword = Cypress.env('TEST_USER_PASSWORD') || 'Tsuno202502';

  beforeEach(() => {
    // テスト前にCookieをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // ログイン処理
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(testEmail);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(testPassword);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();
    
    // ログイン成功を確認
    cy.url({ timeout: 10000 }).should('include', '/translate');
  });

  it('履歴ページにアクセスできる', () => {
    // 履歴ページに移動
    cy.visit('/history', { failOnStatusCode: false });
    
    // 履歴ページのタイトルが表示されることを確認
    cy.contains('翻訳履歴', { timeout: 10000 }).should('be.visible');
    
    // 履歴リストが表示されることを確認（データがない場合もあるため、コンテナの存在を確認）
    cy.get('[data-testid="history-list"]', { timeout: 10000 }).should('exist');
  });

  it('フィルタリング機能が正常に動作する', () => {
    // 履歴ページに移動
    cy.visit('/history', { failOnStatusCode: false });
    
    // フィルターコンポーネントが表示されることを確認
    cy.get('[data-testid="history-filter"]', { timeout: 10000 }).should('be.visible');
    
    // 日付フィルターを開く
    cy.get('[data-testid="date-filter"]', { timeout: 10000 }).should('be.visible').click();
    
    // カレンダーが表示されることを確認
    cy.get('.rdp-month', { timeout: 10000 }).should('be.visible');
    
    // 日付を選択（今日の日付）
    cy.get('.rdp-day_today').click();
    
    // フィルターが適用されたことを確認（URLにクエリパラメータが追加される）
    cy.url().should('include', 'startDate=');
  });

  it('ソート機能が正常に動作する', () => {
    // 履歴ページに移動
    cy.visit('/history', { timeout: 10000 });
    
    // ソートコンポーネントが表示されることを確認
    cy.get('[data-testid="history-sort"]', { timeout: 10000 }).should('be.visible');
    
    // ソートオプションを選択（作成日の降順）
    cy.get('[data-testid="sort-select"]').select('createdAt-desc');
    
    // ソートが適用されたことを確認（URLにクエリパラメータが追加される）
    cy.url().should('include', 'sortBy=createdAt');
    cy.url().should('include', 'sortOrder=desc');
  });

  it('ページネーション機能が正常に動作する', () => {
    // 履歴ページに移動
    cy.visit('/history', { timeout: 10000 });
    
    // ページネーションコンポーネントが表示されることを確認
    cy.get('[data-testid="pagination"]', { timeout: 10000 }).should('exist');
    
    // データが十分にある場合のみ次のページに移動するテストを実行
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="next-page"]').length > 0) {
        // 次のページボタンをクリック
        cy.get('[data-testid="next-page"]').click();
        
        // URLのページパラメータが変更されたことを確認
        cy.url().should('include', 'page=2');
      }
    });
  });

  it('履歴詳細ページにアクセスできる', () => {
    // 履歴ページに移動
    cy.visit('/history', { timeout: 10000 });
    
    // 履歴アイテムが存在する場合のみ詳細ページへのアクセスをテスト
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="history-item"]').length > 0) {
        // 最初の履歴アイテムをクリック
        cy.get('[data-testid="history-item"]').first().click();
        
        // 詳細ページに移動したことを確認
        cy.url().should('include', '/history/');
        
        // 詳細情報が表示されることを確認
        cy.get('[data-testid="history-detail"]', { timeout: 10000 }).should('be.visible');
      }
    });
  });

  it('履歴詳細ページでファイル情報が正しく表示される', () => {
    // 履歴ページに移動
    cy.visit('/history', { timeout: 10000 });
    
    // 履歴アイテムが存在する場合のみ詳細ページへのアクセスをテスト
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="history-item"]').length > 0) {
        // 最初の履歴アイテムをクリック
        cy.get('[data-testid="history-item"]').first().click();
        
        // 詳細ページに移動したことを確認
        cy.url().should('include', '/history/');
        
        // ファイル名が表示されることを確認
        cy.get('[data-testid="file-name"]', { timeout: 10000 }).should('exist');
        
        // ファイルサイズが表示されることを確認
        cy.get('[data-testid="file-size"]', { timeout: 10000 }).should('exist');
        
        // 翻訳言語情報が表示されることを確認
        cy.get('[data-testid="translation-languages"]', { timeout: 10000 }).should('exist');
      }
    });
  });
});
