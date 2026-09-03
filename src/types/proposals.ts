import { Opportunity } from './opportunities';

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export type ProposalBillingType = 'monthly' | 'one_time';

export interface ProposalItem {
  id: string;
  proposal_id: string;
  description: string;
  service_key: string | null;
  billing_type: ProposalBillingType;
  quantity: number;
  unit_price: number;
  display_order: number;
  created_at: string;
}

export interface Proposal {
  id: string;
  opportunity_id: string;
  title: string;
  version: number;
  status: ProposalStatus;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: ProposalItem[];
  opportunity?: Opportunity | null;
  contracts?: import('./contracts').Contract[];
}

export interface CreateProposalItemInput {
  description: string;
  service_key?: string | null;
  billing_type: ProposalBillingType;
  quantity: number;
  unit_price: number;
  display_order?: number;
}

export interface CreateProposalInput {
  opportunity_id: string;
  title: string;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: CreateProposalItemInput[];
}

export interface UpdateProposalInput {
  status?: ProposalStatus;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
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

export interface ProposalTotals {
  monthlyTotal: number;
  oneTimeTotal: number;
}

export interface ProposalDocumentItem {
  id: string;
  proposal_document_id: string;
  proposal_item_id: string;
  display_title: string | null;
  presentation_text: string | null;
  deliverables: string[];
  created_at: string;
  updated_at: string;
}

export interface ProposalDocument {
  id: string;
  proposal_id: string;
  introduction: string | null;
  scope_summary: string | null;
  closing_text: string | null;
  created_at: string;
  updated_at: string;
  items?: ProposalDocumentItem[];
}

export interface SaveProposalDocumentItemInput {
  proposal_item_id: string;
  display_title?: string | null;
  presentation_text?: string | null;
  deliverables?: string[];
}

export interface SaveProposalDocumentInput {
  proposal_id: string;
  introduction?: string | null;
  scope_summary?: string | null;
  closing_text?: string | null;
  items?: SaveProposalDocumentItemInput[];
}
