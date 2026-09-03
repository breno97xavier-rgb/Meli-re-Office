import { useState } from 'react';
import { OFFICIAL_MELIERE_ASSETS } from '@/src/lib/assets';
import type { BrandAssetType } from '@/src/types';

interface BrandAssetProps {
  type: BrandAssetType;
  alt?: string;
  className?: string;
}

export function BrandAsset({ type, alt = 'Melière Marketing', className = '' }: BrandAssetProps) {
  const [hasError, setHasError] = useState(false);

  let src: string = OFFICIAL_MELIERE_ASSETS.logos.darkSurface;
  let isSymbol = false;

  switch (type) {
    case 'logo-dark':
      src = OFFICIAL_MELIERE_ASSETS.logos.darkSurface;
      break;
    case 'logo-coral':
      src = OFFICIAL_MELIERE_ASSETS.logos.coralSurface;
      break;
    case 'logo-light':
      src = OFFICIAL_MELIERE_ASSETS.logos.lightSurface;
      break;
    case 'symbol-light-a':
      src = OFFICIAL_MELIERE_ASSETS.symbols.lightA;
      isSymbol = true;
      break;
    case 'symbol-dark-b':
      src = OFFICIAL_MELIERE_ASSETS.symbols.darkB;
      isSymbol = true;
      break;
    case 'symbol-light-c':
      src = OFFICIAL_MELIERE_ASSETS.symbols.lightC;
      isSymbol = true;
      break;
    case 'symbol-coral-d':
      src = OFFICIAL_MELIERE_ASSETS.symbols.coralD;
      isSymbol = true;
      break;
  }

  if (hasError) {
    return (
      <div 
        className={`inline-flex items-center justify-center rounded border border-[#333333] bg-[#242424] px-2 py-1 text-xs text-[#9E9EA0] ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="h-2 w-2 rounded-full bg-[#F15A3C] mr-1.5" />
        <span className="tracking-widest font-medium text-[10px]">MELIÈRE</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`select-none object-contain transition-opacity duration-200 ${
        isSymbol ? 'h-7 w-7' : 'h-7 max-w-[170px]'
      } ${className}`}
      loading="eager"
      crossOrigin="anonymous"
    />
  );
}
