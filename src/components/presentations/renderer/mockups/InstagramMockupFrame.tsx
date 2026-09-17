import React from 'react';
import { MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Maximize2 } from 'lucide-react';
import { Client } from '../../../../types/clients';

export interface InstagramMockupFrameProps {
  client?: Client | null;
  children: React.ReactNode;
  aspectRatio?: 'square' | 'portrait' | 'story' | 'reels';
  showInteractions?: boolean;
  captionPreview?: string | null;
  onExpand?: () => void;
}

export const InstagramMockupFrame: React.FC<InstagramMockupFrameProps> = ({
  client,
  children,
  aspectRatio = 'portrait',
  showInteractions = true,
  captionPreview,
  onExpand,
}) => {
  const clientName = client?.commercial_name || client?.name || 'Cliente';
  const handle = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const aspectClass =
    aspectRatio === 'story' || aspectRatio === 'reels'
      ? 'aspect-[9/16]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : 'aspect-[4/5]';

  return (
    <div className="w-full max-w-[420px] mx-auto bg-white rounded-2xl border border-[#E8E9EA] shadow-xl overflow-hidden flex flex-col select-none transition-all">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-[#F2F3F3]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-1 ring-[#F15A3C]/40">
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
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1D1D1D] truncate block leading-tight">
              {handle || 'cliente'}
            </span>
          </div>
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
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-[#555557] hover:text-[#F15A3C] hover:bg-[#FDF1EE] transition-all cursor-pointer border border-[#E8E9EA]"
            >
              <Maximize2 className="w-3 h-3 text-[#F15A3C]" />
              <span className="hidden xs:inline">Ampliar</span>
            </button>
          )}
          <MoreHorizontal className="w-4 h-4 text-[#9E9EA0]" />
        </div>
      </div>

      {/* Media Canvas (4:5 Default for Feed/Carousel) */}
      <div className={`relative w-full ${aspectClass} bg-[#0D0D0E] overflow-hidden flex items-center justify-center`}>
        {children}
      </div>

      {/* Action Bar (Feed / Carousel) */}
      {showInteractions && (
        <div className="p-3 bg-white space-y-2 border-t border-[#F2F3F3]">
          <div className="flex items-center justify-between text-[#1D1D1D]">
            <div className="flex items-center gap-3.5">
              <Heart className="w-5 h-5 text-[#1D1D1D] hover:text-[#F15A3C] transition-colors cursor-default" />
              <MessageCircle className="w-5 h-5 text-[#1D1D1D] hover:text-[#F15A3C] transition-colors cursor-default" />
              <Send className="w-5 h-5 text-[#1D1D1D] hover:text-[#F15A3C] transition-colors cursor-default" />
            </div>
            <Bookmark className="w-5 h-5 text-[#1D1D1D] cursor-default" />
          </div>

          {/* Caption preview snippet */}
          {captionPreview && (
            <div className="text-xs text-[#1D1D1D] leading-snug">
              <span className="font-bold mr-1.5">{handle || 'cliente'}</span>
              <span className="text-[#555557] line-clamp-2">{captionPreview}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
