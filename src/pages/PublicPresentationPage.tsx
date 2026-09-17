import React from 'react';
import {
  AlertCircle,
  Clock,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { usePublicPresentation } from '../hooks/usePublicPresentation';
import { usePublicDecision } from '../hooks/usePublicDecision';
import { BrandAsset } from '../components/brand/BrandAsset';
import { PresentationRenderer } from '../components/presentations/renderer/PresentationRenderer';

interface PublicPresentationPageProps {
  token?: string;
}

export const PublicPresentationPage: React.FC<PublicPresentationPageProps> = ({ token }) => {
  const {
    data,
    signedUrls,
    loading,
    error,
    reload,
    updateItemDecision,
  } = usePublicPresentation(token);

  const {
    submittingItemId,
    decisionError,
    toastMessage,
    clearDecisionError,
    clearToast,
    submitDecision,
  } = usePublicDecision({
    token,
    onDecisionSuccess: (response) => {
      updateItemDecision(response);
    },
    onReloadNeeded: () => {
      reload();
    },
  });

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

  // 3. Check if all items in presentation are reviewed
  const items = data.items || [];
  const pendingCount = items.filter(
    (i) => (i.client_approval_status || 'pending') === 'pending'
  ).length;
  const isAllReviewed = items.length > 0 && pendingCount === 0;

  // 4. SHARED PRESENTATION RENDERER (Public Context)
  return (
    <div className="relative">
      {/* Toast / Notification floating pill */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#1D1D1D] text-white text-xs font-semibold shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-2 text-[#9E9EA0] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Decision Error Modal / Notification */}
      {decisionError && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E8E9EA] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1D] font-display">
                  {decisionError.title}
                </h3>
                <p className="text-xs text-[#666668] mt-0.5">
                  {decisionError.message}
                </p>
              </div>
            </div>

            {decisionError.actionHint && (
              <div className="p-3.5 bg-[#FBFBFC] border border-[#E8E9EA] rounded-2xl text-xs text-[#666668] leading-relaxed">
                <span className="font-bold text-[#1D1D1D]">Orientação: </span>
                {decisionError.actionHint}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={clearDecisionError}
                className="px-5 py-2.5 rounded-xl bg-[#1D1D1D] hover:bg-[#333333] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presentation Completed Discrete Banner (Top indicator if fully reviewed) */}
      {isAllReviewed && (
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2 text-center text-xs font-medium text-emerald-800 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Todos os conteúdos desta rodada foram avaliados. Obrigado!</span>
        </div>
      )}

      <PresentationRenderer
        presentation={data}
        items={items}
        signedUrls={signedUrls}
        mode="public"
        submittingDecision={Boolean(submittingItemId)}
        onSubmitDecision={submitDecision}
      />
    </div>
  );
};
