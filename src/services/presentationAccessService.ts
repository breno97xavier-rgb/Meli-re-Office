import { supabase } from '../lib/supabase';
import {
  PresentationAccessLink,
  CreatePresentationAccessLinkResponse,
  PublicPresentationData,
  PublicPresentationError,
  PresentationItem,
} from '../types/presentations';
import {
  normalizePublicPresentationData,
} from './presentationDecisionContracts';
export { normalizePublicPresentationData } from './presentationDecisionContracts';

/**
 * Builds the canonical public URL for client presentation viewing.
 */
export function buildPublicPresentationUrl(token: string): string {
  if (!token) return '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${origin}/apresentacao/${token}`;
}

/**
 * Formats error responses into human-readable messages.
 */
function formatAccessError(err: unknown, fallbackMessage: string): string {
  if (!err) return fallbackMessage;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    if (record.message && typeof record.message === 'string') {
      if (record.message.includes('permission denied')) {
        return 'Permissão negada. É necessário estar autenticado como administrador para gerenciar links de acesso.';
      }
      if (record.message.includes('PREPARE_REVIEW_BEFORE_SHARING')) {
        return 'Prepare a versão para avaliação no editor antes de gerar o link. Para pareceres antigos, use Nova Rodada.';
      }
      if (record.message.includes('NOT_FOUND') || record.message.includes('not found')) {
        return 'Apresentação ou link de acesso não encontrado.';
      }
      return record.message;
    }
    if (record.error_description && typeof record.error_description === 'string') {
      return record.error_description;
    }
  }
  return fallbackMessage;
}

/**
 * Checks whether an access link record is currently active (not revoked and not expired).
 */
export function isAccessLinkActive(link: PresentationAccessLink | null | undefined): boolean {
  if (!link) return false;
  if (link.revoked_at) return false;
  if (link.expires_at) {
    const exp = new Date(link.expires_at).getTime();
    if (exp <= Date.now()) return false;
  }
  return true;
}

/**
 * Fetches the current active presentation access link for a presentation.
 * Returns null if no active link exists or if the existing links are all revoked/expired.
 */
export async function fetchPresentationAccessLink(
  presentationId: string
): Promise<PresentationAccessLink | null> {
  if (!presentationId) return null;

  try {
    const { data, error } = await supabase
      .from('presentation_access_links')
      .select('*')
      .eq('presentation_id', presentationId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Notice fetching presentation access link:', error.message || error);
      return null;
    }

    if (!data) return null;

    const link = data as PresentationAccessLink;
    const active = isAccessLinkActive(link);

    if (!active) {
      return null;
    }

    return {
      ...link,
      is_active: true,
    };
  } catch (err: unknown) {
    console.warn('Caught notice in fetchPresentationAccessLink:', err);
    return null;
  }
}

/**
 * Creates a new public presentation access link via the create_presentation_access_link RPC.
 * This is an explicit administrative action executed under the authenticated user's session.
 */
export async function createPresentationAccessLink(
  presentationId: string,
  expiresAt?: string | null
): Promise<CreatePresentationAccessLinkResponse> {
  if (!presentationId) {
    throw new Error('ID da apresentação é obrigatório para gerar o link de acesso.');
  }

  try {
    const rpcParams: Record<string, unknown> = {
      p_presentation_id: presentationId,
    };

    if (expiresAt) {
      rpcParams.p_expires_at = expiresAt;
    }

    const { data, error } = await supabase.rpc(
      'create_presentation_access_link',
      rpcParams
    );

    if (error) {
      console.error('Error in create_presentation_access_link RPC:', error);
      throw new Error(
        formatAccessError(error, 'Falha ao gerar novo link de acesso para a apresentação.')
      );
    }

    // Parse returned data (may be raw token string or object containing token/link info)
    let extractedToken = '';
    let linkId: string | undefined;
    let createdAt: string | undefined;
    let extractedExpiresAt: string | null | undefined = expiresAt;

    if (typeof data === 'string') {
      extractedToken = data;
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      extractedToken =
        (obj.token as string) ||
        (obj.access_token as string) ||
        (obj.plain_token as string) ||
        (obj.raw_token as string) ||
        (obj.public_token as string) ||
        '';
      linkId = (obj.id as string) || (obj.link_id as string);
      createdAt = obj.created_at as string;
      if (obj.expires_at !== undefined) {
        extractedExpiresAt = obj.expires_at as string | null;
      }
    }

    if (!extractedToken) {
      throw new Error('O servidor não retornou o token público de acesso esperado.');
    }

    const publicUrl = buildPublicPresentationUrl(extractedToken);

    // Fetch the updated access link record from the database to ensure state sync
    let linkRecord: PresentationAccessLink | null = null;
    try {
      linkRecord = await fetchPresentationAccessLink(presentationId);
    } catch (fetchErr) {
      console.warn('Could not immediately fetch created link record:', fetchErr);
    }

    return {
      id: linkId || linkRecord?.id,
      presentation_id: presentationId,
      token: extractedToken,
      public_url: publicUrl,
      created_at: createdAt || linkRecord?.created_at || new Date().toISOString(),
      expires_at: extractedExpiresAt ?? linkRecord?.expires_at ?? null,
      link: linkRecord
        ? {
            ...linkRecord,
            token: extractedToken,
            public_url: publicUrl,
            is_active: true,
          }
        : null,
    };
  } catch (err: unknown) {
    console.error('Error creating presentation access link:', err);
    throw new Error(formatAccessError(err, 'Erro ao criar link de acesso.'));
  }
}

/**
 * Revokes an existing presentation access link via the revoke_presentation_access_link RPC.
 * Once revoked, the link can no longer be used by clients to view the presentation.
 */
export async function revokePresentationAccessLink(
  linkId: string
): Promise<void> {
  if (!linkId) {
    throw new Error('ID do link de acesso é obrigatório para efetuar a revogação.');
  }

  try {
    const { error } = await supabase.rpc('revoke_presentation_access_link', {
      p_link_id: linkId,
    });

    if (error) {
      console.error('Error in revoke_presentation_access_link RPC:', error);
      throw new Error(
        formatAccessError(error, 'Falha ao revogar o link de acesso da apresentação.')
      );
    }
  } catch (err: unknown) {
    console.error('Error revoking presentation access link:', err);
    throw new Error(formatAccessError(err, 'Erro ao revogar link de acesso.'));
  }
}

/**
 * Parses any raw error into an institutional, user-friendly PublicPresentationError.
 */
export function parsePublicPresentationError(err: unknown): PublicPresentationError {
  if (!err) {
    return {
      type: 'SERVER_ERROR',
      title: 'Erro inesperado',
      message: 'Não foi possível carregar as informações desta apresentação.',
      actionHint: 'Tente recarregar a página em instantes.',
    };
  }

  const errObj = err as { message?: string; details?: string; hint?: string; code?: string };
  const msg = typeof err === 'string' ? err : errObj.message || errObj.details || '';
  const lowerMsg = msg.toLowerCase();

  if (
    lowerMsg.includes('invalid_access_token') ||
    lowerMsg.includes('invalid token') ||
    lowerMsg.includes('token_not_found') ||
    lowerMsg.includes('não encontrado')
  ) {
    return {
      type: 'INVALID_TOKEN',
      title: 'Apresentação não encontrada',
      message: 'O link de acesso informado é inválido ou não corresponde a uma apresentação ativa.',
      actionHint: 'Verifique se o link foi digitado corretamente ou solicite um novo link à equipe da Melière.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('access_token_revoked') ||
    lowerMsg.includes('token_revoked') ||
    lowerMsg.includes('revoked') ||
    lowerMsg.includes('revogado')
  ) {
    return {
      type: 'REVOKED_TOKEN',
      title: 'Link de acesso revogado',
      message: 'O link de acesso para esta apresentação foi desativado pela equipe da agência.',
      actionHint: 'Solicite um novo link atualizado à equipe da Melière Marketing.',
      rawError: err,
    };
  }

  if (
    lowerMsg.includes('access_token_expired') ||
    lowerMsg.includes('token_expired') ||
    lowerMsg.includes('expired') ||
    lowerMsg.includes('expirado')
  ) {
    return {
      type: 'EXPIRED_TOKEN',
      title: 'Link de acesso expirado',
      message: 'Este link de apresentação ultrapassou o período de validade configurado.',
      actionHint: 'Solicite um novo link de acesso à equipe da Melière Marketing.',
      rawError: err,
    };
  }

  if (lowerMsg.includes('presentation_not_found') || lowerMsg.includes('not found')) {
    return {
      type: 'NOT_FOUND',
      title: 'Apresentação indisponível',
      message: 'Esta apresentação não está disponível para visualização no momento.',
      actionHint: 'Entre em contato com a equipe da Melière Marketing.',
      rawError: err,
    };
  }

  return {
    type: 'SERVER_ERROR',
    title: 'Instabilidade temporária',
    message: 'Não foi possível estabelecer conexão para carregar os dados da apresentação.',
    actionHint: 'Por favor, tente recarregar a página em instantes.',
    rawError: err,
  };
}

/**
 * Loads a presentation securely via the public RPC get_public_presentation(p_token).
 * This endpoint is accessible anonymously without Melière Office credentials.
 */
export async function fetchPublicPresentation(token: string): Promise<PublicPresentationData> {
  if (!token || !token.trim()) {
    throw new Error('INVALID_ACCESS_TOKEN');
  }

  try {
    const { data, error } = await supabase.rpc('get_public_presentation', {
      p_token: token.trim(),
    });

    if (error) {
      console.error('[presentationAccessService] RPC get_public_presentation error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('PRESENTATION_NOT_FOUND');
    }

    return normalizePublicPresentationData(data);
  } catch (err: unknown) {
    console.error('[presentationAccessService] fetchPublicPresentation caught error:', err);
    throw err;
  }
}

/**
 * Resolves signed URLs for all assets referenced within a public presentation.
 */
export async function resolvePublicPresentationSignedUrls(token: string): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke('presentation-review-media', { body: { token } });
  if (error || !data?.urls) throw new Error('Não foi possível carregar os arquivos desta versão. Atualize a página.');
  return data.urls;
}
