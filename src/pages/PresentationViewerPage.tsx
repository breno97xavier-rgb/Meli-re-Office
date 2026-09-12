import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Presentation, PresentationItem } from '../types/presentations';
import {
  fetchPresentationById,
  fetchPresentationItems,
} from '../services/presentationsService';
import { getContentAssetsSignedUrls } from '../services/contentAssetsService';
import { PresentationRenderer } from '../components/presentations/renderer/PresentationRenderer';
import { useRouter } from '../hooks/useRouter';
import type { RoutePath } from '../types';

interface PresentationViewerPageProps {
  presentationId: string;
}

export const PresentationViewerPage: React.FC<PresentationViewerPageProps> = ({
  presentationId,
}) => {
  const { navigate } = useRouter();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [items, setItems] = useState<PresentationItem[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPresentation = useCallback(async () => {
    if (!presentationId) return;
    setLoading(true);
    setError(null);
    try {
      const [presentationData, itemsData] = await Promise.all([
        fetchPresentationById(presentationId),
        fetchPresentationItems(presentationId),
      ]);

      if (!presentationData) {
        throw new Error('Apresentação não encontrada.');
      }

      setPresentation(presentationData);
      setItems(itemsData);

      // Collect storage paths to sign
      const pathsToSign: string[] = [];
      for (const item of itemsData) {
        if (item.assets && item.assets.length > 0) {
          for (const asset of item.assets) {
            if (asset.file_url) {
              pathsToSign.push(asset.file_url);
            }
          }
        }
      }

      if (pathsToSign.length > 0) {
        try {
          const urlMap = await getContentAssetsSignedUrls(pathsToSign);
          setSignedUrls(urlMap);
        } catch (signErr) {
          console.warn('Notice generating signed URLs for presentation:', signErr);
        }
      }
    } catch (err: unknown) {
      console.error('Error loading presentation viewer data:', err);
      const msg =
        err instanceof Error ? err.message : 'Erro ao carregar a apresentação.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [presentationId]);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  const handleExit = () => {
    navigate(`/apresentacoes/${presentationId}` as RoutePath);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F15A3C] text-white flex items-center justify-center font-bold text-lg shadow-md mb-4 animate-pulse">
          M
        </div>
        <h2 className="text-base font-bold text-[#1D1D1D] font-display">
          Carregando Apresentação
        </h2>
        <p className="text-xs text-[#9E9EA0] mt-1 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F15A3C]" />
          <span>Sincronizando conteúdos e mídias da rodada...</span>
        </p>
      </div>
    );
  }

  // Error state
  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#E8E9EA] rounded-3xl p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#1D1D1D] font-display">
            Não foi possível abrir a apresentação
          </h2>
          <p className="text-xs text-[#666668] leading-relaxed">
            {error || 'Apresentação não encontrada ou inacessível.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D1D1D] hover:bg-[#333333] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Editor</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PresentationRenderer
      presentation={presentation}
      items={items}
      signedUrls={signedUrls}
      mode="internal"
      onExit={handleExit}
    />
  );
};
