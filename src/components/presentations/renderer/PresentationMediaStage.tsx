import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  Layers,
  Film,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
} from 'lucide-react';
import { PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';

interface PresentationMediaStageProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  onExpand?: () => void;
}

export const PresentationMediaStage: React.FC<PresentationMediaStageProps> = ({
  item,
  client,
  signedUrls,
  onExpand,
}) => {
  const content = item.content;
  const format = content?.format || 'feed_single';
  const rawAssets = item.assets || [];

  // Filter valid displayable assets sorted by display_order
  const displayableAssets = [...rawAssets]
    .filter((a) => a.is_current !== false && (a.asset_type === 'image' || a.asset_type === 'video'))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Aspect ratio class based on format
  const isVertical = format === 'reels' || format === 'story';
  const isSquare = false;

  const aspectClass = isVertical
    ? 'aspect-[9/16] max-w-[340px]'
    : isSquare
    ? 'aspect-square max-w-[440px]'
    : 'aspect-[4/5] max-w-[440px]';

  // Carousel slide handling
  const safeIndex = Math.min(
    Math.max(0, activeSlideIndex),
    Math.max(0, displayableAssets.length - 1)
  );
  const currentAsset = displayableAssets[safeIndex] || displayableAssets[0];
  const isVideo =
    currentAsset?.asset_type === 'video' || currentAsset?.mime_type?.startsWith('video/');
  const currentMediaUrl = currentAsset?.file_url ? signedUrls[currentAsset.file_url] : null;

  const clientName = client?.commercial_name || client?.name || 'Cliente';

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlideIndex((prev) => Math.min(displayableAssets.length - 1, prev + 1));
  };

  const getFormatIcon = () => {
    switch (format) {
      case 'carousel':
        return <Layers className="w-5 h-5 text-[#F15A3C]" />;
      case 'reels':
        return <Film className="w-5 h-5 text-[#F15A3C]" />;
      case 'story':
        return <Smartphone className="w-5 h-5 text-[#F15A3C]" />;
      case 'feed_single':
      default:
        return <FileText className="w-5 h-5 text-[#F15A3C]" />;
    }
  };

  return (
    <div className={`w-full ${aspectClass} mx-auto relative group select-none transition-all`}>
      {/* Outer Card Container */}
      <div className="w-full h-full bg-[#111113] rounded-3xl border border-[#2A2A2E] shadow-2xl overflow-hidden flex flex-col relative">
        {/* Top Floating Stage Header (Client tag & Expand action) */}
        <div className="absolute top-0 inset-x-0 z-20 p-3.5 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {client?.logo_url ? (
              <img
                src={client.logo_url}
                alt={clientName}
                className="w-6 h-6 rounded-full object-cover border border-white/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#2A2A2E] text-white text-[10px] font-bold flex items-center justify-center border border-white/10">
                {clientName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-white/90 drop-shadow-sm truncate max-w-[140px]">
              {clientName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {displayableAssets.length > 1 && format === 'carousel' && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold tracking-wider flex items-center gap-1 border border-white/10">
                <Layers className="w-3 h-3 text-[#F15A3C]" />
                <span>
                  {safeIndex + 1} / {displayableAssets.length}
                </span>
              </span>
            )}

            {onExpand && currentMediaUrl && (
              <button
                type="button"
                onClick={onExpand}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer hover:scale-105"
                title="Visualização ampliada"
                aria-label="Visualização ampliada"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Media Canvas */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-[#0D0D0E] overflow-hidden">
          {currentMediaUrl ? (
            isVideo ? (
              <video
                key={currentAsset?.id || safeIndex}
                src={currentMediaUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                key={currentAsset?.id || safeIndex}
                src={currentMediaUrl}
                alt={currentAsset?.file_name || content?.internal_title || 'Mídia da publicação'}
                className="w-full h-full object-contain select-none"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )
          ) : (
            /* Elegant Branded Placeholder when no asset is uploaded */
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#8C8D8F] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1D1D20] border border-[#2E2E32] flex items-center justify-center shadow-inner">
                {getFormatIcon()}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white tracking-wide">
                  Mídia em Produção
                </p>
                <p className="text-[11px] text-[#8C8D8F] max-w-[200px] leading-relaxed">
                  Os arquivos visuais desta peça estão em etapa de finalização pela equipe.
                </p>
              </div>
            </div>
          )}

          {/* Carousel Navigation Arrows */}
          {displayableAssets.length > 1 && format === 'carousel' && (
            <>
              {safeIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Lâmina anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10 shadow-xl cursor-pointer hover:scale-105 active:scale-95 z-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {safeIndex < displayableAssets.length - 1 && (
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Próxima lâmina"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10 shadow-xl cursor-pointer hover:scale-105 active:scale-95 z-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Dots / Bullets bar at bottom */}
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 z-20">
                {displayableAssets.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlideIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === safeIndex
                        ? 'w-4 bg-[#F15A3C]'
                        : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Ir para lâmina ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
