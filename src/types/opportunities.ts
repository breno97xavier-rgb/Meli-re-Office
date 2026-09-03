export type OpportunityStage =
  | 'discovery'
  | 'briefing'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface OpportunityLeadInfo {
  id: string;
  name: string;
  business_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  lead_id?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
  stage: OpportunityStage;
  estimated_value?: number | null;
  services_of_interest: string[];
  probability?: number | null;
  next_action?: string | null;
  next_action_date?: string | null;
  expected_close_date?: string | null;
  closed_at?: string | null;
  lost_reason?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
  lead?: OpportunityLeadInfo | null;
}

export interface CreateOpportunityInput {
  title: string;
  lead_id?: string | null;
  stage?: OpportunityStage;
  estimated_value?: number | null;
  services_of_interest?: string[];
  probability?: number | null;
  next_action?: string | null;
  next_action_date?: string | null;
  expected_close_date?: string | null;
  owner_id?: string | null;
}

export interface UpdateOpportunityInput {
  title?: string;
  stage?: OpportunityStage;
  estimated_value?: number | null;
  services_of_interest?: string[];
  probability?: number | null;
  next_action?: string | null;
  next_action_date?: string | null;
  expected_close_date?: string | null;
  closed_at?: string | null;
  lost_reason?: string | null;
}

export interface OpportunityMetrics {
  openCount: number;
  activePipelineValue: number;
  inProgressCount: number;
  wonCount: number;
  lostCount: number;
  totalCount: number;
}

export type OpportunityStageFilter = 'all' | 'open' | OpportunityStage;
