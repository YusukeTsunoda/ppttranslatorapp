/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      attachFile(filePath: string): Chainable<void>;
      createTeam(name: string): Chainable<void>;
      inviteMember(email: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.intercept('POST', '**/api/auth/signin/credentials').as('login');
  cy.visit('/sign-in', { failOnStatusCode: false });
  cy.get('body').should('be.visible');
  cy.get('h2').should('contain.text', 'サインイン');
  
  cy.get('[data-cy="signin-form"]')
    .should('be.visible')
    .within(() => {
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();
    });
  
  cy.wait('@login');
  cy.url().should('not.include', '/sign-in');
});

Cypress.Commands.add('attachFile', { prevSubject: 'element' }, (subject, filePath, mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation') => {
  cy.fixture(filePath, 'base64')
    .then(Cypress.Blob.base64StringToBlob)
    .then(blob => {
      const testFile = new File([blob], filePath, { type: mimeType })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(testFile)
      
      const input = subject[0] as HTMLInputElement
      input.files = dataTransfer.files
      return cy.wrap(input).trigger('change', { force: true })
    })
});

Cypress.Commands.add('createTeam', (name: string) => {
  cy.visit('/teams/create', { failOnStatusCode: false });
  cy.get('body').should('be.visible');
  cy.get('input[name="teamName"]').should('be.visible').clear().type(name);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/teams');
});

Cypress.Commands.add('inviteMember', (email: string) => {
  cy.get('input[name="email"]').should('be.visible').clear().type(email);
  cy.get('button[type="submit"]').contains('招待').click();
  cy.contains('招待が送信されました').should('be.visible');
});

export {}; 