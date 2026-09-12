import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';
import { ContentFormatBadge } from '../../contents/ContentFormatBadge';

interface PresentationAssetLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  activeSlideIndex?: number;
  onSlideChange?: (index: number) => void;
}

export const PresentationAssetLightbox: React.FC<PresentationAssetLightboxProps> = ({
  isOpen,
  onClose,
  item,
  client,
  signedUrls,
  activeSlideIndex = 0,
  onSlideChange,
}) => {
  const content = item.content;
  const format = content?.format || 'feed_single';
  const assets = item.assets || [];

  // Carousel slides
  const carouselSlides = [...assets]
    .filter((a) => a.is_current !== false && (a.asset_type === 'image' || a.asset_type === 'video'))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const [internalSlideIdx, setInternalSlideIdx] = useState(0);
  const currentSlideIndex = activeSlideIndex !== undefined ? activeSlideIndex : internalSlideIdx;

  const handleIndexChange = (newIdx: number) => {
    if (activeSlideIndex === undefined) {
      setInternalSlideIdx(newIdx);
    }
    onSlideChange?.(newIdx);
  };

  // Video states for Reels / Story video
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const clientName = client?.commercial_name || client?.name || 'Cliente';

  // Carousel nav handlers
  const handlePrevSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const safeCurrent = Math.min(Math.max(0, currentSlideIndex), Math.max(0, carouselSlides.length - 1));
    const nextIdx = Math.max(0, safeCurrent - 1);
    handleIndexChange(nextIdx);
  };

  const handleNextSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const safeCurrent = Math.min(Math.max(0, currentSlideIndex), Math.max(0, carouselSlides.length - 1));
    const nextIdx = Math.min(carouselSlides.length - 1, safeCurrent + 1);
    handleIndexChange(nextIdx);
  };

  // Keyboard navigation & isolation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (format === 'carousel' && carouselSlides.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevSlide();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, format, carouselSlides.length, onClose, currentSlideIndex]);

  if (!isOpen) return null;

  // Video toggles
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.warn(err));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    setProgress((current / duration) * 100);
  };

  // Render media by format
  const renderMedia = () => {
    if (format === 'feed_single') {
      const currentAsset =
        assets.find((a) => a.is_current && a.asset_type === 'image') ||
        assets.find((a) => a.asset_type === 'image') ||
        assets[0];
      const url = currentAsset?.file_url ? signedUrls[currentAsset.file_url] : null;

      if (!url) {
        return (
          <div className="p-12 text-center text-[#9E9EA0] bg-[#1A1A1A] rounded-2xl border border-[#333333]">
            <p className="text-sm font-semibold text-white">Arte em Produção</p>
            <p className="text-xs text-[#7E7E80] mt-1">Nenhum asset visual disponível para ampliação.</p>
          </div>
        );
      }

      return (
        <div className="relative flex items-center justify-center max-h-[85vh] max-w-[90vw]">
          <img
            src={url}
            alt={content?.internal_title || 'Post Estático'}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    if (format === 'carousel') {
      const safeIndex = Math.min(Math.max(0, currentSlideIndex), Math.max(0, carouselSlides.length - 1));
      const currentSlide = carouselSlides[safeIndex];
      const url = currentSlide?.file_url ? signedUrls[currentSlide.file_url] : null;

      if (!url || carouselSlides.length === 0) {
        return (
          <div className="p-12 text-center text-[#9E9EA0] bg-[#1A1A1A] rounded-2xl border border-[#333333]">
            <p className="text-sm font-semibold text-white">Lâminas em Produção</p>
            <p className="text-xs text-[#7E7E80] mt-1">Nenhuma lâmina disponível para ampliação.</p>
          </div>
        );
      }

      return (
        <div className="relative flex flex-col items-center justify-center max-h-[85vh] max-w-[90vw] group">
          {/* Main Slide Image */}
          <div className="relative flex items-center justify-center">
            <img
              key={currentSlide.id || safeIndex}
              src={url}
              alt={`${content?.internal_title || 'Carrossel'} - Lâmina ${safeIndex + 1}`}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-all"
              referrerPolicy="no-referrer"
            />

            {/* Left Navigation Arrow */}
            {safeIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Lâmina anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-2xl cursor-pointer hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Navigation Arrow */}
            {safeIndex < carouselSlides.length - 1 && (
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Próxima lâmina"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-2xl cursor-pointer hover:scale-105 active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Slide Indicator & Bullets */}
          <div className="mt-4 flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>
                Lâmina {safeIndex + 1} de {carouselSlides.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              {carouselSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleIndexChange(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === safeIndex
                      ? 'w-5 bg-[#F15A3C]'
                      : 'w-1.5 bg-white/40 hover:bg-white'
                  }`}
                  aria-label={`Ir para lâmina ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (format === 'reels') {
      const videoAsset =
        assets.find((a) => a.is_current && a.asset_type === 'video') ||
        assets.find((a) => a.asset_type === 'video');
      const thumbnailAsset =
        assets.find((a) => a.is_current && a.asset_type === 'thumbnail') ||
        assets.find((a) => a.asset_type === 'thumbnail');

      const videoUrl = videoAsset?.file_url ? signedUrls[videoAsset.file_url] : null;
      const posterUrl = thumbnailAsset?.file_url ? signedUrls[thumbnailAsset.file_url] : null;

      if (!videoUrl) {
        return (
          <div className="p-12 text-center text-[#9E9EA0] bg-[#1A1A1A] rounded-2xl border border-[#333333]">
            <p className="text-sm font-semibold text-white">Vídeo em Produção</p>
            <p className="text-xs text-[#7E7E80] mt-1">Nenhum vídeo MP4 disponível para ampliação.</p>
          </div>
        );
      }

      return (
        <div className="relative h-[85vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between group">
          {/* Top Video Controls */}
          <div className="absolute top-0 inset-x-0 p-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-xs font-bold text-white tracking-wide font-display">Reels HD</span>
            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
              title={isMuted ? 'Ativar som' : 'Desativar som'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#F15A3C]" />}
            </button>
          </div>

          {/* Video Player */}
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer bg-black"
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl || undefined}
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                setIsPlaying(false);
                setProgress(0);
              }}
              className="w-full h-full object-cover"
            />

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <div className="w-16 h-16 rounded-full bg-[#F15A3C] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-7 h-7 ml-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Video Progress */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F15A3C] transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (format === 'story') {
      const currentAsset =
        assets.find((a) => a.is_current && (a.asset_type === 'image' || a.asset_type === 'video')) ||
        assets[0];
      const url = currentAsset?.file_url ? signedUrls[currentAsset.file_url] : null;
      const isVideo = currentAsset?.asset_type === 'video' || currentAsset?.mime_type?.includes('video');

      if (!url) {
        return (
          <div className="p-12 text-center text-[#9E9EA0] bg-[#1A1A1A] rounded-2xl border border-[#333333]">
            <p className="text-sm font-semibold text-white">Story em Produção</p>
            <p className="text-xs text-[#7E7E80] mt-1">Nenhum asset disponível para ampliação.</p>
          </div>
        );
      }

      return (
        <div className="relative h-[85vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between">
          {isVideo && (
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={toggleMute}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#F15A3C]" />}
              </button>
            </div>
          )}

          {isVideo ? (
            <div className="w-full h-full cursor-pointer relative" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={url}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-14 h-14 rounded-full bg-[#F15A3C] text-white flex items-center justify-center shadow-xl">
                    <Play className="w-6 h-6 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img
              src={url}
              alt={content?.internal_title || 'Story'}
              className="w-full h-full object-contain select-none"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <header
        className="flex items-center justify-between w-full max-w-6xl mx-auto z-20 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {content?.format && <ContentFormatBadge format={content.format} />}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate font-display">
              {content?.internal_title || 'Visualização Ampliada'}
            </h2>
            <span className="text-xs text-[#9E9EA0] truncate block">
              {clientName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-mono text-[#9E9EA0]">
            <span>ESC para fechar</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ampliação"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#F15A3C] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Center Media Stage */}
      <main
        className="flex-1 flex items-center justify-center w-full my-auto py-2 z-10 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {renderMedia()}
      </main>

      {/* Bottom Hint */}
      <footer
        className="w-full max-w-6xl mx-auto flex items-center justify-center text-[11px] text-[#7E7E80] z-20 pointer-events-none"
      >
        <span>Melière Marketing • Visualização Ampliada da Peça</span>
      </footer>
    </div>
  );
};
