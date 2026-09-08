import React from 'react';
import {
  Proposal,
  ProposalStatus,
} from '../../types/proposals';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#666668]',
    border: 'border-[#DCDDDE]',
    dot: 'bg-[#9E9EA0]',
  },
  sent: {
    label: 'Enviada',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#3B82F6]',
  },
  accepted: {
    label: 'Aceita',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    border: 'border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
  },
  rejected: {
    label: 'Rejeitada',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    dot: 'bg-[#EF4444]',
  },
  superseded: {
    label: 'Substituída',
    bg: 'bg-[#F4F4F5]',
    text: 'text-[#71717A]',
    border: 'border-[#E4E4E7]',
    dot: 'bg-[#A1A1AA]',
  },
};

export const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1.5'
      : 'px-2.5 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
};

export function getStatusLabel(status: ProposalStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const [year, month, day] = dateString.split('T')[0].split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function isProposalExpired(proposal: Proposal): boolean {
  if (proposal.status !== 'sent' || !proposal.valid_until) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validDate = new Date(proposal.valid_until + 'T00:00:00');
    return validDate < today;
  } catch {
    return false;
  }
}
