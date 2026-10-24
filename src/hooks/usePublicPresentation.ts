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
          const urls = await resolvePublicPresentationSignedUrls(token.trim());
          setSignedUrls(urls);
        } catch (assetErr) {
          throw new Error('Os arquivos desta versão não puderam ser carregados. Atualize a página antes de avaliar.');
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
    let active = true;
    // Renew short-lived media URLs without closing an open feedback form.
    const refresh = setInterval(() => {
      if (!token?.trim()) return;
      void resolvePublicPresentationSignedUrls(token.trim()).then(urls => {
        if (active) setSignedUrls(urls);
      }).catch(() => {
        if (active) { setError(parsePublicPresentationError(new Error('Arquivos indisponíveis. Atualize a página.'))); setData(null); }
      });
    }, 240000);
    return () => { active = false; clearInterval(refresh); };
  }, [loadPresentation, token]);

  const updateItemDecision = useCallback(
    (response: {
      item_id: string;
      client_approval_status: string;
      client_feedback: string | null;
      reviewed_at: string;
      presentation_id: string;
      presentation_status: string;
    }) => {
      setData((prev) => {
        if (!prev) return prev;

        const updatedItems = (prev.items || []).map((it) => {
          if (it.id === response.item_id) {
            return {
              ...it,
              client_approval_status: response.client_approval_status,
              client_feedback: response.client_feedback,
              reviewed_at: response.reviewed_at,
            };
          }
          return it;
        });

        return {
          ...prev,
          status: response.presentation_status || prev.status,
          items: updatedItems,
        };
      });
    },
    []
  );

  return {
    data,
    signedUrls,
    loading,
    assetsResolving,
    error,
    reload: loadPresentation,
    updateItemDecision,
  };
}
