import { useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import type { ContentAsset } from '../../types/contentAssets';

interface Props { asset?: ContentAsset; url?: string; loading?: boolean; unavailable?: boolean; title: string; controls?: boolean }

export function ContentMediaPreview({ asset, url, loading, unavailable, title, controls = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (loading) return <div className="flex h-full items-center justify-center bg-[#EDEEEE]" aria-label="Carregando mídia"><Loader2 className="h-6 w-6 animate-spin text-[#9E9EA0]" /></div>;
  if (url && failedUrl !== url && asset) {
    return asset.asset_type === 'video'
      ? <video src={url} controls={controls} muted={!controls} playsInline preload="metadata" aria-label={title} onError={() => setFailedUrl(url)} className="h-full w-full object-contain" />
      : <img src={url} alt={title} loading="lazy" onError={() => setFailedUrl(url)} className="h-full w-full object-contain" />;
  }
  const failed = unavailable || Boolean(asset) || Boolean(url && failedUrl === url);
  return <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#EDEEEE] p-4 sm:p-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white/70"><ImageOff className="h-6 w-6 text-[#9E9EA0]" /></div>
    <div><p className="text-sm font-semibold text-[#666668]">{failed ? 'Prévia indisponível' : 'Sem mídia ainda'}</p><p className="mt-1 text-xs text-[#9E9EA0]">{failed ? 'Abra a publicação para verificar o arquivo.' : 'O design aparecerá aqui após o upload.'}</p></div>
  </div>;
}
