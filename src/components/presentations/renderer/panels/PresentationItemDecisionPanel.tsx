import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  Send,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';

interface PresentationItemDecisionPanelProps {
  item: PresentationItem;
  mode?: 'internal' | 'public';
  submitting?: boolean;
  onSubmitDecision?: (
    status: 'approved' | 'changes_requested' | 'rejected',
    feedback?: string | null
  ) => Promise<void>;
  onLightboxChange?: (isOpen: boolean) => void;
}

type ModalType = 'approve' | 'changes' | 'reject' | null;

export const PresentationItemDecisionPanel: React.FC<PresentationItemDecisionPanelProps> = ({
  item,
  mode = 'internal',
  submitting = false,
  onSubmitDecision,
  onLightboxChange,
}) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const approvalStatus = item.client_approval_status || 'pending';
  const isPending = approvalStatus === 'pending';
  const isPublic = mode === 'public';

  // Open modal handler
  const handleOpenModal = (type: ModalType) => {
    setModalType(type);
    setFeedbackText('');
    setValidationError(null);
    onLightboxChange?.(true);
  };

  // Close modal handler
  const handleCloseModal = () => {
    if (submitting) return;
    setModalType(null);
    setFeedbackText('');
    setValidationError(null);
    onLightboxChange?.(false);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalType && !submitting) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalType, submitting]);

  // Submit action handler
  const handleConfirmSubmit = async () => {
    if (!onSubmitDecision || submitting) return;

    if (modalType === 'approve') {
      try {
        await onSubmitDecision('approved', null);
        handleCloseModal();
      } catch {
        // Error is handled in parent hook
      }
      return;
    }

    if (modalType === 'changes' || modalType === 'reject') {
      const trimmed = feedbackText.trim();
      if (!trimmed) {
        setValidationError('Por favor, informe suas observações antes de enviar.');
        return;
      }

      try {
        const targetStatus = modalType === 'changes' ? 'changes_requested' : 'rejected';
        await onSubmitDecision(targetStatus, trimmed);
        handleCloseModal();
      } catch {
        // Error is handled in parent hook
      }
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* Main Container */}
      <div className="bg-white border border-[#E8E9EA] rounded-2xl p-5 shadow-xs space-y-4">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F15A3C]" />
            <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
              {isPublic ? 'Avaliação do Conteúdo' : 'Status da Decisão do Cliente'}
            </h4>
          </div>

          {/* Pending / Decided Tag */}
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>Aguardando Avaliação</span>
            </span>
          ) : (
            <span className="text-[11px] font-medium text-[#8C8D8F]">
              Decisão Registrada
            </span>
          )}
        </div>

        {/* STATE 1: PENDING (Actions available for public client) */}
        {isPending ? (
          isPublic ? (
            <div className="space-y-3">
              <p className="text-xs text-[#666668] leading-relaxed">
                Avalie esta peça para orientar nossa equipe sobre a aprovação ou eventuais ajustes necessários:
              </p>

              {/* Action Buttons Group */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Aprovar */}
                <button
                  type="button"
                  id="btn-public-approve-item"
                  onClick={() => handleOpenModal('approve')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Aprovar</span>
                </button>

                {/* 2. Solicitar Ajustes */}
                <button
                  type="button"
                  id="btn-public-request-changes-item"
                  onClick={() => handleOpenModal('changes')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4 text-white" />
                  <span>Solicitar Ajustes</span>
                </button>

                {/* 3. Recusar */}
                <button
                  type="button"
                  id="btn-public-reject-item"
                  onClick={() => handleOpenModal('reject')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl bg-[#F7F7F8] hover:bg-rose-50 text-[#666668] hover:text-rose-600 border border-[#E8E9EA] hover:border-rose-200 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-current" />
                  <span>Recusar</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#9E9EA0] pt-1">
                <ChevronRight className="w-3 h-3 text-[#F15A3C]" />
                <span>Sua resposta é registrada com segurança e orienta o time em tempo real.</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#1D1D1D]">
                  Pendente de resposta do cliente
                </p>
                <p className="text-[11px] text-[#666668]">
                  O cliente ainda não enviou o parecer desta peça pelo link público.
                </p>
              </div>
            </div>
          )
        ) : (
          /* STATE 2: ALREADY REVIEWED (Immutable feedback card) */
          <div className="space-y-3">
            {/* Status Header Banner */}
            {approvalStatus === 'approved' && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">
                      Conteúdo Aprovado
                    </span>
                    {item.reviewed_at && (
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {formatDate(item.reviewed_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Esta publicação foi aprovada e está pronta para agendamento.
                  </p>
                </div>
              </div>
            )}

            {approvalStatus === 'changes_requested' && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Ajustes Solicitados
                    </span>
                    {item.reviewed_at && (
                      <span className="text-[10px] text-amber-700 font-medium">
                        {formatDate(item.reviewed_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    A equipe foi notificada das orientações de alteração para a próxima rodada.
                  </p>
                </div>
              </div>
            )}

            {approvalStatus === 'rejected' && (
              <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700 shrink-0 mt-0.5">
                  <XCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900">
                      Conteúdo Recusado
                    </span>
                    {item.reviewed_at && (
                      <span className="text-[10px] text-rose-700 font-medium">
                        {formatDate(item.reviewed_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Esta proposta foi descontinuada para esta rodada com base no parecer do cliente.
                  </p>
                </div>
              </div>
            )}

            {/* Client Feedback Text Box */}
            {item.client_feedback && (
              <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#666668]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1D]">
                    Observações Registradas
                  </span>
                </div>
                <p className="text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-[#F15A3C]/30">
                  {item.client_feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DECISION MODALS / BOTTOM SHEETS */}
      {/* ========================================================================= */}
      {modalType && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E8E9EA] space-y-5 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Icon */}
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={submitting}
              className="absolute top-5 right-5 p-1.5 rounded-full text-[#9E9EA0] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 1. APPROVE CONFIRMATION */}
            {modalType === 'approve' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1D1D1D] font-display">
                      Confirmar Aprovação
                    </h3>
                    <p className="text-xs text-[#666668] mt-0.5">
                      Esta peça será aprovada para a rodada atual.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#FBFBFC] border border-[#E8E9EA] rounded-2xl text-xs text-[#666668] leading-relaxed">
                  Ao confirmar, a equipe de criação receberá a validação imediata do conteúdo para continuidade do calendário editorial.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#666668] hover:bg-[#F7F7F8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-approve"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gravando Decisão...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Aprovação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 2. REQUEST CHANGES */}
            {modalType === 'changes' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-700">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1D1D1D] font-display">
                      Solicitar Ajustes
                    </h3>
                    <p className="text-xs text-[#666668] mt-0.5">
                      Descreva o que precisa ser alterado nesta publicação.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="feedback-changes-textarea"
                    className="block text-xs font-bold text-[#1D1D1D]"
                  >
                    Orientações de Ajuste <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="feedback-changes-textarea"
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => {
                      setFeedbackText(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ex: Ajustar o texto da imagem 2 para dar mais destaque ao benefício principal e corrigir o link na legenda."
                    disabled={submitting}
                    className="w-full p-3.5 rounded-2xl border border-[#E8E9EA] bg-[#FBFBFC] focus:bg-white focus:border-[#F15A3C] focus:ring-2 focus:ring-[#F15A3C]/10 text-xs text-[#1D1D1D] outline-hidden transition-all resize-none leading-relaxed"
                  />
                  {validationError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#666668] hover:bg-[#F7F7F8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-request-changes"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando Ajustes...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Solicitação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 3. REJECT */}
            {modalType === 'reject' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-100 rounded-2xl text-rose-700">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1D1D1D] font-display">
                      Recusar Conteúdo
                    </h3>
                    <p className="text-xs text-[#666668] mt-0.5">
                      Informe o motivo da rejeição deste conteúdo.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="feedback-reject-textarea"
                    className="block text-xs font-bold text-[#1D1D1D]"
                  >
                    Motivo da Recusa <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="feedback-reject-textarea"
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => {
                      setFeedbackText(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Ex: Não daremos seguimento com este tema nesta campanha pois a diretoria alterou o foco do trimestre."
                    disabled={submitting}
                    className="w-full p-3.5 rounded-2xl border border-[#E8E9EA] bg-[#FBFBFC] focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 text-xs text-[#1D1D1D] outline-hidden transition-all resize-none leading-relaxed"
                  />
                  {validationError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#666668] hover:bg-[#F7F7F8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-reject"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gravando Recusa...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Confirmar Recusa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
