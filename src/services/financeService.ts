import { supabase } from '../lib/supabase';
import { validateFinanceInput } from './financeContracts';
import type { FinanceInput, FinanceEntry, FinanceClient, FinanceEvent } from '../types/finance';

async function context() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para acessar o Financeiro.');
  const result = await supabase.from('workspace_members').select('workspace_id, workspace:workspaces!inner(id,status)').eq('user_id', data.user.id).eq('status','active').in('role',['owner','admin']).eq('workspace.status','active');
  if (result.error) throw new Error('Não foi possível confirmar sua agência.');
  const ids = [...new Set<string>((result.data || []).map(row => row.workspace_id))];
  if (ids.length !== 1) throw new Error('O Financeiro exige uma única agência ativa vinculada à sua conta como administrador.');
  return { workspaceId: ids[0], userId: data.user.id };
}

export async function fetchFinanceData(clientId?: string): Promise<{ entries: FinanceEntry[]; clients: FinanceClient[] }> {
  const { workspaceId } = await context();
  // Explicit pagination prevents silently incomplete balances at the API row limit.
  const entries: FinanceEntry[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('finance_entries').select('*').eq('workspace_id',workspaceId).order('id').range(offset,offset+499);
    if (clientId) query = query.eq('client_id',clientId);
    const { data, error } = await query;
    if (error) throw new Error('Não foi possível carregar os lançamentos.');
    entries.push(...(data || []) as FinanceEntry[]);
    if (!data || data.length < 500) break;
  }
  const result = await supabase.from('clients').select('id,name,commercial_name').eq('workspace_id',workspaceId).order('name');
  if (result.error) throw new Error('Não foi possível carregar os clientes.');
  return { entries, clients: (result.data || []) as FinanceClient[] };
}

export async function saveFinanceEntry(input: FinanceInput, id?: string, expectedUpdatedAt?: string): Promise<FinanceEntry> {
  const payload = validateFinanceInput(input);
  if (id && !expectedUpdatedAt) throw new Error('Atualize a lista antes de editar este lançamento.');
  const { workspaceId, userId } = await context();
  const query = id
    ? supabase.from('finance_entries').update(payload).eq('id',id).eq('workspace_id',workspaceId).eq('updated_at',expectedUpdatedAt)
    : supabase.from('finance_entries').insert({ ...payload, workspace_id: workspaceId, created_by: userId });
  const { data, error } = await query.select('*').single();
  if (error || !data) throw new Error(id ? 'Não foi possível salvar: o lançamento pode ter mudado. Atualize a lista e tente novamente.' : 'Cadastro sem confirmação. Atualize a lista antes de tentar novamente.');
  return data as FinanceEntry;
}

export async function fetchFinanceHistory(id: string): Promise<FinanceEvent[]> {
  const { workspaceId } = await context();
  const { data, error } = await supabase.from('finance_entry_events').select('id,event_type,old_values,new_values,occurred_at').eq('workspace_id',workspaceId).eq('entry_id',id).order('occurred_at',{ascending:false}).limit(100);
  if (error) throw new Error('Não foi possível carregar o histórico.');
  return (data || []) as FinanceEvent[];
}
