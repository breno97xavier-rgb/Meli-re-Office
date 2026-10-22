import { useEffect, useRef, useState } from 'react';
import type { BriefingQuestion, ClientBriefing, PlanningRevision } from '../../types/planningFoundation';
import { getBriefing, saveBriefing, getPlanningRevisions } from '../../services/planningFoundationService';

const field='mt-1 w-full rounded-lg border border-[#E8E9EA] bg-white p-2 text-sm';
const blocks=['Negócio','Público e decisores','Objetivos','Oferta','Posicionamento','Canais','Referências','Produção','Aprovações','Restrições'];
export function BriefingSection({clientId,onDirty}:{clientId:string;onDirty:(dirty:boolean)=>void}) {
  const [briefing,setBriefing]=useState<ClientBriefing|null>(null),[questions,setQuestions]=useState<BriefingQuestion[]>([]);
  const [status,setStatus]=useState<'draft'|'ready'>('draft'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false);
  const [history,setHistory]=useState<PlanningRevision<ClientBriefing>[]|null>(null),[historyLoading,setHistoryLoading]=useState(false);
  const [reload,setReload]=useState(0),[loaded,setLoaded]=useState(false);
  const alive=useRef(true),locked=useRef(false);
  useEffect(()=>{alive.current=true; let cancelled=false;setLoading(true);setLoaded(false);setError('');
    getBriefing(clientId).then(data=>{if(!cancelled){setBriefing(data);setQuestions(data?.questions||[]);setStatus(data?.status||'draft');setLoaded(true);setDirty(false);setHistory(null);}})
      .catch(failure=>{if(!cancelled)setError(failure.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;alive.current=false;};
  },[clientId,reload]);
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  const change=(next:BriefingQuestion[])=>{setQuestions(next);setDirty(true);setMessage('');};
  const patch=(id:string,input:Partial<BriefingQuestion>)=>change(questions.map(q=>q.id===id?{...q,...input}:q));
  const move=(index:number,step:number)=>{const next=[...questions];[next[index],next[index+step]]=[next[index+step],next[index]];change(next);};
  async function save() {
    if(locked.current)return;locked.current=true;setSaving(true);setError('');setMessage('');
    try { const saved=await saveBriefing(clientId,briefing?.revision||0,questions,status);
      if(alive.current){setBriefing(saved);setQuestions(saved.questions);setDirty(false);setMessage('Briefing salvo. A estratégia não foi alterada.');setHistory(null);}
    } catch(failure){if(alive.current)setError((failure as Error).message);} finally {locked.current=false;if(alive.current)setSaving(false);}
  }
  async function showHistory(){setHistoryLoading(true);setError('');try{const revisions=await getPlanningRevisions<ClientBriefing>(clientId,'briefing');if(alive.current)setHistory(revisions);}catch(failure){if(alive.current)setError((failure as Error).message);}finally{if(alive.current)setHistoryLoading(false);}}
  if(loading)return <p role="status">Carregando briefing…</p>;
  return <section className="rounded-xl border border-[#E8E9EA] bg-white p-5 space-y-5" aria-label="Briefing do cliente">
    <div><h2 className="font-semibold">Briefing opcional</h2><p className="text-sm text-zinc-500 mt-1">Organize as respostas do cliente. Nenhuma pergunta é obrigatória para operar o Office; salvar aqui não reescreve a estratégia.</p></div>
    {error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" disabled={saving} className="mt-2 underline" onClick={()=>{if(!dirty||window.confirm('Atualizar o briefing e descartar alterações não salvas?'))setReload(value=>value+1);}}>Atualizar dados</button></div>}{message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
    <fieldset disabled={saving||!loaded} className="space-y-4 disabled:opacity-60">
      {!questions.length&&<p className="rounded-lg bg-zinc-50 p-4 text-sm">Sem questionário. Você pode começar com perguntas livres ou continuar sem briefing.</p>}
      {questions.map((q,index)=><article key={q.id} className="rounded-xl border border-[#E8E9EA] p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-medium">Pergunta {index+1}</span><div className="flex flex-wrap gap-3 text-sm">
          <button type="button" aria-label={`Subir pergunta ${index+1}`} disabled={!index} onClick={()=>move(index,-1)}>↑ Subir</button>
          <button type="button" aria-label={`Descer pergunta ${index+1}`} disabled={index===questions.length-1} onClick={()=>move(index,1)}>↓ Descer</button>
          <button type="button" className="text-red-700" onClick={()=>{if(window.confirm('Remover esta pergunta e sua resposta do rascunho? As versões salvas continuam no histórico.'))change(questions.filter(item=>item.id!==q.id));}}>Remover</button>
        </div></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Bloco<input list="briefing-blocks" className={field} value={q.block} onChange={e=>patch(q.id,{block:e.target.value})}/></label>
        <label className="text-sm">Tipo<select className={field} value={q.type} onChange={e=>{if((Array.isArray(q.answer)?q.answer.length:q.answer.length)&&!window.confirm('Alterar o tipo limpará a resposta deste rascunho. Continuar?'))return;patch(q.id,{type:e.target.value as BriefingQuestion['type'],answer:e.target.value==='multiple'?[]:''});}}><option value="text">Texto livre</option><option value="select">Seleção única</option><option value="multiple">Múltipla escolha</option></select></label></div>
        <label className="block text-sm">Enunciado<input className={field} value={q.label} onChange={e=>patch(q.id,{label:e.target.value})}/></label>
        {q.type!=='text'&&<label className="block text-sm">Opções (uma por linha)<textarea className={field} value={q.options.join('\n')} onChange={e=>patch(q.id,{options:e.target.value.split('\n')})}/><span className="text-xs text-zinc-500">Se remover uma opção respondida, ajuste a resposta antes de salvar.</span></label>}
        {q.type==='text'?<label className="block text-sm">Resposta<textarea rows={3} className={field} value={q.answer as string} onChange={e=>patch(q.id,{answer:e.target.value})}/></label>:q.type==='select'?<label className="block text-sm">Resposta<select className={field} value={q.answer as string} onChange={e=>patch(q.id,{answer:e.target.value})}><option value="">Não respondido</option>{q.options.map((o,i)=><option key={i} value={o}>{o}</option>)}</select></label>:<fieldset className="space-y-2"><legend className="text-sm">Respostas</legend>{q.options.map((o,i)=><label key={i} className="flex gap-2 text-sm"><input type="checkbox" checked={(q.answer as string[]).includes(o)} onChange={e=>patch(q.id,{answer:e.target.checked?[...q.answer as string[],o]:(q.answer as string[]).filter(a=>a!==o)})}/>{o||'Opção sem texto'}</label>)}</fieldset>}
      </article>)}
      <datalist id="briefing-blocks">{blocks.map(block=><option key={block} value={block}/>)}</datalist>
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>change([...questions,{id:crypto.randomUUID(),block:'Negócio',label:'',type:'text',options:[],answer:''}])}>+ Adicionar pergunta</button>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4"><label className="text-sm">Situação<select className={field} value={status} onChange={e=>{setStatus(e.target.value as 'draft'|'ready');setDirty(true);}}><option value="draft">Rascunho</option><option value="ready">Revisado</option></select></label>
      <button type="button" disabled={!dirty||saving} onClick={()=>void save()} className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm text-white disabled:opacity-50">{saving?'Salvando…':'Salvar briefing'}</button></div>
    </fieldset>
    <div className="border-t pt-4"><button type="button" disabled={historyLoading||saving} onClick={()=>void showHistory()} className="text-sm underline">{historyLoading?'Consultando…':'Consultar versões salvas'}</button>
      {history&&<div className="mt-3 space-y-2">{!history.length&&<p className="text-sm text-zinc-500">Nenhuma versão salva.</p>}{history.map(item=><details key={item.revision} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Versão {item.revision} · {new Date(item.changed_at).toLocaleString('pt-BR')}</summary>{item.snapshot.questions.map(q=><div key={q.id} className="mt-3 text-sm"><p className="font-medium">{q.block} · {q.label}</p><p className="whitespace-pre-wrap">{Array.isArray(q.answer)?q.answer.join(', ')||'Não respondido':q.answer||'Não respondido'}</p></div>)}</details>)}</div>}
    </div>
  </section>;
}
