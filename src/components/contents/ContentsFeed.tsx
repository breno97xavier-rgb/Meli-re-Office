import { Layers, Film, CalendarDays, Plus, RefreshCw } from 'lucide-react';
import type { Content } from '../../types/contents';
import { useContentMedia } from '../../hooks/useContentMedia';
import { selectContentCover } from '../../services/contentMediaContracts';
import { ContentMediaPreview } from './ContentMediaPreview';
import { ContentStatusBadge } from './ContentStatusBadge';
import { parseCivilDate, formatCivilDateObject } from '../../utils/civilDate';

interface Props { contents: Content[]; loading: boolean; onSelectContent: (content: Content) => void; onNewContent: () => void; isFiltered: boolean; onResetFilters: () => void; revision: number }

export function ContentsFeed({ contents, loading, onSelectContent, onNewContent, isFiltered, onResetFilters, revision }: Props) {
  const media = useContentMedia(loading ? [] : contents.map(content => content.id), revision);
  if (loading) return <div className="grid grid-cols-2 gap-4 md:grid-cols-3" aria-label="Carregando publicações">{[0, 1, 2].map(id => <div key={id} className="aspect-[4/5] animate-pulse rounded-xl bg-[#EDEEEE]" />)}</div>;
  if (!contents.length) return <div className="rounded-2xl border border-[#E8E9EA] bg-white p-12 text-center">
    <p className="font-semibold text-[#1D1D1D]">{isFiltered ? 'Nenhuma publicação encontrada' : 'Sua próxima publicação começa aqui'}</p>
    <p className="mt-2 text-sm text-[#666668]">{isFiltered ? 'Ajuste os filtros para encontrar seus conteúdos.' : 'Crie um conteúdo e envie o design para compor o feed.'}</p>
    <button type="button" onClick={isFiltered ? onResetFilters : onNewContent} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />{isFiltered ? 'Limpar filtros' : 'Novo conteúdo'}</button>
  </div>;
  return <section aria-label="Feed visual de publicações" className="space-y-4">
    {media.error && <div role="status" className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{media.error}<button type="button" onClick={media.refresh} className="inline-flex shrink-0 items-center gap-1 font-semibold"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</button></div>}
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
      {contents.map(content => {
        const asset = selectContentCover(media.assets.filter(item => item.content_id === content.id), content.format);
        const planned = parseCivilDate(content.planned_date);
        return <button type="button" key={content.id} onClick={() => onSelectContent(content)} aria-label={`Abrir publicação: ${content.internal_title}`} className="group overflow-hidden rounded-xl border border-[#E8E9EA] bg-white text-left shadow-xs transition-all hover:border-[#FBC3B8] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F15A3C]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#EDEEEE]">
            <ContentMediaPreview key={asset?.id || content.id} asset={asset} url={asset ? media.urls[asset.file_url] : undefined} loading={media.loading} unavailable={Boolean(media.error)} title={content.internal_title} />
            {(content.format === 'carousel' || content.format === 'reels' || content.format === 'story') && <span className="absolute right-3 top-3 rounded-lg bg-black/60 p-2 text-white" title={content.format === 'carousel' ? 'Carrossel' : content.format === 'reels' ? 'Reels' : 'Story'}>{content.format === 'carousel' ? <Layers className="h-4 w-4" /> : <Film className="h-4 w-4" />}</span>}
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            <p className="truncate text-[11px] text-[#9E9EA0]">{content.client?.commercial_name || content.client?.name || 'Cliente'}</p>
            <p className="truncate text-sm font-semibold text-[#1D1D1D]">{content.internal_title}</p>
            <div className="flex flex-wrap items-center justify-between gap-2"><ContentStatusBadge status={content.editorial_status} size="sm" />{planned && <span className="inline-flex items-center gap-1 text-[10px] text-[#666668]"><CalendarDays className="h-3 w-3" />{formatCivilDateObject(planned).split('-').reverse().join('/')}</span>}</div>
          </div>
        </button>;
      })}
    </div>
  </section>;
}
