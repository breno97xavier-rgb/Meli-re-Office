import { supabase } from '../lib/supabase';
import {
  ClientStrategy,
  ClientPillar,
  EditorialPlan,
  EditorialPlanPillar,
  EditorialPlanStatus,
  EditorialPlanMetrics,
  EditorialPlanPillarAllocationInput,
  GetEditorialPlansOptions,
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
  GetCampaignsOptions,
  UpdateClientStrategyInput,
  CreateClientPillarInput,
  UpdateClientPillarInput,
  CreateEditorialPlanInput,
  UpdateEditorialPlanInput,
} from '../types/planning';
import { PrimaryChannel } from '../types/contents';

const ALLOWED_PRIORITY_CHANNELS: PrimaryChannel[] = [
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'blog',
  'whatsapp',
  'other',
];

export function formatPlanningError(error: unknown): string {
  if (!error) return 'Ocorreu um erro desconhecido.';
  const errObj = error as { message?: string; details?: string; hint?: string; code?: string };
  const msg = typeof error === 'string' ? error : errObj.message || errObj.details || '';
  const lowerMsg = msg.toLowerCase();

  console.error('[planningService] Error detail:', {
    code: errObj.code,
    message: errObj.message,
    details: errObj.details,
    hint: errObj.hint,
  });

  if (
    errObj.code === '23505' &&
    (lowerMsg.includes('uq_client_pillars_client_lower_name') || lowerMsg.includes('client_pillars'))
  ) {
    return 'Já existe um pilar com este nome para este cliente.';
  }

  if (errObj.code === '23505' && lowerMsg.includes('uq_client_strategies_client_id')) {
    return 'Já existe uma estratégia cadastrada para este cliente.';
  }

  if (errObj.code === '23505' && lowerMsg.includes('uq_editorial_plan_pillars')) {
    return 'Este pilar já está associado a este plano editorial.';
  }

  if (lowerMsg.includes('check_client_strategies_priority_channels')) {
    return 'Um ou mais canais prioritários selecionados são inválidos.';
  }

  if (lowerMsg.includes('check_client_pillars_name_not_empty')) {
    return 'O nome do pilar não pode ser vazio.';
  }

  if (lowerMsg.includes('check_editorial_plans_title_not_empty')) {
    return 'O título do plano editorial não pode ser vazio.';
  }

  if (lowerMsg.includes('check_editorial_plans_dates')) {
    return 'A data final do plano deve ser igual ou posterior à data inicial.';
  }

  if (lowerMsg.includes('check_editorial_plans_target_posts')) {
    return 'A meta de conteúdos deve ser um número maior ou igual a zero.';
  }

  if (lowerMsg.includes('check_editorial_plans_status')) {
    return 'O status do plano editorial é inválido.';
  }

  if (lowerMsg.includes('check_campaigns_name_not_empty')) {
    return 'O nome da campanha não pode ser vazio.';
  }

  if (lowerMsg.includes('check_campaigns_dates')) {
    return 'A data final da campanha deve ser igual ou posterior à data inicial e requer uma data inicial válida.';
  }

  if (lowerMsg.includes('check_campaigns_status')) {
    return 'O status da campanha é inválido.';
  }

  if (
    lowerMsg.includes('contents_campaign_id_fkey') ||
    lowerMsg.includes('campanha possui conteúdos vinculados') ||
    (lowerMsg.includes('violates foreign key constraint') && lowerMsg.includes('contents'))
  ) {
    return 'Esta campanha possui conteúdos vinculados e não pode ser excluída. Arquive a campanha para preservar o histórico.';
  }

  if (lowerMsg.includes('uq_campaigns_id_client')) {
    return 'Inconsistência de cliente na campanha informada.';
  }

  if (lowerMsg.includes('check_editorial_plan_pillars_target')) {
    return 'A meta por pilar deve ser maior ou igual a zero.';
  }

  if (lowerMsg.includes('fk_plan_pillars_plan_client')) {
    return 'O plano editorial não pertence ao cliente informado.';
  }

  if (lowerMsg.includes('fk_plan_pillars_pillar_client')) {
    return 'Um ou mais pilares selecionados não pertencem ao cliente informado.';
  }

  if (lowerMsg.includes('pillar_client_mismatch')) {
    return 'O pilar selecionado não pertence ao cliente informado.';
  }

  if (lowerMsg.includes('editorial_plan_client_mismatch')) {
    return 'O plano editorial selecionado não pertence ao cliente informado.';
  }

  if (lowerMsg.includes('campaign_client_mismatch')) {
    return 'A campanha selecionada não pertence ao cliente informado.';
  }

  if (lowerMsg.includes('duplicate_pillar_allocation')) {
    return 'O payload contém alocações duplicadas para o mesmo pilar.';
  }

  if (lowerMsg.includes('inactive_pillar_not_allowed')) {
    return 'Não é permitido associar novos pilares inativos a este plano editorial.';
  }

  if (lowerMsg.includes('invalid_payload')) {
    return 'O formato das alocações de pilares é inválido.';
  }

  if (
    errObj.code === '42883' ||
    errObj.code === 'PGRST202' ||
    lowerMsg.includes('set_editorial_plan_pillars') && (lowerMsg.includes('not find') || lowerMsg.includes('does not exist'))
  ) {
    return 'A sincronização de pilares requer a RPC set_editorial_plan_pillars ainda não instalada no banco de dados.';
  }

  if (
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('auth_required') ||
    errObj.code === '42501'
  ) {
    return 'Permissão insuficiente para gerenciar o planejamento do cliente.';
  }

  return msg || 'Erro ao processar operação de planejamento.';
}

// ==============================================================================
// 1. ESTRATÉGIA DO CLIENTE (1:1)
// ==============================================================================

/**
 * Busca a estratégia-base de um cliente. Retorna null se não houver registro.
 */
export async function getClientStrategy(clientId: string): Promise<ClientStrategy | null> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório.');
  }

  const { data, error } = await supabase
    .from('client_strategies')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as ClientStrategy | null;
}

/**
 * Cria ou atualiza (UPSERT) a estratégia de um cliente de forma atômica,
 * preservando o created_by original em caso de edição.
 */
export async function upsertClientStrategy(
  clientId: string,
  input: UpdateClientStrategyInput
): Promise<ClientStrategy> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório para salvar a estratégia.');
  }

  // Sanitiza e valida priority_channels
  const sanitizedChannels = Array.isArray(input.priority_channels)
    ? Array.from(
        new Set(
          input.priority_channels.filter((ch) =>
            ALLOWED_PRIORITY_CHANNELS.includes(ch as PrimaryChannel)
          )
        )
      )
    : [];

  const basePayload: Record<string, unknown> = {
    positioning: input.positioning?.trim() || null,
    value_proposition: input.value_proposition?.trim() || null,
    target_audience: input.target_audience?.trim() || null,
    brand_voice_tone: input.brand_voice_tone?.trim() || null,
    communication_guidelines: input.communication_guidelines?.trim() || null,
    do_donts: input.do_donts?.trim() || null,
    business_goals: input.business_goals?.trim() || null,
    priority_channels: sanitizedChannels,
  };

  // 1. Verifica se a estratégia já existe para este cliente
  const { data: existing, error: fetchError } = await supabase
    .from('client_strategies')
    .select('id, created_by')
    .eq('client_id', clientId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(formatPlanningError(fetchError));
  }

  if (existing) {
    // Modo UPDATE: não altera created_by
    const { data: updated, error: updateError } = await supabase
      .from('client_strategies')
      .update(basePayload)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(formatPlanningError(updateError));
    }

    return updated as ClientStrategy;
  } else {
    // Modo INSERT: define created_by a partir do usuário autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertPayload = {
      ...basePayload,
      client_id: clientId,
      created_by: user?.id || null,
    };

    const { data: created, error: insertError } = await supabase
      .from('client_strategies')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      throw new Error(formatPlanningError(insertError));
    }

    return created as ClientStrategy;
  }
}

// ==============================================================================
// 2. PILARES DO CLIENTE (Catálogo Mestre)
// ==============================================================================

export interface GetClientPillarsOptions {
  includeInactive?: boolean;
}

/**
 * Lista todos os pilares do cliente, ordenados por display_order e created_at.
 */
export async function getClientPillars(
  clientId: string,
  options?: GetClientPillarsOptions
): Promise<ClientPillar[]> {
  if (!clientId) {
    return [];
  }

  let query = supabase
    .from('client_pillars')
    .select('*')
    .eq('client_id', clientId);

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  query = query.order('display_order', { ascending: true }).order('created_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return (data || []) as ClientPillar[];
}

/**
 * Cria um novo pilar para o cliente com verificação de display_order e unicidade.
 */
export async function createClientPillar(
  clientId: string,
  input: CreateClientPillarInput
): Promise<ClientPillar> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório para criar um pilar.');
  }

  const cleanName = input.name?.trim();
  if (!cleanName) {
    throw new Error('O nome do pilar é obrigatório.');
  }

  let displayOrder = input.display_order;

  // Se display_order não foi informado, calcula após o maior display_order atual do cliente
  if (typeof displayOrder !== 'number') {
    const { data: existingPillars } = await supabase
      .from('client_pillars')
      .select('display_order')
      .eq('client_id', clientId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existingPillars?.[0]?.display_order;
    displayOrder = typeof maxOrder === 'number' ? maxOrder + 1 : 0;
  }

  const payload = {
    client_id: clientId,
    name: cleanName,
    description: input.description?.trim() || null,
    is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
    display_order: displayOrder,
  };

  const { data, error } = await supabase
    .from('client_pillars')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as ClientPillar;
}

/**
 * Atualiza nome, descrição e/ou display_order de um pilar existente.
 */
export async function updateClientPillar(
  pillarId: string,
  input: UpdateClientPillarInput
): Promise<ClientPillar> {
  if (!pillarId) {
    throw new Error('ID do pilar é obrigatório para atualização.');
  }

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('O nome do pilar não pode ser vazio.');
    }
    payload.name = cleanName;
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }

  if (typeof input.display_order === 'number') {
    payload.display_order = input.display_order;
  }

  if (input.is_active !== undefined) {
    payload.is_active = Boolean(input.is_active);
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhum campo fornecido para atualização do pilar.');
  }

  const { data, error } = await supabase
    .from('client_pillars')
    .update(payload)
    .eq('id', pillarId)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as ClientPillar;
}

/**
 * Ativa ou desativa um pilar (soft toggle sem delete físico).
 */
export async function setClientPillarActive(
  pillarId: string,
  isActive: boolean
): Promise<ClientPillar> {
  if (!pillarId) {
    throw new Error('ID do pilar é obrigatório.');
  }

  const { data, error } = await supabase
    .from('client_pillars')
    .update({ is_active: Boolean(isActive) })
    .eq('id', pillarId)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as ClientPillar;
}

/**
 * Reordena múltiplos pilares do mesmo cliente em lote seguro.
 * Valida previamente que todos os IDs pertencem exclusivamente ao cliente informado.
 */
export async function reorderClientPillars(
  clientId: string,
  orderedPillarIds: string[]
): Promise<ClientPillar[]> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório para reordenar pilares.');
  }

  if (!Array.isArray(orderedPillarIds) || orderedPillarIds.length === 0) {
    return getClientPillars(clientId, { includeInactive: true });
  }

  // 1. Validação estrita prévia: confirma que todos os IDs pertencem exclusivamente a este client_id
  const { data: existingPillars, error: checkError } = await supabase
    .from('client_pillars')
    .select('id')
    .eq('client_id', clientId)
    .in('id', orderedPillarIds);

  if (checkError) {
    throw new Error(formatPlanningError(checkError));
  }

  const existingIds = new Set((existingPillars || []).map((p) => p.id));
  const hasInvalidId = orderedPillarIds.some((id) => !existingIds.has(id));

  if (hasInvalidId || (existingPillars || []).length !== orderedPillarIds.length) {
    throw new Error('Um ou mais pilares informados não pertencem a este cliente ou não existem.');
  }

  // 2. Executa as atualizações de display_order somente após validação de todos os IDs
  const updates = orderedPillarIds.map((id, index) =>
    supabase
      .from('client_pillars')
      .update({ display_order: index })
      .eq('id', id)
      .eq('client_id', clientId)
  );

  const results = await Promise.all(updates);

  for (const res of results) {
    if (res.error) {
      throw new Error(formatPlanningError(res.error));
    }
  }

  return getClientPillars(clientId, { includeInactive: true });
}

// ==============================================================================
// 3. CICLOS DE PLANEJAMENTO EDITORIAL (public.editorial_plans)
// ==============================================================================

/**
 * Calcula as métricas derivadas do plano editorial a partir da meta e das alocações dos pilares.
 */
export function calculateEditorialPlanMetrics(
  targetPostsCount: number,
  pillars: { target_count: number }[] = []
): EditorialPlanMetrics {
  const target = Math.max(0, targetPostsCount || 0);
  const allocated = (pillars || []).reduce((sum, p) => sum + Math.max(0, p.target_count || 0), 0);
  const unallocated = target - allocated;
  const overallocated = allocated > target;
  const pillarCount = (pillars || []).length;

  return {
    target_posts_count: target,
    allocated_posts_count: allocated,
    unallocated_posts_count: unallocated,
    overallocated,
    pillar_count: pillarCount,
  };
}

/**
 * Lista todos os ciclos de planejamento de um cliente, com suporte a filtros de status e ordenação temporal.
 * Por padrão, não inclui planos com status 'archived'.
 */
export async function getEditorialPlans(
  clientId: string,
  options?: GetEditorialPlansOptions
): Promise<EditorialPlan[]> {
  if (!clientId) {
    return [];
  }

  let query = supabase
    .from('editorial_plans')
    .select(`
      *,
      pillars:editorial_plan_pillars(
        *,
        pillar:client_pillars(*)
      )
    `)
    .eq('client_id', clientId);

  if (options?.status) {
    query = query.eq('status', options.status);
  } else if (!options?.includeArchived) {
    query = query.neq('status', 'archived');
  }

  query = query.order('start_date', { ascending: false }).order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return (data || []) as EditorialPlan[];
}

/**
 * Busca um ciclo de planejamento editorial específico pelo ID, trazendo os pilares associados.
 */
export async function getEditorialPlan(planId: string): Promise<EditorialPlan | null> {
  if (!planId) {
    return null;
  }

  const { data, error } = await supabase
    .from('editorial_plans')
    .select(`
      *,
      pillars:editorial_plan_pillars(
        *,
        pillar:client_pillars(*)
      )
    `)
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as EditorialPlan | null;
}

/**
 * Cria um novo ciclo de planejamento editorial para o cliente.
 * Valida datas, meta quantitativa e sanitiza secondary_goals.
 */
export async function createEditorialPlan(
  clientId: string,
  input: CreateEditorialPlanInput
): Promise<EditorialPlan> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório para criar um plano editorial.');
  }

  const cleanTitle = input.title?.trim();
  if (!cleanTitle) {
    throw new Error('O título do plano editorial é obrigatório.');
  }

  if (!input.start_date) {
    throw new Error('A data inicial do plano editorial é obrigatória.');
  }

  if (!input.end_date) {
    throw new Error('A data final do plano editorial é obrigatória.');
  }

  if (input.end_date < input.start_date) {
    throw new Error('A data final deve ser igual ou posterior à data inicial.');
  }

  const targetPosts = typeof input.target_posts_count === 'number' ? Math.max(0, input.target_posts_count) : 0;

  // Sanitiza e deduplica secondary_goals
  const secondaryGoals = Array.isArray(input.secondary_goals)
    ? Array.from(
        new Set(
          input.secondary_goals
            .map((g) => (typeof g === 'string' ? g.trim() : ''))
            .filter((g) => g.length > 0)
        )
      )
    : [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    client_id: clientId,
    title: cleanTitle,
    start_date: input.start_date,
    end_date: input.end_date,
    primary_goal: input.primary_goal?.trim() || null,
    secondary_goals: secondaryGoals,
    core_message: input.core_message?.trim() || null,
    target_posts_count: targetPosts,
    status: input.status || 'draft',
    notes: input.notes?.trim() || null,
    created_by: user?.id || null,
  };

  const { data, error } = await supabase
    .from('editorial_plans')
    .insert(payload)
    .select(`
      *,
      pillars:editorial_plan_pillars(
        *,
        pillar:client_pillars(*)
      )
    `)
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as EditorialPlan;
}

/**
 * Atualiza os campos de um ciclo de planejamento editorial existente.
 */
export async function updateEditorialPlan(
  planId: string,
  input: UpdateEditorialPlanInput
): Promise<EditorialPlan> {
  if (!planId) {
    throw new Error('ID do plano editorial é obrigatório para atualização.');
  }

  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const cleanTitle = input.title.trim();
    if (!cleanTitle) {
      throw new Error('O título do plano editorial não pode ser vazio.');
    }
    payload.title = cleanTitle;
  }

  if (input.start_date !== undefined) {
    if (!input.start_date) {
      throw new Error('A data inicial não pode ser vazia.');
    }
    payload.start_date = input.start_date;
  }

  if (input.end_date !== undefined) {
    if (!input.end_date) {
      throw new Error('A data final não pode ser vazia.');
    }
    payload.end_date = input.end_date;
  }

  if (input.start_date && input.end_date && input.end_date < input.start_date) {
    throw new Error('A data final deve ser igual ou posterior à data inicial.');
  }

  if (input.primary_goal !== undefined) {
    payload.primary_goal = input.primary_goal?.trim() || null;
  }

  if (input.secondary_goals !== undefined) {
    payload.secondary_goals = Array.isArray(input.secondary_goals)
      ? Array.from(
          new Set(
            input.secondary_goals
              .map((g) => (typeof g === 'string' ? g.trim() : ''))
              .filter((g) => g.length > 0)
          )
        )
      : [];
  }

  if (input.core_message !== undefined) {
    payload.core_message = input.core_message?.trim() || null;
  }

  if (typeof input.target_posts_count === 'number') {
    if (input.target_posts_count < 0) {
      throw new Error('A meta total de conteúdos deve ser maior ou igual a zero.');
    }
    payload.target_posts_count = input.target_posts_count;
  }

  if (input.status !== undefined) {
    const validStatuses: EditorialPlanStatus[] = ['draft', 'active', 'completed', 'archived'];
    if (!validStatuses.includes(input.status)) {
      throw new Error(`Status "${input.status}" é inválido.`);
    }
    payload.status = input.status;
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhum campo fornecido para atualização do plano.');
  }

  const { data, error } = await supabase
    .from('editorial_plans')
    .update(payload)
    .eq('id', planId)
    .select(`
      *,
      pillars:editorial_plan_pillars(
        *,
        pillar:client_pillars(*)
      )
    `)
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as EditorialPlan;
}

/**
 * Altera o status operacional de um ciclo de planejamento.
 */
export async function setEditorialPlanStatus(
  planId: string,
  status: EditorialPlanStatus
): Promise<EditorialPlan> {
  if (!planId) {
    throw new Error('ID do plano editorial é obrigatório.');
  }

  const validStatuses: EditorialPlanStatus[] = ['draft', 'active', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Status "${status}" é inválido para o plano editorial.`);
  }

  return updateEditorialPlan(planId, { status });
}

/**
 * Arquiva um ciclo de planejamento (soft archive via status = 'archived').
 */
export async function archiveEditorialPlan(planId: string): Promise<EditorialPlan> {
  return setEditorialPlanStatus(planId, 'archived');
}

// ==============================================================================
// 4. DISTRIBUIÇÃO E METAS POR PILAR (public.editorial_plan_pillars)
// ==============================================================================

/**
 * Lista as alocações de pilares de um plano editorial específico.
 */
export async function getEditorialPlanPillars(
  planId: string
): Promise<EditorialPlanPillar[]> {
  if (!planId) {
    return [];
  }

  const { data, error } = await supabase
    .from('editorial_plan_pillars')
    .select(`
      *,
      pillar:client_pillars(*)
    `)
    .eq('editorial_plan_id', planId);

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return (data || []) as EditorialPlanPillar[];
}

/**
 * Atualiza ou define o conjunto de pilares e metas quantitativas associados ao plano.
 * Executa exclusivamente a RPC transacional hardened 'set_editorial_plan_pillars'.
 */
export async function setEditorialPlanPillars(
  planId: string,
  clientId: string,
  allocations: EditorialPlanPillarAllocationInput[]
): Promise<EditorialPlanPillar[]> {
  if (!planId) {
    throw new Error('ID do plano editorial é obrigatório.');
  }
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório.');
  }

  if (!Array.isArray(allocations)) {
    throw new Error('O parâmetro de alocações deve ser um array.');
  }

  // 1. Validação estrita no frontend: duplicatas e target_count
  const seenPillars = new Set<string>();
  const payloadAllocations: { pillar_id: string; target_count: number }[] = [];

  for (const alloc of allocations) {
    if (!alloc.pillar_id) {
      throw new Error('O ID do pilar é obrigatório em todas as alocações.');
    }

    if (seenPillars.has(alloc.pillar_id)) {
      throw new Error('O payload contém alocações duplicadas para o mesmo pilar.');
    }
    seenPillars.add(alloc.pillar_id);

    if (typeof alloc.target_count !== 'number' || isNaN(alloc.target_count) || alloc.target_count < 0) {
      throw new Error('A meta de conteúdos por pilar deve ser um número maior ou igual a zero.');
    }

    payloadAllocations.push({
      pillar_id: alloc.pillar_id,
      target_count: Math.floor(alloc.target_count),
    });
  }

  // 2. Execução exclusivamente via RPC transacional
  const { error: rpcError } = await supabase.rpc('set_editorial_plan_pillars', {
    p_editorial_plan_id: planId,
    p_client_id: clientId,
    p_allocations: payloadAllocations,
  });

  if (rpcError) {
    throw new Error(formatPlanningError(rpcError));
  }

  // 3. Retorna a lista atualizada de pilares do plano com relations carregadas
  return getEditorialPlanPillars(planId);
}

// ==============================================================================
// 5. CAMPANHAS (public.campaigns)
// ==============================================================================

const VALID_CAMPAIGN_STATUSES: CampaignStatus[] = ['draft', 'active', 'completed', 'archived'];

/**
 * Valida a coerência temporal de uma campanha conforme as constraints do banco:
 * - Ambas nulas: permitido
 * - Somente data inicial: permitido
 * - Data inicial + data final (com data final >= data inicial): permitido
 * - Data final sem data inicial: proibido
 * - Data final anterior à data inicial: proibido
 */
export function validateCampaignDates(
  startDate?: string | null,
  endDate?: string | null
): void {
  const start = startDate ? startDate.trim() : null;
  const end = endDate ? endDate.trim() : null;

  if (end && !start) {
    throw new Error('A data inicial é obrigatória se a data final for informada.');
  }

  if (start && end && end < start) {
    throw new Error('A data final da campanha deve ser igual ou posterior à data inicial.');
  }
}

/**
 * Lista as campanhas de um cliente com suporte a filtros de status e inclusão de arquivadas.
 * Ordenação: start_date DESC (nulls last), depois created_at DESC.
 */
export async function getCampaigns(
  clientId: string,
  options?: GetCampaignsOptions
): Promise<Campaign[]> {
  if (!clientId) {
    return [];
  }

  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId);

  if (options?.status) {
    query = query.eq('status', options.status);
  } else if (!options?.includeArchived) {
    query = query.neq('status', 'archived');
  }

  query = query
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return (data || []) as Campaign[];
}

/**
 * Busca uma campanha individual por ID, opcionalmente garantindo a amarração de tenant com clientId.
 */
export async function getCampaign(
  campaignId: string,
  clientId?: string
): Promise<Campaign | null> {
  if (!campaignId) {
    return null;
  }

  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as Campaign | null;
}

/**
 * Cria uma nova campanha para o cliente.
 * Inicia sempre com status 'draft' por padrão se não for explicitamente fornecido.
 */
export async function createCampaign(
  clientId: string,
  input: Omit<CreateCampaignInput, 'client_id'>
): Promise<Campaign> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório.');
  }

  const cleanName = input.name ? input.name.trim() : '';
  if (!cleanName) {
    throw new Error('O nome da campanha não pode ser vazio.');
  }

  // Validação de datas
  validateCampaignDates(input.start_date, input.end_date);

  // Validação de status
  const targetStatus: CampaignStatus = input.status || 'draft';
  if (!VALID_CAMPAIGN_STATUSES.includes(targetStatus)) {
    throw new Error(`Status "${targetStatus}" é inválido para a campanha.`);
  }

  // Obter usuário autenticado para rastreabilidade de criação
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id || null;

  const payload: Record<string, unknown> = {
    client_id: clientId,
    name: cleanName,
    objective: input.objective ? input.objective.trim() : null,
    start_date: input.start_date ? input.start_date.trim() : null,
    end_date: input.end_date ? input.end_date.trim() : null,
    status: targetStatus,
    notes: input.notes ? input.notes.trim() : null,
  };

  if (currentUserId) {
    payload.created_by = currentUserId;
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as Campaign;
}

/**
 * Atualiza os dados de uma campanha existente.
 * Impede estritamente a alteração de client_id e valida a consistência de datas e status.
 */
export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput
): Promise<Campaign> {
  if (!campaignId) {
    throw new Error('ID da campanha é obrigatório.');
  }

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('O nome da campanha não pode ser vazio.');
    }
    payload.name = cleanName;
  }

  if (input.objective !== undefined) {
    payload.objective = input.objective ? input.objective.trim() : null;
  }

  if (input.status !== undefined) {
    if (!VALID_CAMPAIGN_STATUSES.includes(input.status)) {
      throw new Error(`Status "${input.status}" é inválido para a campanha.`);
    }
    payload.status = input.status;
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes ? input.notes.trim() : null;
  }

  // Validação contextual de datas se qualquer uma das duas estiver sendo atualizada
  if (input.start_date !== undefined || input.end_date !== undefined) {
    let finalStart = input.start_date;
    let finalEnd = input.end_date;

    // Se apenas uma das datas foi fornecida no update, busca o registro atual para validar a combinação resultante
    if (finalStart === undefined || finalEnd === undefined) {
      const existing = await getCampaign(campaignId);
      if (!existing) {
        throw new Error('Campanha não encontrada para validação de datas.');
      }
      if (finalStart === undefined) finalStart = existing.start_date;
      if (finalEnd === undefined) finalEnd = existing.end_date;
    }

    validateCampaignDates(finalStart, finalEnd);

    if (input.start_date !== undefined) {
      payload.start_date = input.start_date ? input.start_date.trim() : null;
    }
    if (input.end_date !== undefined) {
      payload.end_date = input.end_date ? input.end_date.trim() : null;
    }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', campaignId)
    .select()
    .single();

  if (error) {
    throw new Error(formatPlanningError(error));
  }

  return data as Campaign;
}

/**
 * Altera o status canônico de uma campanha ('draft' | 'active' | 'completed' | 'archived').
 */
export async function setCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<Campaign> {
  if (!campaignId) {
    throw new Error('ID da campanha é obrigatório.');
  }

  if (!VALID_CAMPAIGN_STATUSES.includes(status)) {
    throw new Error(`Status "${status}" é inválido para a campanha.`);
  }

  return updateCampaign(campaignId, { status });
}

/**
 * Arquiva uma campanha (soft archive via status = 'archived').
 */
export async function archiveCampaign(campaignId: string): Promise<Campaign> {
  return setCampaignStatus(campaignId, 'archived');
}

/**
 * Exclui definitivamente uma campanha existente se NÃO houver nenhum Content vinculado.
 * Se houver Contents associados, bloqueia e lança erro amigável orientando o arquivamento.
 */
export async function deleteCampaign(
  campaignId: string,
  clientId: string
): Promise<boolean> {
  if (!campaignId) {
    throw new Error('ID da campanha é obrigatório.');
  }
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório.');
  }

  // 1. Confirmar que a campanha existe e pertence ao cliente informado
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, client_id, name')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    throw new Error('Campanha não encontrada.');
  }

  if (campaign.client_id !== clientId) {
    throw new Error('A campanha selecionada não pertence ao cliente informado.');
  }

  // 2. Verificar se existe algum Content vinculado através de contents.campaign_id
  const { count, error: countError } = await supabase
    .from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (countError) {
    throw new Error(formatPlanningError(countError));
  }

  if (count !== null && count > 0) {
    throw new Error(
      'Esta campanha possui conteúdos vinculados e não pode ser excluída. Arquive a campanha para preservar o histórico.'
    );
  }

  // 3. Executar o DELETE definitivo com segurança
  const { error: deleteError } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('client_id', clientId);

  if (deleteError) {
    throw new Error(formatPlanningError(deleteError));
  }

  return true;
}

// ==============================================================================
// 6. INTEGRAÇÃO COM CONTEÚDOS (Opções de Planejamento)
// ==============================================================================

export interface ContentPlanningOptions {
  editorialPlans: EditorialPlan[];
  pillars: ClientPillar[];
  campaigns: Campaign[];
}

/**
 * Busca todas as opções estruturadas de planejamento (planos, pilares e campanhas)
 * para um determinado cliente. Inclui registros arquivados/inativos para resolução
 * de vínculos históricos de conteúdos existentes.
 */
export async function fetchContentPlanningOptions(
  clientId: string
): Promise<ContentPlanningOptions> {
  if (!clientId) {
    return {
      editorialPlans: [],
      pillars: [],
      campaigns: [],
    };
  }

  const [plans, pillars, campaigns] = await Promise.all([
    getEditorialPlans(clientId, { includeArchived: true }),
    getClientPillars(clientId, { includeInactive: true }),
    getCampaigns(clientId, { includeArchived: true }),
  ]);

  return {
    editorialPlans: plans,
    pillars,
    campaigns,
  };
}


