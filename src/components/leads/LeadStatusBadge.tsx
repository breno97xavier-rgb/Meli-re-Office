import React from 'react';
import { LeadStatus, LeadService, BusinessStage, PreferredContact, LeadSource } from '../../types/leads';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export function getStatusLabel(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'Novo';
    case 'contacted':
      return 'Contatado';
    case 'qualified':
      return 'Qualificado';
    case 'disqualified':
      return 'Desqualificado';
    case 'converted':
      return 'Convertido';
    default:
      return status;
  }
}

export function getStatusBadgeStyles(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-[#FDF1EE] text-[#F15A3C] border-[#FBC3B8]';
    case 'contacted':
      return 'bg-[#FEF8EC] text-[#B45309] border-[#FDE68A]';
    case 'qualified':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    case 'disqualified':
      return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
    case 'converted':
      return 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm font-medium';

  return (
    <span
      id={`lead-status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors ${sizeClasses} ${getStatusBadgeStyles(
        status
      )}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'new'
            ? 'bg-[#F15A3C]'
            : status === 'contacted'
            ? 'bg-[#D97706]'
            : status === 'qualified'
            ? 'bg-[#059669]'
            : status === 'converted'
            ? 'bg-[#4F46E5]'
            : 'bg-[#6B7280]'
        }`}
      />
      {getStatusLabel(status)}
    </span>
  );
};

export function getServiceLabel(service?: LeadService | null): string {
  if (!service) return 'Não especificado';
  switch (service) {
    case 'social_media':
      return 'Social Media';
    case 'paid_traffic':
      return 'Tráfego Pago';
    case 'website':
      return 'Site / Portfólio';
    case 'branding':
      return 'Branding';
    case 'not_sure':
      return 'Ainda não definido';
    default:
      return service;
  }
}

export function getBusinessStageLabel(stage?: BusinessStage | null): string {
  if (!stage) return 'Não informado';
  switch (stage) {
    case 'starting':
      return 'Começando agora';
    case 'needs_structure':
      return 'Precisa de estruturação';
    case 'has_presence':
      return 'Já possui presença digital';
    case 'professionalizing':
      return 'Profissionalizando a marca';
    default:
      return stage;
  }
}

export function getPreferredContactLabel(contact?: PreferredContact | null): string {
  if (!contact) return 'Sem preferência';
  switch (contact) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'email':
      return 'E-mail';
    default:
      return contact;
  }
}

export function getSourceLabel(source?: LeadSource | null): string {
  if (!source) return 'Outro';
  switch (source) {
    case 'website':
      return 'Site Público';
    case 'prospecting':
      return 'Prospecção Ativa';
    case 'referral':
      return 'Indicação';
    case 'instagram':
      return 'Instagram';
    case 'whatsapp':
      return 'WhatsApp Direto';
    default:
      return source;
  }
}
