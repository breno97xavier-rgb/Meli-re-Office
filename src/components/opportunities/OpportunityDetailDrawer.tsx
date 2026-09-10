import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Trophy,
  XCircle,
  Check,
  Tag,
  DollarSign,
  Sparkles,
  FileText,
  AlertTriangle,
  Save,
} from 'lucide-react';
import {
  Opportunity,
  OpportunityStage,
  UpdateOpportunityInput,
} from '../../types/opportunities';
import {
  OpportunityStageBadge,
  getStageLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
} from './OpportunityStageBadge';
import { getServiceLabel } from '../leads/LeadStatusBadge';

interface OpportunityDetailDrawerProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  onClose: () => void;
  onUpdate: (id: string, updates: UpdateOpportunityInput) => Promise<boolean>;
  onCreateProposal?: (opportunity: Opportunity) => void;
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

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  isOpen,
  isUpdating,
  updateError,
  onClose,
  onUpdate,
  onCreateProposal,
}) => {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<OpportunityStage>('discovery');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [probability, setProbability] = useState('50');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [showLostPrompt, setShowLostPrompt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    if (opportunity && isOpen) {
      setTitle(opportunity.title || '');
      setStage(opportunity.stage);
      setEstimatedValue(
        opportunity.estimated_value !== null &&
          opportunity.estimated_value !== undefined
          ? String(opportunity.estimated_value)
          : ''
      );
      setProbability(
        opportunity.probability !== null &&
          opportunity.probability !== undefined
          ? String(opportunity.probability)
          : '50'
      );
      setSelectedServices(opportunity.services_of_interest || []);
      setNextAction(opportunity.next_action || '');
      setNextActionDate(opportunity.next_action_date || '');
      setExpectedCloseDate(opportunity.expected_close_date || '');
      setLostReason(opportunity.lost_reason || '');
      setShowLostPrompt(opportunity.stage === 'lost');
      setSaveSuccess(false);
      setShowDiscardConfirm(false);
    }
  }, [opportunity, isOpen]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!opportunity) return false;
    const origTitle = (opportunity.title || '').trim();
    const origStage = opportunity.stage;
    const origEstimatedValue =
      opportunity.estimated_value !== null && opportunity.estimated_value !== undefined
        ? String(opportunity.estimated_value)
        : '';
    const origProbability =
      opportunity.probability !== null && opportunity.probability !== undefined
        ? String(opportunity.probability)
        : '50';
    const origServices = opportunity.services_of_interest || [];
    const origNextAction = (opportunity.next_action || '').trim();
    const origNextActionDate = opportunity.next_action_date || '';
    const origExpectedCloseDate = opportunity.expected_close_date || '';
    const origLostReason = (opportunity.lost_reason || '').trim();

    const servicesChanged =
      selectedServices.length !== origServices.length ||
      selectedServices.some((s) => !origServices.includes(s));

    return (
      title.trim() !== origTitle ||
      stage !== origStage ||
      estimatedValue.trim() !== origEstimatedValue.trim() ||
      probability !== origProbability ||
      servicesChanged ||
      nextAction.trim() !== origNextAction ||
      nextActionDate !== origNextActionDate ||
      expectedCloseDate !== origExpectedCloseDate ||
      (stage === 'lost' && lostReason.trim() !== origLostReason)
    );
  }, [
    opportunity,
    title,
    stage,
    estimatedValue,
    probability,
    selectedServices,
    nextAction,
    nextActionDate,
    expectedCloseDate,
    lostReason,
  ]);

  if (!isOpen || !opportunity) return null;

  const toggleService = (svc: string) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };

  // Draft update only - no immediate remote persistence
  const handleStageChange = (newStage: OpportunityStage) => {
    setStage(newStage);
    if (newStage === 'lost') {
      setShowLostPrompt(true);
    } else {
      setShowLostPrompt(false);
    }
  };

  const handleSaveFullDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isUpdating || !isDirty) return;

    let parsedVal: number | null = null;
    if (estimatedValue.trim()) {
      const cleanVal = estimatedValue.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num >= 0) {
        parsedVal = num;
      }
    }

    let parsedProb: number | null = null;
    if (probability.trim()) {
      const num = parseInt(probability, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        parsedProb = num;
      }
    }

    const updates: UpdateOpportunityInput = {
      title: title.trim(),
      stage,
      estimated_value: parsedVal,
      probability: parsedProb,
      services_of_interest: selectedServices,
      next_action: nextAction.trim() || null,
      next_action_date: nextActionDate || null,
      expected_close_date: expectedCloseDate || null,
      lost_reason: stage === 'lost' ? lostReason.trim() || null : null,
    };

    const ok = await onUpdate(opportunity.id, updates);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleContinueEditing = () => {
    setShowDiscardConfirm(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={handleAttemptClose}
      />

      {/* Drawer */}
      <div
        id="opportunity-detail-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-[#E8E9EA] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#1D1D1D] truncate max-w-sm">
                {opportunity.title}
              </h2>
              <OpportunityStageBadge stage={stage} size="md" />
            </div>
            {opportunity.lead && (
              <p className="text-sm font-medium text-[#666668] mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>{opportunity.lead.name}</span>
                {opportunity.lead.business_name && (
                  <>
                    <span className="text-[#9E9EA0]">•</span>
                    <span>{opportunity.lead.business_name}</span>
                  </>
                )}
              </p>
            )}
          </div>

          <button
            id="btn-close-opp-drawer"
            onClick={handleAttemptClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Alterações salvas com sucesso!</span>
            </div>
          )}

          {/* Error Alert */}
          {updateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{updateError}</span>
            </div>
          )}

          {/* Stage Alteration Control (Draft mode) */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="drawer-stage-select"
                className="text-xs font-semibold text-[#666668] uppercase tracking-wider block"
              >
                Estágio do Pipeline
              </label>
            </div>

            <div className="relative">
              <select
                id="drawer-stage-select"
                value={stage}
                disabled={isUpdating}
                onChange={(e) =>
                  handleStageChange(e.target.value as OpportunityStage)
                }
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#1D1D1D] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] disabled:opacity-60 cursor-pointer"
              >
                {STAGE_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {getStageLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt for Lost Reason if lost */}
            {(showLostPrompt || stage === 'lost') && (
              <div className="p-3.5 bg-white border border-[#E8E9EA] rounded-lg space-y-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4B5563]">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>Motivo do Encerramento (Perda)</span>
                </div>
                <input
                  type="text"
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Ex: Orçamento fora do escopo, adiou projeto..."
                  className="w-full bg-[#F7F7F8] border border-[#D1D2D4] rounded-md px-3 py-1.5 text-xs text-[#1D1D1D] placeholder:text-[#9E9EA0] focus:outline-none focus:border-[#F15A3C]"
                />
              </div>
            )}

            {onCreateProposal && (
              <div className="pt-2 border-t border-[#E8E9EA]">
                <button
                  type="button"
                  id="btn-drawer-create-proposal"
                  onClick={() => onCreateProposal(opportunity)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F15A3C] bg-[#FDF1EE] border border-[#FBC3B8] rounded-lg hover:bg-[#FBE4DF] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Criar Proposta a partir desta Oportunidade</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Detalhes & Edição da Negociação */}
          <form onSubmit={handleSaveFullDetails} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
                Dados da Negociação
              </h3>
            </div>

            <div className="bg-white border border-[#E8E9EA] rounded-xl p-4.5 space-y-4">
              {/* Título */}
              <div className="space-y-1">
                <label className="text-xs text-[#666668] block">Título</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>

              {/* Valor & Probabilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-[#666668] block">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="text"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="Ex: 4500.00"
                    className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#666668] block">
                      Probabilidade
                    </label>
                    <span className="text-xs font-mono font-medium text-[#1D1D1D]">
                      {probability}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className="w-full accent-[#F15A3C] cursor-pointer mt-1.5"
                  />
                </div>
              </div>

              {/* Serviços de Interesse */}
              <div className="space-y-2 pt-2 border-t border-[#E8E9EA]">
                <label className="text-xs text-[#666668] block">
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
                        className={`px-3 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#FDF1EE] text-[#F15A3C] border-[#FBC3B8]'
                            : 'bg-[#F7F7F8] text-[#666668] hover:text-[#1D1D1D] border-[#E8E9EA]'
                        }`}
                      >
                        {getServiceLabel(svcKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Próxima Ação & Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[#E8E9EA]">
                <div className="space-y-1">
                  <label className="text-xs text-[#666668] block">
                    Próxima Ação
                  </label>
                  <input
                    type="text"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="Ex: Apresentar proposta"
                    className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#666668] block">
                    Data da Próxima Ação
                  </label>
                  <input
                    type="date"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                  />
                </div>
              </div>

              {/* Previsão de Fechamento */}
              <div className="space-y-1 pt-2 border-t border-[#E8E9EA]">
                <label className="text-xs text-[#666668] block">
                  Previsão de Fechamento
                </label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg px-3 py-2 text-sm text-[#1D1D1D] focus:bg-white focus:outline-none focus:border-[#F15A3C]"
                />
              </div>
            </div>
          </form>

          {/* Section: Origem / Lead Relacionado */}
          {opportunity.lead && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
                Contato / Lead de Origem
              </h3>
              <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                    <User className="w-4 h-4 text-[#9E9EA0]" />
                    <span>Nome do Lead</span>
                  </div>
                  <div className="text-sm font-medium text-[#1D1D1D]">
                    {opportunity.lead.name}
                  </div>
                </div>

                {opportunity.lead.business_name && (
                  <div className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                      <Building2 className="w-4 h-4 text-[#9E9EA0]" />
                      <span>Empresa</span>
                    </div>
                    <div className="text-sm font-medium text-[#1D1D1D]">
                      {opportunity.lead.business_name}
                    </div>
                  </div>
                )}

                {opportunity.lead.whatsapp && (
                  <div className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                      <Phone className="w-4 h-4 text-[#9E9EA0]" />
                      <span>WhatsApp</span>
                    </div>
                    <div className="text-sm font-medium text-[#1D1D1D]">
                      {opportunity.lead.whatsapp}
                    </div>
                  </div>
                )}

                {opportunity.lead.email && (
                  <div className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                      <Mail className="w-4 h-4 text-[#9E9EA0]" />
                      <span>E-mail</span>
                    </div>
                    <div className="text-sm font-medium text-[#1D1D1D]">
                      {opportunity.lead.email}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Encerramento (se aplicável) */}
          {(opportunity.closed_at || opportunity.lost_reason) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
                Registro de Encerramento
              </h3>
              <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
                {opportunity.closed_at && (
                  <div className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                      <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                      <span>Data de Encerramento</span>
                    </div>
                    <div className="text-sm font-medium text-[#1D1D1D]">
                      {formatDateTime(opportunity.closed_at)}
                    </div>
                  </div>
                )}

                {opportunity.lost_reason && (
                  <div className="p-3.5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                      <XCircle className="w-4 h-4 text-[#9E9EA0]" />
                      <span>Motivo da Perda</span>
                    </div>
                    <div className="text-sm font-medium text-[#1D1D1D] max-w-xs text-right">
                      {opportunity.lost_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Metadados */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Histórico do Registro
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Criado em</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {formatDateTime(opportunity.created_at)}
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Clock className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Última Atualização</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {formatDateTime(opportunity.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between gap-3 shrink-0">
          <button
            id="btn-close-opp-drawer-bottom"
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            id="btn-save-opportunity-details"
            onClick={() => handleSaveFullDetails()}
            disabled={isUpdating || !isDirty || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E8E9EA] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1D]">
                  Descartar alterações?
                </h3>
                <p className="text-xs text-[#666668] mt-0.5">
                  Existem alterações que ainda não foram salvas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleContinueEditing}
                className="px-3.5 py-2 text-xs font-semibold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] transition-colors cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Descartar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

