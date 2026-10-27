import { supabase } from '../lib/supabase';
import { validatePublication } from './publicationContracts';
import type { PublicationInput, PublicationPiece, PublicationRow, Publication } from '../types/publications';

async function context() {
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user) throw new Error('Entre no Office para acessar Publicações.');
  const memberships = await supabase.from('workspace_members').select('workspace_id,workspace:workspaces!inner(status)')
    .eq('user_id',user.data.user.id).eq('status','active').in('role',['owner','admin']).eq('workspace.status','active');
  const ids = [...new Set<string>((memberships.data || []).map(row => row.workspace_id))];
  if (memberships.error || ids.length !== 1) throw new Error('Confirme uma única agência ativa como administrador.');
  return ids[0];
}
const pieceFields = 'id,internal_title,editorial_status,client_id,client:clients!inner(id,name,commercial_name,workspace_id)';
export async function fetchPublicationData(): Promise<{ rows: PublicationRow[]; pieces: PublicationPiece[] }> {
  const workspace = await context();
  const pieces: PublicationPiece[] = [], rows: PublicationRow[] = [];
  // Both lists are paginated; never display a silently truncated publication queue.
  for (let offset=0;;offset+=500) {
    const result = await supabase.from('contents').select(pieceFields).eq('client.workspace_id',workspace).order('id').range(offset,offset+499);
    if (result.error) throw new Error('Não foi possível carregar as peças editoriais.');
    pieces.push(...(result.data || []) as unknown as PublicationPiece[]);
    if (!result.data || result.data.length < 500) break;
  }
  for (let offset=0;;offset+=500) {
    const result = await supabase.from('publications').select(`*,content:contents!inner(${pieceFields})`).eq('content.client.workspace_id',workspace).order('id').range(offset,offset+499);
    if (result.error) throw new Error('Não foi possível carregar as publicações.');
    rows.push(...(result.data || []) as unknown as PublicationRow[]);
    if (!result.data || result.data.length < 500) break;
  }
  return { rows, pieces };
}
export async function savePublication(id: string, input: PublicationInput, previous?: Publication) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Registro inválido.');
  const payload = validatePublication(input), workspace = await context();
  if (previous && (previous.id !== id || previous.content_id !== payload.content_id)) throw new Error('A peça de origem não pode ser trocada.');
  const piece = await supabase.from('contents').select('id,client:clients!inner(workspace_id)').eq('id',payload.content_id).eq('client.workspace_id',workspace).single();
  if (piece.error || !piece.data) throw new Error('Peça indisponível nesta agência. Atualize a lista.');
  const query = previous
    ? supabase.from('publications').update(payload).eq('id',id).eq('content_id',payload.content_id).eq('updated_at',previous.updated_at)
    : supabase.from('publications').insert({id,...payload});
  const result = await query.select('*').single();
  if (result.error || !result.data) throw new Error('Salvamento sem confirmação ou registro alterado por outra sessão. Atualize a lista antes de tentar novamente.');
  return result.data as Publication;
}
