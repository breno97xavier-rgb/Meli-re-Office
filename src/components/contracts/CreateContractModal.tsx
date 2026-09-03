import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileCheck,
  Calendar,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Building2,
  RotateCw,
  Info,
} from 'lucide-react';
import { Proposal } from '../../types/proposals';
import { Contract, CreateContractInput } from '../../types/contracts';

interface CreateContractModalProps {
  isOpen: boolean;
  initialProposal?: Proposal | null;
  acceptedProposals?: Proposal[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (
    input: CreateContractInput
  ) => Promise<{ success: boolean; contract?: Contract; error?: string }>;
  onSuccess?: (contract: Contract) => void;
}

const EMPTY_PROPOSALS: Proposal[] = [];

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  initialProposal,
  acceptedProposals = EMPTY_PROPOSALS,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
  onSuccess,
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState<number | ''>(12);
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState<number | ''>(30);
  const [specialTerms, setSpecialTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active Proposal object (either initialProposal or from list)
  const activeProposal = useMemo(() => {
    if (initialProposal) return initialProposal;
    return (
      acceptedProposals.find((p) => p.id === selectedProposalId) ||
      acceptedProposals[0] ||
      null
    );
  }, [initialProposal, acceptedProposals, selectedProposalId]);

  // Form initialization strictly on modal open / proposal change
  useEffect(() => {
    if (isOpen) {
      if (initialProposal) {
        setSelectedProposalId(initialProposal.id);
        const oppTitle = initialProposal.opportunity?.title || initialProposal.title;
        setTitle(`Contrato de Prestação de Serviços — ${oppTitle}`);
      } else {
        const first = acceptedProposals[0];
        setSelectedProposalId(first?.id || '');
        if (first) {
          const oppTitle = first.opportunity?.title || first.title;
          setTitle(`Contrato de Prestação de Serviços — ${oppTitle}`);
        } else {
          setTitle('');
        }
      }

      // Default start date: today; default end date: 12 months from today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);

      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearStr = nextYear.toISOString().split('T')[0];
      setEndDate(nextYearStr);

      setAutoRenewal(true);
      setRenewalPeriodMonths(12);
      setCancellationNoticeDays(30);
      setSpecialTerms('');
      setNotes('');
      setValidationError(null);
    }
  }, [isOpen, initialProposal?.id]);

  if (!isOpen) return null;

  const handleProposalSelectionChange = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    const target = acceptedProposals.find((p) => p.id === proposalId);
    if (target) {
      const oppTitle = target.opportunity?.title || target.title;
      setTitle(`Contrato de Prestação de Serviços — ${oppTitle}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const targetProposalId = initialProposal ? initialProposal.id : selectedProposalId;
    if (!targetProposalId) {
      setValidationError('Selecione uma proposta comercial aceita.');
      return;
    }

    if (!title.trim()) {
      setValidationError('O título do contrato é obrigatório.');
      return;
    }

    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      if (end < start) {
        setValidationError('A data de término não pode ser anterior à data de início.');
        return;
      }
    }

    const payload: CreateContractInput = {
      proposal_id: targetProposalId,
      title: title.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      auto_renewal: autoRenewal,
      renewal_period_months: autoRenewal && renewalPeriodMonths !== '' ? Number(renewalPeriodMonths) : null,
      cancellation_notice_days: cancellationNoticeDays !== '' ? Number(cancellationNoticeDays) : null,
      special_terms: specialTerms.trim() || null,
      notes: notes.trim() || null,
    };

    const result = await onSubmit(payload);
    if (result.success) {
      if (result.contract && onSuccess) {
        onSuccess(result.contract);
      }
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <div
          id="create-contract-modal"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E8E9EA] overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 relative z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDF1EE] text-[#F15A3C] border border-[#FBC3B8] flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1D1D1D]">
                  Formalizar Contrato Comercial
                </h2>
                <p className="text-xs text-[#666668] mt-0.5">
                  Gere o contrato jurídico formal em rascunho a partir de uma proposta aceita.
                </p>
              </div>
            </div>
            <button
              id="btn-close-create-contract-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Feedback Alerts */}
            {validationError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Proposal Selection & Origin Context */}
            <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#666668] uppercase tracking-wider block">
                  Proposta Aceita de Origem <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  Status: Aceita
                </span>
              </div>

              {initialProposal ? (
                // Read-only presentation when opened from a specific proposal
                <div className="bg-white border border-[#E8E9EA] rounded-lg p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#1D1D1D]">
                      {initialProposal.title}
                    </span>
                    <span className="text-xs font-mono font-bold bg-[#F2F3F3] text-[#1D1D1D] px-1.5 py-0.5 rounded border border-[#E8E9EA]">
                      v{initialProposal.version}
                    </span>
                  </div>
                  {initialProposal.opportunity && (
                    <div className="text-xs text-[#666668] flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-[#1D1D1D]">
                        {initialProposal.opportunity.title}
                      </span>
                      {initialProposal.opportunity.lead && (
                        <>
                          <span className="text-[#9E9EA0]">•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#9E9EA0]" />
                            <span>{initialProposal.opportunity.lead.name}</span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : acceptedProposals.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Não existem propostas com status <strong>Aceita</strong> disponíveis para formalização.
                  </span>
                </div>
              ) : (
                <div>
                  <select
                    id="select-contract-proposal"
                    value={selectedProposalId}
                    onChange={(e) => handleProposalSelectionChange(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] cursor-pointer shadow-2xs"
                  >
                    {acceptedProposals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (v{p.version}) — {p.opportunity?.title || 'Oportunidade'}
                      </option>
                    ))}
                  </select>

                  {activeProposal?.opportunity?.lead && (
                    <div className="mt-2 text-xs text-[#666668] flex items-center gap-1.5 bg-white p-2 rounded-lg border border-[#E8E9EA]">
                      <User className="w-3.5 h-3.5 text-[#9E9EA0]" />
                      <span>
                        Cliente: <strong>{activeProposal.opportunity.lead.name}</strong>
                        {activeProposal.opportunity.lead.business_name && (
                          <span className="text-[#9E9EA0]">
                            {' '}
                            ({activeProposal.opportunity.lead.business_name})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-[#9E9EA0] flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>
                  O número do contrato (ex: MEL-2026-001) e a versão serão gerados com segurança pelo backend.
                </span>
              </p>
            </div>

            {/* Contract Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="contract-title-input"
                className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider block"
              >
                Título do Contrato <span className="text-red-500">*</span>
              </label>
              <input
                id="contract-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Contrato de Prestação de Serviços — Gestão de Tráfego"
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2.5 text-sm text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
              />
            </div>

            {/* Vigência / Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="contract-start-date"
                  className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider block"
                >
                  Data de Início da Vigência
                </label>
                <div className="relative">
                  <input
                    id="contract-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contract-end-date"
                  className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider block"
                >
                  Data de Término da Vigência
                </label>
                <div className="relative">
                  <input
                    id="contract-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Renovação e Aviso Prévio */}
            <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-[#F15A3C]" />
                  <span className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider">
                    Política de Renovação e Rescisão
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="contract-auto-renewal-checkbox"
                    checked={autoRenewal}
                    onChange={(e) => setAutoRenewal(e.target.checked)}
                    className="w-4 h-4 rounded text-[#F15A3C] border-[#D1D2D4] focus:ring-[#F15A3C]"
                  />
                  <span className="text-xs font-medium text-[#1D1D1D]">
                    Renovação Automática
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contract-renewal-period"
                    className="text-xs font-medium text-[#666668] block"
                  >
                    Período de Renovação (meses)
                  </label>
                  <input
                    id="contract-renewal-period"
                    type="number"
                    min="1"
                    disabled={!autoRenewal}
                    value={renewalPeriodMonths}
                    onChange={(e) =>
                      setRenewalPeriodMonths(
                        e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      )
                    }
                    placeholder="Ex: 12"
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] disabled:opacity-50 disabled:bg-[#F2F3F3] shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contract-cancellation-notice"
                    className="text-xs font-medium text-[#666668] block"
                  >
                    Prazo de Aviso Prévio (dias)
                  </label>
                  <input
                    id="contract-cancellation-notice"
                    type="number"
                    min="0"
                    value={cancellationNoticeDays}
                    onChange={(e) =>
                      setCancellationNoticeDays(
                        e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      )
                    }
                    placeholder="Ex: 30"
                    className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Special Terms & Notes */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="contract-special-terms"
                  className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider block"
                >
                  Condições e Cláusulas Especiais (Opcional)
                </label>
                <textarea
                  id="contract-special-terms"
                  rows={3}
                  value={specialTerms}
                  onChange={(e) => setSpecialTerms(e.target.value)}
                  placeholder="Especifique cláusulas particulares acordadas com o cliente para este contrato..."
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg p-3 text-xs text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contract-notes"
                  className="text-xs font-semibold text-[#1D1D1D] uppercase tracking-wider block"
                >
                  Observações Internas (Opcional)
                </label>
                <textarea
                  id="contract-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações internas da equipe comercial / jurídica..."
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg p-3 text-xs text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] shadow-2xs"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-end gap-3">
            <button
              id="btn-cancel-create-contract"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#666668] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F2F3F3] hover:text-[#1D1D1D] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-create-contract"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!initialProposal && acceptedProposals.length === 0)}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando Contrato...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Gerar Contrato (Rascunho)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
