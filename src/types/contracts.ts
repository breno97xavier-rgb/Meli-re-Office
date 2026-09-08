import { Opportunity } from './opportunities';
import { Proposal } from './proposals';

export type ContractStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'cancelled'
  | 'terminated';

export interface Contract {
  id: string;
  opportunity_id: string;
  proposal_id: string;
  contract_number: string;
  version: number;
  title: string;
  status: ContractStatus;
  monthly_amount: number | null;
  one_time_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_renewal: boolean;
  renewal_period_months: number | null;
  cancellation_notice_days: number | null;
  special_terms: string | null;
  notes: string | null;
  sent_for_signature_at: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  proposal?: Proposal | null;
  opportunity?: Opportunity | null;
}

export interface CreateContractInput {
  proposal_id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  auto_renewal?: boolean;
  renewal_period_months?: number | null;
  cancellation_notice_days?: number | null;
  special_terms?: string | null;
  notes?: string | null;
}

export interface UpdateContractOperationalInput {
  title?: string;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  auto_renewal?: boolean;
  renewal_period_months?: number | null;
  cancellation_notice_days?: number | null;
  special_terms?: string | null;
  notes?: string | null;
}

export interface ContractMetrics {
  totalCount: number;
  pendingSignatureCount: number;
  signedCount: number;
  expiringSoonCount: number;
}

export type ContractStatusFilter = 'all' | ContractStatus;
