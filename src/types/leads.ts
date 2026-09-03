export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';

export type LeadService = 'social_media' | 'paid_traffic' | 'website' | 'branding' | 'not_sure' | string;

export type BusinessStage = 'starting' | 'needs_structure' | 'has_presence' | 'professionalizing' | string;

export type PreferredContact = 'whatsapp' | 'email' | string;

export type LeadSource = 'website' | 'prospecting' | 'referral' | 'instagram' | 'whatsapp' | string;

export interface Lead {
  id: string;
  created_at: string;
  updated_at?: string | null;
  name: string;
  business_name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  service?: LeadService | null;
  business_stage?: BusinessStage | null;
  message?: string | null;
  preferred_contact?: PreferredContact | null;
  status: LeadStatus;
  source?: LeadSource | null;
  metadata?: Record<string, unknown> | null;
  assigned_to?: string | null;
}

export interface LeadCounters {
  total: number;
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
}
