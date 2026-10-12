import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { Content } from '../../types/contents';
import { useContentMedia } from '../../hooks/useContentMedia';
import { ContentMediaPreview } from './ContentMediaPreview';

export function ContentMediaPanel({ content, revision }: { content: Content; revision: number }) {
  const media = useContentMedia([content.id], revision);
  const [index, setIndex] = useState(0);
  const assets = media.assets.filter(asset => ['image', 'video'].includes(asset.asset_type)).sort((a, b) => a.display_order - b.display_order || b.version - a.version);
  const currentIndex = Math.min(index, Math.max(0, assets.length - 1));
  const selected = assets[currentIndex] || media.assets.find(asset => asset.asset_type === 'thumbnail');
  return <aside aria-label="Visualização da publicação" className="flex min-h-0 flex-col border-b border-[#E8E9EA] bg-[#F2F3F3] lg:border-b-0 lg:border-r">
    <div className="flex items-center justify-between px-5 py-4"><span className="text-xs font-semibold text-[#666668]">Prévia da publicação</span><button type="button" onClick={media.refresh} aria-label="Atualizar prévia" className="rounded-lg p-2 text-[#666668] hover:bg-white"><RefreshCw className={`h-4 w-4 ${media.loading ? 'animate-spin' : ''}`} /></button></div>
    <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-5"><div className="h-full min-h-0 max-h-[62vh] w-full overflow-hidden rounded-xl bg-[#EDEEEE] lg:max-h-none"><ContentMediaPreview key={selected?.id || content.id} asset={selected} url={selected ? media.urls[selected.file_url] : undefined} loading={media.loading} unavailable={Boolean(media.error)} title={content.internal_title} controls /></div></div>
    <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-5"><p className="text-xs text-[#666668]">{assets.length ? `${currentIndex + 1} de ${assets.length}` : 'Envie a mídia em Peça & Arquivos'}</p>{assets.length > 1 && <div className="flex gap-2"><button type="button" aria-label="Mídia anterior" disabled={currentIndex <= 0} onClick={() => setIndex(currentIndex - 1)} className="rounded-lg bg-white p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Próxima mídia" disabled={currentIndex >= assets.length - 1} onClick={() => setIndex(currentIndex + 1)} className="rounded-lg bg-white p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}</div>
    {media.error && <p role="status" className="px-5 pb-4 text-xs text-amber-700">{media.error}</p>}
  </aside>;
}
