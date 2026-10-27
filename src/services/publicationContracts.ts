import { PUBLICATION_CHANNELS, PUBLICATION_STATUSES } from '../types/publications';
import type { PublicationInput } from '../types/publications';

export function safePublicationUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password && url.href.length <= 2000 ? url.href : null;
  } catch { return null; }
}

export function validatePublication(input: PublicationInput): PublicationInput {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.content_id)) throw new Error('Selecione uma peça editorial válida.');
  if (!Object.hasOwn(PUBLICATION_CHANNELS, input.channel) || !Object.hasOwn(PUBLICATION_STATUSES, input.status)) throw new Error('Canal ou status inválido.');
  const date = (value: string | null) => {
    if (!value) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Informe data e horário válidos.');
    if (new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10) !== value.slice(0,10)) throw new Error('Informe uma data existente.');
    return new Date(value).toISOString();
  };
  const scheduled_for = date(input.scheduled_for), published_at = date(input.published_at);
  if (input.status === 'scheduled' && !scheduled_for) throw new Error('Informe a data prevista para a programação manual.');
  if (input.status === 'published' && !published_at) throw new Error('Informe quando a publicação foi realizada.');
  const post_url = safePublicationUrl(input.post_url);
  if (input.post_url?.trim() && !post_url) throw new Error('Informe um link HTTPS válido da publicação, sem credenciais.');
  if (input.channel_specific_copy !== null && typeof input.channel_specific_copy !== 'string') throw new Error('Texto específico inválido.');
  const copy = input.channel_specific_copy?.trim() || null;
  if (copy && copy.length > 20000) throw new Error('O texto específico deve ter até 20 mil caracteres.');
  return { content_id: input.content_id, channel: input.channel, status: input.status, scheduled_for, published_at, post_url, channel_specific_copy: copy };
}
export function publicationLocalTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value), pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function publicationUtcTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || publicationLocalTime(date.toISOString()) !== value) throw new Error('Confira a data e o horário no seu fuso.');
  return date.toISOString();
}
