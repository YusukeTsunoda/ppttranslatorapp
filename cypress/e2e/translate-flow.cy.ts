describe('翻訳フロー', () => {
  // テスト用のユーザー情報を環境変数から取得
  const testUser = {
    email: Cypress.env('TEST_USER_EMAIL') || 'tsunotsunoda@gmail.com',
    password: Cypress.env('TEST_USER_PASSWORD') || 'Tsuno202502'
  };

  // モックスライドデータ
  const mockSlideData = {
    slides: [
      {
        index: 0,
        imageUrl: '/mock-slide.png',
        texts: [
          { text: 'サンプルテキスト1', position: { x: 0, y: 0, width: 100, height: 50 } },
          { text: 'サンプルテキスト2', position: { x: 0, y: 100, width: 100, height: 50 } }
        ]
      }
    ]
  };

  // 翻訳済みモックデータ
  const translatedMockData = {
    slides: [
      {
        index: 0,
        imageUrl: '/mock-slide.png',
        texts: [
          { text: 'サンプルテキスト1', position: { x: 0, y: 0, width: 100, height: 50 } },
          { text: 'サンプルテキスト2', position: { x: 0, y: 100, width: 100, height: 50 } }
        ],
        translations: [
          { text: 'Sample Text 1', position: { x: 0, y: 0, width: 100, height: 50 } },
          { text: 'Sample Text 2', position: { x: 0, y: 100, width: 100, height: 50 } }
        ]
      }
    ]
  };

  // テスト前の準備
  before(() => {
    // テスト用のフィクスチャディレクトリが存在することを確認
    cy.task('ensureDir', 'cypress/fixtures');
  });

  beforeEach(() => {
    // 各テスト前にCookieとローカルストレージをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // 直接ログイン処理を実装
    cy.visit('/signin');
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type(testUser.password);
    cy.get('button[type="submit"]').click();
    
    // ダッシュボードへのリダイレクトを確認
    cy.contains('ファイルをアップロード', { timeout: 15000 }).should('be.visible');
  });

  it('翻訳ページにアクセスできる', () => {
    cy.visit('/translate');
    cy.contains('ファイルをアップロード', { timeout: 15000 }).should('be.visible');
    
    // ページの主要要素が表示されることを確認
    cy.get('[data-testid="upload-area"]', { timeout: 10000 }).should('be.visible');
  });

  it('PPTファイルをアップロードして翻訳できる', () => {
    cy.visit('/translate');
    cy.get('[data-testid="upload-area"]', { timeout: 10000 }).should('be.visible');
    
    // APIリクエストをモック
    cy.intercept('POST', '/api/upload', {
      statusCode: 200,
      body: mockSlideData
    }).as('uploadRequest');
    
    // ファイルをアップロード（実際のファイルを使用）
    cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストが完了するまで待機
    cy.wait('@uploadRequest', { timeout: 30000 });
    
    // スライドが表示されることを確認
    cy.get('[data-testid="slide-preview"]', { timeout: 20000 }).should('be.visible');
    
    // 翻訳ボタンをクリック
    cy.contains('button', '翻訳する', { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // 翻訳処理の完了を待機
    cy.get('[data-testid="translating-indicator"]', { timeout: 60000 })
      .should('exist')
      .then(() => {
        cy.get('[data-testid="translating-indicator"]', { timeout: 60000 })
          .should('not.exist')
          .then(() => {
            cy.log('翻訳処理が完了しました');
          });
      });
    
    // 翻訳結果が表示されることを確認
    cy.get('[data-testid="translation-text"]', { timeout: 20000 }).should('be.visible');
  });

  it('翻訳テキストを編集できる', () => {
    cy.visit('/translate');
    cy.get('[data-testid="upload-area"]', { timeout: 10000 }).should('be.visible');
    
    // APIリクエストをモック（翻訳済みデータを返す）
    cy.intercept('POST', '/api/upload', {
      statusCode: 200,
      body: translatedMockData
    }).as('uploadRequest');
    
    // ファイルをアップロード（実際のファイルを使用）
    cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストが完了するまで待機
    cy.wait('@uploadRequest', { timeout: 30000 });
    
    // スライドが表示されるまで待機
    cy.get('[data-testid="slide-preview"]', { timeout: 20000 }).should('be.visible');
    
    // 翻訳テキストが表示されるまで待機
    cy.get('[data-testid="translation-text"]', { timeout: 20000 }).first().should('be.visible');
    
    // 翻訳テキストをクリックして編集モードに入る
    cy.get('[data-testid="translation-text"]').first().click();
    
    // テキストを編集
    const editedText = 'This is an edited translation text';
    cy.get('textarea', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(editedText);
    
    // 保存ボタンをクリック
    cy.get('[data-testid="save-translation-button"]').click();
    
    // 編集したテキストが表示されることを確認
    cy.get('[data-testid="translation-text"]').first()
      .should('contain', editedText, { timeout: 10000 });
  });

  it('翻訳したPPTをダウンロードできる', () => {
    cy.visit('/translate');
    cy.get('[data-testid="upload-area"]', { timeout: 10000 }).should('be.visible');
    
    // APIリクエストをモック（翻訳済みデータを返す）
    cy.intercept('POST', '/api/upload', {
      statusCode: 200,
      body: translatedMockData
    }).as('uploadRequest');
    
    // ファイルをアップロード（実際のファイルを使用）
    cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストが完了するまで待機
    cy.wait('@uploadRequest', { timeout: 30000 });
    
    // スライドが表示されるまで待機
    cy.get('[data-testid="slide-preview"]', { timeout: 20000 }).should('be.visible');
    
    // ダウンロードボタンをクリック
    cy.get('[data-testid="download-button"]', { timeout: 10000 })
      .should('be.visible')
      .click();
    
    // ダウンロード処理の完了を待機
    cy.get('[data-testid="downloading-indicator"]', { timeout: 30000 })
      .should('exist')
      .then(() => {
        cy.get('[data-testid="downloading-indicator"]', { timeout: 30000 })
          .should('not.exist')
          .then(() => {
            cy.log('ダウンロードが完了しました');
          });
      });
    
    // ダウンロード成功のメッセージが表示されることを確認
    cy.contains('ダウンロード完了', { timeout: 15000 }).should('exist');
  });

  afterEach(() => {
    // 各テスト後にログアウト（エラーハンドリングを追加）
    cy.get('body').then($body => {
      // ユーザーメニューが存在するか確認
      if ($body.find('[data-testid="user-menu"]').length > 0) {
        cy.get('[data-testid="user-menu"]').click();
        
        // ログアウトボタンが存在するか確認
        cy.get('body').then($body2 => {
          if ($body2.find('[data-testid="logout-button"]').length > 0) {
            cy.get('[data-testid="logout-button"]').click();
            cy.contains('サインイン', { timeout: 10000 }).should('be.visible');
          }
        });
      }
    });
  });
}); 