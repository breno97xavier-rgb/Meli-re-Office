// Publication is a distribution record for an existing editorial Content.
// It does not own/duplicate the media, strategy or approval workflow.
export const PUBLICATION_CHANNELS = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  tiktok: 'TikTok', youtube: 'YouTube', blog: 'Blog / site', newsletter: 'Newsletter',
} as const;
export const PUBLICATION_STATUSES = {
  planned: 'Planejada', scheduled: 'Programada', published: 'Publicada',
  failed: 'Falha', cancelled: 'Cancelada',
} as const;
export type PublicationChannel = keyof typeof PUBLICATION_CHANNELS;
export type PublicationStatus = keyof typeof PUBLICATION_STATUSES;
export interface Publication {
  id: string;
  content_id: string;
  channel: PublicationChannel;
  status: PublicationStatus;
  scheduled_for: string | null;
  published_at: string | null;
  post_url: string | null;
  channel_specific_copy: string | null;
  metrics_cache: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
export interface PublicationInput {
  content_id: string;
  channel: PublicationChannel;
  status: PublicationStatus;
  scheduled_for: string | null;
  published_at: string | null;
  post_url: string | null;
  channel_specific_copy: string | null;
}
export interface PublicationPiece {
  id: string;
  internal_title: string;
  editorial_status: string;
  client_id: string;
  client: { id: string; name: string; commercial_name: string | null; workspace_id: string };
}
export interface PublicationRow extends Publication { content: PublicationPiece }
