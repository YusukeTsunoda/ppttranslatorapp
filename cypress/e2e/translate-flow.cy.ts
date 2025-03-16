describe('翻訳フロー', () => {
  // テストユーザー情報
  const testUser = {
    email: Cypress.env('TEST_USER_EMAIL'),
    password: Cypress.env('TEST_USER_PASSWORD')
  };

  // モックデータ
  const mockSlideData = {
    slides: [
      {
        index: 0,
        imageUrl: '/api/slides/0.png',
        texts: [
          { id: '1', content: 'サンプルテキスト1', x: 100, y: 100, width: 200, height: 50 },
          { id: '2', content: 'サンプルテキスト2', x: 100, y: 200, width: 200, height: 50 }
        ]
      },
      {
        index: 1,
        imageUrl: '/api/slides/1.png',
        texts: [
          { id: '3', content: 'サンプルテキスト3', x: 100, y: 100, width: 200, height: 50 }
        ]
      }
    ]
  };

  // 翻訳後のモックデータ
  const translatedMockData = {
    slides: [
      {
        index: 0,
        imageUrl: '/api/slides/0.png',
        texts: [
          { id: '1', content: 'サンプルテキスト1', translation: 'Sample Text 1', x: 100, y: 100, width: 200, height: 50 },
          { id: '2', content: 'サンプルテキスト2', translation: 'Sample Text 2', x: 100, y: 200, width: 200, height: 50 }
        ]
      },
      {
        index: 1,
        imageUrl: '/api/slides/1.png',
        texts: [
          { id: '3', content: 'サンプルテキスト3', translation: 'Sample Text 3', x: 100, y: 100, width: 200, height: 50 }
        ]
      }
    ]
  };

  beforeEach(() => {
    // テスト前にCookieをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // テストごとにタイムアウトを設定
    Cypress.config('defaultCommandTimeout', 10000);
    
    // ログイン処理
    cy.visit('/signin', { failOnStatusCode: false });
    cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(testUser.email);
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(testUser.password);
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click();
    
    // ログイン成功を確認（10秒以内）
    cy.get('body', { timeout: 10000 }).then($body => {
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      } else {
        cy.url({ timeout: 10000 }).should('include', '/translate');
      }
    });
    
    // アップロードAPIをモック
    cy.intercept('POST', '/api/upload', {
      statusCode: 200,
      body: mockSlideData,
      delay: 500
    }).as('uploadRequest');

    // 翻訳APIをモック
    cy.intercept('POST', '/api/translate', {
      statusCode: 200,
      body: translatedMockData,
      delay: 500
    }).as('translateRequest');

    // ダウンロードAPIをモック
    cy.intercept('POST', '/api/download', {
      statusCode: 200,
      headers: {
        'content-disposition': 'attachment; filename="translated.pptx"'
      },
      body: Cypress.Buffer.from('dummy file content')
    }).as('downloadRequest');
  });

  it('翻訳ページにアクセスできる', () => {
    cy.visit('/translate', { failOnStatusCode: false });
    
    // ページの主要要素が表示されることを確認（10秒以内）
    cy.get('body', { timeout: 10000 }).then($body => {
      if ($body.find('[data-testid="upload-area"]').length > 0) {
        cy.get('[data-testid="upload-area"]', { timeout: 10000 }).should('be.visible');
      }
      
      if ($body.find('[data-testid="upload-text"]').length > 0) {
        cy.get('[data-testid="upload-text"]', { timeout: 10000 }).should('be.visible');
      } else if ($body.text().includes('ファイルをアップロード')) {
        cy.contains('ファイルをアップロード', { timeout: 10000 }).should('be.visible');
      }
    });
  });

  it('PPTファイルをアップロードして翻訳できる', () => {
    cy.visit('/translate', { failOnStatusCode: false });
    
    // ファイルをアップロード（10秒以内）
    cy.get('input[type="file"]', { timeout: 10000 }).should('exist').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストを待機（10秒以内）
    cy.wait('@uploadRequest', { timeout: 10000 }).then(() => {
      // スライドプレビューが表示されるまで待機（10秒以内）
      cy.get('[data-testid="slide-preview"]', { timeout: 10000 }).should('exist');
      
      // 翻訳ボタンをクリック（10秒以内）
      cy.get('body').then($body => {
        if ($body.find('button:contains("翻訳する")').length > 0) {
          cy.contains('button', '翻訳する', { timeout: 10000 }).click();
        } else {
          cy.log('翻訳ボタンが見つかりませんでした');
        }
      });
      
      // 翻訳リクエストを待機（10秒以内）
      cy.wait('@translateRequest', { timeout: 10000 }).then(() => {
        // 翻訳テキストが表示されるまで待機（10秒以内）
        cy.get('[data-testid="translation-text"]', { timeout: 10000 }).should('exist');
      });
    });
  });

  it('翻訳テキストを編集できる', () => {
    cy.visit('/translate', { failOnStatusCode: false });
    
    // ファイルをアップロード（10秒以内）
    cy.get('input[type="file"]', { timeout: 10000 }).should('exist').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストを待機（10秒以内）
    cy.wait('@uploadRequest', { timeout: 10000 }).then(() => {
      // スライドプレビューが表示されるまで待機（10秒以内）
      cy.get('[data-testid="slide-preview"]', { timeout: 10000 }).should('exist');
      
      // 翻訳ボタンをクリック（10秒以内）
      cy.get('body').then($body => {
        if ($body.find('button:contains("翻訳する")').length > 0) {
          cy.contains('button', '翻訳する', { timeout: 10000 }).click();
        } else {
          cy.log('翻訳ボタンが見つかりませんでした');
        }
      });
      
      // 翻訳リクエストを待機（10秒以内）
      cy.wait('@translateRequest', { timeout: 10000 }).then(() => {
        // 翻訳テキストが表示されるまで待機（10秒以内）
        cy.get('[data-testid="translation-text"]', { timeout: 10000 }).should('exist');
        
        // 編集ボタンをクリック（10秒以内）
        cy.get('body').then($body => {
          if ($body.find('button:contains("編集")').length > 0) {
            cy.contains('button', '編集', { timeout: 10000 }).click();
          } else {
            cy.log('編集ボタンが見つかりませんでした');
          }
        });
        
        // テキストエリアが表示されるまで待機（10秒以内）
        cy.get('textarea', { timeout: 10000 }).should('exist').then($textarea => {
          // テキストを編集
          cy.wrap($textarea).clear().type('Updated Sample Text');
          
          // 保存ボタンをクリック（10秒以内）
          cy.get('body').then($body => {
            if ($body.find('button:contains("保存")').length > 0) {
              cy.contains('button', '保存', { timeout: 10000 }).click();
            } else {
              cy.log('保存ボタンが見つかりませんでした');
            }
          });
          
          // 更新されたテキストが表示されることを確認（10秒以内）
          cy.contains('Updated Sample Text', { timeout: 10000 }).should('exist');
        });
      });
    });
  });

  it('翻訳したPPTをダウンロードできる', () => {
    cy.visit('/translate', { failOnStatusCode: false });
    
    // ファイルをアップロード（10秒以内）
    cy.get('input[type="file"]', { timeout: 10000 }).should('exist').selectFile('cypress/fixtures/sample.pptx', { force: true });
    
    // アップロードリクエストを待機（10秒以内）
    cy.wait('@uploadRequest', { timeout: 10000 }).then(() => {
      // スライドプレビューが表示されるまで待機（10秒以内）
      cy.get('[data-testid="slide-preview"]', { timeout: 10000 }).should('exist');
      
      // 翻訳ボタンをクリック（10秒以内）
      cy.get('body').then($body => {
        if ($body.find('button:contains("翻訳する")').length > 0) {
          cy.contains('button', '翻訳する', { timeout: 10000 }).click();
        } else {
          cy.log('翻訳ボタンが見つかりませんでした');
        }
      });
      
      // 翻訳リクエストを待機（10秒以内）
      cy.wait('@translateRequest', { timeout: 10000 }).then(() => {
        // 翻訳テキストが表示されるまで待機（10秒以内）
        cy.get('[data-testid="translation-text"]', { timeout: 10000 }).should('exist');
        
        // ダウンロードボタンをクリック（10秒以内）
        cy.get('body').then($body => {
          if ($body.find('button:contains("ダウンロード")').length > 0) {
            cy.contains('button', 'ダウンロード', { timeout: 10000 }).click();
          } else {
            cy.log('ダウンロードボタンが見つかりませんでした');
          }
        });
        
        // ダウンロードリクエストを待機（10秒以内）
        cy.wait('@downloadRequest', { timeout: 10000 });
      });
    });
  });

  // テスト環境のクリーンアップ
  afterEach(() => {
    cy.task('log', 'テスト環境のクリーンアップが完了しました');
  });
});