import { supabase } from '../lib/supabase';
import { validateFinanceInput, validateFinanceBaseline, validateFinanceRecurrence } from './financeContracts';
import { getSystemTodayString } from '../utils/civilDate';
import type { FinanceInput, FinanceEntry, FinanceClient, FinanceEvent, FinanceBaseline, FinanceRecurrenceInput, FinanceRecurrence } from '../types/finance';

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
  let clientsQuery = supabase.from('clients').select('id,name,commercial_name,monthly_amount,contract_start_date,contract_end_date').eq('workspace_id',workspaceId).order('name');
  if (clientId) clientsQuery = clientsQuery.eq('id',clientId);
  const result = await clientsQuery;
  if (result.error) throw new Error('Não foi possível carregar os clientes.');
  return { entries, clients: (result.data || []) as FinanceClient[] };
}

export async function fetchFinancePlan(clientId?: string): Promise<{baseline: FinanceBaseline | null; rules: FinanceRecurrence[]}> {
  const {workspaceId}=await context();
  const baseline=clientId?{data:null,error:null}:await supabase.from('finance_cash_settings').select('*').eq('workspace_id',workspaceId).maybeSingle();
  if(baseline.error)throw new Error('Não foi possível carregar o saldo inicial.');
  const rules:FinanceRecurrence[]=[];
  for(let offset=0;;offset+=500){
    let query=supabase.from('finance_recurrences').select('*').eq('workspace_id',workspaceId).order('id').range(offset,offset+499);
    if(clientId)query=query.eq('client_id',clientId);
    const result=await query;
    if(result.error)throw new Error('Não foi possível carregar as recorrências.');
    rules.push(...(result.data||[]) as FinanceRecurrence[]);
    if(!result.data||result.data.length<500)break;
  }
  return {baseline:baseline.data as FinanceBaseline|null,rules};
}
export async function saveFinanceBaseline(opening: number, date: string, previous: FinanceBaseline | null) {
  const payload=validateFinanceBaseline(opening,date,getSystemTodayString());
  const {workspaceId,userId}=await context();
  const query=previous?supabase.from('finance_cash_settings').update(payload).eq('workspace_id',workspaceId).eq('updated_at',previous.updated_at):supabase.from('finance_cash_settings').insert({...payload,workspace_id:workspaceId,created_by:userId});
  const {data,error}=await query.select('*').single();
  if(error||!data)throw new Error('Saldo inicial sem confirmação. Atualize antes de tentar novamente.');
  return data as FinanceBaseline;
}
export async function createFinanceRecurrence(input: FinanceRecurrenceInput) {
  const payload=validateFinanceRecurrence(input);
  const {workspaceId,userId}=await context();
  const {data,error}=await supabase.from('finance_recurrences').insert({...payload,workspace_id:workspaceId,created_by:userId}).select('*').single();
  if(error||!data)throw new Error('Recorrência sem confirmação. Atualize a lista; cada cliente pode ter uma receita mensal ativa.');
  return data as FinanceRecurrence;
}
export async function stopFinanceRecurrence(rule: FinanceRecurrence) {
  const {workspaceId}=await context();
  const {data,error}=await supabase.from('finance_recurrences').update({active:false}).eq('workspace_id',workspaceId).eq('id',rule.id).eq('updated_at',rule.updated_at).select('id').single();
  if(error||!data)throw new Error('Não foi possível encerrar. Atualize a lista antes de tentar novamente.');
}
export async function generateFinanceOccurrences(id: string, from: string, until: string): Promise<number> {
  const {workspaceId}=await context();
  const {data,error}=await supabase.rpc('generate_finance_occurrences',{p_workspace_id:workspaceId,p_rule_id:id,p_from:from,p_until:until});
  if(error)throw new Error('Geração sem confirmação. Atualize a lista. Repetir o mesmo período não duplica as parcelas.');
  return Number(data);
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
