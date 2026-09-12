import React, { useState } from 'react';
import {
  X,
  Share2,
  Link as LinkIcon,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Presentation } from '../../types/presentations';
import { usePresentationAccessLink } from '../../hooks/usePresentationAccessLink';

interface SharePresentationModalProps {
  presentation: Presentation;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const SharePresentationModal: React.FC<SharePresentationModalProps> = ({
  presentation,
  isOpen,
  onClose,
}) => {
  const {
    accessLink,
    publicUrl,
    hasActiveLink,
    loading,
    actionLoading,
    error,
    copied,
    handleGenerateLink,
    handleRevokeLink,
    handleCopyUrl,
    loadAccessLink,
  } = usePresentationAccessLink(presentation.id, isOpen);

  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const clientName =
    presentation.client?.commercial_name ||
    presentation.client?.name ||
    'Cliente';

  const onGenerate = async () => {
    setGenerateError(null);
    try {
      await handleGenerateLink();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar link.';
      setGenerateError(msg);
    }
  };

  const onConfirmRevoke = async () => {
    try {
      await handleRevokeLink();
      setIsConfirmingRevoke(false);
    } catch (err: unknown) {
      console.error('Revoke failed:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D1D1D]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-[#E8E9EA] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F2F3F3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#F15A3C] uppercase tracking-wider block">
                Acesso Externo
              </span>
              <h2 className="text-sm font-bold text-[#1D1D1D] font-display">
                Compartilhar Apresentação
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="p-1.5 text-[#9E9EA0] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Target Presentation Context */}
          <div className="p-3.5 bg-[#F7F7F8] border border-[#E8E9EA] rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#666668]">
                {clientName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#E8E9EA] rounded-md text-[#1D1D1D]">
                Rodada {presentation.round_number || 1}
              </span>
            </div>
            <p className="text-xs font-bold text-[#1D1D1D] truncate">
              {presentation.title}
            </p>
          </div>

          {/* Error Banner if any */}
          {(error || generateError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error || generateError}</span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#F15A3C] mx-auto" />
              <p className="text-xs text-[#666668]">
                Verificando status de acesso externo...
              </p>
            </div>
          ) : isConfirmingRevoke ? (
            /* Revocation Confirmation Dialog */
            <div className="p-5 bg-[#FFF8F6] border border-[#FBC3B8] rounded-2xl space-y-4 animate-in fade-in duration-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FDF1EE] text-[#DE4B2E] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1D1D1D]">
                    Revogar acesso à apresentação?
                  </h3>
                  <p className="text-[11px] text-[#666668] leading-relaxed">
                    O link compartilhado deixará de permitir acesso à apresentação.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FBC3B8]/60">
                <button
                  type="button"
                  onClick={() => setIsConfirmingRevoke(false)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-xl hover:bg-[#F2F3F3] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmRevoke}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DE4B2E] hover:bg-[#c93f24] rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Revogando...</span>
                    </>
                  ) : (
                    <span>Confirmar revogação</span>
                  )}
                </button>
              </div>
            </div>
          ) : hasActiveLink ? (
            /* ACTIVE LINK STATE */
            <div className="space-y-4">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Link de acesso ativo</span>
                </div>

                <button
                  type="button"
                  onClick={loadAccessLink}
                  className="p-1 text-[#9E9EA0] hover:text-[#1D1D1D] rounded-lg transition-colors cursor-pointer"
                  title="Atualizar status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Link Box */}
              {publicUrl ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#1D1D1D]">
                    Link de acesso
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9E9EA0]">
                        <LinkIcon className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        onFocus={(e) => e.target.select()}
                        className="block w-full rounded-xl border border-[#E8E9EA] bg-[#FAFAFA] pl-9 pr-3 py-2 text-xs text-[#1D1D1D] font-mono select-all focus:outline-none focus:border-[#F15A3C] focus:bg-white transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(publicUrl)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#1D1D1D] hover:bg-[#333333] text-white active:scale-98'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#FDF1EE] border border-[#FBC3B8] rounded-xl text-xs text-[#555557] space-y-1.5">
                  <p className="font-semibold text-[#1D1D1D]">
                    Link ativo existente no banco
                  </p>
                  <p className="text-[11px] text-[#666668]">
                    Por motivos de segurança, o token de acesso seguro não é armazenado em texto puro após a criação. Você pode gerar um novo link a qualquer momento ou revogar o acesso existente.
                  </p>
                </div>
              )}

              {/* Metadata details table */}
              <div className="p-3 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#666668]">
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3 h-3 text-[#9E9EA0]" />
                    <span>Criado em:</span>
                  </span>
                  <span className="font-semibold text-[#1D1D1D] text-[11px]">
                    {formatDateTime(accessLink?.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#666668]">
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3 h-3 text-[#9E9EA0]" />
                    <span>Expiração:</span>
                  </span>
                  <span className="font-semibold text-[#1D1D1D] text-[11px]">
                    {accessLink?.expires_at
                      ? formatDateTime(accessLink.expires_at)
                      : 'Sem data limite'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#666668]">
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Situação:</span>
                  </span>
                  <span className="font-bold text-emerald-600 text-[11px]">
                    Ativo
                  </span>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#F2F3F3]">
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Gerar novo link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmingRevoke(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DE4B2E] hover:bg-[#FDF1EE] border border-[#FBC3B8] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Revogar acesso</span>
                </button>
              </div>
            </div>
          ) : (
            /* NO ACTIVE LINK STATE */
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F7F8] border border-[#E8E9EA] text-[#666668] flex items-center justify-center mx-auto">
                <LinkIcon className="w-6 h-6 text-[#9E9EA0]" />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-[#1D1D1D]">
                  Ainda não existe um link ativo para esta apresentação.
                </h3>
                <p className="text-xs text-[#666668] leading-relaxed">
                  Gere um link seguro e exclusivo para que o cliente acesse a visualização da rodada de apresentação.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-98 disabled:opacity-60"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Gerando link seguro...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span>Gerar link de acesso</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-[#FAFAFA] border-t border-[#F2F3F3] flex items-center justify-between text-[11px] text-[#9E9EA0]">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#9E9EA0]" />
            <span>Acesso externo criptografado</span>
          </span>
          <span>Melière Office</span>
        </div>
      </div>
    </div>
  );
};
