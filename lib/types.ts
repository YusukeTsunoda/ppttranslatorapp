import type { Team, TeamMember, User } from '@prisma/client';

export type TeamDataWithMembers = Team & {
  members: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
}; 