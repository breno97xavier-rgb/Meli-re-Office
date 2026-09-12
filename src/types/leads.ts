export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';

export type LeadType = 'business' | 'self_employed';

export type LeadServiceInterest =
  | 'social_media'
  | 'paid_traffic'
  | 'website_portfolio'
  | 'branding_positioning'
  | 'full_strategy'
  | 'not_sure';

export type LeadCurrentSituation =
  | 'not_started'
  | 'in_house'
  | 'active_agency_or_freelancer'
  | 'past_experience'
  | 'wants_improvement'
  | 'evaluating_options';

export type LeadObjective =
  | 'attract_clients'
  | 'brand_perception'
  | 'organize_communication'
  | 'increase_conversion'
  | 'repositioning'
  | 'launch_or_rebrand'
  | 'other';

export type PreferredCallPeriod = 'morning' | 'afternoon';

export type PreferredContact = 'whatsapp' | 'phone' | 'email' | string;

export type LeadSource =
  | 'website'
  | 'meta_ads'
  | 'google_ads'
  | 'instagram'
  | 'referral'
  | 'prospecting'
  | 'whatsapp'
  | 'other'
  | string;

// Tipos legados mantidos para compatibilidade com registros históricos
export type LeadService =
  | 'social_media'
  | 'paid_traffic'
  | 'website'
  | 'branding'
  | 'not_sure'
  | string;

export type BusinessStage =
  | 'starting'
  | 'needs_structure'
  | 'has_presence'
  | 'professionalizing'
  | string;

export interface Lead {
  id: string;
  created_at: string;
  updated_at?: string | null;
  name: string;
  business_name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  status: LeadStatus;
  assigned_to?: string | null;

  // Novos campos estruturados do Briefing
  lead_type?: LeadType | null;
  segment_or_profession?: string | null;
  website_or_instagram?: string | null;
  notes?: string | null;
  services_interest?: LeadServiceInterest[] | null;
  current_situation?: LeadCurrentSituation[] | null;
  objectives?: LeadObjective[] | null;
  preferred_contact?: PreferredContact | null;
  preferred_call_period?: PreferredCallPeriod | null;

  // Rastreabilidade e UTMs
  source?: LeadSource | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
  landing_url?: string | null;
  metadata?: Record<string, unknown> | null;

  // Campos legados (compatibilidade histórica)
  service?: LeadService | null;
  business_stage?: BusinessStage | null;
  message?: string | null;
}

export interface LeadCounters {
  total: number;
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
}

