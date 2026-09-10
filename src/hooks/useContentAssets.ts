import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ContentAsset,
  ContentAssetType,
} from '../types/contentAssets';
import {
  fetchContentAssets,
  uploadContentAsset,
  replaceContentAsset,
  reorderContentAssets,
  removeCurrentAsset,
  getContentAssetsSignedUrls,
  getContentAssetSignedUrl,
  downloadContentAsset,
} from '../services/contentAssetsService';

export function useContentAssets(clientId?: string, contentId?: string) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refreshAssets = useCallback(async () => {
    if (!contentId) {
      setAssets([]);
      setSignedUrls({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchContentAssets(contentId);
      setAssets(data);

      // Generate signed URLs for all assets
      const paths = data.map((a) => a.file_url).filter(Boolean);
      if (paths.length > 0) {
        const urls = await getContentAssetsSignedUrls(paths);
        setSignedUrls(urls);
      } else {
        setSignedUrls({});
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao carregar assets do conteúdo.';
      setError(msg);
      console.error('Error in refreshAssets:', err);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  const currentAssets = useMemo(
    () => assets.filter((a) => a.is_current).sort((a, b) => a.display_order - b.display_order),
    [assets]
  );

  const historyAssets = useMemo(
    () =>
      assets
        .filter((a) => !a.is_current)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [assets]
  );

  const uploadAsset = async (
    file: File,
    assetType: ContentAssetType,
    displayOrder?: number
  ): Promise<ContentAsset | null> => {
    if (!clientId || !contentId) {
      setUploadError('Cliente ou Conteúdo não identificados.');
      return null;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const newAsset = await uploadContentAsset({
        clientId,
        contentId,
        file,
        assetType,
        displayOrder,
      });

      // Fetch signed URL for the new asset
      if (newAsset.file_url) {
        try {
          const url = await getContentAssetSignedUrl(newAsset.file_url);
          setSignedUrls((prev) => ({ ...prev, [newAsset.file_url]: url }));
        } catch (signedErr) {
          console.warn('Could not generate signed URL immediately:', signedErr);
        }
      }

      await refreshAssets();
      return newAsset;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao enviar arquivo.';
      setUploadError(msg);
      console.error('Error in uploadAsset:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const replaceAsset = async (
    targetAssetId: string,
    file: File
  ): Promise<ContentAsset | null> => {
    if (!clientId || !contentId || !targetAssetId) {
      setUploadError('Dados insuficientes para substituir o asset.');
      return null;
    }

    try {
      setActionLoadingId(targetAssetId);
      setUploadError(null);

      const newAsset = await replaceContentAsset({
        clientId,
        contentId,
        targetAssetId,
        file,
      });

      if (newAsset.file_url) {
        try {
          const url = await getContentAssetSignedUrl(newAsset.file_url);
          setSignedUrls((prev) => ({ ...prev, [newAsset.file_url]: url }));
        } catch (signedErr) {
          console.warn('Could not generate signed URL immediately:', signedErr);
        }
      }

      await refreshAssets();
      return newAsset;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao substituir arquivo.';
      setUploadError(msg);
      console.error('Error in replaceAsset:', err);
      return null;
    } finally {
      setActionLoadingId(null);
    }
  };

  const reorderSlides = async (orderedAssetIds: string[]): Promise<boolean> => {
    if (!contentId || orderedAssetIds.length === 0) return false;

    try {
      setLoading(true);
      setError(null);
      await reorderContentAssets(contentId, orderedAssetIds);
      await refreshAssets();
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao reordenar slides.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeSlide = async (assetId: string): Promise<boolean> => {
    if (!contentId || !assetId) return false;

    try {
      setActionLoadingId(assetId);
      setError(null);
      await removeCurrentAsset(assetId, contentId);
      await refreshAssets();
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao remover slide.';
      setError(msg);
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const downloadAsset = async (asset: ContentAsset): Promise<void> => {
    if (!asset.file_url) {
      setError('Caminho do arquivo não localizado.');
      return;
    }

    try {
      setActionLoadingId(asset.id);
      setError(null);
      await downloadContentAsset(asset.file_url, asset.file_name);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao baixar o arquivo.';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getSignedUrlForPath = useCallback(
    (storagePath?: string | null): string | undefined => {
      if (!storagePath) return undefined;
      return signedUrls[storagePath];
    },
    [signedUrls]
  );

  return {
    assets,
    currentAssets,
    historyAssets,
    signedUrls,
    loading,
    uploading,
    actionLoadingId,
    error,
    uploadError,
    setUploadError,
    refreshAssets,
    uploadAsset,
    replaceAsset,
    reorderSlides,
    removeSlide,
    downloadAsset,
    getSignedUrlForPath,
  };
}
