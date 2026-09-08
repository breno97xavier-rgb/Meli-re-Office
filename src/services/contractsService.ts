import { supabase } from '../lib/supabase';
import {
  Contract,
  ContractStatus,
  CreateContractInput,
  UpdateContractOperationalInput,
} from '../types/contracts';
import { Proposal } from '../types/proposals';

export async function fetchContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      proposal:proposals(
        id,
        title,
        version,
        status,
        monthly_amount,
        one_time_amount,
        created_at,
        valid_until,
        notes,
        terms
      ),
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
        client_id,
        lead:leads(
          id,
          name,
          business_name,
          email,
          whatsapp
        )
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching contracts:', error);
    throw new Error(error.message || 'Erro ao carregar contratos.');
  }

  return (data || []) as Contract[];
}

export async function fetchEligibleProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
        client_id,
        lead:leads(
          id,
          name,
          business_name,
          email,
          whatsapp
        )
      )
    `)
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching eligible proposals for contracts:', error);
    throw new Error(error.message || 'Erro ao carregar propostas aceitas.');
  }

  return (data || []) as Proposal[];
}

export async function createContractFromProposal(
  input: CreateContractInput
): Promise<Contract> {
  if (!input.proposal_id) {
    throw new Error('A proposta de origem é obrigatória.');
  }
  if (!input.title || !input.title.trim()) {
    throw new Error('O título do contrato é obrigatório.');
  }

  const params = {
    p_proposal_id: input.proposal_id,
    p_title: input.title.trim(),
    p_start_date: input.start_date || null,
    p_end_date: input.end_date || null,
    p_auto_renewal: Boolean(input.auto_renewal),
    p_renewal_period_months: input.renewal_period_months ?? null,
    p_cancellation_notice_days: input.cancellation_notice_days ?? null,
    p_special_terms: input.special_terms?.trim() || null,
    p_notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase.rpc(
    'create_contract_from_proposal',
    params
  );

  if (error) {
    console.error('Error in create_contract_from_proposal RPC:', error);
    throw new Error(error.message || 'Erro ao criar contrato a partir da proposta.');
  }

  // The RPC returns { contract: { ... } } or the contract object
  const created = (data as { contract?: Contract })?.contract || (data as Contract);
  return created;
}

export async function transitionContractStatus(
  contractId: string,
  targetStatus: ContractStatus,
  reason?: string | null
): Promise<Contract> {
  if (!contractId) {
    throw new Error('ID do contrato é obrigatório.');
  }

  // Validations for reasons
  if (
    (targetStatus === 'cancelled' || targetStatus === 'terminated') &&
    (!reason || !reason.trim())
  ) {
    throw new Error(
      `O motivo de ${
        targetStatus === 'cancelled' ? 'cancelamento' : 'encerramento'
      } é obrigatório.`
    );
  }

  const params = {
    p_contract_id: contractId,
    p_target_status: targetStatus,
    p_reason: reason?.trim() || null,
  };

  const { data, error } = await supabase.rpc(
    'transition_contract_status',
    params
  );

  if (error) {
    console.error('Error in transition_contract_status RPC:', error);
    throw new Error(error.message || 'Erro ao alterar status do contrato.');
  }

  // Fetch updated contract with full joins
  const { data: updatedContract, error: fetchErr } = await supabase
    .from('contracts')
    .select(`
      *,
      proposal:proposals(
        id,
        title,
        version,
        status,
        monthly_amount,
        one_time_amount,
        created_at,
        valid_until,
        notes,
        terms
      ),
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
        client_id,
        lead:leads(
          id,
          name,
          business_name,
          email,
          whatsapp
        )
      )
    `)
    .eq('id', contractId)
    .single();

  if (fetchErr || !updatedContract) {
    return (data as Contract) || { id: contractId, status: targetStatus } as Contract;
  }

  return updatedContract as Contract;
}

export async function updateContractOperational(
  id: string,
  updates: UpdateContractOperationalInput
): Promise<Contract> {
  if (!id) {
    throw new Error('ID do contrato é obrigatório.');
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.monthly_amount !== undefined) {
    if (updates.monthly_amount !== null && (isNaN(updates.monthly_amount) || updates.monthly_amount < 0)) {
      throw new Error('O valor mensal deve ser maior ou igual a zero.');
    }
    payload.monthly_amount = updates.monthly_amount;
  }
  if (updates.one_time_amount !== undefined) {
    if (updates.one_time_amount !== null && (isNaN(updates.one_time_amount) || updates.one_time_amount < 0)) {
      throw new Error('O valor pontual deve ser maior ou igual a zero.');
    }
    payload.one_time_amount = updates.one_time_amount;
  }
  if (updates.start_date !== undefined) payload.start_date = updates.start_date || null;
  if (updates.end_date !== undefined) payload.end_date = updates.end_date || null;
  if (updates.auto_renewal !== undefined) payload.auto_renewal = Boolean(updates.auto_renewal);
  if (updates.renewal_period_months !== undefined) {
    payload.renewal_period_months = updates.renewal_period_months ?? null;
  }
  if (updates.cancellation_notice_days !== undefined) {
    payload.cancellation_notice_days = updates.cancellation_notice_days ?? null;
  }
  if (updates.special_terms !== undefined) {
    payload.special_terms = updates.special_terms?.trim() || null;
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes?.trim() || null;
  }

  const { data, error } = await supabase
    .from('contracts')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      proposal:proposals(
        id,
        title,
        version,
        status,
        monthly_amount,
        one_time_amount,
        created_at,
        valid_until,
        notes,
        terms
      ),
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
        client_id,
        lead:leads(
          id,
          name,
          business_name,
          email,
          whatsapp
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error updating contract:', error);
    throw new Error(error.message || 'Erro ao atualizar dados do contrato.');
  }

  return data as Contract;
}
