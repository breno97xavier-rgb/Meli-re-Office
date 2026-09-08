import React from 'react';
import { ClientStatus } from '../../types/clients';

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  onboarding: {
    label: 'Onboarding',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  active: {
    label: 'Ativo',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  paused: {
    label: 'Pausado',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  ended: {
    label: 'Encerrado',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#666668]',
    border: 'border-[#E8E9EA]',
    dot: 'bg-[#9E9EA0]',
  },
};

export const ClientStatusBadge: React.FC<ClientStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.onboarding;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

export const formatCurrency = (val?: number | null): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    // If YYYY-MM-DD format, parse cleanly without timezone shifting
    if (dateStr.length === 10 && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};
