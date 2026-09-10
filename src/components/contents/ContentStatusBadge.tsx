import React from 'react';
import {
  FileEdit,
  PenTool,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { EditorialStatus, ContentFormat } from '../../types/contents';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ElementType;
}

export const EDITORIAL_STATUS_CONFIG: Record<EditorialStatus, StatusConfig> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#555557]',
    border: 'border-[#E0E1E2]',
    icon: FileEdit,
  },
  in_production: {
    label: 'Em Produção',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: PenTool,
  },
  review: {
    label: 'Revisão Interna',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
  },
  client_review: {
    label: 'Revisão do Cliente',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: UserCheck,
  },
  approved: {
    label: 'Aprovado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  feed_single: 'Post Estático',
  carousel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
};

interface ContentStatusBadgeProps {
  status: EditorialStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const ContentStatusBadge: React.FC<ContentStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = EDITORIAL_STATUS_CONFIG[status] || EDITORIAL_STATUS_CONFIG.draft;
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs font-medium whitespace-nowrap transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{config.label}</span>
    </span>
  );
};
