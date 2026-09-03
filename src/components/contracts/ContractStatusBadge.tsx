import React from 'react';
import { Contract, ContractStatus } from '../../types/contracts';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#666668]',
    border: 'border-[#DCDDDE]',
    dot: 'bg-[#9E9EA0]',
  },
  pending_signature: {
    label: 'Aguardando assinatura',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    border: 'border-[#BFDBFE]',
    dot: 'bg-[#3B82F6]',
  },
  signed: {
    label: 'Assinado',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    border: 'border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    dot: 'bg-[#EF4444]',
  },
  terminated: {
    label: 'Encerrado',
    bg: 'bg-[#F4F4F5]',
    text: 'text-[#71717A]',
    border: 'border-[#E4E4E7]',
    dot: 'bg-[#A1A1AA]',
  },
};

export const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({
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

export function getContractStatusLabel(status: ContractStatus): string {
  return STATUS_CONFIG[status]?.label || status;
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

export function calculateContractDuration(
  startDate?: string | null,
  endDate?: string | null
): string | null {
  if (!startDate || !endDate) return null;
  try {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return null;
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Mesmo dia';

    const months = Math.round(diffDays / 30.4375);
    if (months >= 12 && months % 12 === 0) {
      const years = months / 12;
      return `${years} ${years === 1 ? 'ano' : 'anos'} (${diffDays} dias)`;
    }
    if (months > 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'} (${diffDays} dias)`;
    }
    return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  } catch {
    return null;
  }
}

export function isContractExpiringSoon(contract: Contract): boolean {
  if (contract.status !== 'signed' || !contract.end_date) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    in30Days.setHours(23, 59, 59, 999);

    const endDate = new Date(contract.end_date + 'T00:00:00');
    return !isNaN(endDate.getTime()) && endDate >= today && endDate <= in30Days;
  } catch {
    return false;
  }
}

export function isContractExpired(contract: Contract): boolean {
  if (contract.status !== 'signed' || !contract.end_date) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(contract.end_date + 'T00:00:00');
    return !isNaN(endDate.getTime()) && endDate < today;
  } catch {
    return false;
  }
}
