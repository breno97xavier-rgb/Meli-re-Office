import { useCallback, useEffect, useRef, useState } from 'react';
import { OfficeConfirmProvider, useOfficeConfirm } from '../components/shared/OfficeConfirmProvider';
import { fetchPublicationData, savePublication } from '../services/publicationsService';
import { publicationLocalTime, publicationUtcTime, safePublicationUrl } from '../services/publicationContracts';
import { PUBLICATION_CHANNELS, PUBLICATION_STATUSES } from '../types/publications';
import type { PublicationChannel, PublicationStatus, PublicationPiece, PublicationRow } from '../types/publications';

const field = 'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:bg-zinc-100';
const button = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';
function PublicationForm({ previous, pieces, onClose, onSaved }: { previous: PublicationRow | null; pieces: PublicationPiece[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const confirm = useOfficeConfirm(), dialog = useRef<HTMLDialogElement>(null);
  const [id] = useState(() => previous?.id || crypto.randomUUID());
  const [contentId,setContentId] = useState(previous?.content_id || '');
  const [channel,setChannel] = useState<PublicationChannel>(previous?.channel || 'instagram');
  const [status,setStatus] = useState<PublicationStatus>(previous?.status || 'planned');
  const [scheduled,setScheduled] = useState(publicationLocalTime(previous?.scheduled_for || null));
  const [published,setPublished] = useState(publicationLocalTime(previous?.published_at || null));
  const [url,setUrl] = useState(previous?.post_url || '');
  const [copy,setCopy] = useState(previous?.channel_specific_copy || '');
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [dirty,setDirty] = useState(false);
  const piece = pieces.find(item => item.id === contentId) || previous?.content;
  useEffect(() => { const node=dialog.current; node?.showModal(); return () => node?.close(); }, []);
  useEffect(() => { if (!dirty) return; const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn); },[dirty]);
  const close = async () => {
    if (!busy && (!dirty || await confirm('Descartar as alterações não salvas deste registro de publicação?'))) onClose();
  };
  return <dialog ref={dialog} aria-labelledby="publication-editor-title" onCancel={event=>{event.preventDefault();void close();}} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
    <h2 id="publication-editor-title" className="text-lg font-bold">{previous?'Editar registro':'Registrar publicação'}</h2>
    <p className="mt-2 text-sm text-zinc-600">Controle manual. Salvar aqui não publica nem agenda automaticamente na rede social.</p>
    <form className="mt-5 space-y-4" onChange={()=>setDirty(true)} onSubmit={async event=>{
      event.preventDefault();if(busy)return;setBusy(true);setError('');
      try { await savePublication(id,{content_id:contentId,channel,status,scheduled_for:publicationUtcTime(scheduled),published_at:publicationUtcTime(published),post_url:url||null,channel_specific_copy:copy||null},previous||undefined);setDirty(false);await onSaved();onClose(); }
      catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar.');}
      finally{setBusy(false);}
    }}>
      <label className="block text-sm font-semibold">Peça editorial<select required disabled={busy||Boolean(previous)} value={contentId} onChange={event=>setContentId(event.target.value)} className={field}>
        <option value="">Selecione uma peça existente</option>{pieces.map(item=><option key={item.id} value={item.id}>{item.client.commercial_name||item.client.name} · {item.internal_title}</option>)}
      </select></label>
      {piece && <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">Cliente: {piece.client.commercial_name||piece.client.name}. {piece.editorial_status==='approved'?'Peça aprovada.':'A peça ainda não está aprovada. Este registro manual não altera sua aprovação editorial.'}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Canal<select disabled={busy} value={channel} onChange={event=>setChannel(event.target.value as PublicationChannel)} className={field}>{Object.entries(PUBLICATION_CHANNELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">Status<select disabled={busy} value={status} onChange={event=>setStatus(event.target.value as PublicationStatus)} className={field}>{Object.entries(PUBLICATION_STATUSES).map(([value,label])=><option key={value} value={value}>{label}{value==='scheduled'?' (controle manual)':''}</option>)}</select></label>
        <label className="text-sm font-semibold">Data prevista<input type="datetime-local" required={status==='scheduled'} disabled={busy} value={scheduled} onInput={event=>{setScheduled(event.currentTarget.value);setDirty(true);}} className={field}/></label>
        <label className="text-sm font-semibold">Publicada em<input type="datetime-local" required={status==='published'} disabled={busy} value={published} onInput={event=>{setPublished(event.currentTarget.value);setDirty(true);}} className={field}/></label>
      </div>
      <p className="text-xs text-zinc-500">Horários no fuso {Intl.DateTimeFormat().resolvedOptions().timeZone}. As datas editoriais da peça permanecem independentes.</p>
      <label className="block text-sm font-semibold">Link publicado (opcional)<input type="url" maxLength={2000} disabled={busy} value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://…" className={field}/></label>
      <label className="block text-sm font-semibold">Texto específico deste canal (opcional)<textarea maxLength={20000} rows={4} disabled={busy} value={copy} onChange={event=>setCopy(event.target.value)} className={field}/></label>
      <p className="text-xs text-zinc-500">Sem texto específico, consulte a legenda na peça de origem. Arquivos e aprovações continuam em Conteúdos e Apresentações.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={busy} onClick={()=>void close()} className={button}>Cancelar</button><button type="submit" disabled={busy} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando…':'Salvar registro manual'}</button></div>
    </form>
  </dialog>;
}
function PublicationsContent() {
  const [rows,setRows] = useState<PublicationRow[]>([]), [pieces,setPieces] = useState<PublicationPiece[]>([]);
  const [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [query,setQuery] = useState(''), [client,setClient] = useState('all'), [channel,setChannel] = useState('all'), [status,setStatus] = useState('all');
  const [editor,setEditor] = useState<{previous:PublicationRow|null}|null>(null);
  const request = useRef(0);
  const load = useCallback(async () => { const seq=++request.current;setLoading(true);setError('');try{const result=await fetchPublicationData();if(seq===request.current){setRows(result.rows);setPieces(result.pieces);}}catch(failure){if(seq===request.current)setError(failure instanceof Error?failure.message:'Falha ao carregar publicações.');}finally{if(seq===request.current)setLoading(false);}},[]);
  useEffect(()=>{void load();return()=>{request.current++;};},[load]);
  const clients = [...new Map<string, PublicationPiece['client']>(pieces.map((piece:PublicationPiece)=>[piece.client.id,piece.client] as const)).values()];
  const filtered = rows.filter(row=>(client==='all'||row.content.client.id===client)&&(channel==='all'||row.channel===channel)&&(status==='all'||row.status===status)&&`${row.content.internal_title} ${row.content.client.name} ${row.content.client.commercial_name||''}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))).sort((a,b)=>(b.scheduled_for||b.created_at).localeCompare(a.scheduled_for||a.created_at));
  const date = (value:string|null) => value ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : 'Não informada';
  return <section aria-labelledby="publications-title" className="space-y-5 p-6 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 id="publications-title" className="text-2xl font-bold">Publicações</h1><p className="mt-1 text-sm text-zinc-600">Controle da distribuição das peças por canal.</p></div><div className="flex gap-2"><button disabled={loading||Boolean(editor)} onClick={()=>void load()} className={button}>Atualizar</button><button disabled={loading||Boolean(error)||!pieces.length} onClick={()=>setEditor({previous:null})} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Registrar publicação</button></div></header>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Operação manual: o Office organiza os registros. Publicar ou programar na rede social continua sendo uma ação externa. Contas sociais, automação e métricas serão integradas em etapas futuras.</p>
    <section aria-label="Filtros de publicações" className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
      <input aria-label="Buscar publicações" placeholder="Buscar peça ou cliente" value={query} onChange={event=>setQuery(event.target.value)} className={field}/>
      <select aria-label="Cliente" value={client} onChange={event=>setClient(event.target.value)} className={field}><option value="all">Todos os clientes</option>{clients.map(item=><option key={item.id} value={item.id}>{item.commercial_name||item.name}</option>)}</select>
      <select aria-label="Canal" value={channel} onChange={event=>setChannel(event.target.value)} className={field}><option value="all">Todos os canais</option>{Object.entries(PUBLICATION_CHANNELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Status" value={status} onChange={event=>setStatus(event.target.value)} className={field}><option value="all">Todos os status</option>{Object.entries(PUBLICATION_STATUSES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    </section>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status">Carregando publicações…</p> : !error && <>
      <p className="text-sm text-zinc-600">{filtered.length} {filtered.length===1?'registro':'registros'} neste filtro · {rows.filter(row=>row.status==='published').length} publicados no total</p>
      {!filtered.length && <p className="rounded-xl border bg-white p-6 text-sm text-zinc-600">{rows.length?'Nenhum registro corresponde aos filtros.':'Nenhuma publicação registrada. Comece por uma peça existente, sem cadastrar o conteúdo novamente.'}</p>}
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map(row=><article key={row.id} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex justify-between gap-3"><h2 className="font-bold">{row.content.internal_title}</h2><span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs">{PUBLICATION_STATUSES[row.status]}</span></div>
        <p className="text-sm text-zinc-600">{row.content.client.commercial_name||row.content.client.name} · {PUBLICATION_CHANNELS[row.channel]}</p>
        <p className="text-xs text-zinc-500">Prevista: {date(row.scheduled_for)}<br/>Publicada: {date(row.published_at)}</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setEditor({previous:row})} className={button}>Editar registro</button>{safePublicationUrl(row.post_url)&&<a href={safePublicationUrl(row.post_url)!} target="_blank" rel="noopener noreferrer" className="px-2 py-2 text-sm text-blue-700 underline">Abrir publicação</a>}</div>
      </article>)}</div>
    </>}
    {editor && <PublicationForm previous={editor.previous} pieces={pieces} onClose={()=>setEditor(null)} onSaved={load}/>}
  </section>;
}
export function PublicationsPage() { return <OfficeConfirmProvider title="Alterações não salvas"><PublicationsContent/></OfficeConfirmProvider>; }
