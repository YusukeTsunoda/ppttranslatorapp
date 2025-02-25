import { testUsers, testTeams } from '../fixtures/testData';

describe('Team Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  it('should create a new team', () => {
    const teamName = `Test Team ${Date.now()}`;
    cy.createTeam(teamName);
    cy.contains(teamName).should('be.visible');
  });

  it('should invite a team member', () => {
    const memberEmail = `member${Date.now()}@example.com`;
    cy.get('[data-testid="invite-member-button"]').click();
    cy.inviteMember(memberEmail);
  });

  it('should display team members', () => {
    cy.get('[data-testid="team-members-list"]').should('be.visible');
    cy.get('[data-testid="team-member-item"]').should('have.length.at.least', 1);
  });

  it('should allow team settings modification', () => {
    cy.get('[data-testid="team-settings-button"]').click();
    cy.get('input[name="teamName"]').should('be.visible');
    const newTeamName = `Updated Team ${Date.now()}`;
    cy.get('input[name="teamName"]').clear().type(newTeamName);
    cy.get('button[type="submit"]').click();
    cy.contains(newTeamName).should('be.visible');
  });
}); 