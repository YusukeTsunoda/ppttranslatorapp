// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// カスタムコマンドの型定義は index.d.ts に記述されています

// セッションを保存するコマンド
Cypress.Commands.add('saveSession', () => {
  cy.log('現在のセッションを保存しています...');
  
  // セッションクッキーとローカルストレージを保存
  cy.getCookies().then(cookies => {
    cy.writeFile('cypress/fixtures/cookies.json', cookies);
  });
  
  cy.getAllLocalStorage().then(localStorage => {
    cy.writeFile('cypress/fixtures/localStorage.json', localStorage);
  });
  
  cy.log('セッションが保存されました');
});

// セッションを復元するコマンド
Cypress.Commands.add('restoreSession', () => {
  cy.log('保存されたセッションを復元しています...');
  
  // 保存されたクッキーを読み込んで設定
  cy.readFile('cypress/fixtures/cookies.json', { log: false }).then((cookies: Cypress.Cookie[]) => {
    cookies.forEach((cookie: Cypress.Cookie) => {
      cy.setCookie(cookie.name, cookie.value, {
        domain: cookie.domain,
        expiry: cookie.expiry,
        httpOnly: cookie.httpOnly,
        path: cookie.path,
        secure: cookie.secure
      });
    });
  });
  
  // 保存されたローカルストレージを読み込んで設定
  cy.readFile('cypress/fixtures/localStorage.json', { log: false }).then((localStorage: Record<string, Record<string, string>>) => {
    Cypress._.forEach(localStorage, (values, origin) => {
      cy.origin(origin, { args: { values } }, ({ values }) => {
        Cypress._.forEach(values, (value, key) => {
          window.localStorage.setItem(key, value);
        });
      });
    });
  });
  
  cy.log('セッションが復元されました');
});
