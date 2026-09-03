import React from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  FileText,
  Globe,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/leads';
import {
  LeadStatusBadge,
  getStatusLabel,
  getServiceLabel,
  getBusinessStageLabel,
  getPreferredContactLabel,
  getSourceLabel,
} from './LeadStatusBadge';

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1D1D1D]/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        id="lead-detail-drawer"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-[#E8E9EA] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E9EA] bg-[#FAFAFA] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#1D1D1D]">
                {lead.name}
              </h2>
              <LeadStatusBadge status={lead.status} size="md" />
            </div>
            {lead.business_name && (
              <p className="text-sm font-medium text-[#666668] mt-1 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#9E9EA0]" />
                {lead.business_name}
              </p>
            )}
          </div>

          <button
            id="btn-close-drawer"
            onClick={onClose}
            className="p-1.5 text-[#666668] hover:text-[#1D1D1D] hover:bg-[#E8E9EA]/60 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Alteration Control */}
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
                value={lead.status}
                disabled={isUpdatingStatus}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
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

          {/* Section 1: Contato */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Dados de Contato
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              {/* WhatsApp */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Phone className="w-4 h-4 text-[#9E9EA0]" />
                  <span>WhatsApp</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {lead.whatsapp || <span className="text-[#9E9EA0] font-normal italic">Não informado</span>}
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Mail className="w-4 h-4 text-[#9E9EA0]" />
                  <span>E-mail</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {lead.email || <span className="text-[#9E9EA0] font-normal italic">Não informado</span>}
                </div>
              </div>

              {/* Preferência de Contato */}
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <FileText className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Preferência de Contato</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {getPreferredContactLabel(lead.preferred_contact)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Briefing */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Briefing & Interesse
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl p-4.5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#666668] block">Serviço Solicitado</span>
                  <span className="text-sm font-medium text-[#1D1D1D] mt-0.5 inline-block">
                    {getServiceLabel(lead.service)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#666668] block">Momento do Negócio</span>
                  <span className="text-sm font-medium text-[#1D1D1D] mt-0.5 inline-block">
                    {getBusinessStageLabel(lead.business_stage)}
                  </span>
                </div>
              </div>

              {/* Mensagem Original */}
              <div className="pt-3 border-t border-[#E8E9EA]">
                <span className="text-xs text-[#666668] block mb-1.5">Mensagem / Descrição</span>
                <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg p-3.5 text-sm text-[#1D1D1D] leading-relaxed whitespace-pre-wrap">
                  {lead.message || (
                    <span className="text-[#9E9EA0] italic">Nenhuma mensagem adicional informada.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Registro */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#666668] uppercase tracking-wider">
              Metadados do Registro
            </h3>
            <div className="bg-white border border-[#E8E9EA] rounded-xl divide-y divide-[#E8E9EA]">
              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Globe className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Origem</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {getSourceLabel(lead.source)}
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                  <Calendar className="w-4 h-4 text-[#9E9EA0]" />
                  <span>Data de Entrada</span>
                </div>
                <div className="text-sm font-medium text-[#1D1D1D]">
                  {formatDate(lead.created_at)}
                </div>
              </div>

              {lead.updated_at && (
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-xs text-[#666668]">
                    <Clock className="w-4 h-4 text-[#9E9EA0]" />
                    <span>Última Atualização</span>
                  </div>
                  <div className="text-sm font-medium text-[#1D1D1D]">
                    {formatDate(lead.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8E9EA] bg-[#FAFAFA] flex justify-end">
          <button
            id="btn-drawer-close-bottom"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg hover:bg-[#F7F7F8] hover:border-[#D1D2D4] transition-all cursor-pointer"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </>
  );
};
