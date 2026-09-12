import React from 'react';
import { LeadStatus } from '../../types/leads';
import {
  getStatusLabel,
  getServiceInterestLabel,
  getCurrentSituationLabel,
  getPreferredContactLabel as formatPreferredContact,
  getSourceLabel as formatSource,
} from '../../utils/leadFormatters';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export { getStatusLabel };

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

export function getServiceLabel(service?: string | null): string {
  return getServiceInterestLabel(service);
}

export function getBusinessStageLabel(stage?: string | null): string {
  return getCurrentSituationLabel(stage, null);
}

export function getPreferredContactLabel(contact?: string | null): string {
  return formatPreferredContact(contact);
}

export function getSourceLabel(source?: string | null): string {
  return formatSource(source);
}

