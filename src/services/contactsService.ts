import { supabase } from '../lib/supabase';
import {
  ClientContact,
  CreateClientContactInput,
  UpdateClientContactInput,
} from '../types/contacts';

export function formatContactError(error: unknown): string {
  if (!error) return 'Ocorreu um erro desconhecido.';
  const msg =
    typeof error === 'string'
      ? error
      : (error as { message?: string }).message || '';

  return msg || 'Erro ao processar operação com contato.';
}

export async function fetchClientContacts(
  clientId: string
): Promise<ClientContact[]> {
  if (!clientId) return [];

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching client contacts:', error);
    throw new Error(error.message || 'Erro ao carregar contatos do cliente.');
  }

  return (data || []) as ClientContact[];
}

export async function createClientContact(
  input: CreateClientContactInput
): Promise<ClientContact> {
  if (!input.client_id) {
    throw new Error('ID do cliente é obrigatório para registrar o contato.');
  }
  if (!input.name || !input.name.trim()) {
    throw new Error('O nome do contato é obrigatório.');
  }

  // Se o novo contato for marcado como principal, desmarca os existentes
  if (input.is_primary) {
    try {
      await supabase
        .from('contacts')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('client_id', input.client_id);
    } catch (err) {
      console.warn('Warning resetting other primary contacts:', err);
    }
  }

  const payload = {
    client_id: input.client_id,
    name: input.name.trim(),
    role_title: input.role_title?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    is_primary: Boolean(input.is_primary),
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw new Error(error.message || 'Erro ao cadastrar contato.');
  }

  return data as ClientContact;
}

export async function updateClientContact(
  contactId: string,
  clientId: string,
  input: UpdateClientContactInput
): Promise<ClientContact> {
  if (!contactId) {
    throw new Error('ID do contato é obrigatório.');
  }

  // Se estiver tornando este contato como principal, desmarca os demais do cliente
  if (input.is_primary && clientId) {
    try {
      await supabase
        .from('contacts')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .neq('id', contactId);
    } catch (err) {
      console.warn('Warning resetting other primary contacts:', err);
    }
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.role_title !== undefined) payload.role_title = input.role_title?.trim() || null;
  if (input.email !== undefined) payload.email = input.email?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.is_primary !== undefined) payload.is_primary = Boolean(input.is_primary);
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from('contacts')
    .update(payload)
    .eq('id', contactId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    throw new Error(error.message || 'Erro ao atualizar contato.');
  }

  return data as ClientContact;
}

export async function setPrimaryClientContact(
  clientId: string,
  contactId: string
): Promise<void> {
  if (!clientId || !contactId) {
    throw new Error('IDs de cliente e contato são obrigatórios.');
  }

  // 1. Remove is_primary de todos os contatos do cliente
  const { error: errorReset } = await supabase
    .from('contacts')
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq('client_id', clientId);

  if (errorReset) {
    console.error('Error resetting primary contacts:', errorReset);
    throw new Error(errorReset.message || 'Erro ao redefinir contatos principais.');
  }

  // 2. Marca o selecionado como principal
  const { error: errorSet } = await supabase
    .from('contacts')
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq('id', contactId);

  if (errorSet) {
    console.error('Error setting primary contact:', errorSet);
    throw new Error(errorSet.message || 'Erro ao definir contato principal.');
  }
}

export async function deleteClientContact(
  contactId: string
): Promise<void> {
  if (!contactId) {
    throw new Error('ID do contato é obrigatório.');
  }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    console.error('Error deleting contact:', error);
    throw new Error(error.message || 'Erro ao excluir contato.');
  }
}
