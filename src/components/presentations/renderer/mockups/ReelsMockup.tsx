import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Music,
  Heart,
  MessageCircle,
  Send,
  MoreVertical,
  Bookmark,
  Maximize2,
} from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { Client } from '../../../../types/clients';

interface ReelsMockupProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  onExpand?: () => void;
}

export const ReelsMockup: React.FC<ReelsMockupProps> = ({
  item,
  client,
  signedUrls,
  onExpand,
}) => {
  const content = item.content;
  const assets = item.assets || [];

  // Find the primary video asset and optional poster thumbnail
  const videoAsset = assets.find((a) => a.is_current && a.asset_type === 'video') ||
    assets.find((a) => a.asset_type === 'video');

  const thumbnailAsset = assets.find((a) => a.is_current && a.asset_type === 'thumbnail') ||
    assets.find((a) => a.asset_type === 'thumbnail');

  const videoUrl = videoAsset?.file_url ? signedUrls[videoAsset.file_url] : null;
  const posterUrl = thumbnailAsset?.file_url ? signedUrls[thumbnailAsset.file_url] : null;

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
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video playback error:', err);
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

  return (
    <div className="w-full max-w-[340px] mx-auto bg-[#000000] rounded-3xl border-2 border-[#2A2A2A] shadow-2xl overflow-hidden aspect-[9/16] relative flex flex-col justify-between select-none group">
      {/* Top Bar / Header */}
      <div className="absolute top-0 inset-x-0 p-4 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white tracking-wide font-display">Reels</span>
        </div>

        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              title="Ampliar peça"
              aria-label="Ampliar peça"
              className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-black/80 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3 h-3 text-[#F15A3C]" />
              <span>Ampliar</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-[#F15A3C]" />}
          </button>
        </div>
      </div>

      {/* Video Content / Fallback */}
      <div
        className="relative w-full h-full flex items-center justify-center cursor-pointer bg-[#0A0A0A]"
        onClick={togglePlay}
      >
        {videoUrl ? (
          <>
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

            {/* Play/Pause Center Indicator on hover or when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] transition-all">
                <div className="w-14 h-14 rounded-full bg-[#F15A3C] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[#9E9EA0]">
            <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-3 text-[#F15A3C]">
              <Film className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-white">Reels em Produção</p>
            <p className="text-[11px] text-[#7E7E80] mt-1 max-w-[200px]">
              Nenhum vídeo MP4 anexado a este conteúdo.
            </p>
          </div>
        )}

        {/* Right Side Social Actions (Visual simulation) */}
        <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center gap-4 text-white">
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center hover:bg-black/60 transition-colors">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center hover:bg-black/60 transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center hover:bg-black/60 transition-colors">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <Bookmark className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom Metadata & Client Identity Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 pb-3 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2">
          {/* Client profile */}
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
            <span className="text-xs font-bold text-white truncate">
              {handle || 'cliente'}
            </span>
          </div>

          {/* Caption preview snippet */}
          {content?.caption && (
            <p className="text-[11px] text-white/90 line-clamp-2 max-w-[80%] leading-snug">
              {content.caption}
            </p>
          )}

          {/* Audio track simulation */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/75 pt-0.5">
            <Music className="w-3 h-3 text-[#F15A3C] shrink-0 animate-pulse" />
            <span className="truncate">Áudio original • {clientName}</span>
          </div>

          {/* Video bottom progress bar */}
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[#F15A3C] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
