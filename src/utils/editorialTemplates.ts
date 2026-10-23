import type { EditorialTemplateDraft, EditorialTemplateFilter, EditorialTemplateSlot } from '../types/editorialTemplates';
import { PRIMARY_CHANNELS } from '../types/contents';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const formats = ['feed_single', 'carousel', 'reels', 'story'];
const integer = (value: unknown, min: number, max: number) => Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const text = (value: unknown): value is string => typeof value === 'string';

export function validateEditorialTemplate(draft: EditorialTemplateDraft): void {
  if (!draft || !uuid.test(draft.id) || !uuid.test(draft.client_id)) throw new Error('Identificação do modelo ou cliente inválida.');
  if (!text(draft.name) || !draft.name.trim() || draft.name.trim().length > 200 || !text(draft.notes) || draft.notes.length > 20000 || typeof draft.is_active !== 'boolean') throw new Error('Use um nome de até 200 caracteres e observações de até 20.000 caracteres.');
  if (!integer(draft.revision, 0, 2147483646)) throw new Error('Versão inválida. Atualize os modelos.');
  if (!integer(draft.position_count, 1, 366)) throw new Error('Use entre 1 e 366 posições relativas.');
  if (!Array.isArray(draft.slots) || draft.slots.length > 1000) throw new Error('O modelo aceita até 1.000 vagas.');
  const ids = new Set<string>();
  for (const slot of draft.slots) {
    if (!slot || !text(slot.id) || !uuid.test(slot.id) || ids.has(slot.id.toLowerCase())) throw new Error('Cada vaga precisa de identificação única.');
    ids.add(slot.id.toLowerCase());
    if (!integer(slot.position, 1, draft.position_count)) throw new Error('Há uma vaga fora das posições do modelo. Mova-a antes de reduzir a grade.');
    if (!integer(slot.quantity, 1, 1000)) throw new Error('A quantidade de cada vaga deve ser um inteiro entre 1 e 1.000.');
    if (![slot.title, slot.guidance, slot.objective, slot.funnel].every(value => text(value) && value.length <= 10000) || typeof slot.is_active !== 'boolean') throw new Error('Use textos de até 10.000 caracteres nos campos da vaga.');
    if (![slot.pillar_id, slot.series_id, slot.campaign_id].every(id => id === null || (text(id) && uuid.test(id)))) throw new Error('Vínculo editorial inválido.');
    if (slot.format !== null && !formats.includes(slot.format)) throw new Error('Formato inválido.');
    if (!['main', 'additional', 'optional'].includes(slot.priority) || !['every_cycle', 'alternate', 'monthly', 'manual'].includes(slot.recurrence)) throw new Error('Prioridade ou recorrência inválida.');
    if (!Array.isArray(slot.destinations) || slot.destinations.length > 50) throw new Error('Use até 50 destinos por vaga.');
    const destinations = new Set<string>();
    for (const destination of slot.destinations) {
      if (!destination || !PRIMARY_CHANNELS.some(channel => channel.value === destination.channel) || !text(destination.profile) || destination.profile.length > 200) throw new Error('Destino inválido. Use perfil de até 200 caracteres.');
      const key = `${destination.channel}:${destination.profile.trim().toLowerCase()}`;
      if (destinations.has(key)) throw new Error('Há destinos repetidos na mesma vaga.');
      destinations.add(key);
    }
  }
}

export function newEditorialSlot(position: number, id: string): EditorialTemplateSlot {
  return { id, position, title: '', guidance: '', pillar_id: null, series_id: null, campaign_id: null,
    objective: '', funnel: '', format: null, priority: 'main', recurrence: 'every_cycle', quantity: 1,
    destinations: [], is_active: true };
}

export function duplicateEditorialTemplate(draft: EditorialTemplateDraft, createId: () => string): EditorialTemplateDraft {
  return { ...draft, id: createId(), name: `${draft.name} — cópia`, revision: 0, is_active: true,
    slots: draft.slots.map(slot => ({ ...slot, id: createId(), destinations: slot.destinations.map(destination => ({ ...destination })) })) };
}

export function moveEditorialSlot(slots: EditorialTemplateSlot[], id: string, position: number, beforeId?: string): EditorialTemplateSlot[] {
  const source = slots.find(slot => slot.id === id);
  if (!source) return slots;
  const rest = slots.filter(slot => slot.id !== id);
  const target = beforeId ? rest.findIndex(slot => slot.id === beforeId && slot.position === position) : -1;
  const result = [...rest];
  result.splice(target < 0 ? result.length : target, 0, { ...source, position });
  return result;
}

export function filterEditorialSlots(slots: EditorialTemplateSlot[], filter: EditorialTemplateFilter): EditorialTemplateSlot[] {
  return slots.filter(slot => (filter.includeArchived || slot.is_active)
    && (!filter.channel || slot.destinations.some(destination => destination.channel === filter.channel))
    && (!filter.pillar_id || slot.pillar_id === filter.pillar_id)
    && (!filter.series_id || slot.series_id === filter.series_id)
    && (!filter.funnel || slot.funnel === filter.funnel)
    && (!filter.format || slot.format === filter.format));
}

export function editorialTemplateSummary(slots: EditorialTemplateSlot[]) {
  const active = slots.filter(slot => slot.is_active);
  const plannedUnits = active.reduce((sum, slot) => sum + slot.quantity, 0);
  const byPillar: Record<string, number> = Object.create(null), byFormat: Record<string, number> = Object.create(null), byFunnel: Record<string, number> = Object.create(null);
  for (const slot of active) {
    for (const [distribution, key] of [[byPillar, slot.pillar_id || 'undefined'], [byFormat, slot.format || 'undefined'], [byFunnel, slot.funnel || 'undefined']] as const) {
      distribution[key] = (distribution[key] || 0) + slot.quantity;
    }
  }
  return { activeSlots: active.length, plannedUnits,
    plannedDestinations: active.reduce((sum, slot) => sum + slot.quantity * slot.destinations.length, 0),
    byPillar, byFormat, byFunnel };
}

export function editorialPositionLabel(position: number): string {
  return `Semana ${Math.ceil(position / 7)} · posição ${position}`;
}
