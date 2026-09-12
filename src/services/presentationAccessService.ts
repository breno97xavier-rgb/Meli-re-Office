import { supabase } from '../lib/supabase';
import {
  PresentationAccessLink,
  CreatePresentationAccessLinkResponse,
  PublicPresentationData,
  PublicPresentationError,
  PresentationItem,
  Presentation,
} from '../types/presentations';
import { Content } from '../types/contents';
import { ContentAsset } from '../types/contentAssets';
import { getContentAssetsSignedUrls } from './contentAssetsService';

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
 * Normalizes the raw JSON payload returned by public.get_public_presentation(p_token).
 */
export function normalizePublicPresentationData(raw: unknown): PublicPresentationData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('INVALID_DATA');
  }

  const root = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;

  // Normalize client
  let client = root.client;
  if (Array.isArray(client)) {
    client = client[0] || null;
  }

  // Normalize items / presentation_items
  const rawItems = (root.items || root.presentation_items || []) as unknown[];
  const items: PresentationItem[] = [];

  for (const rawItem of Array.isArray(rawItems) ? rawItems : []) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const itemObj = rawItem as Record<string, unknown>;

    // Normalize item content
    let content = itemObj.content;
    if (Array.isArray(content)) {
      content = content[0] || null;
    }
    if (content && typeof content === 'object') {
      const contentObj = content as Record<string, unknown>;
      let contentClient = contentObj.client;
      if (Array.isArray(contentClient)) {
        contentClient = contentClient[0] || null;
      }
      content = {
        ...contentObj,
        client: contentClient,
      };
    }

    // Normalize item assets
    const rawAssets = (itemObj.assets || itemObj.content_assets || []) as unknown[];
    const assets: ContentAsset[] = [];
    for (const rawAsset of Array.isArray(rawAssets) ? rawAssets : []) {
      if (!rawAsset || typeof rawAsset !== 'object') continue;
      assets.push(rawAsset as ContentAsset);
    }

    // Sort assets by display_order ASC
    assets.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    items.push({
      id: (itemObj.id as string) || '',
      presentation_id: (itemObj.presentation_id as string) || (root.id as string),
      content_id: (itemObj.content_id as string) || (content ? (content as Content).id : ''),
      display_order: typeof itemObj.display_order === 'number' ? itemObj.display_order : 0,
      presentation_notes: (itemObj.presentation_notes as string) || null,
      client_approval_status: (itemObj.client_approval_status as string) || 'pending',
      client_feedback: (itemObj.client_feedback as string) || null,
      reviewed_at: (itemObj.reviewed_at as string) || null,
      created_at: (itemObj.created_at as string) || (root.created_at as string),
      content: (content as Content) || null,
      assets,
    });
  }

  // Sort items by display_order ASC
  items.sort((a, b) => a.display_order - b.display_order);

  return {
    id: (root.id as string) || '',
    client_id:
      (root.client_id as string) ||
      (client ? ((client as Record<string, unknown>).id as string) : ''),
    title: (root.title as string) || 'Apresentação de Conteúdos',
    description: (root.description as string) || null,
    status: (root.status as string) || 'sent',
    round_number: typeof root.round_number === 'number' ? root.round_number : 1,
    sent_at: (root.sent_at as string) || null,
    created_by: (root.created_by as string) || null,
    created_at: (root.created_at as string) || new Date().toISOString(),
    updated_at: (root.updated_at as string) || new Date().toISOString(),
    client: (client as Presentation['client']) || null,
    items_count: items.length,
    items,
    access_info: root.access_info as
      | { expires_at?: string | null; created_at?: string }
      | undefined,
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
export async function resolvePublicPresentationSignedUrls(
  items: PresentationItem[],
  expiresInSeconds: number = 7200
): Promise<Record<string, string>> {
  if (!items || items.length === 0) return {};

  const storagePaths: string[] = [];
  for (const item of items) {
    if (item.assets && Array.isArray(item.assets)) {
      for (const asset of item.assets) {
        if (asset.file_url && typeof asset.file_url === 'string') {
          storagePaths.push(asset.file_url);
        }
      }
    }
  }

  if (storagePaths.length === 0) return {};

  return getContentAssetsSignedUrls(storagePaths, expiresInSeconds);
}

