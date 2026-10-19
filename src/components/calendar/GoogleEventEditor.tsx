import { useEffect, useRef, useState } from 'react';
import type { GoogleCalendarEvent } from '../../types/googleCalendar';
import { saveGoogleEvent, deleteGoogleEvent } from '../../services/googleCalendarService';

const field = 'mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50';
const localTime = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
};
const shiftDay = (value: string, days: number) => new Date(Date.parse(value)+days*86400000).toISOString().slice(0,10);

export function GoogleEventEditor({ event, date, canWrite, onClose, onSaved }: { event: GoogleCalendarEvent | null; date: string; canWrite: boolean; onClose: () => void; onSaved: () => void }) {
  const [title,setTitle]=useState(event?.title || '');
  const [description,setDescription]=useState(event?.description || '');
  const [location,setLocation]=useState(event?.location || '');
  const [allDay,setAllDay]=useState(event?.allDay || false);
  const [start,setStart]=useState(event ? event.allDay ? event.start : localTime(event.start) : date+'T09:00');
  const [end,setEnd]=useState(event ? event.allDay ? shiftDay(event.end,-1) : localTime(event.end) : date+'T10:00');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmDelete,setConfirmDelete]=useState(false);
  const requestId=useRef(crypto.randomUUID());
  const locked=useRef(false),dialog=useRef<HTMLDivElement>(null);
  const editable=canWrite&&(!event||Boolean(event.editable&&event.etag));
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!locked.current)onClose();
      if(e.key==='Tab'){
        const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),textarea:not(:disabled),button:not(:disabled),a[href]')||[]);
        const first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[onClose]);
  const run=async(remove=false)=>{
    if(locked.current||!editable)return;
    locked.current=true;setBusy(true);setError('');
    try{
      if(remove&&event)await deleteGoogleEvent(event);
      else{
        const first=allDay?start:new Date(start).toISOString(),last=allDay?shiftDay(end,1):new Date(end).toISOString();
        if(!allDay&&(localTime(first)!==start||localTime(last)!==end))throw new Error('Esse horário não existe no fuso atual. Confira a data e o horário.');
        if(Date.parse(last)<=Date.parse(first))throw new Error('O término deve ser posterior ao início.');
        await saveGoogleEvent({title,description,location,start:first,end:last,allDay},requestId.current,event||undefined);
      }
      onSaved();
    }catch(failure){setError(failure instanceof Error?failure.message:'Operação não confirmada. Atualize a agenda antes de tentar novamente.');}
    finally{locked.current=false;setBusy(false);}
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={()=>{if(!busy)onClose();}}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="google-event-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e=>e.stopPropagation()}>
      <h2 id="google-event-title" className="text-lg font-semibold">{event?'Compromisso do Google':'Novo compromisso no Google'}</h2>
      <p className="mt-2 text-xs text-zinc-500">Agenda principal · {Intl.DateTimeFormat().resolvedOptions().timeZone}. Alterações serão refletidas no Google Agenda.</p>
      {event?.recurring&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Esta é uma ocorrência recorrente. Salvar ou excluir afeta somente esta ocorrência, preservando as demais.</p>}
      {!editable&&<p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{!canWrite?'Reconecte o Google para autorizar a edição de compromissos.':'Convites, séries completas e eventos especiais devem ser editados no Google Agenda.'}</p>}
      <form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();void run();}}>
        <label className="block text-sm">Título<input required maxLength={300} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy||!editable} className={field}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} disabled={busy||!editable} onChange={e=>{setAllDay(e.target.checked);setStart(e.target.checked?start.slice(0,10):start.slice(0,10)+'T09:00');setEnd(e.target.checked?end.slice(0,10):end.slice(0,10)+'T10:00');}}/>Dia inteiro</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm">Início<input required type={allDay?'date':'datetime-local'} value={start} disabled={busy||!editable} onChange={e=>setStart(e.target.value)} className={field}/></label><label className="text-sm">{allDay?'Último dia (inclusive)':'Término'}<input required type={allDay?'date':'datetime-local'} value={end} disabled={busy||!editable} onChange={e=>setEnd(e.target.value)} className={field}/></label></div>
        <label className="block text-sm">Local<input maxLength={500} value={location} disabled={busy||!editable} onChange={e=>setLocation(e.target.value)} className={field}/></label>
        <label className="block text-sm">Descrição<textarea maxLength={4000} rows={4} value={description} disabled={busy||!editable} onChange={e=>setDescription(e.target.value)} className={field}/></label>
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        {confirmDelete&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Excluir “{event?.title}” da sua agenda Google? {event?.recurring?'Somente esta ocorrência será excluída.':'O compromisso será removido do Google e do Office.'}</p><div className="mt-3 flex gap-4"><button type="button" disabled={busy} onClick={()=>void run(true)} className="font-semibold underline">Confirmar exclusão</button><button type="button" disabled={busy} onClick={()=>setConfirmDelete(false)}>Voltar</button></div></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex gap-3">{event&&editable&&<button type="button" disabled={busy} onClick={()=>setConfirmDelete(true)} className="text-sm text-red-700">Excluir</button>}{event?.url&&<a href={event.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">Abrir no Google</a>}</div><div className="flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Fechar</button>{editable&&!confirmDelete&&<button disabled={busy} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando…':'Salvar no Google'}</button>}</div></div>
      </form>
    </div>
  </div>;
}
