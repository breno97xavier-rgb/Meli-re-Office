import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  Globe,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Save,
  Check,
  ExternalLink,
  Target,
  Compass,
  MessageSquare,
  PhoneCall,
  Sparkles,
  Navigation,
  Share2,
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import {
  getStatusLabel,
  getLeadTypeLabel,
  getServiceInterestLabel,
  getCurrentSituationLabel,
  getObjectiveLabel,
  getPreferredCallPeriodLabel,
  getPreferredContactLabel,
  getSourceLabel,
  getLeadServices,
  getLeadSituations,
  getLeadObjectives,
  getLeadNotesOrMessage,
  hasLeadUtmData,
  getLeadEntityDisplay,
} from '../../utils/leadFormatters';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  isUpdatingStatus: boolean;
  updateStatusError: string | null;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onCreateOpportunity?: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  isUpdatingStatus,
  updateStatusError,
  onClose,
  onUpdateStatus,
  onCreateOpportunity,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('new');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (lead && isOpen) {
      setSelectedStatus(lead.status);
      setShowDiscardConfirm(false);
      setSaveSuccess(false);
    }
  }, [lead, isOpen]);

  const isDirty = useMemo(() => {
    if (!lead) return false;
    return selectedStatus !== lead.status;
  }, [lead, selectedStatus]);

  if (!isOpen || !lead) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const statusOptions: LeadStatus[] = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];

  const handleSave = () => {
    if (!isDirty || isUpdatingStatus) return;
    onUpdateStatus(lead.id, selectedStatus);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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

  // Helpers de formatação e URLs
  const entityDisplay = getLeadEntityDisplay(lead);
  const services = getLeadServices(lead);
  const situations = getLeadSituations(lead);
  const objectives = getLeadObjectives(lead);
  const notesOrMessage = getLeadNotesOrMessage(lead);
  const hasUtm = hasLeadUtmData(lead);

  const getSafeUrl = (urlStr?: string | null): string | null => {
    if (!urlStr) return null;
    const trimmed = urlStr.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  };

  const getCleanPhone = (phoneStr?: string | null): string | null => {
    if (!phoneStr) return null;
    const clean = phoneStr.replace(/\D/g, '');
    if (!clean) return null;
    if (clean.length === 10 || clean.length === 11) {
      return `55${clean}`;
    }
    return clean;
  };

  const webOrInstaUrl = getSafeUrl(lead.website_or_instagram);
  const isInstagramHandle =
    lead.website_or_instagram &&
    !webOrInstaUrl &&
    lead.website_or_instagram.trim().startsWith('@');

  const cleanWaNumber = getCleanPhone(lead.whatsapp);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={handleAttemptClose}
      />

      {/* Drawer Panel */}
      <div
        id="lead-detail-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-[#E8E9EA] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#1D1D1D] truncate">
                {entityDisplay.title}
              </h2>
              {entityDisplay.badge && (
                <span
                  id="lead-badge-type"
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-[#F2F3F3] text-[#555557] border border-[#E0E1E2]"
                >
                  {entityDisplay.badge}
                </span>
              )}
              <LeadStatusBadge status={selectedStatus} size="md" />
            </div>

            {entityDisplay.subtitle && (
              <p className="text-sm font-medium text-[#666668] mt-1 flex items-center gap-1.5 truncate">
                {lead.lead_type === 'business' ? (
                  <User className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                ) : (
                  <Compass className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                )}
                <span>{entityDisplay.subtitle}</span>
              </p>
            )}
          </div>

          <button
            id="btn-close-drawer"
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Status atualizado com sucesso!</span>
            </div>
          )}

          {/* Status Alteration Control (Draft Mode) */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="lead-status-select" className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
                Gerenciar Status
              </label>
              {isUpdatingStatus && (
                <div className="flex items-center gap-1.5 text-xs text-[#F15A3C] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </div>
              )}
            </div>

            <div className="relative">
              <select
                id="lead-status-select"
                value={selectedStatus}
                disabled={isUpdatingStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                className="w-full bg-white border border-[#D1D2D4] rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#1D1D1D] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#F15A3C]/20 focus:border-[#F15A3C] disabled:opacity-60 cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {getStatusLabel(opt)}
                  </option>
                ))}
              </select>
            </div>

            {updateStatusError && (
              <div className="flex items-center gap-2 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateStatusError}</span>
              </div>
            )}

            {onCreateOpportunity && (
              <div className="pt-2 border-t border-[#E8E9EA]">
                <button
                  type="button"
                  id="btn-drawer-create-opportunity"
                  onClick={() => onCreateOpportunity(lead)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#F15A3C] bg-[#FDF1EE] border border-[#FBC3B8] rounded-lg hover:bg-[#FDF1EE]/80 transition-colors cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {lead.status === 'converted'
                      ? 'Nova Oportunidade a partir deste Lead'
                      : 'Criar Oportunidade a partir deste Lead'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Seção 1: Identificação */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#9E9EA0]" />
              Identificação
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {lead.lead_type && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">Tipo de Lead</span>
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {getLeadTypeLabel(lead.lead_type)}
                  </span>
                </div>
              )}

              {lead.business_name && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">
                    {lead.lead_type === 'self_employed' ? 'Nome Profissional / Marca' : 'Empresa'}
                  </span>
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {lead.business_name}
                  </span>
                </div>
              )}

              {lead.name && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">Nome do Contato</span>
                  <span className="text-sm font-medium text-[#1D1D1D]">{lead.name}</span>
                </div>
              )}

              {lead.segment_or_profession && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">
                    {lead.lead_type === 'self_employed' ? 'Profissão / Especialidade' : 'Segmento'}
                  </span>
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {lead.segment_or_profession}
                  </span>
                </div>
              )}

              {lead.website_or_instagram && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">Site ou Instagram</span>
                  <div className="text-sm font-medium text-[#1D1D1D]">
                    {webOrInstaUrl ? (
                      <a
                        href={webOrInstaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#F15A3C] hover:underline"
                      >
                        <span className="truncate max-w-[240px]">{lead.website_or_instagram}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ) : isInstagramHandle ? (
                      <a
                        href={`https://instagram.com/${lead.website_or_instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#F15A3C] hover:underline"
                      >
                        <span>{lead.website_or_instagram}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span>{lead.website_or_instagram}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Contato & Atendimento */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#9E9EA0]" />
              Contato & Atendimento
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {/* WhatsApp */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Phone className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>WhatsApp / Telefone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {lead.whatsapp || <span className="text-[#9E9EA0] font-normal italic">Não informado</span>}
                  </span>
                  {cleanWaNumber && (
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://wa.me/${cleanWaNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Abrir WhatsApp"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`tel:+${cleanWaNumber}`}
                        className="p-1 text-[#F15A3C] hover:bg-[#FDF1EE] rounded-md transition-colors"
                        title="Fazer ligação"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  <Mail className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>E-mail</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {lead.email || <span className="text-[#9E9EA0] font-normal italic">Não informado</span>}
                  </span>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="p-1 text-[#F15A3C] hover:bg-[#FDF1EE] rounded-md transition-colors"
                      title="Enviar e-mail"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Preferência de Contato */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#666668]">
                  {lead.preferred_contact === 'phone' ? (
                    <PhoneCall className="w-3.5 h-3.5 text-[#F15A3C]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  )}
                  <span>Canal Preferido</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D] flex items-center gap-1.5">
                  {lead.preferred_contact === 'phone' && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                      Ligação
                    </span>
                  )}
                  <span>{getPreferredContactLabel(lead.preferred_contact)}</span>
                </div>
              </div>

              {/* Melhor Período para Contato */}
              {lead.preferred_call_period && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#666668]">
                    <Clock className="w-3.5 h-3.5 text-[#9E9EA0]" />
                    <span>Melhor Período</span>
                  </div>
                  <div className="text-sm font-medium text-[#1D1D1D]">
                    {getPreferredCallPeriodLabel(lead.preferred_call_period)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: Interesses & Escopo Solicitado */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F15A3C]" />
              Interesses & Escopo Solicitado
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl p-4">
              {services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {services.map((svcKey, idx) => (
                    <span
                      key={`${svcKey}-${idx}`}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FDF1EE] text-[#F15A3C] border border-[#FBC3B8]"
                    >
                      {getServiceInterestLabel(svcKey)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-[#9E9EA0] italic">
                  Nenhum serviço especificado.
                </span>
              )}
            </div>
          </div>

          {/* Seção 4: Situação Atual */}
          {situations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#9E9EA0]" />
                Situação Atual
              </h3>
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-4">
                <ul className="space-y-2">
                  {situations.map((sitKey, idx) => (
                    <li key={`${sitKey}-${idx}`} className="flex items-start gap-2 text-sm text-[#1D1D1D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#666668] mt-2 shrink-0" />
                      <span className="leading-snug">
                        {getCurrentSituationLabel(sitKey, lead.lead_type)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Seção 5: Objetivos */}
          {objectives.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#059669]" />
                Objetivos de Marketing & Negócio
              </h3>
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-4">
                <ul className="space-y-2">
                  {objectives.map((objKey, idx) => (
                    <li key={`${objKey}-${idx}`} className="flex items-start gap-2.5 text-sm text-[#1D1D1D]">
                      <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        {getObjectiveLabel(objKey, lead.lead_type)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Seção 6: Observações / Mensagem */}
          {notesOrMessage && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#9E9EA0]" />
                {lead.notes ? 'Observações do Briefing' : 'Mensagem / Descrição'}
              </h3>
              <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl p-4 text-sm text-[#1D1D1D] leading-relaxed whitespace-pre-wrap">
                {notesOrMessage}
              </div>
            </div>
          )}

          {/* Seção 7: Origem & Rastreabilidade */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#9E9EA0]" />
              Origem & Rastreabilidade
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <span className="text-xs text-[#666668]">Canal de Origem</span>
                <span className="text-sm font-medium text-[#1D1D1D]">
                  {getSourceLabel(lead.source)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-4">
                <span className="text-xs text-[#666668]">Data de Entrada</span>
                <span className="text-sm font-medium text-[#1D1D1D]">
                  {formatDate(lead.created_at)}
                </span>
              </div>

              {lead.updated_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs text-[#666668]">Última Atualização</span>
                  <span className="text-sm font-medium text-[#1D1D1D]">
                    {formatDate(lead.updated_at)}
                  </span>
                </div>
              )}

              {/* Bloco Secundário de Campanhas e UTMs */}
              {hasUtm && (
                <div className="p-4 bg-[#FAFAFA] space-y-2.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-[#9E9EA0] block">
                    Parâmetros de Campanha (UTM)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {lead.utm_source && (
                      <div className="p-2 bg-white rounded-md border border-[#E8E9EA]">
                        <span className="text-[#9E9EA0] block text-2xs uppercase">UTM Source</span>
                        <span className="font-medium text-[#1D1D1D]">{lead.utm_source}</span>
                      </div>
                    )}

                    {lead.utm_medium && (
                      <div className="p-2 bg-white rounded-md border border-[#E8E9EA]">
                        <span className="text-[#9E9EA0] block text-2xs uppercase">UTM Medium</span>
                        <span className="font-medium text-[#1D1D1D]">{lead.utm_medium}</span>
                      </div>
                    )}

                    {lead.utm_campaign && (
                      <div className="p-2 bg-white rounded-md border border-[#E8E9EA]">
                        <span className="text-[#9E9EA0] block text-2xs uppercase">UTM Campaign</span>
                        <span className="font-medium text-[#1D1D1D]">{lead.utm_campaign}</span>
                      </div>
                    )}

                    {lead.utm_content && (
                      <div className="p-2 bg-white rounded-md border border-[#E8E9EA]">
                        <span className="text-[#9E9EA0] block text-2xs uppercase">UTM Content</span>
                        <span className="font-medium text-[#1D1D1D]">{lead.utm_content}</span>
                      </div>
                    )}

                    {lead.utm_term && (
                      <div className="p-2 bg-white rounded-md border border-[#E8E9EA]">
                        <span className="text-[#9E9EA0] block text-2xs uppercase">UTM Term</span>
                        <span className="font-medium text-[#1D1D1D]">{lead.utm_term}</span>
                      </div>
                    )}
                  </div>

                  {lead.referrer && (
                    <div className="pt-2 text-xs">
                      <span className="text-[#9E9EA0] block text-2xs uppercase">Referrer</span>
                      {getSafeUrl(lead.referrer) ? (
                        <a
                          href={getSafeUrl(lead.referrer)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#F15A3C] hover:underline break-all"
                        >
                          <span>{lead.referrer}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[#1D1D1D] break-all">{lead.referrer}</span>
                      )}
                    </div>
                  )}

                  {lead.landing_url && (
                    <div className="pt-1 text-xs">
                      <span className="text-[#9E9EA0] block text-2xs uppercase">Landing URL</span>
                      {getSafeUrl(lead.landing_url) ? (
                        <a
                          href={getSafeUrl(lead.landing_url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#F15A3C] hover:underline break-all"
                        >
                          <span>{lead.landing_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[#1D1D1D] break-all">{lead.landing_url}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex items-center justify-between gap-3 shrink-0">
          <button
            id="btn-drawer-close-bottom"
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            id="btn-save-lead-drawer"
            onClick={handleSave}
            disabled={isUpdatingStatus || !isDirty}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUpdatingStatus ? (
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


