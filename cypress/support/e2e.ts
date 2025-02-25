// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      attachFile(filePath: string): Chainable<void>;
      createTeam(name: string): Chainable<void>;
      inviteMember(email: string): Chainable<void>;
      waitForServer(): Chainable<void>;
    }
  }
}

// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-file-upload';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (app) {
  app.document.addEventListener('DOMContentLoaded', () => {
    const style = app.document.createElement('style');
    style.innerHTML = `
      .command-name-request,
      .command-name-xhr {
        display: none;
      }
    `;
    app.document.head.appendChild(style);
  });
}

// Cypress.on('uncaught:exception', (err, runnable) => {
//   // テスト実行を継続するために、未捕捉の例外を無視
//   return false;
// }); 