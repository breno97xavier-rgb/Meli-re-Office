import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, Volume2, VolumeX, Play, Send, Heart, Maximize2 } from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { Client } from '../../../../types/clients';

export interface InstagramStoryMockupProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  onExpand?: () => void;
}

export const InstagramStoryMockup: React.FC<InstagramStoryMockupProps> = ({
  item,
  client,
  signedUrls,
  onExpand,
}) => {
  const content = item.content;
  const assets = item.assets || [];

  // Find primary current asset (video or image)
  const currentAsset =
    assets.find((a) => a.is_current && (a.asset_type === 'image' || a.asset_type === 'video')) ||
    assets.find((a) => a.asset_type === 'image' || a.asset_type === 'video') ||
    assets[0];

  const resolvedUrl = currentAsset?.file_url ? signedUrls[currentAsset.file_url] : null;
  const isVideo =
    currentAsset?.asset_type === 'video' ||
    currentAsset?.mime_type?.startsWith('video/');

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

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
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Video playback warning:', err));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-[340px] mx-auto bg-[#000000] rounded-2xl border border-[#2A2A2E] shadow-2xl overflow-hidden aspect-[9/16] relative flex flex-col justify-between select-none group">
      {/* Story Top Progress Bars & Header */}
      <div className="absolute top-0 inset-x-0 p-3 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-2 pointer-events-none">
        {/* Story progress dashes */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="h-0.5 flex-1 bg-white rounded-full overflow-hidden" />
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
        </div>

        {/* Profile info & actions */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[160px] drop-shadow-sm">
                {handle || 'cliente'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                title="Ampliar peça"
                aria-label="Ampliar peça"
                className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
              >
                <Maximize2 className="w-3 h-3 text-[#F15A3C]" />
                <span>Ampliar</span>
              </button>
            )}

            {isVideo && (
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
      </div>

      {/* Story Media Canvas */}
      <div className="relative w-full h-full flex items-center justify-center bg-[#0D0D0E] overflow-hidden">
        {resolvedUrl ? (
          isVideo ? (
            <div className="w-full h-full cursor-pointer relative" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={resolvedUrl}
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                  <div className="w-12 h-12 rounded-full bg-[#F15A3C] text-white flex items-center justify-center shadow-xl">
                    <Play className="w-5 h-5 ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img
              src={resolvedUrl}
              alt={content?.internal_title || 'Story'}
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[#9E9EA0] bg-[#141416] w-full h-full">
            <div className="w-12 h-12 rounded-2xl bg-[#1F1F23] flex items-center justify-center mb-3 text-[#F15A3C] shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-white tracking-wide">Story em Produção</p>
            <p className="text-[11px] text-[#7E7E80] mt-1 max-w-[200px] leading-relaxed">
              Nenhum asset vinculado a este Story.
            </p>
          </div>
        )}
      </div>

      {/* Story Bottom Reply Bar (Visual simulation) */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-2.5 pointer-events-none">
        <div className="flex-1 px-3 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-xs text-[11px] text-white/70">
          <span>Enviar mensagem...</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
          <Heart className="w-4 h-4 text-white" />
        </div>
        <div className="w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
          <Send className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};
