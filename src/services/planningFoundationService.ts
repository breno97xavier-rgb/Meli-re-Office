import { supabase } from '../lib/supabase';
import type { BriefingQuestion, ClientBriefing, PlanningRevision, VersionedStrategy, StrategyRevisionInput, EditorialSeries } from '../types/planningFoundation';
import { PRIMARY_CHANNELS } from '../types/contents';
import { parseCivilDate } from '../utils/civilDate';

export function foundationError(error: unknown): string {
  const failure = error as { message?: string; code?: string };
  if (failure?.message?.includes('revision_conflict')) return 'Este registro mudou em outra sessão. Atualize antes de salvar; suas alterações continuam no formulário.';
  if (failure?.code === 'PGRST202' || failure?.code === '42P01' || failure?.code === 'PGRST205' || failure?.code === '42703') return 'A atualização de Planejamento ainda não está disponível neste ambiente.';
  if (failure?.code === '42501') return 'Sem permissão para operar o planejamento deste cliente.';
  if (failure?.message?.includes('invalid_pillar')) return 'Um pilar não pertence a este cliente ou foi inativado. Atualize os dados antes de salvar.';
  if (failure?.message?.includes('invalid_answer')) return 'Uma resposta não corresponde às opções da pergunta.';
  if (failure?.message?.includes('invalid_question') || failure?.message?.includes('duplicate_question')) return 'Revise os blocos, enunciados e identificadores das perguntas.';
  if (failure?.message?.includes('invalid_options') || failure?.message?.includes('empty_options')) return 'Informe opções diferentes e não vazias para cada pergunta de seleção.';
  if (failure?.message?.includes('strategy_validity')) return 'O fim da vigência requer um início e não pode ser anterior a ele.';
  return failure?.message || 'Não foi possível concluir a operação.';
}
function clientRequired(clientId: string) { if (!clientId) throw new Error('Selecione um cliente.'); }
function revisionRequired(revision: number) {
  if (!Number.isInteger(revision) || revision < 0 || revision > 2147483647) throw new Error('Versão inválida. Atualize os dados.');
}
export function validateBriefing(questions: BriefingQuestion[]) {
  if (!Array.isArray(questions)) throw new Error('Questionário inválido.');
  const ids = new Set<string>();
  for (const question of questions) {
    if (!question || typeof question.id !== 'string' || !question.id.trim() || ids.has(question.id) || typeof question.label !== 'string' || !question.label.trim() || typeof question.block !== 'string' || !question.block.trim()) throw new Error('Cada pergunta precisa de identificador único, bloco e enunciado.');
    ids.add(question.id);
    if (!['text','select','multiple'].includes(question.type) || !Array.isArray(question.options)) throw new Error('Tipo de pergunta inválido.');
    if (question.options.some(value=>typeof value!=='string'||!value.trim()) || new Set(question.options).size!==question.options.length || (question.type!=='text'&&!question.options.length)) throw new Error('Informe opções diferentes e não vazias.');
    if (question.type === 'multiple') {
      if (!Array.isArray(question.answer) || new Set(question.answer).size !== question.answer.length || question.answer.some(value => !question.options.includes(value))) throw new Error('Resposta de múltipla escolha inválida.');
    } else if (typeof question.answer !== 'string' || (question.type === 'select' && question.answer !== '' && !question.options.includes(question.answer))) throw new Error('Resposta incompatível com a pergunta.');
  }
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(foundationError(error));
  if (!data) throw new Error('Gravação não confirmada. Atualize antes de tentar novamente.');
  return data as T;
}
export async function getBriefing(clientId: string): Promise<ClientBriefing | null> {
  clientRequired(clientId);
  const { data, error } = await supabase.from('client_briefings').select('*').eq('client_id',clientId).maybeSingle();
  if (error) throw new Error(foundationError(error));
  return data;
}
export async function saveBriefing(clientId: string, revision: number, questions: BriefingQuestion[], status: 'draft'|'ready') {
  clientRequired(clientId); revisionRequired(revision); validateBriefing(questions);
  if (!['draft','ready'].includes(status)) throw new Error('Status inválido.');
  return rpc<ClientBriefing>('save_client_briefing',{p_client_id:clientId,p_expected_revision:revision,p_questions:questions,p_status:status});
}
export async function getPlanningRevisions<T>(clientId: string, kind: 'briefing'|'strategy'): Promise<PlanningRevision<T>[]> {
  clientRequired(clientId);
  const table = kind === 'briefing' ? 'client_briefing_revisions' : 'client_strategy_revisions';
  const { data, error } = await supabase.from(table).select('revision,snapshot,changed_at').eq('client_id',clientId).order('revision',{ascending:false});
  if (error) throw new Error(foundationError(error));
  return data || [];
}
export async function saveStrategyRevision(clientId: string, revision: number, input: StrategyRevisionInput) {
  clientRequired(clientId); revisionRequired(revision);
  const from=input.valid_from || null, until=input.valid_until || null;
  for (const value of [from,until,input.review_on]) if (value && !parseCivilDate(value)) throw new Error('Data civil inválida.');
  if (until && (!from || until < from)) throw new Error('O fim da vigência requer início e não pode ser anterior a ele.');
  if (input.priority_channels?.some(channel => !PRIMARY_CHANNELS.some(item=>item.value===channel))) throw new Error('Canal inválido.');
  return rpc<VersionedStrategy>('save_client_strategy_revision',{p_client_id:clientId,p_expected_revision:revision,p_input:input});
}
export async function getEditorialSeries(clientId: string): Promise<EditorialSeries[]> {
  clientRequired(clientId);
  const { data,error } = await supabase.from('client_editorial_series').select('*,links:client_editorial_series_pillars(pillar_id)').eq('client_id',clientId).order('created_at');
  if (error) throw new Error(foundationError(error));
  return (data || []).map(({links,...row})=>({...row,pillar_ids:(links || []).map((link:{pillar_id:string})=>link.pillar_id)}));
}
export async function saveEditorialSeries(clientId: string, series: EditorialSeries) {
  clientRequired(clientId); revisionRequired(series.revision);
  if (series.client_id !== clientId || !series.name.trim()) throw new Error('Informe nome e cliente válidos.');
  if (new Set(series.pillar_ids).size !== series.pillar_ids.length) throw new Error('Pilares duplicados.');
  if (series.channels.some(channel=>!PRIMARY_CHANNELS.some(item=>item.value===channel))) throw new Error('Canal inválido.');
  return rpc<EditorialSeries>('save_client_editorial_series',{p_client_id:clientId,p_series_id:series.id,p_expected_revision:series.revision,p_input:series});
}
