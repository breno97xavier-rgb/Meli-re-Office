import { supabase } from '../lib/supabase';
import {
  ProposalDocument,
  ProposalDocumentItem,
  SaveProposalDocumentInput,
} from '../types/proposals';

interface RawProposalDocumentItemRow {
  id: string;
  proposal_document_id: string;
  proposal_item_id: string;
  display_title: string | null;
  presentation_text: string | null;
  deliverables: unknown;
  created_at: string;
  updated_at: string;
}

interface RpcProposalDocumentItemPayload {
  proposal_item_id: string;
  display_title: string | null;
  presentation_text: string | null;
  deliverables: string[];
}

/**
 * Normalizes deliverables from JSONB to string array.
 */
function normalizeDeliverables(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  return [];
}

/**
 * Fetches the proposal document and its items for a specific proposal.
 * If no document exists yet, returns null without throwing an error.
 */
export async function fetchProposalDocument(
  proposalId: string
): Promise<ProposalDocument | null> {
  if (!proposalId) return null;

  const { data, error } = await supabase
    .from('proposal_documents')
    .select(`
      *,
      items:proposal_document_items(*)
    `)
    .eq('proposal_id', proposalId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching proposal document:', error);
    throw new Error(error.message || 'Erro ao buscar documento da proposta.');
  }

  if (!data) return null;

  const rawItems = (
    Array.isArray(data.items) ? data.items : []
  ) as RawProposalDocumentItemRow[];

  const normalizedItems: ProposalDocumentItem[] = rawItems.map((item) => ({
    id: item.id,
    proposal_document_id: item.proposal_document_id,
    proposal_item_id: item.proposal_item_id,
    display_title: item.display_title || null,
    presentation_text: item.presentation_text || null,
    deliverables: normalizeDeliverables(item.deliverables),
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return {
    id: data.id,
    proposal_id: data.proposal_id,
    introduction: data.introduction || null,
    scope_summary: data.scope_summary || null,
    closing_text: data.closing_text || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    items: normalizedItems,
  };
}

/**
 * Saves the proposal document atomically using the Supabase RPC `save_proposal_document`.
 * Prepares and sanitizes inputs before delegating atomic execution to PostgreSQL.
 */
export async function saveProposalDocument(
  input: SaveProposalDocumentInput
): Promise<ProposalDocument> {
  if (!input.proposal_id) {
    throw new Error('Identificador da proposta é obrigatório.');
  }

  const pIntroduction = input.introduction?.trim() || null;
  const pScopeSummary = input.scope_summary?.trim() || null;
  const pClosingText = input.closing_text?.trim() || null;

  const sanitizedItems: RpcProposalDocumentItemPayload[] = (
    input.items || []
  ).map((item) => ({
    proposal_item_id: item.proposal_item_id,
    display_title: item.display_title?.trim() || null,
    presentation_text: item.presentation_text?.trim() || null,
    deliverables: (item.deliverables || [])
      .map((d) => d.trim())
      .filter(Boolean),
  }));

  // Atomic call to RPC save_proposal_document
  const { error: rpcError } = await supabase.rpc('save_proposal_document', {
    p_proposal_id: input.proposal_id,
    p_introduction: pIntroduction,
    p_scope_summary: pScopeSummary,
    p_closing_text: pClosingText,
    p_items: sanitizedItems,
  });

  if (rpcError) {
    console.error('Error in save_proposal_document RPC:', rpcError);
    throw new Error(
      rpcError.message || 'Erro ao salvar documento da proposta.'
    );
  }

  // Refetch the complete document with fresh items
  const refreshed = await fetchProposalDocument(input.proposal_id);
  if (!refreshed) {
    throw new Error('Erro ao recarregar documento após gravação.');
  }

  return refreshed;
}
