import { Opportunity } from './opportunities';
export * from './commercialDocuments';

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export interface Proposal {
  id: string;
  opportunity_id: string;
  title: string;
  version: number;
  status: ProposalStatus;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  monthly_amount: number | null;
  one_time_amount: number | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  opportunity?: Opportunity | null;
  contracts?: import('./contracts').Contract[];
}

export interface CreateProposalInput {
  opportunity_id: string;
  title: string;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
}

export interface UpdateProposalInput {
  status?: ProposalStatus;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
}

export interface ProposalMetrics {
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  totalAcceptedMonthly: number;
  totalAcceptedOneTime: number;
}
