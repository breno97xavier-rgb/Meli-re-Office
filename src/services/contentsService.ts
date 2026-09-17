import { supabase } from '../lib/supabase';
import {
  Content,
  ContentFormat,
  EditorialStatus,
  CreateContentInput,
  UpdateContentInput,
  ContentProfileRelation,
} from '../types/contents';

const VALID_FORMATS: ContentFormat[] = ['feed_single', 'carousel', 'reels', 'story'];
const VALID_STATUSES: EditorialStatus[] = [
  'draft',
  'in_production',
  'review',
  'client_review',
  'approved',
  'cancelled',
];

export function formatContentError(error: unknown): string {
  if (!error) return 'Ocorreu um erro desconhecido.';
  const errObj = error as { message?: string; details?: string; hint?: string; code?: string };
  const msg =
    typeof error === 'string'
      ? error
      : errObj.message || errObj.details || '';
  const lowerMsg = msg.toLowerCase();

  // Log complete diagnostic error object without losing details
  console.error('[contentsService] Error detail:', {
    code: errObj.code,
    message: errObj.message,
    details: errObj.details,
    hint: errObj.hint,
  });

  if (lowerMsg.includes('editorial_plan_client_mismatch')) {
    return 'O ciclo de planejamento selecionado não pertence ao cliente informado.';
  }
  if (lowerMsg.includes('pillar_client_mismatch')) {
    return 'O pilar selecionado não pertence ao cliente informado.';
  }
  if (lowerMsg.includes('campaign_client_mismatch')) {
    return 'A campanha selecionada não pertence ao cliente informado.';
  }
  if (lowerMsg.includes('contents_editorial_plan_id_fkey') || (lowerMsg.includes('editorial_plan') && lowerMsg.includes('foreign key'))) {
    return 'Plano editorial inválido ou inexistente.';
  }
  if (lowerMsg.includes('contents_pillar_id_fkey') || (lowerMsg.includes('pillar_id') && lowerMsg.includes('foreign key'))) {
    return 'Pilar editorial inválido ou inexistente.';
  }
  if (lowerMsg.includes('contents_campaign_id_fkey') || (lowerMsg.includes('campaign_id') && lowerMsg.includes('foreign key'))) {
    return 'Campanha inválida ou inexistente.';
  }
  if (lowerMsg.includes('violates foreign key constraint') || lowerMsg.includes('client_id')) {
    return 'Cliente inválido ou não encontrado.';
  }
  if (lowerMsg.includes('contents_format_check') || (lowerMsg.includes('format') && lowerMsg.includes('check constraint'))) {
    return 'Formato inválido. Formatos aceitos: feed_single, carousel, reels, story.';
  }
  if (lowerMsg.includes('contents_editorial_status_check') || (lowerMsg.includes('editorial_status') && lowerMsg.includes('check constraint'))) {
    return 'Status editorial inválido. Status aceitos: draft, in_production, review, client_review, approved, cancelled.';
  }
  if (lowerMsg.includes('contents_funnel_stage_check') || (lowerMsg.includes('funnel_stage') && lowerMsg.includes('check constraint'))) {
    return 'Etapa do funil inválida.';
  }
  if (lowerMsg.includes('contents_primary_channel_check') || (lowerMsg.includes('primary_channel') && lowerMsg.includes('check constraint'))) {
    return 'Canal principal inválido.';
  }
  if (lowerMsg.includes('check constraint')) {
    return `Validação de dados falhou: ${errObj.message || 'Verifique os campos informados.'}`;
  }
  if (lowerMsg.includes('auth_required') || lowerMsg.includes('permission denied') || errObj.code === '42501') {
    return 'Autenticação necessária para esta operação.';
  }
  return msg || 'Erro ao processar operação com conteúdo.';
}

function normalizeContent(item: unknown): Content {
  if (!item || typeof item !== 'object') return item as Content;
  const row = item as Record<string, unknown>;
  const client = Array.isArray(row.client)
    ? row.client[0] || null
    : row.client || null;
  const assigned_profile = Array.isArray(row.assigned_profile)
    ? row.assigned_profile[0] || null
    : row.assigned_profile || null;
  const editorial_plan = Array.isArray(row.editorial_plan)
    ? row.editorial_plan[0] || null
    : row.editorial_plan || null;
  const client_pillar = Array.isArray(row.client_pillar)
    ? row.client_pillar[0] || null
    : row.client_pillar || null;
  const campaign = Array.isArray(row.campaign)
    ? row.campaign[0] || null
    : row.campaign || null;

  return {
    ...row,
    client,
    assigned_profile,
    editorial_plan,
    client_pillar,
    campaign,
  } as unknown as Content;
}

export async function fetchContents(clientId?: string): Promise<Content[]> {
  try {
    let query = supabase
      .from('contents')
      .select(`
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
        editorial_status,
        planned_date,
        approved_at,
        notes,
        created_by,
        assigned_to,
        created_at,
        updated_at,
        caption,
        visual_copy,
        scheduled_date,
        published_at,
        editorial_plan_id,
        pillar_id,
        campaign_id,
        client:clients(
          id,
          name,
          commercial_name,
          status,
          logo_url
        ),
        assigned_profile:profiles!contents_assigned_to_fkey(
          id,
          full_name,
          display_name,
          avatar_url,
          role
        ),
        editorial_plan:editorial_plans(
          id,
          title,
          status,
          start_date,
          end_date
        ),
        client_pillar:client_pillars(
          id,
          name,
          is_active
        ),
        campaign:campaigns(
          id,
          name,
          status,
          start_date,
          end_date
        )
      `)
      .order('planned_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (!error && data) {
      return (data as unknown[]).map(normalizeContent);
    }

    if (error) {
      console.warn('Query with relational embeds returned error, falling back to manual join:', error);
    }
  } catch (err) {
    console.warn('Fallback error fetching contents with relations:', err);
  }

  // Fallback query if relation embed fails
  let query = supabase
    .from('contents')
    .select('*')
    .order('planned_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching contents (fallback):', error);
    throw new Error(formatContentError(error));
  }

  const contentsList = (data || []) as Content[];

  // Fetch client details manually to ensure client info is always present
  const clientIds = Array.from(new Set(contentsList.map((c) => c.client_id).filter(Boolean)));
  if (clientIds.length > 0) {
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, commercial_name, status, logo_url')
        .in('id', clientIds);

      if (clientsData) {
        const clientMap = new Map(clientsData.map((cl) => [cl.id, cl]));
        contentsList.forEach((c) => {
          c.client = clientMap.get(c.client_id) || null;
        });
      }
    } catch (clErr) {
      console.warn('Could not populate clients in fallback:', clErr);
    }
  }

  return contentsList;
}

export async function fetchContentById(contentId: string): Promise<Content> {
  const { data, error } = await supabase
    .from('contents')
    .select(`
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
      editorial_status,
      planned_date,
      approved_at,
      notes,
      created_by,
      assigned_to,
      created_at,
      updated_at,
      caption,
      visual_copy,
      scheduled_date,
      published_at,
      editorial_plan_id,
      pillar_id,
      campaign_id,
      client:clients(
        id,
        name,
        commercial_name,
        status,
        logo_url
      ),
      assigned_profile:profiles!contents_assigned_to_fkey(
        id,
        full_name,
        display_name,
        avatar_url,
        role
      ),
      editorial_plan:editorial_plans(
        id,
        title,
        status,
        start_date,
        end_date
      ),
      client_pillar:client_pillars(
        id,
        name,
        is_active
      ),
      campaign:campaigns(
        id,
        name,
        status,
        start_date,
        end_date
      )
    `)
    .eq('id', contentId)
    .single();

  if (error) {
    console.error('Error fetching content by id:', error);
    throw new Error(formatContentError(error));
  }

  return normalizeContent(data);
}

export async function createContent(input: CreateContentInput): Promise<Content> {
  if (!input.client_id) {
    throw new Error('O cliente é obrigatório para cadastrar o conteúdo.');
  }
  if (!input.internal_title || !input.internal_title.trim()) {
    throw new Error('O título interno do conteúdo é obrigatório.');
  }
  if (!input.format || !VALID_FORMATS.includes(input.format)) {
    throw new Error(`Formato inválido (${input.format}). Formatos aceitos: ${VALID_FORMATS.join(', ')}.`);
  }

  const editorial_status = input.editorial_status && VALID_STATUSES.includes(input.editorial_status)
    ? input.editorial_status
    : 'draft';

  const primary_channel = input.primary_channel
    ? input.primary_channel.trim().toLowerCase()
    : 'instagram';

  const funnel_stage = input.funnel_stage
    ? input.funnel_stage.trim().toLowerCase()
    : null;

  const payload: Record<string, unknown> = {
    client_id: input.client_id,
    internal_title: input.internal_title.trim(),
    format: input.format,
    primary_channel,
    goal: input.goal?.trim() || null,
    pillar: input.pillar?.trim() || null,
    funnel_stage,
    copy: input.copy?.trim() || null,
    caption: input.caption?.trim() || null,
    script: input.script?.trim() || null,
    planned_date: input.planned_date || null,
    notes: input.notes?.trim() || null,
    assigned_to: input.assigned_to || null,
    editorial_status,
    editorial_plan_id: input.editorial_plan_id ? input.editorial_plan_id.trim() : null,
    pillar_id: input.pillar_id ? input.pillar_id.trim() : null,
    campaign_id: input.campaign_id ? input.campaign_id.trim() : null,
  };

  if (input.visual_copy !== undefined && input.visual_copy !== null) {
    payload.visual_copy = input.visual_copy.trim() || null;
  }

  const { data, error } = await supabase
    .from('contents')
    .insert([payload])
    .select(`
      *,
      client:clients(
        id,
        name,
        commercial_name,
        status,
        logo_url
      ),
      assigned_profile:profiles!contents_assigned_to_fkey(
        id,
        full_name,
        display_name,
        avatar_url,
        role
      ),
      editorial_plan:editorial_plans(
        id,
        title,
        status,
        start_date,
        end_date
      ),
      client_pillar:client_pillars(
        id,
        name,
        is_active
      ),
      campaign:campaigns(
        id,
        name,
        status,
        start_date,
        end_date
      )
    `)
    .single();

  if (error) {
    console.error('Error creating content:', error);
    throw new Error(formatContentError(error));
  }

  return normalizeContent(data);
}

export async function updateContent(
  contentId: string,
  input: UpdateContentInput
): Promise<Content> {
  if (!contentId) {
    throw new Error('ID do conteúdo não informado.');
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.internal_title !== undefined) payload.internal_title = input.internal_title.trim();
  if (input.format !== undefined) {
    if (!VALID_FORMATS.includes(input.format)) {
      throw new Error(`Formato inválido (${input.format}).`);
    }
    payload.format = input.format;
  }
  if (input.editorial_status !== undefined) {
    if (!VALID_STATUSES.includes(input.editorial_status)) {
      throw new Error(`Status editorial inválido (${input.editorial_status}).`);
    }
    payload.editorial_status = input.editorial_status;
  }
  if (input.primary_channel !== undefined) {
    payload.primary_channel = input.primary_channel?.trim().toLowerCase() || null;
  }
  if (input.goal !== undefined) payload.goal = input.goal?.trim() || null;
  if (input.pillar !== undefined) payload.pillar = input.pillar?.trim() || null;
  if (input.funnel_stage !== undefined) {
    payload.funnel_stage = input.funnel_stage?.trim().toLowerCase() || null;
  }
  if (input.copy !== undefined) payload.copy = input.copy?.trim() || null;
  if (input.visual_copy !== undefined) payload.visual_copy = input.visual_copy?.trim() || null;
  if (input.caption !== undefined) payload.caption = input.caption?.trim() || null;
  if (input.script !== undefined) payload.script = input.script?.trim() || null;
  if (input.planned_date !== undefined) payload.planned_date = input.planned_date || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to || null;
  if (input.client_id !== undefined) payload.client_id = input.client_id;
  if (input.editorial_plan_id !== undefined) {
    payload.editorial_plan_id = input.editorial_plan_id ? input.editorial_plan_id.trim() : null;
  }
  if (input.pillar_id !== undefined) {
    payload.pillar_id = input.pillar_id ? input.pillar_id.trim() : null;
  }
  if (input.campaign_id !== undefined) {
    payload.campaign_id = input.campaign_id ? input.campaign_id.trim() : null;
  }

  const { data, error } = await supabase
    .from('contents')
    .update(payload)
    .eq('id', contentId)
    .select(`
      *,
      client:clients(
        id,
        name,
        commercial_name,
        status,
        logo_url
      ),
      assigned_profile:profiles!contents_assigned_to_fkey(
        id,
        full_name,
        display_name,
        avatar_url,
        role
      ),
      editorial_plan:editorial_plans(
        id,
        title,
        status,
        start_date,
        end_date
      ),
      client_pillar:client_pillars(
        id,
        name,
        is_active
      ),
      campaign:campaigns(
        id,
        name,
        status,
        start_date,
        end_date
      )
    `)
    .single();

  if (error) {
    console.error('Error updating content:', error);
    throw new Error(formatContentError(error));
  }

  return normalizeContent(data);
}

export async function fetchTeamProfiles(): Promise<ContentProfileRelation[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, avatar_url, role')
      .order('full_name', { ascending: true });

    if (error) {
      console.warn('Could not fetch profiles for assignment:', error);
      return [];
    }

    return (data || []) as ContentProfileRelation[];
  } catch (err) {
    console.warn('Error fetching profiles:', err);
    return [];
  }
}
