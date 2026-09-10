import { supabase } from '../lib/supabase';
import {
  Presentation,
  PresentationItem,
  CreatePresentationInput,
  UpdatePresentationInput,
  UpdatePresentationItemInput,
} from '../types/presentations';
import { Content } from '../types/contents';
import { ContentAsset } from '../types/contentAssets';
import { fetchContentAssets } from './contentAssetsService';

export function formatPresentationError(error: unknown): string {
  if (!error) return 'Ocorreu um erro desconhecido.';
  const errObj = error as { message?: string; details?: string; hint?: string; code?: string };
  const msg =
    typeof error === 'string'
      ? error
      : errObj.message || errObj.details || '';
  const lowerMsg = msg.toLowerCase();

  console.error('[presentationsService] Error detail:', {
    code: errObj.code,
    message: errObj.message,
    details: errObj.details,
    hint: errObj.hint,
  });

  if (lowerMsg.includes('unique constraint') || lowerMsg.includes('presentation_items_presentation_id_content_id_key') || lowerMsg.includes('duplicate key')) {
    return 'Este conteúdo já foi adicionado a esta apresentação.';
  }
  if (lowerMsg.includes('violates foreign key constraint') || lowerMsg.includes('client_id')) {
    return 'Cliente associado inválido ou não encontrado.';
  }
  if (lowerMsg.includes('content_id') && lowerMsg.includes('foreign key')) {
    return 'Conteúdo inválido ou não encontrado.';
  }
  if (lowerMsg.includes('check constraint')) {
    return `Validação de status/dados falhou: ${errObj.message || 'Verifique os dados informados.'}`;
  }
  if (lowerMsg.includes('auth_required') || lowerMsg.includes('permission denied') || errObj.code === '42501') {
    return 'Autenticação necessária para esta operação.';
  }
  return msg || 'Erro ao processar operação com apresentações.';
}

function normalizePresentation(item: unknown): Presentation {
  if (!item || typeof item !== 'object') return item as Presentation;
  const row = item as Record<string, unknown>;
  const client = Array.isArray(row.client)
    ? row.client[0] || null
    : row.client || null;

  return {
    ...row,
    client,
  } as unknown as Presentation;
}

function normalizeResolvedContent(rawContent: unknown): Content | null {
  if (!rawContent || typeof rawContent !== 'object') return null;
  const contentObj = Array.isArray(rawContent) ? rawContent[0] : rawContent;
  if (!contentObj || typeof contentObj !== 'object') return null;

  const row = contentObj as Record<string, unknown>;
  const client = Array.isArray(row.client) ? row.client[0] || null : row.client || null;

  return {
    ...row,
    client,
  } as unknown as Content;
}

/**
 * Fetches all presentations, optionally filtered by client_id.
 * Also retrieves the total count of items per presentation.
 */
export async function fetchPresentations(clientId?: string): Promise<Presentation[]> {
  try {
    let query = supabase
      .from('presentations')
      .select(`
        id,
        client_id,
        title,
        description,
        status,
        round_number,
        sent_at,
        created_by,
        created_at,
        updated_at,
        client:clients(
          id,
          name,
          commercial_name,
          status,
          logo_url
        )
      `)
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching presentations:', error);
      throw new Error(formatPresentationError(error));
    }

    const presentations = ((data || []) as unknown[]).map(normalizePresentation);

    // Fetch presentation item counts in parallel to enrich the list
    if (presentations.length > 0) {
      const presentationIds = presentations.map((p) => p.id);
      const { data: itemsData } = await supabase
        .from('presentation_items')
        .select('presentation_id')
        .in('presentation_id', presentationIds);

      if (itemsData) {
        const countMap: Record<string, number> = {};
        for (const item of itemsData) {
          countMap[item.presentation_id] = (countMap[item.presentation_id] || 0) + 1;
        }
        for (const p of presentations) {
          p.items_count = countMap[p.id] || 0;
        }
      }
    }

    return presentations;
  } catch (err: unknown) {
    console.error('fetchPresentations exception:', err);
    throw new Error(formatPresentationError(err));
  }
}

/**
 * Fetches a single presentation by its ID with client relation.
 */
export async function fetchPresentationById(presentationId: string): Promise<Presentation | null> {
  if (!presentationId) return null;

  try {
    const { data, error } = await supabase
      .from('presentations')
      .select(`
        id,
        client_id,
        title,
        description,
        status,
        round_number,
        sent_at,
        created_by,
        created_at,
        updated_at,
        client:clients(
          id,
          name,
          commercial_name,
          status,
          logo_url
        )
      `)
      .eq('id', presentationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching presentation by id:', error);
      throw new Error(formatPresentationError(error));
    }

    return normalizePresentation(data);
  } catch (err: unknown) {
    console.error('fetchPresentationById exception:', err);
    throw new Error(formatPresentationError(err));
  }
}

/**
 * Creates a new presentation record.
 */
export async function createPresentation(input: CreatePresentationInput): Promise<Presentation> {
  if (!input.client_id) {
    throw new Error('O cliente é obrigatório para criar uma apresentação.');
  }
  if (!input.title || !input.title.trim()) {
    throw new Error('O título da apresentação é obrigatório.');
  }

  const payload = {
    client_id: input.client_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    round_number: input.round_number && input.round_number > 0 ? input.round_number : 1,
    status: input.status || 'draft',
  };

  const { data, error } = await supabase
    .from('presentations')
    .insert([payload])
    .select(`
      id,
      client_id,
      title,
      description,
      status,
      round_number,
      sent_at,
      created_by,
      created_at,
      updated_at,
      client:clients(
        id,
        name,
        commercial_name,
        status,
        logo_url
      )
    `)
    .single();

  if (error) {
    console.error('Error creating presentation:', error);
    throw new Error(formatPresentationError(error));
  }

  return normalizePresentation(data);
}

/**
 * Updates an existing presentation's header/metadata.
 */
export async function updatePresentation(
  id: string,
  input: UpdatePresentationInput
): Promise<Presentation> {
  if (!id) throw new Error('ID da apresentação não informado.');

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.round_number !== undefined) payload.round_number = input.round_number;
  if (input.status !== undefined) payload.status = input.status;
  if (input.sent_at !== undefined) payload.sent_at = input.sent_at;

  const { data, error } = await supabase
    .from('presentations')
    .update(payload)
    .eq('id', id)
    .select(`
      id,
      client_id,
      title,
      description,
      status,
      round_number,
      sent_at,
      created_by,
      created_at,
      updated_at,
      client:clients(
        id,
        name,
        commercial_name,
        status,
        logo_url
      )
    `)
    .single();

  if (error) {
    console.error('Error updating presentation:', error);
    throw new Error(formatPresentationError(error));
  }

  return normalizePresentation(data);
}

/**
 * Deletes a presentation and its items.
 */
export async function deletePresentation(id: string): Promise<void> {
  if (!id) throw new Error('ID da apresentação não informado.');

  // 1. Delete items first
  await supabase.from('presentation_items').delete().eq('presentation_id', id);

  // 2. Delete presentation
  const { error } = await supabase.from('presentations').delete().eq('id', id);

  if (error) {
    console.error('Error deleting presentation:', error);
    throw new Error(formatPresentationError(error));
  }
}

/**
 * Fetches all presentation items for a given presentation,
 * resolving the referenced Content and its current ContentAssets.
 */
export async function fetchPresentationItems(presentationId: string): Promise<PresentationItem[]> {
  if (!presentationId) return [];

  try {
    const { data, error } = await supabase
      .from('presentation_items')
      .select(`
        id,
        presentation_id,
        content_id,
        display_order,
        presentation_notes,
        client_approval_status,
        client_feedback,
        reviewed_at,
        created_at,
        content:contents(
          id,
          client_id,
          internal_title,
          format,
          primary_channel,
          goal,
          pillar,
          funnel_stage,
          copy,
          script,
          caption,
          visual_copy,
          editorial_status,
          planned_date,
          scheduled_date,
          published_at,
          approved_at,
          notes,
          created_at,
          updated_at,
          client:clients(
            id,
            name,
            commercial_name,
            logo_url,
            status
          )
        )
      `)
      .eq('presentation_id', presentationId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching presentation items:', error);
      throw new Error(formatPresentationError(error));
    }

    const items: PresentationItem[] = [];

    for (const row of (data || []) as Record<string, unknown>[]) {
      const resolvedContent = normalizeResolvedContent(row.content);

      let assets: ContentAsset[] = [];
      if (row.content_id) {
        try {
          const allAssets = await fetchContentAssets(row.content_id as string);
          assets = allAssets.filter((a) => a.is_current);
        } catch (assetErr) {
          console.warn(`Could not fetch assets for content ${row.content_id}:`, assetErr);
        }
      }

      items.push({
        id: row.id as string,
        presentation_id: row.presentation_id as string,
        content_id: row.content_id as string,
        display_order: typeof row.display_order === 'number' ? row.display_order : 0,
        presentation_notes: (row.presentation_notes as string) || null,
        client_approval_status: (row.client_approval_status as string) || 'pending',
        client_feedback: (row.client_feedback as string) || null,
        reviewed_at: (row.reviewed_at as string) || null,
        created_at: row.created_at as string,
        content: resolvedContent,
        assets,
      });
    }

    return items;
  } catch (err: unknown) {
    console.error('fetchPresentationItems exception:', err);
    throw new Error(formatPresentationError(err));
  }
}

/**
 * Adds a single content to a presentation.
 * Ensures the content is not already present and calculates display_order.
 */
export async function addContentToPresentation(
  presentationId: string,
  contentId: string,
  displayOrder?: number,
  presentationNotes?: string
): Promise<PresentationItem> {
  if (!presentationId) throw new Error('ID da apresentação obrigatório.');
  if (!contentId) throw new Error('ID do conteúdo obrigatório.');

  // Check if already in presentation to provide user-friendly error
  const { data: existing } = await supabase
    .from('presentation_items')
    .select('id')
    .eq('presentation_id', presentationId)
    .eq('content_id', contentId)
    .maybeSingle();

  if (existing) {
    throw new Error('Este conteúdo já faz parte desta apresentação.');
  }

  let finalDisplayOrder = displayOrder;
  if (finalDisplayOrder === undefined) {
    const { data: items } = await supabase
      .from('presentation_items')
      .select('display_order')
      .eq('presentation_id', presentationId);

    if (items && items.length > 0) {
      const maxOrder = Math.max(...items.map((i) => i.display_order || 0));
      finalDisplayOrder = maxOrder + 1;
    } else {
      finalDisplayOrder = 0;
    }
  }

  const { data, error } = await supabase
    .from('presentation_items')
    .insert([
      {
        presentation_id: presentationId,
        content_id: contentId,
        display_order: finalDisplayOrder,
        presentation_notes: presentationNotes?.trim() || null,
        client_approval_status: 'pending',
      },
    ])
    .select(`
      id,
      presentation_id,
      content_id,
      display_order,
      presentation_notes,
      client_approval_status,
      client_feedback,
      reviewed_at,
      created_at,
      content:contents(
        id,
        client_id,
        internal_title,
        format,
        primary_channel,
        goal,
        pillar,
        funnel_stage,
        copy,
        script,
        caption,
        visual_copy,
        editorial_status,
        planned_date,
        scheduled_date,
        published_at,
        approved_at,
        notes,
        created_at,
        updated_at,
        client:clients(
          id,
          name,
          commercial_name,
          logo_url,
          status
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error adding content to presentation:', error);
    throw new Error(formatPresentationError(error));
  }

  const resolvedContent = normalizeResolvedContent(data.content);

  let assets: ContentAsset[] = [];
  try {
    const allAssets = await fetchContentAssets(contentId);
    assets = allAssets.filter((a) => a.is_current);
  } catch (assetErr) {
    console.warn('Could not fetch assets for newly added content:', assetErr);
  }

  return {
    id: data.id,
    presentation_id: data.presentation_id,
    content_id: data.content_id,
    display_order: data.display_order,
    presentation_notes: data.presentation_notes,
    client_approval_status: data.client_approval_status,
    client_feedback: data.client_feedback,
    reviewed_at: data.reviewed_at,
    created_at: data.created_at,
    content: resolvedContent,
    assets,
  };
}

/**
 * Adds multiple contents to a presentation in sequence.
 */
export async function addMultipleContentsToPresentation(
  presentationId: string,
  contentIds: string[]
): Promise<PresentationItem[]> {
  if (!presentationId) throw new Error('ID da apresentação obrigatório.');
  if (!contentIds || contentIds.length === 0) return [];

  const addedItems: PresentationItem[] = [];

  for (const contentId of contentIds) {
    try {
      const item = await addContentToPresentation(presentationId, contentId);
      addedItems.push(item);
    } catch (err) {
      console.warn(`Could not add content ${contentId} to presentation:`, err);
    }
  }

  return addedItems;
}

/**
 * Removes a presentation item from the presentation.
 * DOES NOT DELETE the original content in contents table.
 */
export async function removeContentFromPresentation(itemId: string): Promise<void> {
  if (!itemId) throw new Error('ID do item não informado.');

  const { error } = await supabase
    .from('presentation_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error removing content from presentation:', error);
    throw new Error(formatPresentationError(error));
  }
}

/**
 * Updates a presentation item's presentation_notes or client_approval_status.
 * (Note: presentation_notes does not touch Content.notes).
 */
export async function updatePresentationItem(
  itemId: string,
  input: UpdatePresentationItemInput
): Promise<PresentationItem> {
  if (!itemId) throw new Error('ID do item não informado.');

  const payload: Record<string, unknown> = {};
  if (input.presentation_notes !== undefined) {
    payload.presentation_notes = input.presentation_notes?.trim() || null;
  }
  if (input.client_approval_status !== undefined) {
    payload.client_approval_status = input.client_approval_status;
  }
  if (input.display_order !== undefined) {
    payload.display_order = input.display_order;
  }
  if (input.client_feedback !== undefined) {
    payload.client_feedback = input.client_feedback;
  }
  if (input.reviewed_at !== undefined) {
    payload.reviewed_at = input.reviewed_at;
  }

  const { data, error } = await supabase
    .from('presentation_items')
    .update(payload)
    .eq('id', itemId)
    .select(`
      id,
      presentation_id,
      content_id,
      display_order,
      presentation_notes,
      client_approval_status,
      client_feedback,
      reviewed_at,
      created_at,
      content:contents(
        id,
        client_id,
        internal_title,
        format,
        primary_channel,
        goal,
        pillar,
        funnel_stage,
        copy,
        script,
        caption,
        visual_copy,
        editorial_status,
        planned_date,
        scheduled_date,
        published_at,
        approved_at,
        notes,
        created_at,
        updated_at,
        client:clients(
          id,
          name,
          commercial_name,
          logo_url,
          status
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error updating presentation item:', error);
    throw new Error(formatPresentationError(error));
  }

  const resolvedContent = normalizeResolvedContent(data.content);

  let assets: ContentAsset[] = [];
  if (data.content_id) {
    try {
      const allAssets = await fetchContentAssets(data.content_id);
      assets = allAssets.filter((a) => a.is_current);
    } catch (assetErr) {
      console.warn('Could not fetch assets for updated item:', assetErr);
    }
  }

  return {
    id: data.id,
    presentation_id: data.presentation_id,
    content_id: data.content_id,
    display_order: data.display_order,
    presentation_notes: data.presentation_notes,
    client_approval_status: data.client_approval_status,
    client_feedback: data.client_feedback,
    reviewed_at: data.reviewed_at,
    created_at: data.created_at,
    content: resolvedContent,
    assets,
  };
}

/**
 * Reorders presentation items by updating display_order sequentially.
 */
export async function reorderPresentationItems(
  presentationId: string,
  orderedItemIds: string[]
): Promise<void> {
  if (!presentationId || !orderedItemIds || orderedItemIds.length === 0) return;

  const updatePromises = orderedItemIds.map((itemId, index) =>
    supabase
      .from('presentation_items')
      .update({ display_order: index })
      .eq('id', itemId)
      .eq('presentation_id', presentationId)
  );

  const results = await Promise.all(updatePromises);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error('Error reordering presentation items:', failed.error);
    throw new Error(formatPresentationError(failed.error));
  }
}
