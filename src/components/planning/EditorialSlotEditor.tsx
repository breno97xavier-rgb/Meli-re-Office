import type { ClientPillar, Campaign } from '../../types/planning';
import type { EditorialSeries } from '../../types/planningFoundation';
import type { EditorialTemplateSlot } from '../../types/editorialTemplates';
import { FORMAT_LABELS, PRIMARY_CHANNELS } from '../../types/contents';

const field = 'mt-1 w-full rounded-lg border border-[#E8E9EA] bg-white p-2 text-sm';
interface Props {
  slot: EditorialTemplateSlot;
  positionCount: number;
  pillars: ClientPillar[];
  series: EditorialSeries[];
  campaigns: Campaign[];
  onChange: (input: Partial<EditorialTemplateSlot>) => void;
  onClose: () => void;
}

export function EditorialSlotEditor({ slot, positionCount, pillars, series, campaigns, onChange, onClose }: Props) {
  return <section aria-label="Editar vaga editorial" className="rounded-xl border border-[#E8E9EA] bg-white p-5 space-y-4">
    <div className="flex justify-between gap-3"><h3 className="font-semibold">Vaga editorial · posição {slot.position}</h3><button type="button" onClick={onClose} className="text-sm underline">Fechar edição da vaga</button></div>
    <p className="text-xs text-zinc-500">Defina um tema reutilizável. O título final e os materiais serão preparados em Conteúdos, na aplicação do modelo.</p>
    <label className="block text-sm">Título-tema<input className={field} value={slot.title} placeholder="Ex.: Decisão criativa de projeto" onChange={event => onChange({ title: event.target.value })}/></label>
    <label className="block text-sm">Orientação<textarea className={field} rows={3} value={slot.guidance} onChange={event => onChange({ guidance: event.target.value })}/></label>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Posição relativa<select className={field} value={slot.position} onChange={event => onChange({ position: Number(event.target.value) })}>{Array.from({ length: positionCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
      <label className="text-sm">Pilar<select className={field} value={slot.pillar_id || ''} onChange={event => onChange({ pillar_id: event.target.value || null })}><option value="">Sem pilar</option>{pillars.filter(item => item.is_active || item.id === slot.pillar_id).map(item => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ' (inativo)'}</option>)}</select></label>
      <label className="text-sm">Série<select className={field} value={slot.series_id || ''} onChange={event => onChange({ series_id: event.target.value || null })}><option value="">Sem série</option>{series.filter(item => item.is_active || item.id === slot.series_id).map(item => <option key={item.id} value={item.id}>{item.name}{item.is_active ? '' : ' (arquivada)'}</option>)}</select></label>
      <label className="text-sm">Campanha<select className={field} value={slot.campaign_id || ''} onChange={event => onChange({ campaign_id: event.target.value || null })}><option value="">Sem campanha</option>{campaigns.filter(item => item.status !== 'archived' || item.id === slot.campaign_id).map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? ' (arquivada)' : ''}</option>)}</select></label>
      <label className="text-sm">Formato<select className={field} value={slot.format || ''} onChange={event => onChange({ format: (event.target.value || null) as EditorialTemplateSlot['format'] })}><option value="">Não definido</option>{Object.entries(FORMAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm">Funil ou classificação<input list="editorial-funnel-presets" className={field} value={slot.funnel} onChange={event => onChange({ funnel: event.target.value })}/><datalist id="editorial-funnel-presets"><option value="topo"/><option value="meio"/><option value="fundo"/><option value="institucional"/></datalist></label>
      <label className="text-sm">Objetivo<input className={field} value={slot.objective} onChange={event => onChange({ objective: event.target.value })}/></label>
      <label className="text-sm">Prioridade<select className={field} value={slot.priority} onChange={event => onChange({ priority: event.target.value as EditorialTemplateSlot['priority'] })}><option value="main">Principal</option><option value="additional">Adicional</option><option value="optional">Opcional</option></select></label>
      <label className="text-sm">Recorrência<select className={field} value={slot.recurrence} onChange={event => onChange({ recurrence: event.target.value as EditorialTemplateSlot['recurrence'] })}><option value="every_cycle">Todo ciclo</option><option value="alternate">Ciclos alternados</option><option value="monthly">Mensal</option><option value="manual">Manual</option></select></label>
      <label className="text-sm">Quantidade<input type="number" min={1} max={1000} step={1} className={field} value={slot.quantity} onChange={event => onChange({ quantity: Number(event.target.value) })}/></label>
    </div>
    <fieldset className="space-y-3"><legend className="text-sm font-medium">Canais e perfis planejados (opcional)</legend>
      <p className="text-xs text-zinc-500">O perfil identifica o destino editorial; não conecta contas nem publica automaticamente.</p>
      {slot.destinations.map((destination, index) => <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm">Canal {index + 1}<select className={field} value={destination.channel} onChange={event => onChange({ destinations: slot.destinations.map((item, current) => current === index ? { ...item, channel: event.target.value as typeof item.channel } : item) })}>{PRIMARY_CHANNELS.map(channel => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label>
        <label className="text-sm">Perfil {index + 1}<input className={field} placeholder="Ex.: @perfil_do_cliente" value={destination.profile} onChange={event => onChange({ destinations: slot.destinations.map((item, current) => current === index ? { ...item, profile: event.target.value } : item) })}/></label>
        <button type="button" className="rounded-lg border p-2 text-sm" aria-label={`Remover destino ${index + 1}`} onClick={() => onChange({ destinations: slot.destinations.filter((_, current) => current !== index) })}>Remover</button>
      </div>)}
      <button type="button" disabled={slot.destinations.length >= 50} onClick={() => onChange({ destinations: [...slot.destinations, { channel: 'instagram', profile: '' }] })} className="rounded-lg border px-3 py-2 text-sm">+ Adicionar destino</button>
    </fieldset>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={slot.is_active} onChange={event => onChange({ is_active: event.target.checked })}/>Vaga ativa — desmarcar arquiva e preserva o histórico</label>
  </section>;
}
