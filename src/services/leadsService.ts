import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types/leads';

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id,
      created_at,
      updated_at,
      name,
      business_name,
      whatsapp,
      email,
      service,
      business_stage,
      message,
      preferred_contact,
      status,
      source,
      metadata,
      assigned_to
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    throw new Error(error.message || 'Erro ao carregar leads.');
  }

  return (data as Lead[]) || [];
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('leads')
    .update({
      status,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lead status:', error);
    throw new Error(error.message || 'Erro ao atualizar status do lead.');
  }

  return data as Lead;
}
