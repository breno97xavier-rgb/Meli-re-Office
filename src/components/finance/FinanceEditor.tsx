import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { FinanceClient, FinanceEntry, FinanceInput, FinanceStatus, FinanceType } from '../../types/finance';
import { parseFinanceAmount } from '../../services/financeContracts';
import { getSystemTodayString } from '../../utils/civilDate';

const field = 'w-full rounded-lg border border-[#E8E9EA] bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-[#F15A3C]';
export function FinanceEditor({ entry, clients, onClose, onSave }: { entry: FinanceEntry | null; clients: FinanceClient[]; onClose: () => void; onSave: (input: FinanceInput) => Promise<void> }) {
  const initial = { title: entry?.title || '', description: entry?.description || '', category: entry?.category || 'Geral', entry_type: entry?.entry_type || 'income' as FinanceType, amount: entry ? (entry.amount_cents/100).toFixed(2).replace('.',',') : '', due_date: entry?.due_date || getSystemTodayString(), status: entry?.status || 'pending' as FinanceStatus, settlement_date: entry?.settlement_date || '', client_id: entry?.client_id || '' };
  const [form,setForm] = useState(initial);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node=dialog.current; const overflow=document.body.style.overflow; document.body.style.overflow='hidden'; node?.showModal(); return()=>{node?.close(); document.body.style.overflow=overflow;}; },[]);
  const close=()=>{if(saving)return; if(JSON.stringify(form)!==JSON.stringify(initial)&&!window.confirm('Descartar as alterações não salvas deste lançamento?'))return; onClose();};
  const changeStatus=(status: FinanceStatus)=>setForm(previous=>({...previous,status,settlement_date:status==='settled' ? previous.settlement_date||getSystemTodayString() : ''}));
  return <dialog ref={dialog} aria-label={entry ? 'Editar lançamento financeiro' : 'Novo lançamento financeiro'} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
    <form onSubmit={async event=>{event.preventDefault();if(saving)return;setSaving(true);setError(null);try {await onSave({title:form.title,description:form.description||null,category:form.category,entry_type:form.entry_type,amount_cents:parseFinanceAmount(form.amount),due_date:form.due_date,status:form.status,settlement_date:form.settlement_date||null,client_id:form.client_id||null});}catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível salvar.');}finally{setSaving(false);}}}>
      <div className="flex items-center justify-between border-b border-[#E8E9EA] p-6"><h2 className="text-lg font-semibold">{entry?'Editar lançamento':'Novo lançamento'}</h2><button type="button" onClick={close} disabled={saving} aria-label="Fechar formulário financeiro" className="p-2"><X className="h-5 w-5" /></button></div>
      <fieldset disabled={saving} className="space-y-4 p-6">
        <label className="block space-y-1 text-sm font-semibold">Descrição do lançamento<input required maxLength={200} value={form.title} onChange={event=>setForm({...form,title:event.target.value})} className={field} autoFocus /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm font-semibold">Tipo<select disabled={Boolean(entry?.recurrence_id)} value={form.entry_type} onChange={event=>setForm({...form,entry_type:event.target.value as FinanceType})} className={field}><option value="income">Receita</option><option value="expense">Despesa</option></select></label>
          <label className="block space-y-1 text-sm font-semibold">Valor (R$)<input required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={event=>setForm({...form,amount:event.target.value})} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold">Categoria<input required maxLength={80} value={form.category} onChange={event=>setForm({...form,category:event.target.value})} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold">Cliente<select disabled={Boolean(entry?.recurrence_id)} value={form.client_id} onChange={event=>setForm({...form,client_id:event.target.value})} className={field}><option value="">Sem cliente / Interno da agência</option>{clients.map(client=><option key={client.id} value={client.id}>{client.commercial_name||client.name}</option>)}</select></label>
          <label className="block space-y-1 text-sm font-semibold">Vencimento<input type="date" required value={form.due_date} onChange={event=>setForm({...form,due_date:event.target.value})} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold">Situação<select value={form.status} onChange={event=>changeStatus(event.target.value as FinanceStatus)} className={field}><option value="pending">Pendente</option><option value="settled">{form.entry_type==='income'?'Recebido':'Pago'}</option><option value="cancelled">Cancelado</option></select></label>
          {form.status==='settled'&&<label className="block space-y-1 text-sm font-semibold">{form.entry_type==='income'?'Data do recebimento':'Data do pagamento'}<input type="date" required value={form.settlement_date} onChange={event=>setForm({...form,settlement_date:event.target.value})} className={field} /></label>}
        </div>
        <label className="block space-y-1 text-sm font-semibold">Observações<textarea rows={3} value={form.description} onChange={event=>setForm({...form,description:event.target.value})} className={field} /></label>
        <p className="text-xs text-[#666668]">Registro manual. Não envia cobranças nem realiza transferências. Lançamentos cancelados ficam no histórico e não entram nos totais.</p>
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </fieldset>
      <div className="flex justify-end gap-3 border-t border-[#E8E9EA] p-6"><button type="button" onClick={close} disabled={saving} className="rounded-lg bg-[#F2F3F3] px-4 py-2 text-sm">Voltar</button><button type="submit" disabled={saving} className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando…':'Salvar lançamento'}</button></div>
    </form>
  </dialog>;
}
