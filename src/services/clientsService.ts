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

export async function fetchClientById(clientId: string): Promise<Client | null> {
  if (!clientId) return null;

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
        origin_contract:contracts!clients_origin_contract_id_fkey(
          id,
          contract_number,
          title,
          version,
          status,
          start_date,
          end_date,
          monthly_amount,
          one_time_amount,
          signed_at
        ),
        origin_opportunity:opportunities!clients_origin_opportunity_id_fkey(
          id,
          title,
          stage,
          estimated_value,
          services_of_interest,
          probability,
          closed_at
        )
      `)
      .eq('id', clientId)
      .maybeSingle();

    if (!error && data) {
      return normalizeClient(data);
    }
    if (error) {
      console.warn('Query with relations failed for client, falling back:', error);
    }
  } catch (err) {
    console.warn('Fallback error fetching single client with relations:', err);
  }

  const { data: rawData, error: rawError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (rawError) {
    console.error('Error fetching client by ID:', rawError);
    throw new Error(rawError.message || 'Erro ao carregar dados do cliente.');
  }

  return rawData ? (rawData as Client) : null;
}

export async function fetchClientCommercialHistory(
  clientId: string,
  client?: Client | null
) {
  if (!clientId) {
    return {
      opportunities: [],
      proposals: [],
      contracts: [],
    };
  }

  try {
    // 1. Busca oportunidades vinculadas ao client_id
    const { data: oppsData, error: oppsError } = await supabase
      .from('opportunities')
      .select(`
        id,
        title,
        stage,
        services_of_interest,
        probability,
        estimated_value,
        closed_at,
        created_at
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (oppsError) {
      console.warn('Error fetching client opportunities:', oppsError);
    }

    const opportunities = (oppsData || []) as Array<{
      id: string;
      title: string;
      stage: string;
      services_of_interest?: string[] | null;
      probability?: number | null;
      estimated_value?: number | null;
      closed_at?: string | null;
      created_at: string;
    }>;

    // Se houver origin_opportunity_id e não estiver na lista, adiciona
    if (client?.origin_opportunity_id && !opportunities.some(o => o.id === client.origin_opportunity_id)) {
      const { data: originOpp } = await supabase
        .from('opportunities')
        .select(`
          id,
          title,
          stage,
          services_of_interest,
          probability,
          estimated_value,
          closed_at,
          created_at
        `)
        .eq('id', client.origin_opportunity_id)
        .maybeSingle();

      if (originOpp) {
        opportunities.unshift(originOpp);
      }
    }

    const opportunityIds = opportunities.map((o) => o.id).filter(Boolean);

    // 2. Busca propostas vinculadas a essas oportunidades
    let proposals: Array<{
      id: string;
      opportunity_id: string;
      title: string;
      version: number;
      status: string;
      valid_until?: string | null;
      monthly_amount?: number | null;
      one_time_amount?: number | null;
      accepted_at?: string | null;
      rejected_at?: string | null;
      sent_at?: string | null;
      created_at: string;
      notes?: string | null;
    }> = [];

    if (opportunityIds.length > 0) {
      const { data: propsData, error: propsError } = await supabase
        .from('proposals')
        .select(`
          id,
          opportunity_id,
          title,
          version,
          status,
          valid_until,
          monthly_amount,
          one_time_amount,
          accepted_at,
          rejected_at,
          sent_at,
          created_at,
          notes
        `)
        .in('opportunity_id', opportunityIds)
        .order('created_at', { ascending: false });

      if (propsError) {
        console.warn('Error fetching proposals for client opportunities:', propsError);
      } else if (propsData) {
        proposals = propsData;
      }
    }

    // 3. Busca contratos vinculados às oportunidades ou ao origin_contract_id
    let contracts: Array<{
      id: string;
      proposal_id?: string | null;
      opportunity_id?: string | null;
      contract_number: string;
      title: string;
      version: number;
      status: string;
      start_date?: string | null;
      end_date?: string | null;
      monthly_amount?: number | null;
      one_time_amount?: number | null;
      signed_at?: string | null;
      created_at: string;
      notes?: string | null;
    }> = [];

    const contractIdsToInclude = client?.origin_contract_id ? [client.origin_contract_id] : [];

    if (opportunityIds.length > 0 || contractIdsToInclude.length > 0) {
      let query = supabase.from('contracts').select(`
        id,
        proposal_id,
        opportunity_id,
        contract_number,
        title,
        version,
        status,
        start_date,
        end_date,
        monthly_amount,
        one_time_amount,
        signed_at,
        created_at,
        notes
      `);

      if (opportunityIds.length > 0 && contractIdsToInclude.length > 0) {
        query = query.or(`opportunity_id.in.(${opportunityIds.join(',')}),id.in.(${contractIdsToInclude.join(',')})`);
      } else if (opportunityIds.length > 0) {
        query = query.in('opportunity_id', opportunityIds);
      } else {
        query = query.in('id', contractIdsToInclude);
      }

      const { data: contractsData, error: contractsError } = await query.order('created_at', { ascending: false });

      if (contractsError) {
        console.warn('Error fetching contracts for client:', contractsError);
      } else if (contractsData) {
        contracts = contractsData;
      }
    }

    return {
      opportunities,
      proposals,
      contracts,
    };
  } catch (err) {
    console.error('Error fetching client commercial history:', err);
    return {
      opportunities: [],
      proposals: [],
      contracts: [],
    };
  }
}
