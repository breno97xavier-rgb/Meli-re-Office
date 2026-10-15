import { useEffect, useRef, useState } from 'react';
import { fetchFinanceHistory } from '../../services/financeService';
import type { FinanceEntry, FinanceEvent } from '../../types/finance';
import { formatCivilDateBR } from '../../utils/civilDate';

const cash=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const state=(entry:FinanceEntry)=>entry.status==='pending'?'Pendente':entry.status==='cancelled'?'Cancelado':entry.entry_type==='income'?'Recebido':'Pago';
export function FinanceHistory({ entry, onClose }: { entry:FinanceEntry; onClose:()=>void }) {
  const [events,setEvents]=useState<FinanceEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [revision,setRevision]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=dialog.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';node?.showModal();return()=>{node?.close();document.body.style.overflow=overflow;};},[]);
  useEffect(()=>{let active=true;setLoading(true);setError(null);fetchFinanceHistory(entry.id).then(data=>{if(active)setEvents(data);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'Histórico indisponível.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[entry.id,revision]);
  return <dialog ref={dialog} aria-label="Histórico do lançamento" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-2xl backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Histórico do lançamento</h2><p className="mt-1 text-sm text-[#666668]">{entry.title}</p></div><button type="button" onClick={onClose} className="rounded-lg bg-[#F2F3F3] px-3 py-2 text-sm">Fechar</button></div>
    {loading?<p role="status" className="py-8 text-center text-sm">Carregando histórico…</p>:error?<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button onClick={()=>setRevision(value=>value+1)} className="underline">Tentar novamente</button></p>:<div className="mt-5 space-y-3">{events.map(event=><article key={event.id} className="rounded-xl border border-[#E8E9EA] p-4 text-sm"><p className="font-semibold">{event.event_type==='INSERT'?'Lançamento criado':'Lançamento atualizado'}</p><p className="mt-1 text-xs text-[#9E9EA0]">{new Date(event.occurred_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>{event.old_values&&<p className="mt-2 text-[#666668]">Antes: {event.old_values.title} · {cash(event.old_values.amount_cents)} · {state(event.old_values)} · vencimento {formatCivilDateBR(event.old_values.due_date)}{event.old_values.settlement_date&&` · efetivado ${formatCivilDateBR(event.old_values.settlement_date)}`}</p>}<p className="mt-2">{event.old_values?'Depois':'Registro'}: {event.new_values.title} · {cash(event.new_values.amount_cents)} · {state(event.new_values)} · vencimento {formatCivilDateBR(event.new_values.due_date)}{event.new_values.settlement_date&&` · efetivado ${formatCivilDateBR(event.new_values.settlement_date)}`}</p></article>)}{events.length===0&&<p className="text-sm text-[#666668]">Nenhum evento disponível.</p>}<p className="text-xs text-[#9E9EA0]">Até 100 alterações mais recentes.</p></div>}
  </dialog>;
}
