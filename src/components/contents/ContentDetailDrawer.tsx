import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Save,
  Check,
  ChevronRight,
  Info,
  AlertTriangle,
  Image as ImageIcon,
  Compass,
  Target,
} from 'lucide-react';
import {
  Content,
  ContentFormat,
  EditorialStatus,
  UpdateContentInput,
  ContentProfileRelation,
  PRIMARY_CHANNELS,
  FUNNEL_STAGES,
} from '../../types/contents';
import { Client } from '../../types/clients';
import {
  ContentStatusBadge,
  EDITORIAL_STATUS_CONFIG,
  FORMAT_LABELS,
} from './ContentStatusBadge';
import { ContentFormatBadge } from './ContentFormatBadge';
import { ContentAssetsSection } from './assets/ContentAssetsSection';
import { useContentPlanningOptions } from '../../hooks/useContentPlanningOptions';

interface ContentDetailDrawerProps {
  content: Content | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contentId: string, input: UpdateContentInput) => Promise<unknown>;
  onUpdateStatus?: (contentId: string, status: EditorialStatus) => Promise<unknown>;
  teamProfiles: ContentProfileRelation[];
  clients: Client[];
  isSaving: boolean;
  error?: string | null;
}

type DrawerTab = 'strategy' | 'assets' | 'creation' | 'planning' | 'operation';

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Não registrado';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr || 'Não registrado';
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

export const ContentDetailDrawer: React.FC<ContentDetailDrawerProps> = ({
  content,
  isOpen,
  onClose,
  onSave,
  teamProfiles,
  clients,
  isSaving,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('strategy');
  const [successToast, setSuccessToast] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Editable Form State (Draft)
  const [internalTitle, setInternalTitle] = useState('');
  const [format, setFormat] = useState<ContentFormat>('feed_single');
  const [editorialStatus, setEditorialStatus] = useState<EditorialStatus>('draft');
  const [clientId, setClientId] = useState('');
  const [primaryChannel, setPrimaryChannel] = useState('instagram');
  const [goal, setGoal] = useState('');
  const [funnelStage, setFunnelStage] = useState('');
  const [copy, setCopy] = useState('');
  const [caption, setCaption] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  // Planning Structured Fields
  const [editorialPlanId, setEditorialPlanId] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [campaignId, setCampaignId] = useState('');

  // Planning Options Hook for active client
  const targetClientId = clientId || content?.client_id || null;
  const {
    plans,
    activePlans,
    pillars,
    activePillars,
    campaigns,
    activeCampaigns,
    loading: planningLoading,
    error: planningError,
  } = useContentPlanningOptions(targetClientId);

  // Sync state with content when selected or updated
  useEffect(() => {
    if (content) {
      setInternalTitle(content.internal_title || '');
      setFormat(content.format || 'feed_single');
      setEditorialStatus(content.editorial_status || 'draft');
      setClientId(content.client_id || '');
      setPrimaryChannel(content.primary_channel || 'instagram');
      setGoal(content.goal || '');
      setFunnelStage(content.funnel_stage || '');
      setCopy(content.copy || '');
      setCaption(content.caption || '');
      setPlannedDate(formatDate(content.planned_date));
      setAssignedTo(content.assigned_to || '');
      setNotes(content.notes || '');
      setEditorialPlanId(content.editorial_plan_id || '');
      setPillarId(content.pillar_id || '');
      setCampaignId(content.campaign_id || '');
      setSuccessToast(false);
      setShowDiscardConfirm(false);
    }
  }, [content]);

  // Current bound entities (to handle historical states)
  const currentBoundPlan = useMemo(
    () => (content?.editorial_plan_id ? plans.find((p) => p.id === content.editorial_plan_id) : null),
    [content?.editorial_plan_id, plans]
  );

  const currentBoundPillar = useMemo(
    () => (content?.pillar_id ? pillars.find((p) => p.id === content.pillar_id) : null),
    [content?.pillar_id, pillars]
  );

  const currentBoundCampaign = useMemo(
    () => (content?.campaign_id ? campaigns.find((c) => c.id === content.campaign_id) : null),
    [content?.campaign_id, campaigns]
  );

  // Selectable Plans: active plans + current plan if completed/archived
  const selectablePlans = useMemo(() => {
    const list = [...activePlans];
    if (
      editorialPlanId &&
      currentBoundPlan &&
      (currentBoundPlan.status === 'completed' || currentBoundPlan.status === 'archived') &&
      !list.some((p) => p.id === currentBoundPlan.id)
    ) {
      list.unshift(currentBoundPlan);
    }
    return list;
  }, [activePlans, editorialPlanId, currentBoundPlan]);

  // Selected Plan Object (based on current selection)
  const selectedPlan = useMemo(
    () => (editorialPlanId ? plans.find((p) => p.id === editorialPlanId) : null),
    [editorialPlanId, plans]
  );

  // Selectable Pillars:
  // - If no cycle: active pillars (+ current pillar if inactive)
  // - If cycle selected: allocated pillars in that cycle (+ current pillar if inactive but allocated)
  const { selectablePillars, isCycleWithoutPillars } = useMemo(() => {
    if (!editorialPlanId || !selectedPlan) {
      const list = [...activePillars];
      if (
        pillarId &&
        currentBoundPillar &&
        !currentBoundPillar.is_active &&
        !list.some((p) => p.id === currentBoundPillar.id)
      ) {
        list.unshift(currentBoundPillar);
      }
      return {
        selectablePillars: list,
        isCycleWithoutPillars: false,
      };
    }

    const allocatedPillarIds = new Set(
      (selectedPlan.pillars || []).map((pp) => pp.pillar_id)
    );

    const list = pillars.filter((p) => {
      if (!allocatedPillarIds.has(p.id)) return false;
      if (p.is_active) return true;
      // Include inactive only if it is the currently bound pillar of this content
      return p.id === pillarId && p.id === content?.pillar_id;
    });

    return {
      selectablePillars: list,
      isCycleWithoutPillars: (selectedPlan.pillars || []).length === 0 || list.length === 0,
    };
  }, [editorialPlanId, selectedPlan, activePillars, pillars, pillarId, currentBoundPillar, content?.pillar_id]);

  // Incompatibility check: operator has a pillar selected, but cycle changed and pillar is NOT in that cycle
  const isPillarIncompatible = useMemo(() => {
    if (!editorialPlanId || !pillarId || !selectedPlan) return false;
    const allocatedPillarIds = new Set(
      (selectedPlan.pillars || []).map((pp) => pp.pillar_id)
    );
    return !allocatedPillarIds.has(pillarId);
  }, [editorialPlanId, pillarId, selectedPlan]);

  // Selectable Campaigns: active campaigns + current campaign if completed/archived
  const selectableCampaigns = useMemo(() => {
    const list = [...activeCampaigns];
    if (
      campaignId &&
      currentBoundCampaign &&
      (currentBoundCampaign.status === 'completed' || currentBoundCampaign.status === 'archived') &&
      !list.some((c) => c.id === currentBoundCampaign.id)
    ) {
      list.unshift(currentBoundCampaign);
    }
    return list;
  }, [activeCampaigns, campaignId, currentBoundCampaign]);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    if (!content) return false;
    const origTitle = (content.internal_title || '').trim();
    const origFormat = content.format || 'feed_single';
    const origStatus = content.editorial_status || 'draft';
    const origClientId = content.client_id || '';
    const origChannel = content.primary_channel ? content.primary_channel.trim().toLowerCase() : 'instagram';
    const origGoal = (content.goal || '').trim();
    const origFunnel = content.funnel_stage ? content.funnel_stage.trim().toLowerCase() : '';
    const origCopy = (content.copy || '').trim();
    const origCaption = (content.caption || '').trim();
    const origPlannedDate = formatDate(content.planned_date);
    const origAssignedTo = content.assigned_to || '';
    const origNotes = (content.notes || '').trim();

    const origPlanId = content.editorial_plan_id || '';
    const origPillarId = content.pillar_id || '';
    const origCampaignId = content.campaign_id || '';

    return (
      internalTitle.trim() !== origTitle ||
      format !== origFormat ||
      editorialStatus !== origStatus ||
      clientId !== origClientId ||
      (primaryChannel ? primaryChannel.trim().toLowerCase() : 'instagram') !== origChannel ||
      goal.trim() !== origGoal ||
      (funnelStage ? funnelStage.trim().toLowerCase() : '') !== origFunnel ||
      copy.trim() !== origCopy ||
      caption.trim() !== origCaption ||
      plannedDate !== origPlannedDate ||
      assignedTo !== origAssignedTo ||
      notes.trim() !== origNotes ||
      editorialPlanId !== origPlanId ||
      pillarId !== origPillarId ||
      campaignId !== origCampaignId
    );
  }, [
    content,
    internalTitle,
    format,
    editorialStatus,
    clientId,
    primaryChannel,
    goal,
    funnelStage,
    copy,
    caption,
    plannedDate,
    assignedTo,
    notes,
    editorialPlanId,
    pillarId,
    campaignId,
  ]);

  if (!isOpen || !content) return null;

  const clientName =
    content.client?.commercial_name || content.client?.name || 'Cliente';

  // Status changes update local draft until "Salvar Alterações" is clicked
  const handleStatusChange = (newStatus: EditorialStatus) => {
    setEditorialStatus(newStatus);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalTitle.trim() || isSaving || !isDirty || isPillarIncompatible) return;

    // Resolve pillar text: if structured pillar chosen, use its name; otherwise preserve legacy pillar text
    const chosenPillar = pillars.find((p) => p.id === pillarId);
    const finalPillarText = chosenPillar ? chosenPillar.name : (pillarId ? null : (content.pillar || null));

    try {
      await onSave(content.id, {
        internal_title: internalTitle.trim(),
        format,
        editorial_status: editorialStatus,
        client_id: clientId || content.client_id,
        primary_channel: primaryChannel ? primaryChannel.trim().toLowerCase() : null,
        goal: goal.trim() || null,
        pillar: finalPillarText,
        pillar_id: pillarId || null,
        editorial_plan_id: editorialPlanId || null,
        campaign_id: campaignId || null,
        funnel_stage: funnelStage ? funnelStage.trim().toLowerCase() : null,
        copy: copy.trim() || null,
        caption: caption.trim() || null,
        script: content.script ?? null,
        planned_date: plannedDate || null,
        assigned_to: assignedTo || null,
        notes: notes.trim() || null,
      });
      showSuccessFeedback();
    } catch {
      // Error is caught/handled by parent and displayed via error prop
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

  const showSuccessFeedback = () => {
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
    }, 3000);
  };

  // Resolved readable names for display
  const activePlanName = selectedPlan?.title || content.editorial_plan?.title;
  const activePillarName = pillars.find((p) => p.id === pillarId)?.name || content.client_pillar?.name || content.pillar;
  const activeCampaignName = campaigns.find((c) => c.id === campaignId)?.name || content.campaign?.name;
  const hasPlanningLinks = Boolean(editorialPlanId || pillarId || campaignId || content.pillar);

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        {/* Backdrop click triggers close check */}
        <div className="fixed inset-0" onClick={handleAttemptClose} />

        <div className="relative bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl border-l border-[#E8E9EA] overflow-hidden animate-in slide-in-from-right duration-200 z-10">
          {/* Top Header */}
          <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] space-y-4 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#666668] uppercase tracking-wider">
                  Gestão Editorial
                </span>
                <ChevronRight className="w-3 h-3 text-[#8C8D8F]" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1D]">
                  <Building2 className="w-3.5 h-3.5 text-[#F15A3C]" />
                  <span className="truncate max-w-[200px]">{clientName}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAttemptClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] transition-colors cursor-pointer"
                title="Fechar editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title and Badges */}
            <div className="space-y-3">
              <input
                type="text"
                value={internalTitle}
                onChange={(e) => setInternalTitle(e.target.value)}
                placeholder="Título da peça editorial"
                className="text-lg font-bold text-[#1D1D1D] bg-transparent border-b border-transparent hover:border-[#E8E9EA] focus:border-[#1D1D1D] focus:bg-white px-1.5 py-1 -mx-1.5 rounded transition-all w-full focus:outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ContentFormatBadge format={format} size="md" />
                  {activePillarName && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-[#F2F3F3] text-[#1D1D1D] rounded-lg border border-[#E8E9EA] truncate max-w-[180px]">
                      {activePillarName}
                    </span>
                  )}
                </div>

                {/* Status Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#666668]">Status:</span>
                  <select
                    value={editorialStatus}
                    onChange={(e) => handleStatusChange(e.target.value as EditorialStatus)}
                    className="px-3 py-1 text-xs font-bold text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] shadow-2xs cursor-pointer"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="in_production">Em Produção</option>
                    <option value="review">Revisão Interna</option>
                    <option value="client_review">Revisão do Cliente</option>
                    <option value="approved">Aprovado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-1 border-b border-[#E8E9EA] -mb-6 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('strategy')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'strategy'
                    ? 'border-[#F15A3C] text-[#F15A3C]'
                    : 'border-transparent text-[#666668] hover:text-[#1D1D1D]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Estratégia</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'assets'
                    ? 'border-[#F15A3C] text-[#F15A3C]'
                    : 'border-transparent text-[#666668] hover:text-[#1D1D1D]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Peça & Arquivos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('creation')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'creation'
                    ? 'border-[#F15A3C] text-[#F15A3C]'
                    : 'border-transparent text-[#666668] hover:text-[#1D1D1D]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Criação & Redação</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('planning')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'planning'
                    ? 'border-[#F15A3C] text-[#F15A3C]'
                    : 'border-transparent text-[#666668] hover:text-[#1D1D1D]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Planejamento</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('operation')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'operation'
                    ? 'border-[#F15A3C] text-[#F15A3C]'
                    : 'border-transparent text-[#666668] hover:text-[#1D1D1D]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Operação & Logs</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Toast */}
            {successToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Alterações salvas com sucesso!</span>
              </div>
            )}

            {/* TAB 1: ESTRATÉGIA */}
            {activeTab === 'strategy' && (
              <div className="space-y-4">
                {/* Planning Summary Box */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1D]">
                      <Compass className="w-3.5 h-3.5 text-[#F15A3C]" />
                      <span>Vínculos de Planejamento</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('planning')}
                      className="text-[11px] font-semibold text-[#F15A3C] hover:underline cursor-pointer"
                    >
                      Gerenciar na aba Planejamento →
                    </button>
                  </div>

                  {hasPlanningLinks ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Ciclo */}
                      <div className="p-2.5 bg-white rounded-lg border border-[#E8E9EA] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#8C8D8F] block">
                          Ciclo
                        </span>
                        <span className="font-semibold text-[#1D1D1D] truncate block">
                          {activePlanName || 'Sem ciclo'}
                        </span>
                        {currentBoundPlan?.status === 'completed' && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-600 rounded">
                            Concluído
                          </span>
                        )}
                        {currentBoundPlan?.status === 'archived' && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 rounded">
                            Arquivado
                          </span>
                        )}
                      </div>

                      {/* Pilar */}
                      <div className="p-2.5 bg-white rounded-lg border border-[#E8E9EA] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#8C8D8F] block">
                          Pilar
                        </span>
                        <span className="font-semibold text-[#1D1D1D] truncate block">
                          {activePillarName || 'Sem pilar'}
                        </span>
                        {currentBoundPillar && !currentBoundPillar.is_active && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-500 rounded">
                            Inativo
                          </span>
                        )}
                        {!pillarId && content.pillar && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-orange-50 text-[#F15A3C] rounded">
                            Legado
                          </span>
                        )}
                      </div>

                      {/* Campanha */}
                      <div className="p-2.5 bg-white rounded-lg border border-[#E8E9EA] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#8C8D8F] block">
                          Campanha
                        </span>
                        <span className="font-semibold text-[#1D1D1D] truncate block">
                          {activeCampaignName || 'Sem campanha'}
                        </span>
                        {currentBoundCampaign?.status === 'completed' && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-600 rounded">
                            Concluída
                          </span>
                        )}
                        {currentBoundCampaign?.status === 'archived' && (
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 rounded">
                            Arquivada
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-[#D5D6D8] text-center text-xs text-[#666668]">
                      <span>Este conteúdo ainda não está vinculado ao planejamento.</span>
                    </div>
                  )}
                </div>

                {/* Formato & Canal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                      Formato da Peça
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as ContentFormat)}
                      className="w-full px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                    >
                      <option value="feed_single">Post Estático (Feed)</option>
                      <option value="carousel">Carrossel</option>
                      <option value="reels">Reels</option>
                      <option value="story">Story</option>
                    </select>
                  </div>

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

                {/* Objetivo Estratégico */}
                <div>
                  <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                    Objetivo Estratégico
                  </label>
                  <textarea
                    rows={3}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Objetivo pretendido com esta publicação (ex: aquisição de leads, posicionamento de marca, aumento de engajamento)..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: PEÇA & ARQUIVOS */}
            {activeTab === 'assets' && (
              <ContentAssetsSection
                clientId={clientId || content.client_id}
                contentId={content.id}
                format={format}
              />
            )}

            {/* TAB 3: CRIAÇÃO & REDAÇÃO */}
            {activeTab === 'creation' && (
              <div className="space-y-4">
                {/* Legenda Final (Caption) */}
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5 flex items-center justify-between">
                    <span>Legenda da Publicação (Caption)</span>
                    <span className="text-[10px] text-[#8C8D8F] font-medium">
                      Texto para veiculação nas redes sociais
                    </span>
                  </label>
                  <textarea
                    rows={6}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Texto completo que acompanhará a publicação com parágrafos, emojis e CTA..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] leading-relaxed"
                  />
                </div>

                {/* Copy Geral / Conceito */}
                <div>
                  <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                    Conceito Geral / Copy de Apoio
                  </label>
                  <textarea
                    rows={3}
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    placeholder="Orientação geral, referências conceituais e notas de redação..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D]"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: PLANEJAMENTO */}
            {activeTab === 'planning' && (
              <div className="space-y-5">
                {/* Section: Vínculos Estruturados de Planejamento */}
                <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E9EA]">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#F15A3C]" />
                      <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider">
                        Vínculos de Planejamento
                      </h3>
                    </div>
                    {planningLoading && (
                      <span className="text-[11px] text-[#8C8D8F] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-[#F15A3C]" />
                        <span>Carregando opções...</span>
                      </span>
                    )}
                  </div>

                  {planningError && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <span>Erro ao carregar opções: {planningError}</span>
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
                            Selecione um pilar do ciclo ou remova o vínculo para permitir salvar.
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

                  {/* Legacy Pillar Notification */}
                  {!pillarId && content.pillar && (
                    <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#F15A3C] shrink-0" />
                        <span>
                          Pilar textual legado: <strong className="font-semibold">"{content.pillar}"</strong>
                        </span>
                      </div>
                      <span className="text-[10px] text-orange-700 bg-white px-2 py-0.5 rounded border border-orange-200 font-medium">
                        Selecione um pilar estruturado acima para migrar
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* 1. Ciclo de Planejamento */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-[#1D1D1D]">
                          Ciclo de Planejamento
                        </label>
                        {currentBoundPlan?.status === 'completed' && (
                          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                            Ciclo Concluído
                          </span>
                        )}
                        {currentBoundPlan?.status === 'archived' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Ciclo Arquivado
                          </span>
                        )}
                      </div>
                      <select
                        value={editorialPlanId}
                        onChange={(e) => setEditorialPlanId(e.target.value)}
                        disabled={planningLoading}
                        className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] cursor-pointer"
                      >
                        <option value="">Sem ciclo definido</option>
                        {selectablePlans.map((p) => {
                          const isHistorical = p.status === 'completed' || p.status === 'archived';
                          const statusLabel =
                            p.status === 'draft'
                              ? ' (Rascunho)'
                              : p.status === 'completed'
                              ? ' (Concluído)'
                              : p.status === 'archived'
                              ? ' (Arquivado)'
                              : '';
                          return (
                            <option key={p.id} value={p.id}>
                              {p.title}
                              {statusLabel}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 2. Pilar Editorial */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-[#1D1D1D]">
                          Pilar Editorial Estruturado
                        </label>
                        {currentBoundPillar && !currentBoundPillar.is_active && (
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                            Pilar Inativo
                          </span>
                        )}
                      </div>
                      <select
                        value={pillarId}
                        onChange={(e) => setPillarId(e.target.value)}
                        disabled={planningLoading || (Boolean(editorialPlanId) && isCycleWithoutPillars)}
                        className={`w-full px-3 py-2 text-xs font-medium bg-white border rounded-lg focus:outline-none cursor-pointer ${
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
                        ) : (
                          selectablePillars.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {!p.is_active ? '(Inativo)' : ''}
                            </option>
                          ))
                        )}
                      </select>
                      {isCycleWithoutPillars && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          Este ciclo ainda não possui pilares configurados.
                        </p>
                      )}
                    </div>

                    {/* 3. Campanha */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-[#1D1D1D]">
                          Campanha Comercial / Sazonal
                        </label>
                        {currentBoundCampaign?.status === 'completed' && (
                          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                            Campanha Concluída
                          </span>
                        )}
                        {currentBoundCampaign?.status === 'archived' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Campanha Arquivada
                          </span>
                        )}
                      </div>
                      <select
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        disabled={planningLoading}
                        className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] cursor-pointer"
                      >
                        <option value="">Sem campanha definida</option>
                        {selectableCampaigns.map((c) => {
                          const statusLabel =
                            c.status === 'draft'
                              ? ' (Rascunho)'
                              : c.status === 'completed'
                              ? ' (Concluída)'
                              : c.status === 'archived'
                              ? ' (Arquivada)'
                              : '';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {statusLabel}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data Planejada */}
                <div className="p-4 bg-white border border-[#E8E9EA] rounded-xl space-y-2 shadow-2xs">
                  <label className="block text-xs font-bold text-[#1D1D1D]">
                    Data Planejada para Publicação
                  </label>
                  <input
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D]"
                  />
                  <p className="text-[11px] text-[#8C8D8F]">
                    Data prevista no calendário editorial para a veiculação desta peça.
                  </p>
                </div>

                {/* Informações Operacionais de Sistema */}
                <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1D1D1D] pb-1 border-b border-[#E8E9EA]">
                    <Info className="w-3.5 h-3.5 text-[#F15A3C]" />
                    <span>Status do Ciclo de Vida do Conteúdo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-[#E8E9EA] space-y-1">
                      <span className="text-[11px] font-medium text-[#8C8D8F] block">
                        Aprovado em (Trigger)
                      </span>
                      <span className="font-semibold text-[#1D1D1D]">
                        {content.approved_at
                          ? formatDateTime(content.approved_at)
                          : 'Ainda não aprovado'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-[#E8E9EA] space-y-1">
                      <span className="text-[11px] font-medium text-[#8C8D8F] block">
                        Agendamento Operacional
                      </span>
                      <span className="font-semibold text-[#1D1D1D]">
                        {content.scheduled_date
                          ? formatDateTime(content.scheduled_date)
                          : 'Não agendado'}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-[#E8E9EA] space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-medium text-[#8C8D8F] block">
                        Publicado em (Histórico)
                      </span>
                      <span className="font-semibold text-[#1D1D1D]">
                        {content.published_at
                          ? formatDateTime(content.published_at)
                          : 'Não publicado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: OPERAÇÃO & METADADOS */}
            {activeTab === 'operation' && (
              <div className="space-y-4">
                {/* Responsável */}
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                    Membro Responsável pela Peça
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8D8F] pointer-events-none" />
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
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

                {/* Observações Internas */}
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                    Notas Internas da Equipe
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções para o time de design, revisões de copywriting, links para pastas de arquivos..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D]"
                  />
                </div>

                {/* Metadados de Auditoria */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl space-y-2 text-xs text-[#666668]">
                  <div className="flex justify-between">
                    <span>ID do Conteúdo:</span>
                    <span className="font-mono text-[#1D1D1D]">{content.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Criado em:</span>
                    <span className="font-medium text-[#1D1D1D]">
                      {formatDateTime(content.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última atualização:</span>
                    <span className="font-medium text-[#1D1D1D]">
                      {formatDateTime(content.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving || !isDirty || !internalTitle.trim() || isPillarIncompatible}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
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
      </div>

      {/* Discard Changes Confirmation Dialog */}
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
