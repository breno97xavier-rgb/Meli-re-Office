import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Presentation, PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';
import { PresentationCoverSlide } from './PresentationCoverSlide';
import { PresentationContentSlide } from './PresentationContentSlide';
import { PresentationNavigation } from './PresentationNavigation';

export interface PresentationRendererProps {
  presentation: Presentation;
  items: PresentationItem[];
  client?: Client | null;
  signedUrls: Record<string, string>;
  mode?: 'internal' | 'public';
  submittingDecision?: boolean;
  onSubmitDecision?: (
    itemId: string,
    status: 'approved' | 'changes_requested' | 'rejected',
    feedback?: string | null
  ) => Promise<void>;
  onExit?: () => void;
}

export const PresentationRenderer: React.FC<PresentationRendererProps> = ({
  presentation,
  items,
  client,
  signedUrls,
  mode = 'internal',
  submittingDecision = false,
  onSubmitDecision,
  onExit,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLightboxActive, setIsLightboxActive] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveClient = client || presentation.client;

  // Sorted items by display_order
  const sortedItems = [...items].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const totalContentSlides = sortedItems.length;
  const isCover = currentSlideIndex === 0;

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(totalContentSlides, prev + 1));
  }, [totalContentSlides]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleGoToCover = useCallback(() => {
    setCurrentSlideIndex(0);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Suspend global slide keys if lightbox is open
      if (isLightboxActive) {
        return;
      }

      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleGoToCover();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev, handleGoToCover, isLightboxActive]);

  // Fullscreen management
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Current content item (1-indexed for content slides)
  const currentItem = isCover ? null : sortedItems[currentSlideIndex - 1];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#F7F7F8] text-[#1D1D1D] font-body flex flex-col justify-center relative overflow-x-hidden pt-16 pb-24 selection:bg-[#FDF1EE] selection:text-[#F15A3C]"
    >
      {/* Navigation Controls */}
      <PresentationNavigation
        currentIndex={currentSlideIndex}
        totalSlides={totalContentSlides}
        isCover={isCover}
        isFullscreen={isFullscreen}
        onPrev={handlePrev}
        onNext={handleNext}
        onGoToCover={handleGoToCover}
        onToggleFullscreen={handleToggleFullscreen}
        onExit={onExit}
        mode={mode}
      />

      {/* Main Slide Content */}
      <main className="flex-1 flex items-center justify-center">
        {isCover ? (
          <PresentationCoverSlide
            presentation={presentation}
            items={sortedItems}
            client={effectiveClient}
            onStart={handleNext}
          />
        ) : currentItem ? (
          <PresentationContentSlide
            key={currentItem.id || currentSlideIndex}
            item={currentItem}
            client={effectiveClient}
            signedUrls={signedUrls}
            slideNumber={currentSlideIndex}
            totalSlides={totalContentSlides}
            mode={mode}
            submittingDecision={submittingDecision}
            onSubmitDecision={
              onSubmitDecision
                ? (status, feedback) => onSubmitDecision(currentItem.id, status, feedback)
                : undefined
            }
            onLightboxChange={setIsLightboxActive}
          />
        ) : null}
      </main>
    </div>
  );
};

