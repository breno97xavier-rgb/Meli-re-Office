import React from 'react';
import { HelpCircle, Maximize2, FileText } from 'lucide-react';
import { PresentationItem } from '../../../types/presentations';
import { Client } from '../../../types/clients';
import {
  InstagramFeedMockup,
  InstagramCarouselMockup,
  InstagramReelsMockup,
  InstagramStoryMockup,
} from './mockups';

export interface PresentationMediaStageProps {
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
  const rawFormat = (content?.format || '').toLowerCase().trim();

  // Route to the appropriate mockup component based on content format
  switch (rawFormat) {
    case 'feed_single':
    case 'static':
      return (
        <InstagramFeedMockup
          item={item}
          client={client}
          signedUrls={signedUrls}
          onExpand={onExpand}
        />
      );

    case 'carousel':
      return (
        <InstagramCarouselMockup
          item={item}
          client={client}
          signedUrls={signedUrls}
          onExpand={onExpand}
        />
      );

    case 'reels':
      return (
        <InstagramReelsMockup
          item={item}
          client={client}
          signedUrls={signedUrls}
          onExpand={onExpand}
        />
      );

    case 'story':
      return (
        <InstagramStoryMockup
          item={item}
          client={client}
          signedUrls={signedUrls}
          onExpand={onExpand}
        />
      );

    default: {
      // Fallback neutro para formatos não suportados / não reconhecidos
      const assets = item.assets || [];
      const primaryAsset =
        assets.find((a) => a.is_current && (a.asset_type === 'image' || a.asset_type === 'video')) ||
        assets.find((a) => a.asset_type === 'image' || a.asset_type === 'video') ||
        assets[0];

      const resolvedUrl = primaryAsset?.file_url ? signedUrls[primaryAsset.file_url] : null;
      const isVideo =
        primaryAsset?.asset_type === 'video' ||
        primaryAsset?.mime_type?.startsWith('video/');

      return (
        <div className="w-full max-w-[420px] mx-auto bg-[#141416] rounded-2xl border border-[#2A2A2E] shadow-xl overflow-hidden flex flex-col select-none">
          {/* Top Neutral Header */}
          <div className="px-4 py-3 bg-[#1C1C1F] border-b border-[#2A2A2E] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#9E9EA0]">
              <HelpCircle className="w-4 h-4 text-[#F15A3C]" />
              <span className="text-xs font-semibold text-white">
                {content?.format ? `Formato: ${content.format}` : 'Formato Não Identificado'}
              </span>
            </div>

            {onExpand && resolvedUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white/80 hover:text-white bg-black/40 hover:bg-black/60 transition-all cursor-pointer border border-white/10"
              >
                <Maximize2 className="w-3 h-3 text-[#F15A3C]" />
                <span>Ampliar</span>
              </button>
            )}
          </div>

          {/* Media or Neutral Notice Area */}
          <div className="relative w-full aspect-[4/5] bg-[#0D0D0E] flex items-center justify-center p-4">
            {resolvedUrl ? (
              isVideo ? (
                <video
                  src={resolvedUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={resolvedUrl}
                  alt={content?.internal_title || 'Mídia da Peça'}
                  className="w-full h-full object-contain select-none"
                  referrerPolicy="no-referrer"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 text-[#9E9EA0]">
                <div className="w-12 h-12 rounded-2xl bg-[#1F1F23] flex items-center justify-center mb-3 text-[#F15A3C] shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-white tracking-wide">
                  Formato de conteúdo não suportado para pré-visualização.
                </p>
                <p className="text-[11px] text-[#7E7E80] mt-1.5 max-w-[240px] leading-relaxed">
                  Não foi possível identificar um mockup de rede social compatível para este formato.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Neutral Notice */}
          <div className="px-4 py-2.5 bg-[#1C1C1F] border-t border-[#2A2A2E] text-center">
            <span className="text-[11px] text-[#9E9EA0]">
              Formato de conteúdo não suportado para pré-visualização.
            </span>
          </div>
        </div>
      );
    }
  }
};
