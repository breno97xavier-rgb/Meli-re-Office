import React from 'react';
import { OpportunityStage } from '../../types/opportunities';

interface OpportunityStageBadgeProps {
  stage: OpportunityStage;
  size?: 'sm' | 'md';
}

export function getStageLabel(stage: OpportunityStage): string {
  switch (stage) {
    case 'discovery':
      return 'Diagnóstico';
    case 'briefing':
      return 'Briefing';
    case 'proposal':
      return 'Proposta';
    case 'negotiation':
      return 'Negociação';
    case 'won':
      return 'Ganho';
    case 'lost':
      return 'Perdido';
    default:
      return stage;
  }
}

export function getStageBadgeStyles(stage: OpportunityStage): string {
  switch (stage) {
    case 'discovery':
      return 'bg-[#F0F4F8] text-[#334E68] border-[#D9E2EC]';
    case 'briefing':
      return 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]';
    case 'proposal':
      return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    case 'negotiation':
      return 'bg-[#FDF1EE] text-[#F15A3C] border-[#FBC3B8]';
    case 'won':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    case 'lost':
      return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getStageDotColor(stage: OpportunityStage): string {
  switch (stage) {
    case 'discovery':
      return 'bg-[#486581]';
    case 'briefing':
      return 'bg-[#8B5CF6]';
    case 'proposal':
      return 'bg-[#D97706]';
    case 'negotiation':
      return 'bg-[#F15A3C]';
    case 'won':
      return 'bg-[#059669]';
    case 'lost':
      return 'bg-[#6B7280]';
    default:
      return 'bg-gray-400';
  }
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
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
}

export const OpportunityStageBadge: React.FC<OpportunityStageBadgeProps> = ({
  stage,
  size = 'sm',
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-2.5 py-1 text-xs sm:text-sm font-medium';

  return (
    <span
      id={`opportunity-stage-badge-${stage}`}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors ${sizeClasses} ${getStageBadgeStyles(
        stage
      )}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getStageDotColor(stage)}`} />
      {getStageLabel(stage)}
    </span>
  );
};
