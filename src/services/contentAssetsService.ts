import { supabase } from '../lib/supabase';
import {
  ContentAsset,
  ContentAssetType,
  UploadContentAssetInput,
  ReplaceContentAssetInput,
} from '../types/contentAssets';

export const CONTENT_ASSETS_BUCKET = 'content-assets';
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
];

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_MIME_TYPES = ['video/mp4'];

/**
 * Formats byte size into human readable string (e.g. "2.4 MB")
 */
export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i] || 'B'}`;
}

/**
 * Validates file constraints (existence, MIME type, max size).
 */
export function validateAssetFile(file: File, expectedType?: ContentAssetType): void {
  if (!file) {
    throw new Error('Nenhum arquivo foi selecionado.');
  }

  if (file.size <= 0) {
    throw new Error('O arquivo selecionado está vazio (0 bytes).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('O arquivo excede o limite máximo permitido de 50 MB.');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Formato de arquivo não suportado (${file.type || 'desconhecido'}). Envie imagens (JPG, PNG, WebP) ou vídeos (MP4).`
    );
  }

  if (expectedType === 'image' && !IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error('Para este campo, selecione uma imagem válida (JPG, PNG ou WebP).');
  }

  if (expectedType === 'thumbnail' && !IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error('A thumbnail deve ser uma imagem válida (JPG, PNG ou WebP).');
  }

  if (expectedType === 'video' && !VIDEO_MIME_TYPES.includes(file.type)) {
    throw new Error('Para este campo, selecione um vídeo válido em formato MP4.');
  }
}

/**
 * Extracts file extension from file name or mime type.
 */
function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase();
    if (ext && /^[a-z0-9]+$/.test(ext)) return ext;
  }

  // Fallback by mime type
  switch (file.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'video/mp4':
      return 'mp4';
    default:
      return 'bin';
  }
}

async function resolveAssetWorkspace(clientId: string, contentId: string): Promise<string> {
  const { data: content, error: contentError } = await supabase.from('contents')
    .select('client_id').eq('id', contentId).eq('client_id', clientId).single();
  if (contentError || content?.client_id !== clientId) {
    throw new Error('Conteúdo não encontrado ou não pertence ao cliente informado. Atualize a página antes de enviar o arquivo.');
  }
  const { data: client, error: clientError } = await supabase.from('clients')
    .select('workspace_id').eq('id', clientId).single();
  if (clientError || !client?.workspace_id) {
    throw new Error('Cliente não encontrado ou workspace inválido para armazenamento.');
  }
  return client.workspace_id;
}

/**
 * Fetches all assets for a given content item, sorted by display_order ASC, version DESC.
 */
export async function fetchContentAssets(contentId: string): Promise<ContentAsset[]> {
  if (!contentId) return [];

  const { data, error } = await supabase
    .from('content_assets')
    .select('*')
    .eq('content_id', contentId)
    .order('display_order', { ascending: true })
    .order('version', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching content assets:', error);
    throw new Error(error.message || 'Erro ao carregar assets do conteúdo.');
  }

  return (data || []) as ContentAsset[];
}

/**
 * Uploads a new content asset to private Supabase Storage and records metadata.
 * Uses compensating transaction to remove uploaded file if DB insert fails.
 */
export async function uploadContentAsset(
  input: UploadContentAssetInput
): Promise<ContentAsset> {
  const { clientId, contentId, file, assetType, displayOrder } = input;

  if (!clientId) {
    throw new Error('Cliente inválido para armazenamento do asset.');
  }
  if (!contentId) {
    throw new Error('Conteúdo inválido para armazenamento do asset.');
  }

  validateAssetFile(file, assetType);
  if (!['image', 'video', 'thumbnail'].includes(assetType)) {
    throw new Error('Tipo de mídia inválido.');
  }
  if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 2147483647)) {
    throw new Error('A ordem do arquivo deve ser um número inteiro válido maior ou igual a zero.');
  }
  const workspaceId = await resolveAssetWorkspace(clientId, contentId);
  // Resolve the order before upload. A failed read must not create an orphan or guess zero.
  let finalDisplayOrder = displayOrder ?? 0;
  if (displayOrder === undefined) {
    const existing = await fetchContentAssets(contentId);
    const currentOfSameType = existing.filter(a => a.is_current && a.asset_type === assetType);
    if (currentOfSameType.length) finalDisplayOrder = Math.max(...currentOfSameType.map(a => a.display_order)) + 1;
    if (!Number.isInteger(finalDisplayOrder) || finalDisplayOrder < 0 || finalDisplayOrder > 2147483647) {
      throw new Error('Não foi possível determinar uma ordem válida para o arquivo.');
    }
  }

  // Generate canonical storage path: workspace/<workspace_id>/clients/<client_id>/contents/<content_id>/<uuid>.<ext>
  const fileUuid = crypto.randomUUID();
  const ext = getFileExtension(file);
  const storagePath = `workspace/${workspaceId}/clients/${clientId}/contents/${contentId}/${fileUuid}.${ext}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(uploadError.message || 'Falha no envio do arquivo para o Storage.');
  }

  // 3. Insert metadata record in content_assets
  try {
    const { data, error: dbError } = await supabase
      .from('content_assets')
      .insert([
        {
          content_id: contentId,
          asset_type: assetType,
          file_url: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          version: 1,
          display_order: finalDisplayOrder,
          is_current: true,
        },
      ])
      .select('*')
      .single();

    if (dbError) {
      throw dbError;
    }

    return data as ContentAsset;
  } catch (dbErr: unknown) {
    console.error('Error inserting content asset record in DB:', dbErr);

    // Compensating transaction: remove newly uploaded file to prevent orphans
    try {
      await supabase.storage
        .from(CONTENT_ASSETS_BUCKET)
        .remove([storagePath]);
    } catch (cleanupErr) {
      console.error(
        'Compensation cleanup failed for asset path:',
        storagePath,
        cleanupErr
      );
    }

    const message =
      dbErr instanceof Error
        ? dbErr.message
        : 'Falha ao registrar dados do asset no banco.';
    throw new Error(message);
  }
}

/**
 * Replaces an existing content asset with a new version.
 * Marks the previous asset as `is_current = false` and inserts the new one with `version = previous.version + 1`.
 * Uses compensating cleanup if DB operations fail.
 */
export async function replaceContentAsset(
  input: ReplaceContentAssetInput
): Promise<ContentAsset> {
  const { clientId, contentId, targetAssetId, file } = input;

  if (!clientId || !contentId || !targetAssetId) {
    throw new Error('Parâmetros obrigatórios ausentes para substituição do asset.');
  }

  // Fetch the target asset to get its properties (display_order, asset_type, version)
  const { data: targetAsset, error: fetchErr } = await supabase
    .from('content_assets')
    .select('*')
    .eq('id', targetAssetId)
    .eq('content_id', contentId)
    .eq('is_current', true)
    .single();

  if (fetchErr || !targetAsset || targetAsset.content_id !== contentId || !targetAsset.is_current) {
    throw new Error('Arquivo atual não encontrado neste conteúdo. Atualize a página antes de substituir.');
  }

  const assetType = targetAsset.asset_type as ContentAssetType;
  validateAssetFile(file, assetType);

  const workspaceId = await resolveAssetWorkspace(clientId, contentId);

  // Generate canonical storage path: workspace/<workspace_id>/clients/<client_id>/contents/<content_id>/<uuid>.<ext>
  const fileUuid = crypto.randomUUID();
  const ext = getFileExtension(file);
  const storagePath = `workspace/${workspaceId}/clients/${clientId}/contents/${contentId}/${fileUuid}.${ext}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error during replacement:', uploadError);
    throw new Error(uploadError.message || 'Falha no envio do novo arquivo.');
  }

  // 2. Perform DB operations: mark old asset is_current = false, insert new asset
  let replacementRejected = false;
  try {
    const { data: newAsset, error: insertErr } = await supabase.rpc('mutate_content_asset_version', {
      p_content_id: contentId, p_target_id: targetAssetId,
      p_file: { file_url: storagePath, file_name: file.name, file_size_bytes: file.size, mime_type: file.type },
    });
    if (insertErr) {
      replacementRejected = /^[0-9A-Z]{5}$/.test(insertErr.code || '');
      throw insertErr;
    }
    if (!newAsset) throw new Error('Resultado indeterminado da substituição. Atualize antes de repetir.');

    return newAsset as ContentAsset;
  } catch (dbErr: unknown) {
    console.error('Error updating asset versions in DB:', dbErr);

    // Compensating transaction: remove the newly uploaded file
    try {
      if (replacementRejected) await supabase.storage
        .from(CONTENT_ASSETS_BUCKET)
        .remove([storagePath]);
    } catch (cleanupErr) {
      console.error('Compensation cleanup failed for path:', storagePath, cleanupErr);
    }

    const message =
      dbErr instanceof Error
        ? dbErr.message
        : 'Falha ao atualizar versão do asset no banco.';
    throw new Error(message);
  }
}

/**
 * Reorders active carousel slides.
 * Updates display_order for each given asset id according to array index.
 */
export async function reorderContentAssets(
  contentId: string,
  orderedAssetIds: string[]
): Promise<void> {
  if (!contentId || !orderedAssetIds || orderedAssetIds.length === 0) return;

  const { error } = await supabase.rpc('mutate_content_asset_version', { p_content_id: contentId, p_order: orderedAssetIds });
  if (error) throw new Error(error.message || 'Erro ao reordenar slides do carrossel.');
}

/**
 * Removes an active asset from the active view by marking is_current = false,
 * and re-indexes remaining active assets of the same type so display_order remains continuous.
 */
export async function removeCurrentAsset(
  assetId: string,
  contentId: string
): Promise<void> {
  if (!assetId || !contentId) return;

  const { error } = await supabase.rpc('mutate_content_asset_version', { p_content_id: contentId, p_target_id: assetId, p_remove: true });
  if (error) throw new Error(error.message || 'Erro ao desativar arquivo.');
}

/**
 * Generates a temporary signed URL for viewing a private asset.
 */
export async function getContentAssetSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!storagePath) {
    throw new Error('Caminho do arquivo não fornecido.');
  }

  const { data, error } = await supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error('Error generating signed URL for asset:', error);
    throw new Error(
      error?.message || 'Erro ao gerar link de visualização segura do arquivo.'
    );
  }

  return data.signedUrl;
}

/**
 * Generates signed URLs for multiple storage paths in batch.
 */
export async function getContentAssetsSignedUrls(
  storagePaths: string[],
  expiresInSeconds: number = 3600
): Promise<Record<string, string>> {
  if (!storagePaths || storagePaths.length === 0) return {};

  const uniquePaths = Array.from(new Set(storagePaths.filter(Boolean)));
  const urlMap: Record<string, string> = {};

  const promises = uniquePaths.map(async (path) => {
    try {
      const url = await getContentAssetSignedUrl(path, expiresInSeconds);
      urlMap[path] = url;
    } catch (err) {
      console.warn(`Could not get signed URL for ${path}:`, err);
    }
  });

  await Promise.all(promises);
  return urlMap;
}

/**
 * Downloads an asset directly from the private bucket and triggers a browser download with the original filename.
 */
export async function downloadContentAsset(
  storagePath: string,
  originalFilename: string
): Promise<void> {
  if (!storagePath) {
    throw new Error('Caminho do arquivo não informado.');
  }

  const { data, error } = await supabase.storage
    .from(CONTENT_ASSETS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error('Error downloading asset blob:', error);
    throw new Error(error?.message || 'Erro ao baixar o arquivo do Storage.');
  }

  const blobUrl = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = originalFilename || 'arquivo';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
