import React, { useEffect, useRef, useState } from 'react';
import type { Client } from '../../types/clients';
import type { EditorialPlan } from '../../types/planning';
import type { Content, ContentFormat } from '../../types/contents';
import { FORMAT_LABELS } from '../../types/contents';
import type { EditorialTemplate, EditorialTemplateSlot } from '../../types/editorialTemplates';
import type { EditorialApplication, EditorialContentLink } from '../../types/editorialExecution';
import { getEditorialTemplates } from '../../services/editorialTemplateService';
import { applyEditorialTemplate, executionError, getEditorialApplication, getEditorialContentLinks, resolveEditorialSlotContent } from '../../services/editorialExecutionService';
import { fetchContentById, fetchContents, updateContent } from '../../services/contentsService';
import { ContentDetailDrawer } from '../contents/ContentDetailDrawer';
import { editorialPositionLabel } from '../../utils/editorialTemplates';
import { parseCivilDate } from '../../utils/civilDate';

const button = 'rounded-lg border border-[#E8E9EA] px-3 py-2 text-sm min-h-11 disabled:opacity-50';
const inputClass = 'block w-full rounded-lg border border-[#E8E9EA] p-2 text-sm min-h-11';
export const EditorialExecutionSection: React.FC<{ plan: EditorialPlan; clients: Client[]; onDirty: (value: boolean) => void }> = ({ plan, clients, onDirty }) => {
  const [application, setApplication] = useState<EditorialApplication | null>(null);
  const [templates, setTemplates] = useState<EditorialTemplate[]>([]), [links, setLinks] = useState<EditorialContentLink[]>([]);
  const [modelId, setModelId] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [selection, setSelection] = useState<{ slot: EditorialTemplateSlot; unit: number; mode: 'create' | 'link' } | null>(null);
  const [title, setTitle] = useState(''), [format, setFormat] = useState(''), [date, setDate] = useState(''), [existingId, setExistingId] = useState('');
  const [pieces, setPieces] = useState<Content[]>([]), [content, setContent] = useState<Content | null>(null);
  const alive = useRef(true), lock = useRef(false), request = useRef(0);
  const editable = plan.status === 'draft' || plan.status === 'active';
  useEffect(() => {
    alive.current = true; let cancelled = false; setLoading(true); setError('');
    Promise.all([getEditorialApplication(plan.client_id, plan.id), getEditorialTemplates(plan.client_id)])
      .then(async ([applied, models]) => {
        const savedLinks = applied ? await getEditorialContentLinks(plan.client_id, applied.id) : [];
        if (!cancelled) { setApplication(applied); setTemplates(models.filter(model => model.is_active)); setLinks(savedLinks); }
      }).catch(failure => { if (!cancelled) setError(executionError(failure)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; alive.current = false; request.current++; };
  }, [plan.id, plan.client_id, reload]);
  useEffect(() => { onDirty(Boolean(selection || content || busy)); return () => onDirty(false); }, [selection, content, busy, onDirty]);
  function present(piece: Content): Content {
    const client = clients.find(item => item.id === piece.client_id);
    return { ...piece, client: piece.client || (client ? { id: client.id, name: client.name, status: client.status, commercial_name: client.commercial_name, logo_url: client.logo_url } : null) };
  }
  async function perform(action: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (failure) { if (alive.current) setError(executionError(failure)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function start(slot: EditorialTemplateSlot, unit: number, mode: 'create' | 'link') {
    if (busy || (selection && !window.confirm('Descartar o preenchimento desta vaga?'))) return;
    setSelection({ slot, unit, mode }); setTitle(slot.title); setFormat(slot.format || ''); setDate(''); setExistingId(''); setPieces([]); setError('');
    const current = ++request.current;
    if (mode === 'link') void fetchContents(plan.client_id).then(rows => {
      if (alive.current && request.current === current) setPieces(rows.filter(row => !row.editorial_plan_id || row.editorial_plan_id === plan.id));
    }).catch(failure => { if (alive.current && request.current === current) setError(executionError(failure)); });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!selection || !application) return;
    const selected = selection;
    await perform(async () => {
      if (date && !parseCivilDate(date)) throw new Error('Informe uma data civil válida.');
      const piece = await resolveEditorialSlotContent(plan.client_id, application.id, selected.slot.id, selected.unit,
        selected.mode === 'link' ? { contentId: existingId } : { input: {
          client_id: plan.client_id, internal_title: title, format: format as ContentFormat,
          primary_channel: selected.slot.destinations[0]?.channel || null, funnel_stage: selected.slot.funnel || null,
          goal: selected.slot.objective || null, notes: selected.slot.guidance || null,
          pillar_id: selected.slot.pillar_id, campaign_id: selected.slot.campaign_id, planned_date: date || null,
        } });
      if (!alive.current) return;
      setLinks(previous => [...previous.filter(link => !(link.slot_id === selected.slot.id && link.unit_index === selected.unit)),
        { application_id: application.id, client_id: plan.client_id, slot_id: selected.slot.id, unit_index: selected.unit, content_id: piece.id }]);
      setSelection(null); setContent(present(piece));
    });
  }
  return <section aria-label="Execução da grade editorial" className="space-y-4 rounded-xl border border-[#E8E9EA] p-4">
    <h3 className="font-semibold">Grade deste ciclo</h3>
    <p className="text-sm text-[#666668]">Aplicar um modelo preserva sua versão neste ciclo. As vagas só viram peças quando você criar ou vincular um conteúdo. Posição não define data.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" className={button} disabled={busy} onClick={() => setReload(value => value + 1)}>Atualizar</button></p>}
    {loading ? <p role="status">Carregando a grade do ciclo…</p> : !application ? <div className="space-y-3">
      <label className="block text-sm">Modelo salvo<select className={inputClass} value={modelId} disabled={busy || !editable} onChange={event => setModelId(event.target.value)}><option value="">Selecione um modelo</option>{templates.map(model => <option key={model.id} value={model.id}>{model.name} · versão {model.revision}</option>)}</select></label>
      {!templates.length && <p className="text-sm">Nenhum modelo ativo. Você pode criar um na aba Grade editorial ou continuar sem grade.</p>}
      <button type="button" className={button} disabled={busy || !editable || !modelId || Boolean(error)} onClick={() => void perform(async () => {
        const model = templates.find(item => item.id === modelId); if (!model) return;
        const applied = await applyEditorialTemplate(plan.client_id, plan.id, model.id, model.revision);
        if (alive.current) { setApplication(applied); const savedLinks = await getEditorialContentLinks(plan.client_id, applied.id); if (alive.current) setLinks(savedLinks); }
      })}>Aplicar modelo a este ciclo</button>
    </div> : <>
      <p className="text-sm"><strong>{application.snapshot.name}</strong> · versão {application.template_revision} · {links.length} {links.length === 1 ? 'peça vinculada' : 'peças vinculadas'}. Metas e alocações do ciclo permanecem independentes; não são somadas às vagas.</p>
      {!editable && <p className="text-sm">Ciclo encerrado ou arquivado: os vínculos ficam disponíveis para consulta.</p>}
      {application.snapshot.slots.filter(slot => slot.is_active).map(slot => <ExecutionSlot key={slot.id} slot={slot} links={links} busy={busy || Boolean(selection)} editable={editable}
        onStart={(unit, mode) => start(slot, unit, mode)} onOpen={id => void perform(async () => { const piece = await fetchContentById(id); if (alive.current && piece.client_id === plan.client_id) setContent(present(piece)); })}/>)}
    </>}
    {selection && <form onSubmit={event => void submit(event)} className="space-y-3 rounded-xl bg-[#F7F7F8] p-4" aria-label="Preencher vaga">
      <h4 className="font-semibold">{selection.mode === 'create' ? 'Criar peça em rascunho' : 'Vincular peça existente'} · unidade {selection.unit}</h4>
      <p className="text-sm">Destinos planejados: {selection.slot.destinations.map(destination => `${destination.channel} ${destination.profile}`).join(', ') || 'não definidos'}. Nenhuma publicação será feita.</p>
      {selection.mode === 'create' ? <>
        <label className="block text-sm">Título da peça<input className={inputClass} required value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/></label>
        <label className="block text-sm">Formato<select className={inputClass} required value={format} disabled={busy} onChange={event => setFormat(event.target.value)}><option value="">Selecione</option>{Object.entries(FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm">Data planejada (opcional)<input className={inputClass} type="date" value={date} disabled={busy} onChange={event => setDate(event.target.value)}/></label>
        <p className="text-sm">Sem data, a peça fica no backlog. Após criar, o editor de Conteúdos abre para texto, arquivos e demais ajustes.</p>
      </> : <label className="block text-sm">Conteúdo do mesmo cliente<select className={inputClass} required value={existingId} disabled={busy} onChange={event => setExistingId(event.target.value)}><option value="">Selecione</option>{pieces.filter(piece => !links.some(link => link.content_id === piece.id)).map(piece => <option key={piece.id} value={piece.id}>{piece.internal_title}</option>)}</select></label>}
      <button className={button} type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Confirmar vínculo e abrir conteúdo'}</button>{' '}
      <button className={button} type="button" disabled={busy} onClick={() => { setSelection(null); request.current++; }}>Cancelar</button>
    </form>}
    <ContentDetailDrawer content={content} isOpen={Boolean(content)} onClose={() => setContent(null)} clients={clients} teamProfiles={[]} isSaving={busy} error={error || null}
      onSave={async (id, input) => { let saved: Content | null = null; await perform(async () => { saved = await updateContent(id, input); if (alive.current) setContent(present(saved)); }); if (!saved) throw new Error('Conteúdo não foi salvo.'); return saved; }}/>
  </section>;
}
const ExecutionSlot: React.FC<{ slot: EditorialTemplateSlot; links: EditorialContentLink[]; busy: boolean; editable: boolean;
  onStart: (unit: number, mode: 'create' | 'link') => void; onOpen: (id: string) => void }> = ({ slot, links, busy, editable, onStart, onOpen }) => {
  const [unit, setUnit] = useState(1); const link = links.find(item => item.slot_id === slot.id && item.unit_index === unit);
  return <article className="space-y-2 rounded-lg border border-[#E8E9EA] p-3">
    <h4 className="text-sm font-semibold">{editorialPositionLabel(slot.position)} · {slot.title || 'Vaga sem tema'}</h4>
    <p className="text-sm">{slot.priority === 'optional' ? 'Opcional' : slot.priority === 'additional' ? 'Adicional' : 'Principal'} · {slot.quantity} peças previstas · recorrência: {{every_cycle:'todo ciclo',alternate:'alternada',monthly:'mensal',manual:'manual'}[slot.recurrence]} (seleção manual neste ciclo)</p>
    <label className="block text-sm">Unidade desta vaga<select className={inputClass} value={unit} disabled={busy} onChange={event => setUnit(Number(event.target.value))}>{Array.from({ length: slot.quantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} de {slot.quantity}</option>)}</select></label>
    {link ? <button className={button} type="button" disabled={busy} onClick={() => onOpen(link.content_id)}>Abrir conteúdo vinculado</button> : <div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={busy || !editable} onClick={() => onStart(unit, 'create')}>Criar conteúdo</button><button className={button} type="button" disabled={busy || !editable} onClick={() => onStart(unit, 'link')}>Vincular existente</button></div>}
  </article>;
}
