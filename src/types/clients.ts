export type ClientStatus =
  | 'onboarding'
  | 'active'
  | 'paused'
  | 'ended';

export type ClientStatusFilter = 'all' | ClientStatus;

export interface ClientOriginContract {
  id: string;
  contract_number: string;
  title: string;
  version: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  signed_at?: string | null;
}

export interface ClientOriginOpportunity {
  id: string;
  title: string;
  stage?: string;
  estimated_value?: number | null;
  services_of_interest?: string[];
  probability?: number | null;
  closed_at?: string | null;
}

export interface Client {
  id: string;
  name: string;
  commercial_name?: string | null;
  slug?: string | null;
  status: ClientStatus;
  logo_url?: string | null;
  segment?: string | null;
  website?: string | null;
  instagram?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  origin_contract_id?: string | null;
  origin_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  // Optional joined relations
  origin_contract?: ClientOriginContract | null;
  origin_opportunity?: ClientOriginOpportunity | null;
}

export interface ClientMetrics {
  totalCount: number;
  onboardingCount: number;
  activeCount: number;
  pausedCount: number;
  endedCount: number;
  monthlyRevenueActive: number;
}

export interface UpdateClientInput {
  name?: string;
  commercial_name?: string | null;
  segment?: string | null;
  website?: string | null;
  instagram?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  status?: ClientStatus;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
}

export interface ClientOpportunityItem {
  id: string;
  title: string;
  stage: string;
  services_of_interest?: string[] | null;
  probability?: number | null;
  estimated_value?: number | null;
  closed_at?: string | null;
  created_at?: string;
}

export interface ClientProposalItem {
  id: string;
  opportunity_id: string;
  title: string;
  version: number;
  status: string;
  valid_until?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  notes?: string | null;
}

export interface ClientContractItem {
  id: string;
  proposal_id?: string | null;
  opportunity_id?: string | null;
  contract_number: string;
  title: string;
  version: number;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  monthly_amount?: number | null;
  one_time_amount?: number | null;
  signed_at?: string | null;
  created_at: string;
  notes?: string | null;
}

export interface ClientCommercialHistory {
  opportunities: ClientOpportunityItem[];
  proposals: ClientProposalItem[];
  contracts: ClientContractItem[];
}
