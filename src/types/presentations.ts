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

/**
 * Canonical interface for public.presentation_access_links
 */
export interface PresentationAccessLink {
  id: string;
  presentation_id: string;
  token_hash: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  // Client-side computed properties
  token?: string | null;
  public_url?: string | null;
  is_active?: boolean;
}

export interface CreatePresentationAccessLinkResponse {
  id?: string;
  presentation_id?: string;
  token: string;
  public_url: string;
  created_at?: string;
  expires_at?: string | null;
  link?: PresentationAccessLink | null;
}

export type PublicPresentationErrorType =
  | 'INVALID_TOKEN'
  | 'REVOKED_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';

export interface PublicPresentationError {
  type: PublicPresentationErrorType;
  title: string;
  message: string;
  actionHint?: string;
  rawError?: unknown;
}

export interface PublicPresentationData extends Presentation {
  items: PresentationItem[];
  access_info?: {
    expires_at?: string | null;
    created_at?: string;
  };
}

