import type { ContentFormat, PrimaryChannel } from './contents';

export interface EditorialDestination {
  channel: PrimaryChannel;
  profile: string;
}

export interface EditorialTemplateSlot {
  id: string;
  position: number;
  title: string;
  guidance: string;
  pillar_id: string | null;
  series_id: string | null;
  campaign_id: string | null;
  objective: string;
  funnel: string;
  format: ContentFormat | null;
  priority: 'main' | 'additional' | 'optional';
  recurrence: 'every_cycle' | 'alternate' | 'monthly' | 'manual';
  quantity: number;
  destinations: EditorialDestination[];
  is_active: boolean;
}

export interface EditorialTemplateDraft {
  id: string;
  client_id: string;
  name: string;
  position_count: number;
  notes: string;
  slots: EditorialTemplateSlot[];
  is_active: boolean;
  revision: number;
}

export interface EditorialTemplate extends EditorialTemplateDraft {
  created_at: string;
  updated_at: string;
}

export interface EditorialTemplateRevision {
  revision: number;
  snapshot: EditorialTemplate;
  changed_at: string;
}

export interface EditorialTemplateFilter {
  channel?: string;
  pillar_id?: string;
  series_id?: string;
  funnel?: string;
  format?: string;
  includeArchived?: boolean;
}
