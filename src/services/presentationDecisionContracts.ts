import type { PublicPresentationData, PresentationItem, Presentation } from '../types/presentations';
import type { Content } from '../types/contents';
import type { ContentAsset } from '../types/contentAssets';

/** Keep the existing UI vocabulary while respecting the current database enums. */
export function normalizeItemApprovalStatus(value: unknown): string {
  const status = typeof value === 'string' && value ? value : 'pending';
  return status === 'adjustments_requested' ? 'changes_requested' : status;
}

export function normalizePresentationStatus(value: unknown): string {
  const status = typeof value === 'string' && value ? value : 'sent';
  if (status === 'under_review') return 'in_review';
  if (status === 'approved_with_adjustments') return 'changes_requested';
  return status;
}

/** The public RPC nests metadata under presentation, with items/access beside it. */
export function unwrapPublicPresentationPayload(raw: unknown): Record<string, unknown> {
  const envelope = Array.isArray(raw) ? raw[0] : raw;
  if (!envelope || typeof envelope !== 'object') throw new Error('INVALID_DATA');
  const root = envelope as Record<string, unknown>;
  if (root.presentation && typeof root.presentation === 'object' && !Array.isArray(root.presentation)) {
    return {
      ...(root.presentation as Record<string, unknown>),
      items: root.items ?? [],
      access_info: root.access ?? root.access_info,
    };
  }
  return root;
}


export function normalizePublicPresentationData(raw: unknown): PublicPresentationData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('INVALID_DATA');
  }

  const root = unwrapPublicPresentationPayload(raw);

  // Normalize client
  let client = root.client;
  if (Array.isArray(client)) {
    client = client[0] || null;
  }

  // Normalize items / presentation_items
  const rawItems = (root.items || root.presentation_items || []) as unknown[];
  const items: PresentationItem[] = [];

  for (const rawItem of Array.isArray(rawItems) ? rawItems : []) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const itemObj = rawItem as Record<string, unknown>;

    // Normalize item content
    let content = itemObj.content;
    if (Array.isArray(content)) {
      content = content[0] || null;
    }
    if (content && typeof content === 'object') {
      const contentObj = content as Record<string, unknown>;
      let contentClient = contentObj.client;
      if (Array.isArray(contentClient)) {
        contentClient = contentClient[0] || null;
      }
      content = {
        ...contentObj,
        client: contentClient,
      };
    }

    // Normalize item assets
    const rawAssets = (itemObj.assets || itemObj.content_assets || []) as unknown[];
    const assets: ContentAsset[] = [];
    for (const rawAsset of Array.isArray(rawAssets) ? rawAssets : []) {
      if (!rawAsset || typeof rawAsset !== 'object') continue;
      assets.push(rawAsset as ContentAsset);
    }

    // Sort assets by display_order ASC
    assets.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    items.push({
      id: (itemObj.id as string) || '',
      presentation_id: (itemObj.presentation_id as string) || (root.id as string),
      content_id: (itemObj.content_id as string) || (content ? (content as Content).id : ''),
      display_order: typeof itemObj.display_order === 'number' ? itemObj.display_order : 0,
      presentation_notes: (itemObj.presentation_notes as string) || null,
      client_approval_status: normalizeItemApprovalStatus(itemObj.client_approval_status),
      client_feedback: (itemObj.client_feedback as string) || null,
      reviewed_at: (itemObj.reviewed_at as string) || null,
      created_at: (itemObj.created_at as string) || (root.created_at as string),
      content: (content as Content) || null,
      assets,
    });
  }

  // Sort items by display_order ASC
  items.sort((a, b) => a.display_order - b.display_order);

  return {
    id: (root.id as string) || '',
    client_id:
      (root.client_id as string) ||
      (client ? ((client as Record<string, unknown>).id as string) : ''),
    title: (root.title as string) || 'Apresentação de Conteúdos',
    description: (root.description as string) || null,
    status: normalizePresentationStatus(root.status),
    round_number: typeof root.round_number === 'number' ? root.round_number : 1,
    sent_at: (root.sent_at as string) || null,
    created_by: (root.created_by as string) || null,
    created_at: (root.created_at as string) || new Date().toISOString(),
    updated_at: (root.updated_at as string) || new Date().toISOString(),
    client: (client as Presentation['client']) || null,
    items_count: items.length,
    items,
    access_info: root.access_info as
      | { expires_at?: string | null; created_at?: string }
      | undefined,
  };
}
