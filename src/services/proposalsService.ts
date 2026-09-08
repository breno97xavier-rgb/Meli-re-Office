import { supabase } from '../lib/supabase';
import {
  Proposal,
  ProposalStatus,
  CreateProposalInput,
  UpdateProposalInput,
} from '../types/proposals';

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      contracts:contracts(*),
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
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
    console.error('Error fetching proposals:', error);
    throw new Error(error.message || 'Erro ao carregar propostas.');
  }

  return (data || []) as Proposal[];
}

export async function createProposalRecord(
  input: CreateProposalInput
): Promise<Proposal> {
  if (!input.opportunity_id) {
    throw new Error('A oportunidade vinculada é obrigatória.');
  }

  if (!input.title || !input.title.trim()) {
    throw new Error('O título da proposta é obrigatório.');
  }

  const monthlyAmount =
    input.monthly_amount !== undefined && input.monthly_amount !== null
      ? Number(input.monthly_amount)
      : null;

  if (monthlyAmount !== null && (isNaN(monthlyAmount) || monthlyAmount < 0)) {
    throw new Error('O valor mensal não pode ser negativo.');
  }

  const oneTimeAmount =
    input.one_time_amount !== undefined && input.one_time_amount !== null
      ? Number(input.one_time_amount)
      : null;

  if (oneTimeAmount !== null && (isNaN(oneTimeAmount) || oneTimeAmount < 0)) {
    throw new Error('O valor pontual não pode ser negativo.');
  }

  const params = {
    p_opportunity_id: input.opportunity_id,
    p_title: input.title.trim(),
    p_valid_until: input.valid_until || null,
    p_notes: input.notes?.trim() || null,
    p_monthly_amount: monthlyAmount,
    p_one_time_amount: oneTimeAmount,
  };

  const { data, error } = await supabase.rpc('create_proposal_record', params);

  if (error) {
    console.error('Error in create_proposal_record RPC:', error);
    throw new Error(error.message || 'Erro ao criar proposta comercial.');
  }

  return data as Proposal;
}

export async function updateProposal(
  id: string,
  updates: UpdateProposalInput
): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      contracts:contracts(*),
      opportunity:opportunities(
        id,
        title,
        stage,
        estimated_value,
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
    console.error('Error updating proposal:', error);
    throw new Error(error.message || 'Erro ao atualizar proposta.');
  }

  return data as Proposal;
}

export async function updateProposalStatus(
  id: string,
  newStatus: ProposalStatus
): Promise<Proposal> {
  const now = new Date().toISOString();
  const updates: UpdateProposalInput = {
    status: newStatus,
  };

  if (newStatus === 'sent') {
    updates.sent_at = now;
  } else if (newStatus === 'accepted') {
    updates.accepted_at = now;
  } else if (newStatus === 'rejected') {
    updates.rejected_at = now;
  }

  return updateProposal(id, updates);
}
