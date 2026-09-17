import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  Compass,
  AlertTriangle,
  Target,
} from 'lucide-react';
import {
  ContentFormat,
  EditorialStatus,
  CreateContentInput,
  ContentProfileRelation,
  PRIMARY_CHANNELS,
  FUNNEL_STAGES,
} from '../../types/contents';
import { Client } from '../../types/clients';
import { FORMAT_LABELS } from './ContentStatusBadge';
import { useContentPlanningOptions } from '../../hooks/useContentPlanningOptions';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateContentInput) => Promise<unknown>;
  clients: Client[];
  teamProfiles: ContentProfileRelation[];
  initialClientId?: string;
  isSaving: boolean;
  error?: string | null;
}

export const CreateContentModal: React.FC<CreateContentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  teamProfiles,
  initialClientId,
  isSaving,
  error,
}) => {
  const [clientId, setClientId] = useState(initialClientId || '');
  const [internalTitle, setInternalTitle] = useState('');
  const [format, setFormat] = useState<ContentFormat>('feed_single');
  const [primaryChannel, setPrimaryChannel] = useState('instagram');
  const [editorialStatus, setEditorialStatus] = useState<EditorialStatus>('draft');
  const [goal, setGoal] = useState('');
  const [funnelStage, setFunnelStage] = useState('');
  const [copy, setCopy] = useState('');
  const [caption, setCaption] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Planning state (optional, independent & nullable)
  const [editorialPlanId, setEditorialPlanId] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [campaignId, setCampaignId] = useState('');

  // Load planning options for selected client
  const {
    plans,
    activePlans,
    pillars,
    activePillars,
    campaigns,
    activeCampaigns,
    loading: planningLoading,
    error: planningError,
  } = useContentPlanningOptions(clientId || null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClientId(initialClientId || (clients.length === 1 ? clients[0].id : ''));
      setInternalTitle('');
      setFormat('feed_single');
      setPrimaryChannel('instagram');
      setEditorialStatus('draft');
      setGoal('');
      setFunnelStage('');
      setCopy('');
      setCaption('');
      setPlannedDate('');
      setAssignedTo('');
      setNotes('');
      setEditorialPlanId('');
      setPillarId('');
      setCampaignId('');
      setValidationError(null);
    }
  }, [isOpen, initialClientId, clients]);

  // Handle client change: clear planning selections to prevent cross-tenant assignment
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setEditorialPlanId('');
    setPillarId('');
    setCampaignId('');
    setValidationError(null);
  };

  // Find currently selected plan
  const selectedPlan = useMemo(
    () => (editorialPlanId ? plans.find((p) => p.id === editorialPlanId) : null),
    [editorialPlanId, plans]
  );

  // Determine available pillars based on cycle selection:
  // - If no cycle: all active client pillars
  // - If cycle selected: strictly pillars allocated in that cycle
  const { availablePillars, isCycleWithoutPillars } = useMemo(() => {
    if (!editorialPlanId || !selectedPlan) {
      return {
        availablePillars: activePillars,
        isCycleWithoutPillars: false,
      };
    }

    const allocatedPillarIds = new Set(
      (selectedPlan.pillars || []).map((pp) => pp.pillar_id)
    );

    const cyclePillars = pillars.filter(
      (p) => allocatedPillarIds.has(p.id) && p.is_active
    );

    return {
      availablePillars: cyclePillars,
      isCycleWithoutPillars: (selectedPlan.pillars || []).length === 0 || cyclePillars.length === 0,
    };
  }, [editorialPlanId, selectedPlan, activePillars, pillars]);

  // Incompatibility check: operator has a pillar selected, but cycle changed and pillar is NOT allocated in new cycle
  const isPillarIncompatible = useMemo(() => {
    if (!editorialPlanId || !pillarId || !selectedPlan) return false;
    const allocatedPillarIds = new Set(
      (selectedPlan.pillars || []).map((pp) => pp.pillar_id)
    );
    return !allocatedPillarIds.has(pillarId);
  }, [editorialPlanId, pillarId, selectedPlan]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!clientId) {
      setValidationError('Selecione o cliente para associar o conteúdo.');
      return;
    }
    if (!internalTitle.trim()) {
      setValidationError('Informe o título interno do conteúdo.');
      return;
    }
    if (isPillarIncompatible) {
      setValidationError(
        'O pilar atual não faz parte do novo ciclo selecionado. Selecione um pilar válido ou remova o vínculo.'
      );
      return;
    }

    // Resolve pillar name for legacy compatibility
    const chosenPillar = pillars.find((p) => p.id === pillarId);

    try {
      await onSave({
        client_id: clientId,
        internal_title: internalTitle.trim(),
        format,
        primary_channel: primaryChannel ? primaryChannel.trim().toLowerCase() : 'instagram',
        editorial_status: editorialStatus,
        goal: goal.trim() || null,
        pillar: chosenPillar ? chosenPillar.name : null,
        pillar_id: pillarId || null,
        editorial_plan_id: editorialPlanId || null,
        campaign_id: campaignId || null,
        funnel_stage: funnelStage ? funnelStage.trim().toLowerCase() : null,
        copy: copy.trim() || null,
        caption: caption.trim() || null,
        script: null,
        planned_date: plannedDate || null,
        assigned_to: assignedTo || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      // Error handled by parent hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8E9EA] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F15A3C] flex items-center justify-center border border-orange-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1D]">
                Novo Conteúdo Editorial
              </h2>
              <p className="text-xs text-[#666668]">
                Cadastre um novo item de pauta, definindo formato, planejamento e redação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8D8F] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error alerts */}
          {(validationError || error) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Section 1: Identificação & Formato (Obrigatórios) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <FileText className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Identificação & Formato</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                  Cliente <span className="text-[#F15A3C]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8D8F] pointer-events-none" />
                  <select
                    id="content-client-select"
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    disabled={Boolean(initialClientId)}
                    required
                    className="w-full pl-9 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] disabled:opacity-75 disabled:bg-[#EDEEEE] cursor-pointer"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.commercial_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formato */}
              <div>
                <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                  Formato <span className="text-[#F15A3C]">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F2F3F3] rounded-lg border border-[#E8E9EA]">
                  {(['feed_single', 'carousel', 'reels', 'story'] as ContentFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-1.5 text-center text-[11px] font-semibold rounded-md transition-all cursor-pointer truncate px-1 ${
                        format === fmt
                          ? 'bg-white text-[#1D1D1D] shadow-2xs'
                          : 'text-[#666668] hover:text-[#1D1D1D]'
                      }`}
                    >
                      {FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Título Interno */}
            <div>
              <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                Título Interno / Tema da Peça <span className="text-[#F15A3C]">*</span>
              </label>
              <input
                type="text"
                value={internalTitle}
                onChange={(e) => setInternalTitle(e.target.value)}
                placeholder="Ex: 5 erros comuns no tráfego pago para e-commerce"
                required
                className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 2: Planejamento Estratégico (Opcional, Não obrigatório) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#F2F3F3]">
              <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Planejamento Estratégico</span>
              </h3>
              {planningLoading && (
                <span className="text-[11px] text-[#8C8D8F] flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-[#F15A3C]" />
                  <span>Carregando opções...</span>
                </span>
              )}
            </div>

            {planningError && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span>Não foi possível carregar as opções de planejamento: {planningError}</span>
              </div>
            )}

            {/* Incompatibility Warning Banner */}
            {isPillarIncompatible && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Incompatibilidade de Pilar:</strong>
                    <span>
                      O pilar atual não faz parte das alocações do novo ciclo selecionado.
                      Selecione um pilar pertencente ao ciclo ou remova o vínculo.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPillarId('')}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  Remover pilar
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Ciclo de Planejamento */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Ciclo de Planejamento
                </label>
                <select
                  value={editorialPlanId}
                  onChange={(e) => setEditorialPlanId(e.target.value)}
                  disabled={!clientId || planningLoading}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer disabled:opacity-50"
                >
                  <option value="">Sem ciclo definido</option>
                  {activePlans.length > 0 ? (
                    activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} {plan.status === 'draft' ? '(Rascunho)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Nenhum ciclo ativo disponível
                    </option>
                  )}
                </select>
              </div>

              {/* 2. Pilar Editorial */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Pilar Editorial
                </label>
                <select
                  value={pillarId}
                  onChange={(e) => setPillarId(e.target.value)}
                  disabled={!clientId || planningLoading || (Boolean(editorialPlanId) && isCycleWithoutPillars)}
                  className={`w-full px-3 py-2 text-xs font-medium bg-[#F7F7F8] border rounded-lg focus:outline-none focus:bg-white cursor-pointer disabled:opacity-50 ${
                    isPillarIncompatible
                      ? 'border-amber-400 text-amber-900 bg-amber-50/50'
                      : 'border-[#E8E9EA] text-[#1D1D1D] focus:border-[#1D1D1D]'
                  }`}
                >
                  <option value="">Sem pilar definido</option>
                  {isCycleWithoutPillars ? (
                    <option value="" disabled>
                      Ciclo sem pilares configurados
                    </option>
                  ) : availablePillars.length > 0 ? (
                    availablePillars.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Nenhum pilar disponível
                    </option>
                  )}
                </select>
                {isCycleWithoutPillars && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Este ciclo ainda não possui pilares configurados.
                  </p>
                )}
              </div>

              {/* 3. Campanha */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Campanha
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  disabled={!clientId || planningLoading}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer disabled:opacity-50"
                >
                  <option value="">Sem campanha definida</option>
                  {activeCampaigns.length > 0 ? (
                    activeCampaigns.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name} {camp.status === 'draft' ? '(Rascunho)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Nenhuma campanha ativa disponível
                    </option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Estratégia Editorial & Metas */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <Sparkles className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Estratégia & Metas</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Etapa do Funil */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Etapa do Funil
                </label>
                <select
                  value={funnelStage}
                  onChange={(e) => setFunnelStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  <option value="">Selecione a etapa...</option>
                  {FUNNEL_STAGES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Canal Principal */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Canal Principal
                </label>
                <select
                  value={primaryChannel}
                  onChange={(e) => setPrimaryChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  {PRIMARY_CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Objetivo da Peça */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                Objetivo Estratégico da Peça
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ex: Gerar salvamentos e atrair novos seguidores qualificados no segmento B2B"
                className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 4: Redação & Criação */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#F2F3F3]">
              <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Conteúdo & Redação</span>
              </h3>
              <span className="text-[11px] text-[#8C8D8F]">
                {FORMAT_LABELS[format]}
              </span>
            </div>

            {/* Legenda da Publicação (Caption) */}
            <div>
              <label className="block text-xs font-bold text-[#1D1D1D] mb-1 flex items-center justify-between">
                <span>Legenda da Publicação (Caption)</span>
                <span className="text-[10px] text-[#8C8D8F] font-semibold uppercase">
                  {FORMAT_LABELS[format]}
                </span>
              </label>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Texto completo da legenda da publicação, estruturado com espaçamentos, copy persuasiva e CTA..."
                className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] leading-relaxed"
              />
            </div>

            {/* Copy Geral / Conceito (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1">
                Conceito Geral / Copy de Apoio
              </label>
              <textarea
                rows={2}
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Rascunho de ideias conceituais, referências e orientações de redação..."
                className="w-full p-2.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 5: Operação & Agendamento */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <Calendar className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Operação & Agendamento</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Editorial Inicial */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Status Editorial
                </label>
                <select
                  value={editorialStatus}
                  onChange={(e) => setEditorialStatus(e.target.value as EditorialStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  <option value="draft">Rascunho</option>
                  <option value="in_production">Em Produção</option>
                  <option value="review">Revisão Interna</option>
                  <option value="client_review">Revisão do Cliente</option>
                  <option value="approved">Aprovado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Data Planejada */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Data Planejada
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D]"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Responsável
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8D8F] pointer-events-none" />
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {teamProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.full_name} ({p.role || 'Equipe'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Observações Internas */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                Notas & Observações Internas
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Diretrizes da equipe, prazos internos, links de referência..."
                className="w-full p-2.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isPillarIncompatible}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Cadastrar Conteúdo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
