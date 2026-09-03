import { supabase } from '../lib/supabase';
import {
  Proposal,
  ProposalItem,
  ProposalStatus,
  CreateProposalInput,
  UpdateProposalInput,
} from '../types/proposals';

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      items:proposal_items(*),
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

  // Ensure items are ordered by display_order ASC
  const formatted: Proposal[] = (data || []).map((prop) => {
    const rawItems = Array.isArray(prop.items) ? prop.items : [];
    const sortedItems = [...rawItems].sort(
      (a: ProposalItem, b: ProposalItem) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    return {
      ...prop,
      items: sortedItems,
    } as Proposal;
  });

  return formatted;
}

export async function createProposalWithItems(
  input: CreateProposalInput
): Promise<{ proposal: Proposal; items: ProposalItem[] }> {
  if (!input.opportunity_id) {
    throw new Error('A oportunidade vinculada é obrigatória.');
  }

  if (!input.title || !input.title.trim()) {
    throw new Error('O título da proposta é obrigatório.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('A proposta deve conter pelo menos um item de serviço.');
  }

  const p_items = input.items.map((item, index) => {
    const desc = item.description?.trim();
    if (!desc) {
      throw new Error(`A descrição do item ${index + 1} é obrigatória.`);
    }
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty < 1) {
      throw new Error(`A quantidade do item "${desc}" deve ser maior ou igual a 1.`);
    }
    const price = Number(item.unit_price);
    if (isNaN(price) || price < 0) {
      throw new Error(`O preço unitário do item "${desc}" não pode ser negativo.`);
    }

    return {
      description: desc,
      service_key: item.service_key?.trim() || null,
      billing_type: item.billing_type,
      quantity: Math.floor(qty),
      unit_price: price,
      display_order: item.display_order ?? index,
    };
  });

  const params = {
    p_opportunity_id: input.opportunity_id,
    p_title: input.title.trim(),
    p_valid_until: input.valid_until || null,
    p_notes: input.notes?.trim() || null,
    p_terms: input.terms?.trim() || null,
    p_items,
  };

  const { data, error } = await supabase.rpc('create_proposal_with_items', params);

  if (error) {
    console.error('Error in create_proposal_with_items RPC:', error);
    throw new Error(error.message || 'Erro ao criar proposta comercial.');
  }

  return data as { proposal: Proposal; items: ProposalItem[] };
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
      items:proposal_items(*),
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

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const sortedItems = [...rawItems].sort(
    (a: ProposalItem, b: ProposalItem) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  return {
    ...data,
    items: sortedItems,
  } as Proposal;
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
