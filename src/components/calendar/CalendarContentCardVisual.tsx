import React from 'react';
import { Loader2 } from 'lucide-react';
import { Content } from '../../types/contents';
import { EDITORIAL_STATUS_CONFIG } from '../contents/ContentStatusBadge';
import { FORMAT_CONFIG } from '../contents/ContentFormatBadge';
import { PRIMARY_CHANNEL_LABELS } from '../../types/contents';

export interface CalendarContentCardVisualProps {
  content: Content;
  onClick?: () => void;
  showClientName?: boolean;
  isDragging?: boolean;
  isMoving?: boolean;
  isOverlay?: boolean;
}

export const CalendarContentCardVisual: React.FC<CalendarContentCardVisualProps> = ({
  content,
  onClick,
  showClientName = true,
  isDragging = false,
  isMoving = false,
  isOverlay = false,
}) => {
  const isCancelled = content.editorial_status === 'cancelled';
  const statusConfig = EDITORIAL_STATUS_CONFIG[content.editorial_status] || EDITORIAL_STATUS_CONFIG.draft;
  const formatConfig = FORMAT_CONFIG[content.format] || FORMAT_CONFIG.feed_single;
  const FormatIcon = formatConfig.icon;
  const channelLabel = content.primary_channel
    ? PRIMARY_CHANNEL_LABELS[content.primary_channel] || content.primary_channel
    : null;

  const clientName = content.client?.commercial_name || content.client?.name || '';

  // Estilização condicional
  let cardClasses = 'w-full text-left p-2 rounded-lg border transition-all duration-150 select-none ';

  if (isOverlay) {
    cardClasses += 'bg-white border-[#1D1D1D] shadow-xl ring-2 ring-[#1D1D1D]/20 cursor-grabbing ';
  } else if (isDragging) {
    cardClasses += 'opacity-25 border-dashed border-[#1D1D1D]/40 bg-[#F7F7F8] cursor-grabbing ';
  } else if (isMoving) {
    cardClasses += 'bg-zinc-50 border-[#E8E9EA] opacity-75 cursor-wait pointer-events-none ';
  } else if (isCancelled) {
    cardClasses += 'bg-zinc-100/70 border-zinc-200/80 opacity-60 hover:opacity-90 cursor-grab active:cursor-grabbing hover:border-zinc-400 ';
  } else {
    cardClasses += 'bg-white border-[#E8E9EA] hover:border-[#1D1D1D] hover:shadow-xs shadow-2xs cursor-grab active:cursor-grabbing ';
  }

  return (
    <button
      type="button"
      id={`calendar-card-${content.id}${isOverlay ? '-overlay' : ''}`}
      onClick={() => {
        if (!isDragging && !isMoving && !isOverlay && onClick) {
          onClick();
        }
      }}
      className={`${cardClasses} focus:outline-none focus:ring-2 focus:ring-[#1D1D1D] focus:ring-offset-1 group`}
      aria-label={`Conteúdo: ${content.internal_title || 'Sem título'}. Status: ${statusConfig.label}. Cliente: ${clientName || 'Geral'}`}
    >
      {/* 1. Top row: Client name (if viewing all clients) & Status badge/moving indicator */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        {showClientName && clientName ? (
          <span className="text-[10px] font-bold text-[#444446] truncate max-w-[120px] uppercase tracking-wider">
            {clientName}
          </span>
        ) : (
          <span />
        )}

        {isMoving ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 shrink-0">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>Salvando...</span>
          </span>
        ) : (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* 2. Content Title */}
      <div className="mb-1.5">
        <p
          className={`text-xs font-semibold leading-snug line-clamp-2 ${
            isCancelled
              ? 'text-[#777779] line-through'
              : 'text-[#1D1D1D] group-hover:text-black'
          }`}
          title={content.internal_title || 'Sem título'}
        >
          {content.internal_title || 'Sem título'}
        </p>
      </div>

      {/* 3. Bottom row: Format & Channel */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#666668] font-medium pt-1 border-t border-[#F2F3F3]">
        <div className="flex items-center gap-1 shrink-0">
          <FormatIcon className="w-3 h-3 text-[#8C8D8F]" />
          <span className="truncate">{formatConfig.label}</span>
        </div>
        {channelLabel && (
          <>
            <span className="text-[#D0D1D2]">•</span>
            <span className="truncate text-[#8C8D8F]">{channelLabel}</span>
          </>
        )}
      </div>
    </button>
  );
};
