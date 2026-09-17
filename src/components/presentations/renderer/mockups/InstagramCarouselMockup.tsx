import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, ImageIcon } from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { Client } from '../../../../types/clients';
import { InstagramMockupFrame } from './InstagramMockupFrame';

export interface InstagramCarouselMockupProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  activeSlideIndex?: number;
  onSlideIndexChange?: (index: number) => void;
  onExpand?: () => void;
}

export const InstagramCarouselMockup: React.FC<InstagramCarouselMockupProps> = ({
  item,
  client,
  signedUrls,
  activeSlideIndex: controlledIndex,
  onSlideIndexChange,
  onExpand,
}) => {
  const content = item.content;
  const rawAssets = item.assets || [];

  // Filter valid current assets for carousel slides and sort by display_order
  const slides = [...rawAssets]
    .filter((a) => a.is_current !== false && (a.asset_type === 'image' || a.asset_type === 'video'))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const [internalIndex, setInternalIndex] = useState(0);
  const activeSlideIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const updateIndex = (idx: number) => {
    if (controlledIndex === undefined) {
      setInternalIndex(idx);
    }
    onSlideIndexChange?.(idx);
  };

  // Safe index
  const currentIndex = Math.min(Math.max(0, activeSlideIndex), Math.max(0, slides.length - 1));
  const currentSlide = slides[currentIndex];
  const currentUrl = currentSlide?.file_url ? signedUrls[currentSlide.file_url] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateIndex(Math.min(slides.length - 1, currentIndex + 1));
  };

  const handleSelectBullet = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    updateIndex(idx);
  };

  const captionSnippet = content?.caption || content?.copy || null;

  return (
    <InstagramMockupFrame
      client={client}
      aspectRatio="portrait"
      showInteractions={true}
      captionPreview={captionSnippet}
      onExpand={onExpand}
    >
      {slides.length > 0 && currentUrl ? (
        <div className="relative w-full h-full group select-none bg-[#0D0D0E] flex items-center justify-center">
          {/* Active Image (4:5 frame with object-contain to prevent distortion) */}
          <img
            key={currentSlide.id || currentIndex}
            src={currentUrl}
            alt={`${content?.internal_title || 'Carrossel'} - Lâmina ${currentIndex + 1}`}
            className="w-full h-full object-contain select-none transition-opacity duration-200"
            referrerPolicy="no-referrer"
          />

          {/* Slide Position Counter Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold tracking-wider z-10 flex items-center gap-1.5 shadow-md border border-white/10">
            <Layers className="w-3 h-3 text-[#F15A3C]" />
            <span>
              {currentIndex + 1} / {slides.length}
            </span>
          </div>

          {/* Carousel Left Navigation Button */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Lâmina anterior"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-xs z-10 shadow-lg cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Carousel Right Navigation Button */}
          {currentIndex < slides.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próxima lâmina"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-xs z-10 shadow-lg cursor-pointer hover:scale-105 active:scale-95 border border-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Bullets indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs z-10 border border-white/10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSelectBullet(idx, e)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 bg-[#F15A3C]'
                    : 'w-1.5 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Ir para lâmina ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#141416] text-[#9E9EA0]">
          <div className="w-12 h-12 rounded-2xl bg-[#1F1F23] flex items-center justify-center mb-3 text-[#F15A3C] shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-white tracking-wide">Lâminas em Produção</p>
          <p className="text-[11px] text-[#7E7E80] mt-1 max-w-[220px] leading-relaxed">
            Nenhuma lâmina vinculada a este carrossel.
          </p>
        </div>
      )}
    </InstagramMockupFrame>
  );
};
