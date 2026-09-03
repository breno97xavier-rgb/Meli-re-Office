import React, { useState, useEffect } from 'react';
import { X, Building2, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import {
  CreateOpportunityInput,
  OpportunityStage,
} from '../../types/opportunities';
import { Lead } from '../../types/leads';
import { getStageLabel } from './OpportunityStageBadge';
import { getServiceLabel } from '../leads/LeadStatusBadge';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  initialLead?: Lead | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (input: CreateOpportunityInput) => Promise<unknown>;
}

const AVAILABLE_SERVICES = [
  'social_media',
  'paid_traffic',
  'website',
  'branding',
];

const STAGE_OPTIONS: OpportunityStage[] = [
  'discovery',
  'briefing',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  initialLead,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<OpportunityStage>('discovery');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [probability, setProbability] = useState<string>('50');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLead) {
        const leadLabel = initialLead.business_name || initialLead.name;
        setTitle(`Negociação — ${leadLabel}`);
        if (initialLead.service && initialLead.service !== 'not_sure') {
          setSelectedServices([initialLead.service]);
        } else {
          setSelectedServices([]);
        }
      } else {
        setTitle('');
        setSelectedServices([]);
      }
      setStage('discovery');
      setEstimatedValue('');
      setProbability('50');
      setNextAction('');
      setNextActionDate('');
      setExpectedCloseDate('');
      setValidationError(null);
    }
  }, [isOpen, initialLead]);

  if (!isOpen) return null;

  const toggleService = (serviceKey: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('O título da oportunidade é obrigatório.');
      return;
    }

    setValidationError(null);

    let parsedValue: number | null = null;
    if (estimatedValue.trim()) {
      const cleanVal = estimatedValue.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num >= 0) {
        parsedValue = num;
      }
    }

    let parsedProb: number | null = null;
    if (probability.trim()) {
      const num = parseInt(probability, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        parsedProb = num;
      }
    }

    const payload: CreateOpportunityInput = {
      title: title.trim(),
      lead_id: initialLead ? initialLead.id : null,
      stage,
      estimated_value: parsedValue,
      services_of_interest: selectedServices,
      probability: parsedProb,
      next_action: nextAction.trim() || null,
      next_action_date: nextActionDate || null,
      expected_close_date: expectedCloseDate || null,
    };

    const res = await onSubmit(payload);
    if (res) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          id="create-opportunity-modal"
          className="bg-white border border-[#E8E9EA] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF1EE] flex items-center justify-center text-[#F15A3C]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-[#1D1D1D]">
                  {initialLead ? 'Nova Oportunidade a partir do Lead' : 'Nova Oportunidade'}
                </h2>
              </div>
              {initialLead && (
                <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-[#E8E9EA] text-xs text-[#666668]">
                  <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span className="font-medium text-[#1D1D1D]">{initialLead.name}</span>
                  {initialLead.business_name && (
                    <>
                      <span className="text-[#9E9EA0]">•</span>
                      <span>{initialLead.business_name}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              id="btn-close-modal"
              onClick={onClose}
              className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {(validationError || submitError) && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError || submitError}</span>
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5">
              <label
                htmlFor="opp-title"
                className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
              >
                Título da Negociação *
              </label>
              <input
                id="opp-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Contrato Social Media + Branding — Empresa X"
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
              />
            </div>

            {/* Estágio & Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="opp-stage"
                  className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
                >
                  Estágio Inicial
                </label>
                <select
                  id="opp-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as OpportunityStage)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] cursor-pointer"
                >
                  {STAGE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {getStageLabel(st)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="opp-value"
                  className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
                >
                  Valor Estimado (R$)
                </label>
                <input
                  id="opp-value"
                  type="text"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="Ex: 3500.00"
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                />
              </div>
            </div>

            {/* Probabilidade */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="opp-probability"
                  className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
                >
                  Probabilidade de Fechamento
                </label>
                <span className="text-xs font-mono font-medium text-[#1D1D1D]">
                  {probability}%
                </span>
              </div>
              <input
                id="opp-probability"
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="w-full accent-[#F15A3C] cursor-pointer"
              />
            </div>

            {/* Serviços de Interesse */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#666668] uppercase tracking-wider block">
                Serviços de Interesse
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SERVICES.map((svcKey) => {
                  const isChecked = selectedServices.includes(svcKey);
                  return (
                    <button
                      key={svcKey}
                      type="button"
                      onClick={() => toggleService(svcKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#FDF1EE] text-[#F15A3C] border-[#FBC3B8] shadow-2xs font-semibold'
                          : 'bg-white text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F7F7F8] border-[#E8E9EA]'
                      }`}
                    >
                      {getServiceLabel(svcKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Próxima Ação & Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="opp-next-action"
                  className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
                >
                  Próxima Ação
                </label>
                <input
                  id="opp-next-action"
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Ex: Apresentar proposta comercial"
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2 text-sm text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="opp-next-action-date"
                  className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
                >
                  Data da Próxima Ação
                </label>
                <input
                  id="opp-next-action-date"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
                />
              </div>
            </div>

            {/* Previsão de Fechamento */}
            <div className="space-y-1.5">
              <label
                htmlFor="opp-expected-close-date"
                className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
              >
                Previsão de Fechamento
              </label>
              <input
                id="opp-expected-close-date"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2 text-sm text-[#1D1D1D] focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C]"
              />
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-[#666668] hover:text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="btn-submit-opportunity"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <span>Criar Oportunidade</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
