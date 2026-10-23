import { useEffect, useRef, useState } from 'react';
import type { Campaign, ClientPillar } from '../../types/planning';
import type { EditorialSeries } from '../../types/planningFoundation';
import type { EditorialTemplate, EditorialTemplateDraft, EditorialTemplateFilter, EditorialTemplateRevision, EditorialTemplateSlot } from '../../types/editorialTemplates';
import { getEditorialTemplates, saveEditorialTemplate, getEditorialTemplateRevisions } from '../../services/editorialTemplateService';
import { getEditorialSeries } from '../../services/planningFoundationService';
import { getCampaigns } from '../../services/planningService';
import { duplicateEditorialTemplate, editorialPositionLabel, editorialTemplateSummary, filterEditorialSlots, moveEditorialSlot, newEditorialSlot } from '../../utils/editorialTemplates';
import { FORMAT_LABELS, PRIMARY_CHANNELS } from '../../types/contents';
import { EditorialSlotEditor } from './EditorialSlotEditor';

const field = 'mt-1 w-full rounded-lg border border-[#E8E9EA] bg-white p-2 text-sm';
const button = 'rounded-lg border border-[#E8E9EA] bg-white px-3 py-2 text-sm disabled:opacity-50';

export function EditorialTemplatesSection({ clientId, pillars, onDirty }: { clientId: string; pillars: ClientPillar[]; onDirty: (dirty: boolean) => void }) {
  const [templates, setTemplates] = useState<EditorialTemplate[]>([]);
  const [draft, setDraft] = useState<EditorialTemplateDraft | null>(null);
  const [series, setSeries] = useState<EditorialSeries[]>([]), [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true), [loaded, setLoaded] = useState(false), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [reload, setReload] = useState(0);
  const [slotId, setSlotId] = useState<string | null>(null), [filter, setFilter] = useState<EditorialTemplateFilter>({});
  const [history, setHistory] = useState<EditorialTemplateRevision[] | null>(null), [historyLoading, setHistoryLoading] = useState(false);
  const alive = useRef(true), lock = useRef(false), historyRequest = useRef(0);

  useEffect(() => {
    alive.current = true; let cancelled = false; setLoading(true); setLoaded(false); setError('');
    Promise.all([getEditorialTemplates(clientId), getEditorialSeries(clientId), getCampaigns(clientId, { includeArchived: true })])
      .then(([models, recurring, launches]) => { if (!cancelled) { setTemplates(models); setSeries(recurring); setCampaigns(launches); setDraft(null); setSlotId(null); setHistory(null); setDirty(false); setLoaded(true); } })
      .catch(failure => { if (!cancelled) setError(failure.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; alive.current = false; historyRequest.current++; };
  }, [clientId, reload]);
  useEffect(() => { onDirty(dirty || saving); return () => onDirty(false); }, [dirty, saving, onDirty]);

  function choose(next: EditorialTemplateDraft | null, unsaved = false) {
    if (saving || (dirty && !window.confirm('Descartar alterações não salvas deste modelo?'))) return;
    historyRequest.current++; setDraft(next); setDirty(unsaved); setSlotId(null); setFilter({}); setHistory(null); setHistoryLoading(false); setMessage('');
  }
  function change(input: Partial<EditorialTemplateDraft>) { setDraft(current => current ? { ...current, ...input } : null); setDirty(true); setMessage(''); setHistory(null); historyRequest.current++; setHistoryLoading(false); }
  function patchSlot(id: string, input: Partial<EditorialTemplateSlot>) { if (draft) change({ slots: draft.slots.map(slot => slot.id === id ? { ...slot, ...input } : slot) }); }
  async function save() {
    if (!draft || !loaded || lock.current) return;
    lock.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveEditorialTemplate(clientId, draft);
      if (alive.current) { setTemplates(current => current.some(model => model.id === result.id) ? current.map(model => model.id === result.id ? result : model) : [...current, result]); setDraft(result); setDirty(false); setMessage(`Modelo salvo · versão ${result.revision}. Nenhum conteúdo ou data foi criado.`); }
    } catch (failure) { if (alive.current) setError((failure as Error).message); }
    finally { lock.current = false; if (alive.current) setSaving(false); }
  }
  async function showHistory() {
    if (!draft?.revision) return;
    const request = ++historyRequest.current; setHistoryLoading(true); setError('');
    try { const rows = await getEditorialTemplateRevisions(clientId, draft.id); if (alive.current && request === historyRequest.current) setHistory(rows); }
    catch (failure) { if (alive.current && request === historyRequest.current) setError((failure as Error).message); }
    finally { if (alive.current && request === historyRequest.current) setHistoryLoading(false); }
  }
  const visible = draft ? filterEditorialSlots(draft.slots, filter) : [];
  const summary = editorialTemplateSummary(visible);
  const editingSlot = draft?.slots.find(slot => slot.id === slotId);

  return <section aria-label="Modelos de grade editorial" className="space-y-5">
    <div className="rounded-xl border bg-white p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">Grade editorial reutilizável</h2><button type="button" className={button} disabled={!loaded || saving} onClick={() => choose({ id: crypto.randomUUID(), client_id: clientId, name: 'Novo modelo', notes: '', position_count: 14, slots: [], revision: 0, is_active: true }, true)}>+ Novo modelo</button></div>
      <p className="text-sm text-zinc-500">Posições relativas não são dias da semana nem datas. Um modelo pode ser usado em ciclos futuros com novos assuntos.</p>
      {loading && <p role="status">Carregando modelos…</p>}
      {error && <div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="mt-2 underline" disabled={saving || loading} onClick={() => { if (!dirty || window.confirm('Atualizar e descartar o rascunho do modelo?')) setReload(value => value + 1); }}>Atualizar modelos</button></div>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {loaded && !templates.length && <p className="rounded-lg bg-zinc-50 p-4 text-sm">Nenhum modelo salvo. Planejamento editorial é opcional.</p>}
      <div className="flex flex-wrap gap-2">{templates.map(model => <button type="button" key={model.id} disabled={saving || !loaded} className={`${button} text-left ${draft?.id === model.id ? 'ring-2 ring-[#F3705A]' : ''}`} onClick={() => choose(model)}>{model.name}<span className="block text-xs text-zinc-500">v{model.revision} · {model.position_count} posições · {model.is_active ? 'Ativo' : 'Arquivado'}</span></button>)}</div>
    </div>
    {draft && <fieldset disabled={saving || !loaded} className="space-y-5 disabled:opacity-60">
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome do modelo<input className={field} value={draft.name} onChange={event => change({ name: event.target.value })}/></label>
          <label className="text-sm">Quantidade de posições<input type="number" min={1} max={366} step={1} className={field} value={draft.position_count} onChange={event => { const count = Number(event.target.value); if (!Number.isInteger(count) || count < 1 || count > 366) { setError('Use entre 1 e 366 posições.'); return; } if (draft.slots.some(slot => slot.position > count)) { setError('Mova também as vagas arquivadas antes de reduzir a grade. Nenhuma vaga foi removida.'); return; } change({ position_count: count }); setError(''); }}/></label></div>
        <div className="flex flex-wrap gap-2">{[[7, '1 semana'], [14, '2 semanas'], [28, '4 semanas']].map(([count, label]) => <button type="button" key={count} className={button} onClick={() => { if (draft.slots.some(slot => slot.position > Number(count))) { setError('Mova as vagas antes de reduzir a grade.'); return; } change({ position_count: Number(count) }); }}>{label} · {count} posições</button>)}</div>
        <label className="block text-sm">Observações<textarea className={field} rows={2} value={draft.notes} onChange={event => change({ notes: event.target.value })}/></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.is_active} onChange={event => change({ is_active: event.target.checked })}/>Modelo ativo</label>
          <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => choose(duplicateEditorialTemplate(draft, () => crypto.randomUUID()), true)}>Duplicar modelo</button><button type="button" className={button} onClick={() => choose(null)}>Fechar modelo</button><button type="button" disabled={!dirty || saving} className="rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar modelo'}</button></div></div>
        <p className="text-xs text-zinc-500">{draft.revision ? `Base: versão ${draft.revision}. Salvar cria nova versão.` : 'Modelo ainda não salvo.'} Recorrências são orientações; não geram agendamento automático.</p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <label className="text-xs">Canal<select className={field} value={filter.channel || ''} onChange={event => setFilter(current => ({ ...current, channel: event.target.value }))}><option value="">Todos os canais</option>{PRIMARY_CHANNELS.map(channel => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label>
        <label className="text-xs">Pilar<select className={field} value={filter.pillar_id || ''} onChange={event => setFilter(current => ({ ...current, pillar_id: event.target.value }))}><option value="">Todos os pilares</option>{pillars.map(pillar => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
        <label className="text-xs">Série<select className={field} value={filter.series_id || ''} onChange={event => setFilter(current => ({ ...current, series_id: event.target.value }))}><option value="">Todas as séries</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs">Formato<select className={field} value={filter.format || ''} onChange={event => setFilter(current => ({ ...current, format: event.target.value }))}><option value="">Todos os formatos</option>{Object.entries(FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs">Funil<select className={field} value={filter.funnel || ''} onChange={event => setFilter(current => ({ ...current, funnel: event.target.value }))}><option value="">Todas as classificações</option>{Array.from(new Set(draft.slots.map(slot => slot.funnel).filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" checked={Boolean(filter.includeArchived)} onChange={event => setFilter(current => ({ ...current, includeArchived: event.target.checked }))}/>Mostrar vagas arquivadas</label>
      </div>
      <div aria-label="Resumo do modelo filtrado" className="rounded-xl border bg-white p-5 space-y-4"><div className="flex flex-wrap gap-6 text-sm"><p><strong>{summary.activeSlots}</strong> {summary.activeSlots === 1 ? 'vaga ativa' : 'vagas ativas'}</p><p><strong>{summary.plannedUnits}</strong> {summary.plannedUnits === 1 ? 'peça prevista' : 'peças previstas'}</p><p><strong>{summary.plannedDestinations}</strong> {summary.plannedDestinations === 1 ? 'destino previsto' : 'destinos previstos'}</p></div><p className="text-xs text-zinc-500">Resumo do rascunho filtrado. Peças previstas = soma das quantidades de vagas ativas, inclusive opcionais. Não representa Contents produzidos. Destinos = quantidade × destinos de cada vaga.</p>
        {Object.entries(summary.byPillar).map(([id, quantity]) => <div key={id} className="grid grid-cols-[1fr_auto] gap-x-3 text-xs"><span>{id === 'undefined' ? 'Sem pilar' : pillars.find(pillar => pillar.id === id)?.name || 'Pilar histórico'}</span><span>{quantity} · {Math.round(quantity / summary.plannedUnits * 100)}%</span><meter className="col-span-2 w-full" aria-label={`Distribuição ${id === 'undefined' ? 'sem pilar' : pillars.find(pillar => pillar.id === id)?.name || 'pilar histórico'}`} min={0} max={summary.plannedUnits} value={quantity}/></div>)}</div>
      {editingSlot && <EditorialSlotEditor slot={editingSlot} positionCount={draft.position_count} pillars={pillars} series={series} campaigns={campaigns} onChange={input => patchSlot(editingSlot.id, input)} onClose={() => setSlotId(null)}/>}
      <div className={`grid gap-4 ${draft.position_count > 14 ? 'md:grid-cols-2 xl:grid-cols-4' : draft.position_count > 7 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>{Array.from({ length: Math.ceil(draft.position_count / 7) }, (_, week) => <section key={week} className="min-w-0 rounded-xl border bg-white p-3 space-y-3" aria-label={`Semana ${week + 1}`}><h3 className="font-semibold">Semana {week + 1}</h3>{Array.from({ length: Math.min(7, draft.position_count - week * 7) }, (_, day) => { const position = week * 7 + day + 1; const slots = visible.filter(slot => slot.position === position); return <div key={position} className="rounded-lg bg-zinc-50 p-3 space-y-2"><h4 className="text-xs font-medium">Posição {position}</h4>{!slots.length && <p className="text-xs text-zinc-400">{draft.slots.some(slot => slot.position === position) ? 'Sem vagas neste filtro' : 'Sem atividade planejada'}</p>}{slots.map((slot, index) => <article key={slot.id} className={`rounded-lg border bg-white p-3 space-y-2 ${slot.is_active ? '' : 'opacity-60'}`}><button type="button" className="w-full break-words text-left text-sm font-medium" onClick={() => setSlotId(slot.id)}>{slot.title || 'Vaga sem título'}</button><p className="text-xs text-zinc-500 break-words">{slot.format ? FORMAT_LABELS[slot.format] : 'Formato livre'} · {slot.priority === 'main' ? 'Principal' : slot.priority === 'additional' ? 'Adicional' : 'Opcional'} · {slot.quantity} peça(s){slot.is_active ? '' : ' · Arquivada'}</p><div className="flex flex-wrap gap-2 text-xs [&>button]:min-h-11 [&>button]:px-2"><button type="button" aria-label={`Editar ${slot.title || 'vaga'} na posição ${position}`} onClick={() => setSlotId(slot.id)}>Editar</button><button type="button" disabled={index === 0} aria-label={`Subir ${slot.title || 'vaga'} na posição ${position}`} onClick={() => change({ slots: moveEditorialSlot(draft.slots, slot.id, position, slots[index - 1]?.id) })}>↑ Subir</button><button type="button" onClick={() => { const copy = { ...slot, id: crypto.randomUUID(), destinations: slot.destinations.map(item => ({ ...item })) }; change({ slots: [...draft.slots, copy] }); setSlotId(copy.id); }}>Duplicar</button><button type="button" onClick={() => patchSlot(slot.id, { is_active: !slot.is_active })}>{slot.is_active ? 'Arquivar' : 'Reativar'}</button></div></article>)}<button type="button" disabled={draft.slots.length >= 1000} className="min-h-11 px-2 text-xs underline" aria-label={`Adicionar vaga: ${editorialPositionLabel(position)}`} onClick={() => { const slot = newEditorialSlot(position, crypto.randomUUID()); change({ slots: [...draft.slots, slot] }); setSlotId(slot.id); }}>+ Vaga nesta posição</button></div>; })}</section>)}</div>
      <div className="rounded-xl border bg-white p-5 space-y-3"><button type="button" disabled={!draft.revision || historyLoading || dirty} className="text-sm underline" onClick={() => void showHistory()}>{historyLoading ? 'Consultando…' : 'Consultar versões salvas do modelo'}</button>{dirty && <p className="text-xs text-zinc-500">Salve ou reabra o modelo para consultar versões sem confundir o rascunho com o histórico.</p>}{history?.map(item => <details key={item.revision} className="rounded-lg border p-3"><summary className="text-sm cursor-pointer">Versão {item.revision} · {new Date(item.changed_at).toLocaleString('pt-BR')}</summary><p className="mt-2 text-sm">{item.snapshot.name} · {item.snapshot.position_count} posições · {item.snapshot.is_active ? 'Ativo' : 'Arquivado'}</p>{item.snapshot.slots.map(slot => <p key={slot.id} className="mt-2 text-xs">{editorialPositionLabel(slot.position)} · {slot.title || 'Sem título'} · {slot.quantity} peça(s) · {slot.is_active ? 'Ativa' : 'Arquivada'}</p>)}</details>)}</div>
    </fieldset>}
  </section>;
}
