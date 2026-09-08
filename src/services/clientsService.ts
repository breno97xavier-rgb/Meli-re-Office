import { supabase } from '../lib/supabase';
import { Client, UpdateClientInput } from '../types/clients';

export function formatClientError(error: unknown): string {
  if (!error) return 'Ocorreu um erro desconhecido.';
  const msg =
    typeof error === 'string'
      ? error
      : (error as { message?: string }).message || '';

  if (msg.includes('CONTRACT_MUST_BE_SIGNED')) {
    return 'Somente contratos assinados podem ser convertidos em cliente.';
  }
  if (msg.includes('OPPORTUNITY_ALREADY_LINKED_TO_CLIENT')) {
    return 'Esta oportunidade já está vinculada a um cliente.';
  }
  if (msg.includes('CONTRACT_NOT_FOUND')) {
    return 'Contrato não encontrado.';
  }
  if (msg.includes('ADMIN_REQUIRED')) {
    return 'Apenas administradores podem converter contratos em clientes.';
  }
  if (msg.includes('AUTH_REQUIRED')) {
    return 'Autenticação necessária para esta operação.';
  }
  return msg || 'Erro ao processar operação com cliente.';
}

function normalizeClient(item: unknown): Client {
  if (!item || typeof item !== 'object') return item as Client;
  const row = item as Record<string, unknown>;
  const origin_contract = Array.isArray(row.origin_contract)
    ? row.origin_contract[0] || null
    : row.origin_contract || null;
  const origin_opportunity = Array.isArray(row.origin_opportunity)
    ? row.origin_opportunity[0] || null
    : row.origin_opportunity || null;

  return {
    ...row,
    origin_contract,
    origin_opportunity,
  } as unknown as Client;
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        commercial_name,
        slug,
        status,
        logo_url,
        segment,
        website,
        instagram,
        phone,
        email,
        notes,
        contract_start_date,
        contract_end_date,
        monthly_amount,
        one_time_amount,
        origin_contract_id,
        origin_opportunity_id,
        created_at,
        updated_at,
        origin_contract:contracts!clients_origin_contract_id_fkey(id, contract_number, title, version),
        origin_opportunity:opportunities!clients_origin_opportunity_id_fkey(id, title)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return (data as unknown[]).map(normalizeClient);
    }
    if (error) {
      console.warn('Query with relational embeds returned error, falling back:', error);
    }
  } catch (err) {
    console.warn('Fallback error fetching clients with relations:', err);
  }

  const { data, error } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      commercial_name,
      slug,
      status,
      logo_url,
      segment,
      website,
      instagram,
      phone,
      email,
      notes,
      contract_start_date,
      contract_end_date,
      monthly_amount,
      one_time_amount,
      origin_contract_id,
      origin_opportunity_id,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    throw new Error(error.message || 'Erro ao carregar clientes.');
  }

  return (data || []) as unknown as Client[];
}

export async function updateClient(
  clientId: string,
  input: UpdateClientInput
): Promise<Client> {
  if (!clientId) {
    throw new Error('ID do cliente é obrigatório.');
  }

  // Only allow editing safe basic/registration/status fields
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.commercial_name !== undefined) payload.commercial_name = input.commercial_name?.trim() || null;
  if (input.segment !== undefined) payload.segment = input.segment?.trim() || null;
  if (input.website !== undefined) payload.website = input.website?.trim() || null;
  if (input.instagram !== undefined) payload.instagram = input.instagram?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.email !== undefined) payload.email = input.email?.trim() || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.contract_start_date !== undefined) payload.contract_start_date = input.contract_start_date || null;
  if (input.contract_end_date !== undefined) payload.contract_end_date = input.contract_end_date || null;

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', clientId)
    .select(`
      id,
      name,
      commercial_name,
      slug,
      status,
      logo_url,
      segment,
      website,
      instagram,
      phone,
      email,
      notes,
      contract_start_date,
      contract_end_date,
      monthly_amount,
      one_time_amount,
      origin_contract_id,
      origin_opportunity_id,
      created_at,
      updated_at,
      origin_contract:contracts!clients_origin_contract_id_fkey(id, contract_number, title, version),
      origin_opportunity:opportunities!clients_origin_opportunity_id_fkey(id, title)
    `)
    .single();

  if (error) {
    console.error('Error updating client:', error);
    throw new Error(error.message || 'Erro ao atualizar dados do cliente.');
  }

  return normalizeClient(data);
}

export async function convertSignedContractToClient(
  contractId: string
): Promise<Client> {
  if (!contractId) {
    throw new Error('ID do contrato é obrigatório.');
  }

  const { data, error } = await supabase.rpc(
    'convert_signed_contract_to_client',
    {
      p_contract_id: contractId,
    }
  );

  if (error) {
    console.error('Error in convert_signed_contract_to_client RPC:', error);
    throw new Error(formatClientError(error));
  }

  return data as Client;
}
