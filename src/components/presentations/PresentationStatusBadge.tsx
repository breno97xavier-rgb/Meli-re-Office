import React from 'react';
import {
  FileEdit,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  PresentationStatus,
  PresentationItemApprovalStatus,
} from '../../types/presentations';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ElementType;
}

export const PRESENTATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: 'Rascunho',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#555557]',
    border: 'border-[#E0E1E2]',
    icon: FileEdit,
  },
  sent: {
    label: 'Enviada',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Send,
  },
  in_review: {
    label: 'Em Revisão',
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
    icon: Clock,
  },
  approved: {
    label: 'Aprovada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Recusada',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
  changes_requested: {
    label: 'Ajustes Solicitados',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Concluída',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: CheckCircle2,
  },
};

export const PRESENTATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  in_review: 'Em Revisão',
  client_review: 'Revisão do Cliente',
  approved: 'Aprovada',
  rejected: 'Recusada',
  changes_requested: 'Ajustes Solicitados',
  completed: 'Concluída',
};

interface PresentationStatusBadgeProps {
  status?: PresentationStatus | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PresentationStatusBadge: React.FC<PresentationStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const normalizedKey = (status || 'draft').toLowerCase().trim();
  const config =
    PRESENTATION_STATUS_CONFIG[normalizedKey] || {
      label: status || 'Desconhecido',
      bg: 'bg-zinc-50',
      text: 'text-zinc-700',
      border: 'border-zinc-200',
      icon: HelpCircle,
    };

  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};

// Item Approval Status
export const ITEM_APPROVAL_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pendente',
    bg: 'bg-[#F2F3F3]',
    text: 'text-[#555557]',
    border: 'border-[#E0E1E2]',
    icon: Clock,
  },
  approved: {
    label: 'Aprovado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  changes_requested: {
    label: 'Ajustes Solicitados',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: AlertTriangle,
  },
  rejected: {
    label: 'Recusado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

export const ITEM_APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  changes_requested: 'Ajustes Solicitados',
  rejected: 'Recusado',
};

interface PresentationItemApprovalBadgeProps {
  status?: PresentationItemApprovalStatus | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const PresentationItemApprovalBadge: React.FC<PresentationItemApprovalBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const normalizedKey = (status || 'pending').toLowerCase().trim();
  const config =
    ITEM_APPROVAL_STATUS_CONFIG[normalizedKey] || {
      label: status || 'Pendente',
      bg: 'bg-zinc-50',
      text: 'text-zinc-700',
      border: 'border-zinc-200',
      icon: Clock,
    };

  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
