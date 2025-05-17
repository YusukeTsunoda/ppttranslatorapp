// ***********************************************************
// This example support/component.ts is processed and
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

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import { mount } from 'cypress/react18';
import '@cypress/code-coverage/support';
import 'cypress-mochawesome-reporter/register';

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// Example use:
// cy.mount(<MyComponent />);

// グローバルスタイルの読み込み
import '../app/globals.css';

beforeEach(() => {
  // テスト用のビューポートを設定
  cy.viewport(1280, 720);
});

// React18のStrictModeでの警告を抑制
const originalLog = Cypress.log;
Cypress.log = function (opts, ...other) {
  if (opts.displayName === 'script error' && opts.message?.includes('StrictMode')) {
    return;
  }
  return originalLog(opts, ...other);
};
