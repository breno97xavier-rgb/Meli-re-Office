import { supabase } from '../lib/supabase';
import type { Content, CreateContentInput } from '../types/contents';
import type { EditorialApplication, EditorialContentLink } from '../types/editorialExecution';
import { foundationError } from './planningFoundationService';

export function executionError(error: unknown): string {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message || '';
  if (/cycle_already_applied|slot_already_linked/.test(message)) return 'Esta posição já foi preenchida. Atualize para consultar o vínculo salvo.';
  if (/content_other_cycle|linked_content_scope_immutable/.test(message)) return 'Este conteúdo já pertence a outro ciclo. O vínculo existente foi preservado.';
  if (/unavailable|mismatch/.test(message)) return 'O ciclo, vaga ou conteúdo não está disponível para este cliente. Atualize e confira os vínculos.';
  if (/unique|duplicate/.test(message)) return 'Este conteúdo já está vinculado a uma vaga. Escolha outra peça.';
  if (/permission_denied|42501/.test(message)) return 'Você precisa de permissão de operação em Planejamento e Conteúdos para esta ação.';
  return foundationError(error);
}
function required(...ids: string[]) { if (ids.some(id => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Identificação inválida. Atualize o planejamento.'); }
export async function getEditorialApplication(clientId: string, planId: string): Promise<EditorialApplication | null> {
  required(clientId, planId);
  const { data, error } = await supabase.from('editorial_cycle_applications').select('*').eq('client_id', clientId).eq('editorial_plan_id', planId).maybeSingle();
  if (error) throw new Error(executionError(error)); return data;
}
export async function getEditorialContentLinks(clientId: string, applicationId: string): Promise<EditorialContentLink[]> {
  required(clientId, applicationId);
  const { data, error } = await supabase.from('editorial_cycle_content_links').select('*').eq('client_id', clientId).eq('application_id', applicationId);
  if (error) throw new Error(executionError(error)); return data || [];
}
export async function applyEditorialTemplate(clientId: string, planId: string, templateId: string, revision: number): Promise<EditorialApplication> {
  required(clientId, planId, templateId);
  if (!Number.isInteger(revision) || revision < 1) throw new Error('Salve e atualize a versão do modelo.');
  const { data, error } = await supabase.rpc('apply_editorial_template', { p_client_id: clientId, p_plan_id: planId, p_template_id: templateId, p_revision: revision });
  if (error) throw new Error(executionError(error)); if (!data) throw new Error('Aplicação não confirmada. Atualize antes de tentar novamente.'); return data;
}
export async function resolveEditorialSlotContent(clientId: string, applicationId: string, slotId: string, unit: number, request: { contentId: string } | { input: CreateContentInput }): Promise<Content> {
  required(clientId, applicationId, slotId);
  if (!Number.isInteger(unit) || unit < 1 || unit > 1000) throw new Error('Unidade inválida.');
  let input: Record<string, unknown> | null = null;
  if ('contentId' in request) required(request.contentId);
  else {
    if (request.input.client_id !== clientId || !request.input.internal_title.trim() || !['feed_single','carousel','reels','story'].includes(request.input.format)) throw new Error('Confira cliente, título e formato.');
    const { client_id: _client, editorial_plan_id: _plan, pillar: _pillar, ...fields } = request.input;
    input = { ...fields, editorial_status: 'draft' };
  }
  const { data, error } = await supabase.rpc('resolve_editorial_slot_content', { p_client_id: clientId, p_application_id: applicationId, p_slot_id: slotId, p_unit_index: unit,
    p_content_id: 'contentId' in request ? request.contentId : null, p_input: input });
  if (error) throw new Error(executionError(error)); if (!data) throw new Error('Gravação não confirmada. Atualize a vaga antes de tentar novamente.'); return data;
}
