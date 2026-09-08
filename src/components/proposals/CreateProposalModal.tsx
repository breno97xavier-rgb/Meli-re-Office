import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Loader2,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { Opportunity } from '../../types/opportunities';
import { CreateProposalInput } from '../../types/proposals';

interface CreateProposalModalProps {
  isOpen: boolean;
  initialOpportunity?: Opportunity | null;
  opportunities?: Opportunity[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (input: CreateProposalInput) => Promise<boolean>;
}

const EMPTY_OPPORTUNITIES: Opportunity[] = [];

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  initialOpportunity,
  opportunities = EMPTY_OPPORTUNITIES,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}) => {
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [monthlyAmountStr, setMonthlyAmountStr] = useState('');
  const [oneTimeAmountStr, setOneTimeAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize/Reset form when modal opens (preserving stable dependency on initialOpportunity.id)
  useEffect(() => {
    if (isOpen) {
      if (initialOpportunity) {
        setSelectedOpportunityId(initialOpportunity.id);
        setTitle(`Proposta Comercial — ${initialOpportunity.title}`);
      } else {
        const firstOpp = opportunities[0];
        setSelectedOpportunityId(firstOpp?.id || '');
        if (firstOpp) {
          setTitle(`Proposta Comercial — ${firstOpp.title}`);
        } else {
          setTitle('');
        }
      }

      // Default valid until: 15 days from today
      const d = new Date();
      d.setDate(d.getDate() + 15);
      const defaultDateStr = d.toISOString().split('T')[0];
      setValidUntil(defaultDateStr);

      setMonthlyAmountStr('');
      setOneTimeAmountStr('');
      setNotes('');
      setValidationError(null);
    }
  }, [isOpen, initialOpportunity?.id]);

  if (!isOpen) return null;

  const handleOpportunityChange = (oppId: string) => {
    setSelectedOpportunityId(oppId);
    const opp = opportunities.find((o) => o.id === oppId);
    if (opp && (!title || title.startsWith('Proposta Comercial — '))) {
      setTitle(`Proposta Comercial — ${opp.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedOpportunityId) {
      setValidationError('Selecione uma oportunidade vinculada.');
      return;
    }

    if (!title.trim()) {
      setValidationError('O título da proposta é obrigatório.');
      return;
    }

    let parsedMonthly: number | null = null;
    if (monthlyAmountStr.trim() !== '') {
      const val = parseFloat(monthlyAmountStr.replace(',', '.'));
      if (isNaN(val) || val < 0) {
        setValidationError('O valor mensal deve ser um número maior ou igual a zero.');
        return;
      }
      parsedMonthly = val;
    }

    let parsedOneTime: number | null = null;
    if (oneTimeAmountStr.trim() !== '') {
      const val = parseFloat(oneTimeAmountStr.replace(',', '.'));
      if (isNaN(val) || val < 0) {
        setValidationError('O valor pontual deve ser um número maior ou igual a zero.');
        return;
      }
      parsedOneTime = val;
    }

    const payload: CreateProposalInput = {
      opportunity_id: selectedOpportunityId,
      title: title.trim(),
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      monthly_amount: parsedMonthly,
      one_time_amount: parsedOneTime,
    };

    const success = await onSubmit(payload);
    if (success) {
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
          id="create-proposal-modal"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E9EA] overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150 relative z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1D]">
                  Nova Proposta Comercial
                </h3>
                <p className="text-xs text-[#666668] mt-0.5">
                  Cadastre as informações essenciais da proposta para acompanhamento comercial.
                </p>
              </div>
            </div>

            <button
              id="btn-close-create-proposal-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-5"
          >
            {/* Error Banners */}
            {(validationError || submitError) && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{validationError || submitError}</span>
              </div>
            )}

            {/* Opportunity Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Oportunidade Vinculada *</span>
              </label>

              {initialOpportunity ? (
                <div className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2.5 text-xs font-medium text-[#1D1D1D] truncate">
                  {initialOpportunity.title}
                  {initialOpportunity.lead && (
                    <span className="text-[#666668] font-normal">
                      {' '}
                      • {initialOpportunity.lead.name}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  id="select-proposal-opportunity"
                  required
                  value={selectedOpportunityId}
                  onChange={(e) => handleOpportunityChange(e.target.value)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2.5 text-xs text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] cursor-pointer"
                >
                  {opportunities.length === 0 ? (
                    <option value="">Nenhuma oportunidade disponível</option>
                  ) : (
                    opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.title}{' '}
                        {opp.lead?.name ? `(${opp.lead.name})` : ''}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Título da Proposta */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#666668] block">
                Título da Proposta *
              </label>
              <input
                type="text"
                required
                id="input-proposal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Proposta Comercial — Tráfego e Social Media"
                className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2.5 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
              />
            </div>

            {/* Validade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Validade da Proposta</span>
              </label>
              <input
                type="date"
                id="input-proposal-valid-until"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2.5 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
              />
            </div>

            {/* Valores Comerciais */}
            <div className="pt-2 border-t border-[#E8E9EA] space-y-3">
              <div>
                <h4 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
                  Valores Comerciais
                </h4>
                <p className="text-[11px] text-[#666668] mt-0.5">
                  Informe os valores acordados para a proposta (recorrente e/ou pontual).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Valor Mensal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#F15A3C]" />
                    <span>Valor Mensal (Recorrente)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-medium text-[#9E9EA0]">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="input-proposal-monthly-amount"
                      placeholder="0.00"
                      value={monthlyAmountStr}
                      onChange={(e) => setMonthlyAmountStr(e.target.value)}
                      className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg pl-9 pr-3 py-2.5 text-xs font-medium text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                    />
                  </div>
                </div>

                {/* Valor Pontual */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#666668] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Valor Pontual (Projeto)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-medium text-[#9E9EA0]">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="input-proposal-one-time-amount"
                      placeholder="0.00"
                      value={oneTimeAmountStr}
                      onChange={(e) => setOneTimeAmountStr(e.target.value)}
                      className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg pl-9 pr-3 py-2.5 text-xs font-medium text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Observação Interna */}
            <div className="space-y-1.5 pt-2 border-t border-[#E8E9EA]">
              <label className="text-xs font-semibold text-[#666668] block">
                Observação Interna (Opcional)
              </label>
              <textarea
                rows={3}
                id="input-proposal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações internas sobre a negociação ou detalhes da proposta."
                className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg p-3 text-xs text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
              />
            </div>

            {/* PDF Informational Block */}
            <div className="p-3.5 bg-[#F9F9FA] border border-[#E8E9EA] rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E9EA] flex items-center justify-center text-[#666668] shrink-0 mt-0.5">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[#1D1D1D] block">
                  Documento PDF
                </span>
                <p className="text-[11px] text-[#666668] leading-relaxed">
                  Você poderá anexar o arquivo da proposta após o cadastro.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="btn-submit-proposal"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cadastrando Proposta...</span>
                  </>
                ) : (
                  <span>Cadastrar Proposta</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
