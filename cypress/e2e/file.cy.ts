import { testUsers, testFiles } from '../fixtures/testData';

describe('ファイル操作', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.login('test@example.com', 'password123');
    cy.waitForServer();
  });

  describe('ファイルアップロード', () => {
    beforeEach(() => {
      cy.visit('/translate', { timeout: 90000 });
      cy.waitForServer();
    });

    it('PPTファイルをアップロードできること', () => {
      cy.get('input[type="file"]', { timeout: 30000 }).should('be.visible').attachFile('test.pptx');
      cy.contains('翻訳を開始', { timeout: 30000 }).should('be.visible');
    });

    it('非対応のファイル形式をアップロードするとエラーが表示されること', () => {
      cy.get('input[type="file"]', { timeout: 30000 }).should('be.visible').attachFile('test.txt');
      cy.contains('非対応のファイル形式です', { timeout: 30000 }).should('be.visible');
    });

    it('ファイルサイズが制限を超えるとエラーが表示されること', () => {
      cy.get('input[type="file"]', { timeout: 30000 }).should('be.visible').attachFile('large.pptx');
      cy.contains('ファイルサイズは10MB以下にしてください', { timeout: 30000 }).should('be.visible');
    });
  });

  describe('翻訳機能', () => {
    beforeEach(() => {
      cy.visit('/translate', { timeout: 90000 });
      cy.waitForServer();
      cy.get('input[type="file"]', { timeout: 30000 }).should('be.visible').attachFile(testFiles.validPPT);
      cy.contains('アップロード完了', { timeout: 30000 }).should('be.visible');
    });

    it('翻訳オプションを選択して翻訳を実行できること', () => {
      cy.get('select[id="source-lang"]', { timeout: 30000 }).should('be.visible').select('ja');
      cy.get('select[id="target-lang"]', { timeout: 30000 }).should('be.visible').select('en');
      cy.get('button').contains('翻訳開始', { timeout: 30000 }).should('be.visible').click();
      cy.contains('翻訳が完了しました', { timeout: 60000 }).should('be.visible');
    });

    it('翻訳中の進捗状況が表示されること', () => {
      cy.get('select[id="source-lang"]', { timeout: 30000 }).should('be.visible').select('ja');
      cy.get('select[id="target-lang"]', { timeout: 30000 }).should('be.visible').select('en');
      cy.get('button').contains('翻訳開始', { timeout: 30000 }).should('be.visible').click();
      cy.contains('翻訳中...', { timeout: 30000 }).should('be.visible');
      cy.get('[data-testid="progress-bar"]', { timeout: 30000 }).should('exist');
    });
  });

  describe('ダウンロード', () => {
    beforeEach(() => {
      cy.visit('/translate', { timeout: 90000 });
      cy.waitForServer();
      cy.get('input[type="file"]', { timeout: 30000 }).should('be.visible').attachFile(testFiles.validPPT);
      cy.get('select[id="source-lang"]', { timeout: 30000 }).should('be.visible').select('ja');
      cy.get('select[id="target-lang"]', { timeout: 30000 }).should('be.visible').select('en');
      cy.get('button').contains('翻訳開始', { timeout: 30000 }).should('be.visible').click();
      cy.contains('翻訳が完了しました', { timeout: 60000 }).should('be.visible');
    });

    it('翻訳済みファイルをダウンロードできること', () => {
      cy.get('button').contains('ダウンロード', { timeout: 30000 }).should('be.visible').click();
      cy.readFile('cypress/downloads/translated.pptx', { timeout: 30000 }).should('exist');
    });

    it('履歴ページで過去の翻訳ファイルをダウンロードできること', () => {
      cy.visit('/history', { timeout: 90000 });
      cy.waitForServer();
      cy.get('[data-testid="download-button"]', { timeout: 30000 }).first().should('be.visible').click();
      cy.readFile('cypress/downloads/translated.pptx', { timeout: 30000 }).should('exist');
    });
  });
}); 