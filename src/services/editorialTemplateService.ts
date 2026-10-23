import { supabase } from '../lib/supabase';
import { foundationError } from './planningFoundationService';
import { validateEditorialTemplate } from '../utils/editorialTemplates';
import type { EditorialTemplate, EditorialTemplateDraft, EditorialTemplateRevision } from '../types/editorialTemplates';

export function editorialTemplateError(error: unknown): string {
  const message = (error as { message?: string })?.message || '';
  if (message.includes('invalid_template_reference')) return 'Um pilar, série ou campanha não está disponível para este cliente. Atualize e revise os vínculos; seu rascunho foi preservado.';
  if (message.includes('duplicate_destination')) return 'Há destinos repetidos na mesma vaga. Revise o canal e o perfil.';
  if (message.includes('duplicate_slot')) return 'Duas vagas têm a mesma identificação. Atualize os dados antes de salvar.';
  if (/invalid_(template|position_count|slots?|destination|reference)|too_many_(slots|destinations)/.test(message)) return 'Revise as posições, quantidades e campos do modelo antes de salvar.';
  return foundationError(error);
}

export async function getEditorialTemplates(clientId: string): Promise<EditorialTemplate[]> {
  if (!clientId) throw new Error('Selecione um cliente.');
  const { data, error } = await supabase.from('client_editorial_templates').select('*').eq('client_id', clientId).order('created_at');
  if (error) throw new Error(editorialTemplateError(error));
  return data || [];
}

export async function saveEditorialTemplate(clientId: string, draft: EditorialTemplateDraft): Promise<EditorialTemplate> {
  validateEditorialTemplate(draft);
  if (draft.client_id !== clientId) throw new Error('O modelo pertence a outro cliente.');
  const { data, error } = await supabase.rpc('save_client_editorial_template', {
    p_client_id: clientId, p_template_id: draft.id, p_expected_revision: draft.revision,
    p_input: { name: draft.name.trim(), position_count: draft.position_count, notes: draft.notes,
      slots: draft.slots, is_active: draft.is_active },
  });
  if (error) throw new Error(editorialTemplateError(error));
  if (!data) throw new Error('Gravação não confirmada. Atualize antes de tentar novamente.');
  return data;
}

export async function getEditorialTemplateRevisions(clientId: string, templateId: string): Promise<EditorialTemplateRevision[]> {
  if (!clientId || !templateId) throw new Error('Selecione cliente e modelo.');
  const { data, error } = await supabase.from('client_editorial_template_revisions')
    .select('revision,snapshot,changed_at').eq('client_id', clientId).eq('template_id', templateId).order('revision', { ascending: false });
  if (error) throw new Error(editorialTemplateError(error));
  return data || [];
}
