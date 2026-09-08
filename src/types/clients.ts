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
}

export interface ClientOriginOpportunity {
  id: string;
  title: string;
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
