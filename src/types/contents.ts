export type ContentFormat =
  | 'feed_single'
  | 'carousel'
  | 'reels'
  | 'story';

export const FORMAT_LABELS: Record<string, string> = {
  feed_single: 'Post Estático',
  carousel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
};

export function getFormatLabel(format?: string | null): string {
  if (!format) return '';
  const key = format.toLowerCase().trim();
  return FORMAT_LABELS[key] || format;
}

export type EditorialStatus =
  | 'draft'
  | 'in_production'
  | 'review'
  | 'client_review'
  | 'approved'
  | 'cancelled';

export type PrimaryChannel =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'blog'
  | 'whatsapp'
  | 'other';

export type FunnelStage =
  | 'topo'
  | 'meio'
  | 'fundo'
  | 'pos_venda';

export const PRIMARY_CHANNELS: { value: PrimaryChannel; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'blog', label: 'Blog / Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Outro' },
];

export const PRIMARY_CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  blog: 'Blog / Site',
  whatsapp: 'WhatsApp',
  other: 'Outro',
};

export const CHANNEL_LABELS = PRIMARY_CHANNEL_LABELS;

export function getPrimaryChannelLabel(channel?: string | null): string {
  if (!channel) return '';
  const key = channel.toLowerCase().trim();
  return PRIMARY_CHANNEL_LABELS[key] || channel;
}

export const FUNNEL_STAGES: { value: FunnelStage; label: string }[] = [
  { value: 'topo', label: 'Topo de Funil (Atração)' },
  { value: 'meio', label: 'Meio de Funil (Nutrição / Consideração)' },
  { value: 'fundo', label: 'Fundo de Funil (Conversão / Venda)' },
  { value: 'pos_venda', label: 'Pós-Venda / Retenção' },
];

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  topo: 'Topo de Funil (Atração)',
  meio: 'Meio de Funil (Nutrição)',
  fundo: 'Fundo de Funil (Conversão)',
  pos_venda: 'Pós-Venda / Retenção',
  tofu: 'Topo de Funil (Atração)',
  mofu: 'Meio de Funil (Nutrição)',
  bofu: 'Fundo de Funil (Conversão)',
  retention: 'Pós-Venda / Retenção',
};

export function getFunnelStageLabel(stage?: string | null): string {
  if (!stage) return '';
  const key = stage.toLowerCase().trim();
  return FUNNEL_STAGE_LABELS[key] || stage;
}

export type ContentFormatFilter = 'all' | ContentFormat;
export type EditorialStatusFilter = 'all' | EditorialStatus;

export interface ContentClientRelation {
  id: string;
  name: string;
  commercial_name?: string | null;
  status: string;
  logo_url?: string | null;
}

export interface ContentProfileRelation {
  id: string;
  full_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string;
}

export interface Content {
  id: string;
  client_id: string;
  internal_title: string;
  format: ContentFormat;
  primary_channel?: string | null;
  goal?: string | null;
  pillar?: string | null;
  funnel_stage?: string | null;
  copy?: string | null;
  script?: string | null;
  editorial_status: EditorialStatus;
  planned_date?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  caption?: string | null;
  visual_copy?: string | null;
  scheduled_date?: string | null;
  published_at?: string | null;
  // Joined relations
  client?: ContentClientRelation | null;
  assigned_profile?: ContentProfileRelation | null;
}

export interface CreateContentInput {
  client_id: string;
  internal_title: string;
  format: ContentFormat;
  primary_channel?: string | null;
  goal?: string | null;
  pillar?: string | null;
  funnel_stage?: string | null;
  copy?: string | null;
  visual_copy?: string | null;
  caption?: string | null;
  script?: string | null;
  planned_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  editorial_status?: EditorialStatus;
}

export interface UpdateContentInput {
  internal_title?: string;
  format?: ContentFormat;
  primary_channel?: string | null;
  goal?: string | null;
  pillar?: string | null;
  funnel_stage?: string | null;
  copy?: string | null;
  visual_copy?: string | null;
  caption?: string | null;
  script?: string | null;
  planned_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  editorial_status?: EditorialStatus;
  client_id?: string;
}

export interface ContentFilters {
  clientId: string | 'all';
  format: ContentFormatFilter;
  status: EditorialStatusFilter;
  searchTerm: string;
}

export interface ContentMetrics {
  totalCount: number;
  draftCount: number;
  inProductionCount: number;
  inReviewCount: number; // review + client_review
  approvedCount: number;
  cancelledCount: number;
}
