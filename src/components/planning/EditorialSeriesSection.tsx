import { useEffect, useRef, useState } from 'react';
import type { ClientPillar } from '../../types/planning';
import type { EditorialSeries } from '../../types/planningFoundation';
import { PRIMARY_CHANNELS } from '../../types/contents';
import { getEditorialSeries, saveEditorialSeries } from '../../services/planningFoundationService';

const field='mt-1 w-full rounded-lg border border-[#E8E9EA] p-2 text-sm';
export function EditorialSeriesSection({clientId,pillars,onDirty}:{clientId:string;pillars:ClientPillar[];onDirty:(dirty:boolean)=>void}) {
  const [series,setSeries]=useState<EditorialSeries[]>([]),[editing,setEditing]=useState<EditorialSeries|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[message,setMessage]=useState('');
  const alive=useRef(true),lock=useRef(false);
  const [reload,setReload]=useState(0);
  useEffect(()=>{alive.current=true;let cancelled=false;setLoading(true);setError('');getEditorialSeries(clientId).then(data=>{if(!cancelled){setSeries(data);setEditing(null);setDirty(false);}}).catch(f=>{if(!cancelled)setError(f.message);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;alive.current=false;};},[clientId,reload]);
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  const choose=(next:EditorialSeries|null)=>{if(dirty&&!window.confirm('Descartar alterações não salvas da série?'))return;setEditing(next);setDirty(false);setMessage('');};
  const change=(input:Partial<EditorialSeries>)=>{setEditing(current=>current?{...current,...input}:null);setDirty(true);setMessage('');};
  async function save(){if(!editing||lock.current)return;lock.current=true;setSaving(true);setError('');try{const result=await saveEditorialSeries(clientId,editing);if(alive.current){setSeries(old=>old.some(s=>s.id===result.id)?old.map(s=>s.id===result.id?result:s):[...old,result]);setEditing(result);setDirty(false);setMessage('Série salva. Os pilares e os conteúdos existentes foram preservados.');}}catch(f){if(alive.current)setError((f as Error).message);}finally{lock.current=false;if(alive.current)setSaving(false);}}
  return <section aria-label="Séries editoriais" className="rounded-xl border border-[#E8E9EA] bg-white p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">Séries editoriais</h2><p className="mt-1 text-sm text-zinc-500">Quadros recorrentes podem reunir vários pilares. Criar uma série não gera conteúdos nem datas.</p></div><button type="button" disabled={loading||saving||Boolean(error&&!series.length&&!editing)} onClick={()=>choose({id:crypto.randomUUID(),client_id:clientId,name:'',description:null,suggested_recurrence:null,channels:[],pillar_ids:[],is_active:true,revision:0})} className="rounded-lg border px-3 py-2 text-sm">+ Nova série</button></div>
    {error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" disabled={saving||loading} className="mt-2 underline" onClick={()=>{if(!dirty||window.confirm('Atualizar as séries e descartar alterações não salvas?'))setReload(value=>value+1);}}>Atualizar dados</button></div>}{message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
    {loading?<p role="status" className="text-sm">Carregando séries…</p>:!series.length&&!error?<p className="rounded-lg bg-zinc-50 p-4 text-sm">Nenhuma série cadastrada. Este recurso é opcional.</p>:<div className="grid gap-3 sm:grid-cols-2">{series.map(item=><button type="button" disabled={saving} key={item.id} onClick={()=>choose(item)} className="rounded-lg border p-4 text-left"><span className="block font-medium">{item.name}</span><span className="text-xs text-zinc-500">{item.is_active?'Ativa':'Arquivada'} · {item.pillar_ids.length} pilar(es) · {item.suggested_recurrence||'Recorrência livre'}</span></button>)}</div>}
    {editing&&<form onSubmit={e=>{e.preventDefault();void save();}} className="space-y-4 border-t pt-4"><fieldset disabled={saving} className="space-y-4">
      <label className="block text-sm">Nome da série<input required className={field} value={editing.name} onChange={e=>change({name:e.target.value})}/></label>
      <label className="block text-sm">Descrição<textarea rows={3} className={field} value={editing.description||''} onChange={e=>change({description:e.target.value})}/></label>
      <label className="block text-sm">Recorrência sugerida<input className={field} value={editing.suggested_recurrence||''} placeholder="Ex.: a cada ciclo, alternado, mensal…" onChange={e=>change({suggested_recurrence:e.target.value})}/></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Pilares associados (opcional)</legend><div className="flex flex-wrap gap-3">{pillars.filter(p=>p.is_active||editing.pillar_ids.includes(p.id)).map(p=><label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.pillar_ids.includes(p.id)} onChange={e=>change({pillar_ids:e.target.checked?[...editing.pillar_ids,p.id]:editing.pillar_ids.filter(id=>id!==p.id)})}/>{p.name}{!p.is_active?' (inativo)':''}</label>)}{!pillars.length&&<p className="text-sm text-zinc-500">Nenhum pilar disponível. A série pode ser salva sem pilares.</p>}</div></fieldset>
      <fieldset><legend className="mb-2 text-sm font-medium">Canais usuais (opcional)</legend><div className="flex flex-wrap gap-3">{PRIMARY_CHANNELS.map(c=><label key={c.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.channels.includes(c.value)} onChange={e=>change({channels:e.target.checked?[...editing.channels,c.value]:editing.channels.filter(value=>value!==c.value)})}/>{c.label}</label>)}</div></fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={e=>change({is_active:e.target.checked})}/>Série ativa — desmarcar arquiva sem remover vínculos</label>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>choose(null)} className="rounded-lg border px-4 py-2 text-sm">Fechar</button><button disabled={!dirty||saving} className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm text-white disabled:opacity-50">{saving?'Salvando…':'Salvar série'}</button></div>
    </fieldset></form>}
  </section>;
}
