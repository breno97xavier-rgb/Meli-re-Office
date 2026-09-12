import React from 'react';
import {
  Calendar,
  Target,
  Layers,
  Filter,
  Instagram,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { ContentFormatBadge } from '../../../contents/ContentFormatBadge';

interface StrategicInfoPanelProps {
  item: PresentationItem;
}

const FUNNEL_LABELS: Record<string, string> = {
  topo: 'Topo de Funil (Atração)',
  meio: 'Meio de Funil (Nutrição)',
  fundo: 'Fundo de Funil (Conversão)',
  pos_venda: 'Pós-Venda / Retenção',
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const StrategicInfoPanel: React.FC<StrategicInfoPanelProps> = ({ item }) => {
  const content = item.content;
  if (!content) return null;

  const funnelLabel = content.funnel_stage
    ? FUNNEL_LABELS[content.funnel_stage] || content.funnel_stage
    : null;

  const channelLabel = content.primary_channel
    ? CHANNEL_LABELS[content.primary_channel] || content.primary_channel
    : null;

  const formattedDate = formatDisplayDate(content.planned_date);

  return (
    <div className="space-y-4">
      {/* Title & Format row */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {content.format && <ContentFormatBadge format={content.format} />}
          {channelLabel && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F7F7F8] border border-[#E8E9EA] text-[11px] font-semibold text-[#1D1D1D]">
              <Instagram className="w-3 h-3 text-[#F15A3C]" />
              <span>{channelLabel}</span>
            </span>
          )}
          {formattedDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F7F7F8] border border-[#E8E9EA] text-[11px] font-semibold text-[#666668]">
              <Calendar className="w-3 h-3 text-[#9E9EA0]" />
              <span>{formattedDate}</span>
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-[#1D1D1D] font-display leading-tight">
          {content.internal_title || 'Sem título'}
        </h3>
      </div>

      {/* Strategic grid (only non-empty fields) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {content.pillar && (
          <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-[#9E9EA0] uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#F15A3C]" />
              <span>Pilar Editorial</span>
            </span>
            <p className="text-xs font-semibold text-[#1D1D1D]">{content.pillar}</p>
          </div>
        )}

        {content.goal && (
          <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-[#9E9EA0] uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3 text-[#F15A3C]" />
              <span>Objetivo</span>
            </span>
            <p className="text-xs font-semibold text-[#1D1D1D]">{content.goal}</p>
          </div>
        )}

        {funnelLabel && (
          <div className="p-3 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold text-[#9E9EA0] uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#F15A3C]" />
              <span>Etapa do Funil</span>
            </span>
            <p className="text-xs font-semibold text-[#1D1D1D]">{funnelLabel}</p>
          </div>
        )}
      </div>

      {/* Presentation notes (Specific context for this presentation round) */}
      {item.presentation_notes && item.presentation_notes.trim() !== '' && (
        <div className="p-3.5 bg-[#FDF1EE] border border-[#FBC3B8] rounded-2xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#F15A3C]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Nota da Rodada
            </span>
          </div>
          <p className="text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap">
            {item.presentation_notes}
          </p>
        </div>
      )}
    </div>
  );
};
