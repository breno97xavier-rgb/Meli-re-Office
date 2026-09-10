import React from 'react';
import {
  Image,
  Layers,
  Film,
  Sparkles,
} from 'lucide-react';
import { ContentFormat } from '../../types/contents';
import { FORMAT_LABELS } from './ContentStatusBadge';

interface FormatConfig {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
}

export const FORMAT_CONFIG: Record<ContentFormat, FormatConfig> = {
  feed_single: {
    label: 'Post Estático',
    icon: Image,
    bg: 'bg-zinc-50',
    text: 'text-zinc-700',
    border: 'border-zinc-200',
  },
  carousel: {
    label: 'Carrossel',
    icon: Layers,
    bg: 'bg-blue-50/70',
    text: 'text-blue-700',
    border: 'border-blue-200/70',
  },
  reels: {
    label: 'Reels',
    icon: Film,
    bg: 'bg-rose-50/70',
    text: 'text-rose-700',
    border: 'border-rose-200/70',
  },
  story: {
    label: 'Story',
    icon: Sparkles,
    bg: 'bg-purple-50/70',
    text: 'text-purple-700',
    border: 'border-purple-200/70',
  },
};

interface ContentFormatBadgeProps {
  format: ContentFormat;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const ContentFormatBadge: React.FC<ContentFormatBadgeProps> = ({
  format,
  size = 'md',
  showIcon = true,
}) => {
  const config = FORMAT_CONFIG[format] || FORMAT_CONFIG.feed_single;
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-md border shadow-2xs whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{config.label}</span>
    </span>
  );
};
