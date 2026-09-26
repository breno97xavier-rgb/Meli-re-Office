import { supabase } from '../lib/supabase';
import {
  Opportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '../types/opportunities';

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      id,
      title,
      lead_id,
      client_id,
      contact_id,
      stage,
      estimated_value,
      services_of_interest,
      probability,
      next_action,
      next_action_date,
      expected_close_date,
      closed_at,
      lost_reason,
      owner_id,
      created_at,
      updated_at,
      lead:leads(
        id,
        name,
        business_name,
        email,
        whatsapp
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching opportunities:', error);
    throw new Error(error.message || 'Erro ao carregar oportunidades.');
  }

  return (data as unknown as Opportunity[]) || [];
}

export async function createOpportunity(
  input: CreateOpportunityInput
): Promise<Opportunity> {
  let ownerId = input.owner_id;
  if (!ownerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    ownerId = user?.id || null;
  }

  let resolvedWorkspaceId: string | null = null;

  // A. Se a oportunidade está vinculada a um Lead, herda o workspace do Lead
  if (input.lead_id) {
    const { data: leadData, error: leadErr } = await supabase
      .from('leads')
      .select('id, workspace_id')
      .eq('id', input.lead_id)
      .maybeSingle();

    if (leadErr || !leadData) {
      throw new Error('LEAD_NOT_FOUND: Lead de origem não encontrado.');
    }
    if (!leadData.workspace_id) {
      throw new Error('LEAD_HAS_NO_WORKSPACE: O lead especificado não possui workspace associado.');
    }
    resolvedWorkspaceId = leadData.workspace_id;
  }

  // B. Se a oportunidade está vinculada a um Client, herda o workspace do Client
  if (input.client_id) {
    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('id, workspace_id')
      .eq('id', input.client_id)
      .maybeSingle();

    if (clientErr || !clientData) {
      throw new Error('CLIENT_NOT_FOUND: Cliente de origem não encontrado.');
    }
    if (!clientData.workspace_id) {
      throw new Error('CLIENT_HAS_NO_WORKSPACE: O cliente especificado não possui workspace associado.');
    }
    if (resolvedWorkspaceId && resolvedWorkspaceId !== clientData.workspace_id) {
      throw new Error('CROSS_WORKSPACE_MISMATCH: O lead e o cliente pertencem a workspaces diferentes.');
    }
    resolvedWorkspaceId = clientData.workspace_id;
  }

  // C. Se o caller passou workspace_id explicitamente, valida compatibilidade
  if (input.workspace_id) {
    if (resolvedWorkspaceId && resolvedWorkspaceId !== input.workspace_id) {
      throw new Error('CROSS_WORKSPACE_MISMATCH: O workspace_id informado diverge do workspace da entidade de origem.');
    }
    resolvedWorkspaceId = input.workspace_id;
  }

  // D. Criação totalmente avulsa (sem Lead, Client ou Workspace explícito)
  if (!resolvedWorkspaceId) {
    throw new Error('WORKSPACE_REQUIRED: É obrigatório informar o Workspace para criar uma oportunidade avulsa.');
  }

  const payload = {
    workspace_id: resolvedWorkspaceId,
    title: input.title.trim(),
    lead_id: input.lead_id || null,
    client_id: input.client_id || null,
    contact_id: input.contact_id || null,
    stage: input.stage || 'discovery',
    estimated_value:
      typeof input.estimated_value === 'number' && !isNaN(input.estimated_value)
        ? input.estimated_value
        : null,
    services_of_interest: input.services_of_interest || [],
    probability:
      typeof input.probability === 'number' && !isNaN(input.probability)
        ? Math.min(100, Math.max(0, input.probability))
        : null,
    next_action: input.next_action?.trim() || null,
    next_action_date: input.next_action_date || null,
    expected_close_date: input.expected_close_date || null,
    owner_id: ownerId,
  };

  const { data, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select(`
      id,
      title,
      lead_id,
      client_id,
      contact_id,
      stage,
      estimated_value,
      services_of_interest,
      probability,
      next_action,
      next_action_date,
      expected_close_date,
      closed_at,
      lost_reason,
      owner_id,
      created_at,
      updated_at,
      lead:leads(
        id,
        name,
        business_name,
        email,
        whatsapp
      )
    `)
    .single();

  if (error) {
    console.error('Error creating opportunity:', error);
    throw new Error(error.message || 'Erro ao criar oportunidade.');
  }

  return data as unknown as Opportunity;
}

export async function updateOpportunity(
  id: string,
  updates: UpdateOpportunityInput
): Promise<Opportunity> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.estimated_value !== undefined) {
    payload.estimated_value =
      typeof updates.estimated_value === 'number' && !isNaN(updates.estimated_value)
        ? updates.estimated_value
        : null;
  }
  if (updates.services_of_interest !== undefined) {
    payload.services_of_interest = updates.services_of_interest;
  }
  if (updates.probability !== undefined) {
    payload.probability =
      typeof updates.probability === 'number' && !isNaN(updates.probability)
        ? Math.min(100, Math.max(0, updates.probability))
        : null;
  }
  if (updates.next_action !== undefined) {
    payload.next_action = updates.next_action ? updates.next_action.trim() : null;
  }
  if (updates.next_action_date !== undefined) {
    payload.next_action_date = updates.next_action_date || null;
  }
  if (updates.expected_close_date !== undefined) {
    payload.expected_close_date = updates.expected_close_date || null;
  }
  if (updates.closed_at !== undefined) {
    payload.closed_at = updates.closed_at || null;
  }
  if (updates.lost_reason !== undefined) {
    payload.lost_reason = updates.lost_reason ? updates.lost_reason.trim() : null;
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq('id', id)
    .select(`
      id,
      title,
      lead_id,
      client_id,
      contact_id,
      stage,
      estimated_value,
      services_of_interest,
      probability,
      next_action,
      next_action_date,
      expected_close_date,
      closed_at,
      lost_reason,
      owner_id,
      created_at,
      updated_at,
      lead:leads(
        id,
        name,
        business_name,
        email,
        whatsapp
      )
    `)
    .single();

  if (error) {
    console.error('Error updating opportunity:', error);
    throw new Error(error.message || 'Erro ao atualizar oportunidade.');
  }

  return data as unknown as Opportunity;
}

export async function convertLeadToOpportunity(
  input: CreateOpportunityInput
): Promise<Opportunity> {
  if (!input.lead_id) {
    throw new Error('ID do lead é obrigatório para conversão.');
  }

  const params = {
    p_lead_id: input.lead_id,
    p_title: input.title.trim(),
    p_stage: input.stage || 'discovery',
    p_estimated_value:
      typeof input.estimated_value === 'number' && !isNaN(input.estimated_value)
        ? input.estimated_value
        : null,
    p_services_of_interest: input.services_of_interest || [],
    p_probability:
      typeof input.probability === 'number' && !isNaN(input.probability)
        ? Math.min(100, Math.max(0, input.probability))
        : null,
    p_next_action: input.next_action?.trim() || null,
    p_next_action_date: input.next_action_date || null,
    p_expected_close_date: input.expected_close_date || null,
  };

  const { data, error } = await supabase.rpc(
    'convert_lead_to_opportunity',
    params
  );

  if (error) {
    console.error('Error in convert_lead_to_opportunity RPC:', error);
    throw new Error(error.message || 'Erro ao converter lead em oportunidade.');
  }

  return data as unknown as Opportunity;
}
