import React from 'react';
import { Sparkles, ArrowRight, Layers, FileText, Film, Smartphone, Calendar } from 'lucide-react';
import { Presentation, PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';
import { BrandAsset } from '../../brand/BrandAsset';

interface PresentationCoverSlideProps {
  presentation: Presentation;
  items: PresentationItem[];
  client?: Client | null;
  onStart: () => void;
}

export const PresentationCoverSlide: React.FC<PresentationCoverSlideProps> = ({
  presentation,
  items,
  client,
  onStart,
}) => {
  const resolvedClient = client || presentation.client;
  const clientName = resolvedClient?.commercial_name || resolvedClient?.name || 'Cliente';

  // Count formats
  const formatCounts: Record<string, number> = {};
  for (const item of items) {
    const fmt = item.content?.format || 'other';
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
  }

  // Format date
  const formattedDate = presentation.created_at
    ? new Date(presentation.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-[80vh] flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-5xl mx-auto w-full animate-in fade-in duration-300 select-none">
      {/* Top Identity Header */}
      <div className="flex items-center justify-between border-b border-[#E8E9EA] pb-6">
        <div className="flex items-center gap-3">
          <BrandAsset type="logo-light" className="h-6 w-auto" />
          <div className="hidden sm:block pl-3 border-l border-[#E8E9EA]">
            <span className="text-[10px] font-medium text-[#9E9EA0] uppercase tracking-wider block">
              Apresentação Estratégica
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FDF1EE] border border-[#FBC3B8] text-[#F15A3C] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rodada {presentation.round_number || 1}</span>
        </div>
      </div>

      {/* Center Body */}
      <div className="py-10 sm:py-14 space-y-6">
        {/* Client identity & Date */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {client?.logo_url ? (
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E9EA] p-1 flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
                <img
                  src={client.logo_url}
                  alt={clientName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {clientName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-[#1D1D1D] tracking-wide uppercase block">
                {clientName}
              </span>
              <span className="text-[11px] text-[#8C8D8F]">Conteúdo Estratégico</span>
            </div>
          </div>

          {formattedDate && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E8E9EA] rounded-xl text-xs text-[#666668] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Big Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#1D1D1D] font-display tracking-tight leading-tight">
          {presentation.title}
        </h1>

        {/* Description if present */}
        {presentation.description && (
          <p className="text-base sm:text-lg text-[#666668] max-w-2xl leading-relaxed font-body">
            {presentation.description}
          </p>
        )}

        {/* Summary tags */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E8E9EA] shadow-2xs text-xs font-semibold text-[#1D1D1D] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F15A3C]" />
            <span>{items.length} {items.length === 1 ? 'Conteúdo' : 'Conteúdos'} na Rodada</span>
          </div>

          {Boolean(formatCounts['feed_single']) && (
            <div className="px-3 py-1.5 rounded-xl bg-[#F7F7F8] border border-[#E8E9EA] text-xs text-[#666668] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>{formatCounts['feed_single']} Estático(s)</span>
            </div>
          )}

          {Boolean(formatCounts['carousel']) && (
            <div className="px-3 py-1.5 rounded-xl bg-[#F7F7F8] border border-[#E8E9EA] text-xs text-[#666668] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>{formatCounts['carousel']} Carrossel(is)</span>
            </div>
          )}

          {Boolean(formatCounts['reels']) && (
            <div className="px-3 py-1.5 rounded-xl bg-[#F7F7F8] border border-[#E8E9EA] text-xs text-[#666668] flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>{formatCounts['reels']} Reels</span>
            </div>
          )}

          {Boolean(formatCounts['story']) && (
            <div className="px-3 py-1.5 rounded-xl bg-[#F7F7F8] border border-[#E8E9EA] text-xs text-[#666668] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>{formatCounts['story']} Stories</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Start Action Bar */}
      <div className="flex items-center justify-between pt-6 border-t border-[#E8E9EA]">
        <div className="text-xs text-[#9E9EA0] flex items-center gap-1.5">
          <span>Use as setas</span>
          <span className="font-mono font-bold text-[#1D1D1D] px-1.5 py-0.5 bg-[#F2F3F3] rounded-md text-[11px]">←</span>
          <span className="font-mono font-bold text-[#1D1D1D] px-1.5 py-0.5 bg-[#F2F3F3] rounded-md text-[11px]">→</span>
          <span>para navegar</span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F15A3C] hover:bg-[#d9482b] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
        >
          <span>Iniciar Apresentação</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
