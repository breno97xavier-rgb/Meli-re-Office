import React from 'react';
import {
  AlertCircle,
  Clock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { usePublicPresentation } from '../hooks/usePublicPresentation';
import { BrandAsset } from '../components/brand/BrandAsset';
import { PresentationRenderer } from '../components/presentations/renderer/PresentationRenderer';

interface PublicPresentationPageProps {
  token?: string;
}

export const PublicPresentationPage: React.FC<PublicPresentationPageProps> = ({ token }) => {
  const { data, signedUrls, loading, error, reload } = usePublicPresentation(token);

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0E] text-[#F7F7F8] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center max-w-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#242426] border-t-[#F15A3C] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BrandAsset type="symbol-light-a" className="w-6 h-6" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-wide text-white">
              Carregando Apresentação
            </h2>
            <p className="text-xs text-[#8C8D8F]">
              Validando credenciais de acesso seguro da Melière...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR STATE (Institutional & User Friendly)
  if (error || !data) {
    const errorType = error?.type || 'SERVER_ERROR';

    const getErrorIcon = () => {
      switch (errorType) {
        case 'EXPIRED_TOKEN':
          return <Clock className="w-7 h-7 text-amber-500" />;
        case 'REVOKED_TOKEN':
          return <ShieldAlert className="w-7 h-7 text-rose-500" />;
        case 'INVALID_TOKEN':
        case 'NOT_FOUND':
          return <AlertCircle className="w-7 h-7 text-[#F15A3C]" />;
        default:
          return <AlertCircle className="w-7 h-7 text-[#8C8D8F]" />;
      }
    };

    return (
      <div className="min-h-screen bg-[#0D0D0E] text-[#F7F7F8] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#161618] border border-[#262628] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          {/* Header Branding */}
          <div className="flex justify-center pb-2">
            <BrandAsset type="logo-dark" className="h-7 w-auto" />
          </div>

          {/* Error Visual & Content */}
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-[#1F1F22] rounded-full border border-[#2E2E32]">
              {getErrorIcon()}
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {error?.title || 'Apresentação Indisponível'}
            </h1>
            <p className="text-xs text-[#A1A1A4] leading-relaxed max-w-xs">
              {error?.message ||
                'Não foi possível encontrar a apresentação solicitada com o link fornecido.'}
            </p>
          </div>

          {/* Action Hint */}
          {error?.actionHint && (
            <div className="bg-[#1D1D20] border border-[#2A2A2E] rounded-xl p-3 text-xs text-[#C5C5C8] leading-relaxed">
              <span className="font-semibold text-white">Orientação: </span>
              {error.actionHint}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => reload()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242428] hover:bg-[#2C2C32] text-xs font-semibold text-white border border-[#333338] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-[11px] text-[#555558]">
          Melière Marketing • Plataforma Segura de Apresentação
        </div>
      </div>
    );
  }

  // 3. SHARED PRESENTATION RENDERER (Public Context)
  return (
    <PresentationRenderer
      presentation={data}
      items={data.items || []}
      signedUrls={signedUrls}
      mode="public"
    />
  );
};

