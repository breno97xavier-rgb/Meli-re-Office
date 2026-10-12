import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PresentationItem } from '../../types/presentations';
import { selectContentCover } from '../../services/contentMediaContracts';
import { ContentMediaPreview } from '../contents/ContentMediaPreview';
import { PresentationItemApprovalBadge } from './PresentationStatusBadge';
import { PresentationItemCard, type PresentationItemCardProps } from './PresentationItemCard';

interface Props extends Omit<PresentationItemCardProps, 'item' | 'index' | 'totalItems' | 'isSavingNotes' | 'onDirtyChange' | 'saveNotesOnBlur'> {
  items: PresentationItem[];
  savingItemId: string | null;
  actionLoading: boolean;
}

export function PresentationItemsFeed({ items, signedUrls, savingItemId, actionLoading, ...actions }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const index = items.findIndex(item => item.id === selectedId);
  const selected = items[index];
  const open = Boolean(selected);

  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.showModal();
    return () => { node?.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  const close = () => {
    if (savingItemId === selectedId || actionLoading) return;
    if (dirty && !window.confirm('Há notas não salvas. Fechar e descartar essas notas?')) return;
    setSelectedId(null);
    setDirty(false);
  };

  return <>
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5" aria-label="Publicações desta apresentação">
      {items.map((item, position) => {
        const title = item.content?.internal_title || 'Conteúdo indisponível';
        const cover = selectContentCover(item.assets || [], item.content?.format || 'static_post');
        return <button key={item.id} type="button" onClick={() => { setDirty(false); setSelectedId(item.id); }} aria-label={`Abrir publicação ${position + 1}: ${title}`} className="overflow-hidden rounded-xl border border-[#E8E9EA] bg-white text-left shadow-xs hover:border-[#FBC3B8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F15A3C]">
          <div className="relative aspect-[4/5] bg-[#EDEEEE]">
            <ContentMediaPreview asset={cover} url={cover ? signedUrls[cover.file_url] : undefined} title={title} />
            <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white">#{position + 1}</span>
          </div>
          <div className="space-y-2 p-3"><p className="truncate text-sm font-semibold text-[#1D1D1D]">{title}</p><PresentationItemApprovalBadge status={item.client_approval_status} /></div>
        </button>;
      })}
    </div>
    <dialog ref={dialog} aria-label={`Detalhes da publicação: ${selected?.content?.internal_title || 'Conteúdo'}`} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[1440px] overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
      {selected && <>
        <div className="flex items-center justify-between border-b border-[#E8E9EA] px-5 py-3"><p className="text-sm font-semibold">Publicação da apresentação</p><button type="button" onClick={close} disabled={savingItemId === selectedId || actionLoading} aria-label="Fechar detalhes da publicação" className="rounded-lg p-2 text-[#666668] hover:bg-[#F2F3F3] disabled:opacity-40"><X className="h-5 w-5" /></button></div>
        <PresentationItemCard key={selected.id} item={selected} index={index} totalItems={items.length} signedUrls={signedUrls} isSavingNotes={savingItemId === selected.id} onDirtyChange={setDirty} saveNotesOnBlur={false} {...actions} />
      </>}
    </dialog>
  </>;
}
