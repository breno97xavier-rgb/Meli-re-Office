import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { PresentationItem } from '../../../../types/presentations';
import { Client } from '../../../../types/clients';
import { InstagramMockupFrame } from './InstagramMockupFrame';

interface FeedSingleMockupProps {
  item: PresentationItem;
  client?: Client | null;
  signedUrls: Record<string, string>;
  onExpand?: () => void;
}

export const FeedSingleMockup: React.FC<FeedSingleMockupProps> = ({
  item,
  client,
  signedUrls,
  onExpand,
}) => {
  const content = item.content;
  const assets = item.assets || [];

  // Find the primary current image asset
  const currentAsset =
    assets.find((a) => a.is_current && a.asset_type === 'image') ||
    assets.find((a) => a.asset_type === 'image') ||
    assets[0];

  const resolvedUrl = currentAsset?.file_url
    ? signedUrls[currentAsset.file_url]
    : null;

  return (
    <InstagramMockupFrame
      client={client}
      aspectRatio="portrait"
      showInteractions={true}
      captionPreview={content?.caption}
      onExpand={onExpand}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={content?.internal_title || 'Post Estático'}
          className="w-full h-full object-contain bg-[#111111] select-none"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#1A1A1A] text-[#9E9EA0]">
          <div className="w-12 h-12 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mb-3 text-[#F15A3C]">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-white">Arte em Produção</p>
          <p className="text-[11px] text-[#7E7E80] mt-1 max-w-[200px]">
            Nenhuma imagem vinculada a este post estático.
          </p>
        </div>
      )}
    </InstagramMockupFrame>
  );
};
