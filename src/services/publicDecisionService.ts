import { supabase } from '../lib/supabase';
import {
  PublicDecisionSubmissionInput,
  PublicDecisionResponse,
} from '../types/presentations';

export interface PublicDecisionError {
  code:
    | 'INVALID_ACCESS_TOKEN'
    | 'ACCESS_TOKEN_REVOKED'
    | 'ACCESS_TOKEN_EXPIRED'
    | 'INVALID_ITEM'
    | 'INVALID_DECISION_STATUS'
    | 'FEEDBACK_REQUIRED'
    | 'ITEM_ALREADY_REVIEWED'
    | 'UNKNOWN_ERROR';
  title: string;
  message: string;
  actionHint?: string;
  rawError?: unknown;
}

/**
 * Parses functional error codes returned by the public decision RPC.
 */
export function parsePublicDecisionError(err: unknown): PublicDecisionError {
  const errObj = err as { message?: string; details?: string; hint?: string; code?: string };
  const msg = typeof err === 'string' ? err : errObj?.message || errObj?.details || '';
  const lowerMsg = msg.toLowerCase();

  if (
    lowerMsg.includes('item_already_reviewed') ||
    lowerMsg.includes('already reviewed') ||
    lowerMsg.includes('já foi avaliado')
  ) {
    return {
      code: 'ITEM_ALREADY_REVIEWED',
      title: 'Conteúdo já avaliado',
      message: 'Este conteúdo já recebeu uma avaliação anterior e sua decisão foi registrada com segurança.',
      actionHint: 'Navegue pelos demais conteúdos para continuar a avaliação desta rodada.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('feedback_required') ||
    lowerMsg.includes('feedback is required') ||
    lowerMsg.includes('feedback obrigatório')
  ) {
    return {
      code: 'FEEDBACK_REQUIRED',
      title: 'Feedback obrigatório',
      message: 'Por favor, descreva detalhadamente os ajustes necessários ou o motivo da recusa antes de enviar.',
      actionHint: 'Preencha o campo de texto com suas orientações para a equipe da Melière.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('invalid_access_token') ||
    lowerMsg.includes('invalid token') ||
    lowerMsg.includes('token_not_found')
  ) {
    return {
      code: 'INVALID_ACCESS_TOKEN',
      title: 'Link de acesso inválido',
      message: 'O link de apresentação utilizado não é válido ou foi corrompido.',
      actionHint: 'Solicite um novo link à equipe da Melière Marketing.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('access_token_revoked') ||
    lowerMsg.includes('token_revoked') ||
    lowerMsg.includes('revogado')
  ) {
    return {
      code: 'ACCESS_TOKEN_REVOKED',
      title: 'Link de acesso revogado',
      message: 'O link de acesso para esta apresentação foi desativado.',
      actionHint: 'Solicite um novo link atualizado à equipe da Melière.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('access_token_expired') ||
    lowerMsg.includes('token_expired') ||
    lowerMsg.includes('expirado')
  ) {
    return {
      code: 'ACCESS_TOKEN_EXPIRED',
      title: 'Link de acesso expirado',
      message: 'O prazo de validade deste link de apresentação foi atingido.',
      actionHint: 'Solicite uma nova chave de visualização à agência.',
      rawError: err,
    };
  }

  if (lowerMsg.includes('invalid_item')) {
    return {
      code: 'INVALID_ITEM',
      title: 'Conteúdo não localizado',
      message: 'O item selecionado não pertence a esta apresentação ou não está mais ativo.',
      actionHint: 'Atualize a página para recarregar a lista atual de peças.',
      rawError: err,
    };
  }

  if (lowerMsg.includes('invalid_decision_status')) {
    return {
      code: 'INVALID_DECISION_STATUS',
      title: 'Status inválido',
      message: 'A ação solicitada não é reconhecida pela plataforma.',
      actionHint: 'Selecione uma das opções disponíveis na tela.',
      rawError: err,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    title: 'Falha ao registrar decisão',
    message: 'Ocorreu uma instabilidade temporária ao salvar sua avaliação.',
    actionHint: 'Por favor, tente novamente em instantes.',
    rawError: err,
  };
}

/**
 * Submits a client decision (approved, changes_requested, rejected) for a single presentation item.
 * Calls the secure SECURITY DEFINER RPC `submit_public_presentation_decision`.
 */
export async function submitPublicPresentationDecision(
  input: PublicDecisionSubmissionInput
): Promise<PublicDecisionResponse> {
  const token = (input.token || '').trim();
  const itemId = input.itemId;
  const status = input.status;
  const feedback = input.feedback ? input.feedback.trim() : null;

  if (!token) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  if (!itemId) {
    throw new Error('INVALID_ITEM');
  }

  if (!['approved', 'changes_requested', 'rejected'].includes(status)) {
    throw new Error('INVALID_DECISION_STATUS');
  }

  if (['changes_requested', 'rejected'].includes(status) && (!feedback || feedback.length === 0)) {
    throw new Error('FEEDBACK_REQUIRED');
  }

  const { data, error } = await supabase.rpc('submit_public_presentation_decision', {
    p_token: token,
    p_item_id: itemId,
    p_status: status,
    p_feedback: feedback || null,
  });

  if (error) {
    console.error('[publicDecisionService] RPC submit_public_presentation_decision error:', error);
    throw error;
  }

  if (!data) {
    throw new Error('INVALID_RESPONSE');
  }

  const res = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;

  return {
    item_id: String(res.item_id || itemId),
    client_approval_status: (res.client_approval_status as string) || status,
    client_feedback: (res.client_feedback as string) || feedback || null,
    reviewed_at: (res.reviewed_at as string) || new Date().toISOString(),
    presentation_id: (res.presentation_id as string) || '',
    presentation_status: (res.presentation_status as string) || 'in_review',
  };
}
