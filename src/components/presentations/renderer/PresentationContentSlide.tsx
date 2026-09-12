import React, { useState } from 'react';
import { PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';
import { PresentationMediaStage } from './PresentationMediaStage';
import { StrategicInfoPanel } from './panels/StrategicInfoPanel';
import { CaptionCopyPanel } from './panels/CaptionCopyPanel';
import { PresentationAssetLightbox } from './PresentationAssetLightbox';

interface PresentationContentSlideProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  slideNumber: number;
  totalSlides: number;
  onLightboxChange?: (isOpen: boolean) => void;
}

export const PresentationContentSlide: React.FC<PresentationContentSlideProps> = ({
  item,
  client,
  signedUrls,
  slideNumber: _slideNumber,
  totalSlides: _totalSlides,
  onLightboxChange,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeCarouselSlideIndex, setActiveCarouselSlideIndex] = useState(0);

  const content = item.content;

  const handleOpenLightbox = () => {
    setIsLightboxOpen(true);
    onLightboxChange?.(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    onLightboxChange?.(false);
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 lg:p-10 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Media Stage in High Prominence (4:5 / 9:16) */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center sticky top-6">
            <PresentationMediaStage
              item={item}
              client={client}
              signedUrls={signedUrls}
              onExpand={handleOpenLightbox}
            />
          </div>

          {/* Right Column: Editorial & Strategic Details */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            {/* Strategic Info Panel */}
            <StrategicInfoPanel item={item} />

            {/* Caption / Copy & Script Panel */}
            <CaptionCopyPanel content={content} />
          </div>
        </div>
      </div>

      {/* Lightbox / Visualização Ampliada da Peça */}
      <PresentationAssetLightbox
        isOpen={isLightboxOpen}
        onClose={handleCloseLightbox}
        item={item}
        client={client}
        signedUrls={signedUrls}
        activeSlideIndex={activeCarouselSlideIndex}
        onSlideChange={setActiveCarouselSlideIndex}
      />
    </>
  );
};

