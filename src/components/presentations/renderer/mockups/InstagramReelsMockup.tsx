import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Volume2,
  VolumeX,
  Film,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Maximize2,
} from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { Client } from '../../../../types/clients';

export interface InstagramReelsMockupProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  onExpand?: () => void;
}

export const InstagramReelsMockup: React.FC<InstagramReelsMockupProps> = ({
  item,
  client,
  signedUrls,
  onExpand,
}) => {
  const content = item.content;
  const assets = item.assets || [];

  // Find the primary video asset and optional poster thumbnail
  const videoAsset =
    assets.find((a) => a.is_current && a.asset_type === 'video') ||
    assets.find((a) => a.asset_type === 'video');

  const thumbnailAsset =
    assets.find((a) => a.is_current && a.asset_type === 'thumbnail') ||
    assets.find((a) => a.asset_type === 'thumbnail');

  // Fallback to image if no video
  const imageAsset =
    assets.find((a) => a.is_current && a.asset_type === 'image') ||
    assets.find((a) => a.asset_type === 'image');

  const videoUrl = videoAsset?.file_url ? signedUrls[videoAsset.file_url] : null;
  const posterUrl = thumbnailAsset?.file_url ? signedUrls[thumbnailAsset.file_url] : null;
  const fallbackImageUrl = imageAsset?.file_url ? signedUrls[imageAsset.file_url] : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const clientName = client?.commercial_name || client?.name || 'Cliente';
  const handle = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('Video playback warning:', err);
        });
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

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  // Pause on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  const captionSnippet = content?.caption || content?.copy || null;

  return (
    <div className="w-full max-w-[340px] mx-auto bg-[#000000] rounded-2xl border border-[#2A2A2E] shadow-2xl overflow-hidden aspect-[9/16] relative flex flex-col justify-between select-none group">
      {/* Top Floating Header */}
      <div className="absolute top-0 inset-x-0 p-3.5 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <span className="text-xs font-bold text-white tracking-wide font-display drop-shadow-sm">
            Reels
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              title="Ampliar peça"
              aria-label="Ampliar peça"
              className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
            >
              <Maximize2 className="w-3 h-3 text-[#F15A3C]" />
              <span>Ampliar</span>
            </button>
          )}

          {videoUrl && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-white/90" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#F15A3C]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Video Content / Fallback Area */}
      <div
        className="relative w-full h-full flex items-center justify-center bg-[#0D0D0E] overflow-hidden"
        onClick={videoUrl ? togglePlay : undefined}
      >
        {videoUrl ? (
          <div className="relative w-full h-full cursor-pointer">
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl || undefined}
              muted={isMuted}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              className="w-full h-full object-cover"
            />

            {/* Play indicator when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] transition-all">
                <div className="w-13 h-13 rounded-full bg-[#F15A3C] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : fallbackImageUrl ? (
          <img
            src={fallbackImageUrl}
            alt={content?.internal_title || 'Reels'}
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[#9E9EA0] bg-[#141416] w-full h-full">
            <div className="w-12 h-12 rounded-2xl bg-[#1F1F23] flex items-center justify-center mb-3 text-[#F15A3C] shadow-inner">
              <Film className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-white tracking-wide">Reels em Produção</p>
            <p className="text-[11px] text-[#7E7E80] mt-1 max-w-[200px] leading-relaxed">
              Nenhum vídeo MP4 vinculado a este conteúdo.
            </p>
          </div>
        )}

        {/* Right Side Social Actions (Interface representation) */}
        <div className="absolute right-3 bottom-14 z-20 flex flex-col items-center gap-3.5 text-white pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center border border-white/10">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center border border-white/10">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center border border-white/10">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center border border-white/10">
            <Bookmark className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Bottom Metadata & Client Identity Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 pb-3 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-1.5 pointer-events-none">
          {/* Client Profile */}
          <div className="flex items-center gap-2 max-w-[80%]">
            <div className="w-7 h-7 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-[10px] ring-1 ring-[#F15A3C] shrink-0 overflow-hidden">
              {client?.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={clientName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{clientName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-bold text-white truncate drop-shadow-sm">
              {handle || 'cliente'}
            </span>
          </div>

          {/* Caption preview snippet */}
          {captionSnippet && (
            <p className="text-[11px] text-white/90 line-clamp-2 max-w-[80%] leading-snug drop-shadow-xs">
              {captionSnippet}
            </p>
          )}

          {/* Video bottom progress bar */}
          {videoUrl && (
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#F15A3C] transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
