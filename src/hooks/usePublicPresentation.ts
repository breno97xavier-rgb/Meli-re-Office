import { useState, useEffect, useCallback } from 'react';
import {
  PublicPresentationData,
  PublicPresentationError,
} from '../types/presentations';
import {
  fetchPublicPresentation,
  parsePublicPresentationError,
  resolvePublicPresentationSignedUrls,
} from '../services/presentationAccessService';

export function usePublicPresentation(token: string | null | undefined) {
  const [data, setData] = useState<PublicPresentationData | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [assetsResolving, setAssetsResolving] = useState<boolean>(false);
  const [error, setError] = useState<PublicPresentationError | null>(null);

  const loadPresentation = useCallback(async () => {
    if (!token || !token.trim()) {
      setError({
        type: 'INVALID_TOKEN',
        title: 'Link de acesso ausente',
        message: 'Nenhum token de apresentação foi fornecido na URL.',
        actionHint: 'Verifique o endereço digitado ou utilize o link completo enviado pela equipe da Melière.',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const presentation = await fetchPublicPresentation(token.trim());
      setData(presentation);

      // Resolve signed URLs for all assets in the presentation
      if (presentation.items && presentation.items.length > 0) {
        setAssetsResolving(true);
        try {
          const urls = await resolvePublicPresentationSignedUrls(presentation.items, 7200);
          setSignedUrls(urls);
        } catch (assetErr) {
          console.warn('[usePublicPresentation] Could not resolve asset signed URLs:', assetErr);
        } finally {
          setAssetsResolving(false);
        }
      }
    } catch (err: unknown) {
      console.error('[usePublicPresentation] Error loading presentation:', err);
      const parsed = parsePublicPresentationError(err);
      setError(parsed);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  return {
    data,
    signedUrls,
    loading,
    assetsResolving,
    error,
    reload: loadPresentation,
  };
}
