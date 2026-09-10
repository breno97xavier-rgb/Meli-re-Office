import { Content } from './contents';
import { ContentAsset } from './contentAssets';

export type PresentationStatus =
  | 'draft'
  | 'sent'
  | 'in_review'
  | 'client_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'completed'
  | string;

export type PresentationItemApprovalStatus =
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | string;

export interface PresentationClientRelation {
  id: string;
  name: string;
  commercial_name?: string | null;
  logo_url?: string | null;
  status?: string;
}

export interface Presentation {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: PresentationStatus;
  round_number: number;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined / computed relations
  client?: PresentationClientRelation | null;
  items_count?: number;
  items?: PresentationItem[];
}

export interface PresentationItem {
  id: string;
  presentation_id: string;
  content_id: string;
  display_order: number;
  presentation_notes: string | null;
  client_approval_status: PresentationItemApprovalStatus;
  client_feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Resolved content and assets
  content?: Content | null;
  assets?: ContentAsset[];
}

export interface CreatePresentationInput {
  client_id: string;
  title: string;
  description?: string | null;
  round_number?: number;
  status?: PresentationStatus;
}

export interface UpdatePresentationInput {
  title?: string;
  description?: string | null;
  round_number?: number;
  status?: PresentationStatus;
  sent_at?: string | null;
}

export interface CreatePresentationItemInput {
  presentation_id: string;
  content_id: string;
  display_order?: number;
  presentation_notes?: string | null;
}

export interface UpdatePresentationItemInput {
  display_order?: number;
  presentation_notes?: string | null;
  client_approval_status?: PresentationItemApprovalStatus;
  client_feedback?: string | null;
  reviewed_at?: string | null;
}

export interface PresentationFilters {
  clientId: string | 'all';
  status: string | 'all';
  searchTerm: string;
}

export interface PresentationMetrics {
  totalCount: number;
  draftCount: number;
  sentCount: number;
  approvedCount: number;
  changesRequestedCount: number;
}
