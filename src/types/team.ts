export type TeamType = 'B2B' | 'B2C';

export interface Team {
  id: string;
  name: string;
  code: string;
  description: string;
  type: TeamType; // B2B or B2C
  leadId: string;
  leadName: string;
  leadEmail?: string;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  active: boolean;
  memberCount: number;
  currency: string;
  createdAt: string;
  color?: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  joinedAt: string;
}
