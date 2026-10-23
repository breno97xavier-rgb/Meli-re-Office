import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const id = value => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`;
async function load() {
  const calls = []; let response = { data: [], error: null };
  const chain = new Proxy({}, { get(_target, key) {
    if (key === 'then') return (resolvePromise, reject) => Promise.resolve(response).then(resolvePromise, reject);
    return (...args) => { calls.push([key, ...args]); return chain; };
  } });
  const supabase = { from(...args) { calls.push(['from', ...args]); return chain; }, rpc(...args) { calls.push(['rpc', ...args]); return Promise.resolve(response); } };
  const context = createContext({ console }); const cache = new Map();
  async function moduleAt(path) {
    if (cache.has(path)) return cache.get(path);
    let module;
    if (path.endsWith('/lib/supabase.ts')) module = new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }, { context });
    else module = new SourceTextModule(stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'transform' }), { context, identifier: path });
    cache.set(path, module);
    await module.link((name, referring) => moduleAt(resolve(dirname(referring.identifier), `${name}.ts`).replaceAll('\\', '/')));
    return module;
  }
  const utils = await moduleAt(`${root}/src/utils/editorialTemplates.ts`.replaceAll('\\', '/'));
  const service = await moduleAt(`${root}/src/services/editorialTemplateService.ts`.replaceAll('\\', '/'));
  await utils.evaluate(); await service.evaluate();
  return { utils: utils.namespace, service: service.namespace, calls, respond(value) { response = value; } };
}
const h = await load();
const draft = () => ({ id: id(1), client_id: id(2), name: 'Quinzenal', notes: '', position_count: 14, revision: 0, is_active: true, slots: [] });
const slot = (value = 3, position = 2) => h.utils.newEditorialSlot(position, id(value));

test('relative templates allow empty positions and multiple optional slots without civil dates', () => {
  const model = draft(); model.slots = [slot(), { ...slot(4), priority: 'optional', funnel: 'institucional' }];
  assert.doesNotThrow(() => h.utils.validateEditorialTemplate(model));
  for (const size of [1, 7, 14, 28, 33, 366]) assert.doesNotThrow(() => h.utils.validateEditorialTemplate({ ...model, slots: [], position_count: size }));
  assert.equal(h.utils.editorialPositionLabel(8), 'Semana 2 · posição 8');
  assert.equal(h.utils.editorialPositionLabel(28), 'Semana 4 · posição 28');
});

test('reducing positions cannot silently lose even archived slots', () => {
  assert.throws(() => h.utils.validateEditorialTemplate({ ...draft(), position_count: 7, slots: [{ ...slot(3, 14), is_active: false }] }), /fora das posições/);
});

test('duplicate template has new identities and independent destination objects', () => {
  const model = { ...draft(), revision: 9, slots: [{ ...slot(), destinations: [{ channel: 'instagram', profile: '@cafe' }] }] };
  let next = 20; const copy = h.utils.duplicateEditorialTemplate(model, () => id(next++));
  assert.equal(copy.revision, 0); assert.notEqual(copy.id, model.id); assert.notEqual(copy.slots[0].id, model.slots[0].id);
  copy.slots[0].destinations[0].profile = '@outro';
  assert.equal(model.slots[0].destinations[0].profile, '@cafe'); assert.equal(model.revision, 9);
});

test('move/reorder preserves identities and source array across positions', () => {
  const source = [slot(3, 1), slot(4, 1), slot(5, 2)];
  const moved = h.utils.moveEditorialSlot(source, id(5), 1, id(4));
  assert.deepEqual(Array.from(moved, item => item.id), [id(3), id(5), id(4)]);
  assert.equal(moved[1].position, 1); assert.equal(source[2].position, 2);
});

test('quantities distinguish planned pieces and destinations, excluding archived slots', () => {
  const entries = [{ ...slot(), quantity: 2, pillar_id: id(7), destinations: [{ channel: 'instagram', profile: '@a' }, { channel: 'instagram', profile: '@b' }] }, { ...slot(4), quantity: 3 }, { ...slot(5), quantity: 100, is_active: false }];
  const summary = h.utils.editorialTemplateSummary(entries);
  assert.equal(summary.activeSlots, 2); assert.equal(summary.plannedUnits, 5); assert.equal(summary.plannedDestinations, 4);
  assert.equal(summary.byPillar[id(7)], 2); assert.equal(summary.byPillar.undefined, 3);
  assert.equal(h.utils.editorialTemplateSummary([]).plannedUnits, 0);
});

test('free classifications cannot collide with JavaScript prototype properties', () => {
  const summary = h.utils.editorialTemplateSummary([{ ...slot(), funnel: '__proto__' }, { ...slot(4), funnel: 'constructor' }]);
  assert.equal(summary.byFunnel.__proto__, 1); assert.equal(summary.byFunnel.constructor, 1);
});

test('all filters intersect and never mutate the saved model', () => {
  const entries = [{ ...slot(), format: 'reels', funnel: 'meio', pillar_id: id(9), series_id: id(10), destinations: [{ channel: 'instagram', profile: '' }] }, { ...slot(4), format: 'story' }];
  assert.equal(h.utils.filterEditorialSlots(entries, { channel: 'instagram', format: 'reels', funnel: 'meio', pillar_id: id(9), series_id: id(10) }).length, 1);
  assert.equal(h.utils.filterEditorialSlots(entries, { channel: 'tiktok' }).length, 0);
  assert.equal(entries.length, 2);
});

test('invalid identity, bounds, quantities, format and duplicate destinations are rejected', () => {
  for (const patch of [{ position_count: 0 }, { position_count: 14.5 }, { revision: -1 }, { slots: [{ ...slot(), quantity: 0 }] }, { slots: [{ ...slot(), format: 'static_post' }] }, { slots: [slot(), slot()] }, { slots: [{ ...slot(), destinations: [{ channel: 'instagram', profile: ' @A ' }, { channel: 'instagram', profile: '@a' }] }] }]) {
    assert.throws(() => h.utils.validateEditorialTemplate({ ...draft(), ...patch }));
  }
});

test('archiving does not remove slots or change their stable identity', () => {
  const archived = { ...draft(), is_active: false, slots: [{ ...slot(), is_active: false }] };
  assert.doesNotThrow(() => h.utils.validateEditorialTemplate(archived));
  assert.equal(h.utils.filterEditorialSlots(archived.slots, {}).length, 0);
  assert.equal(h.utils.filterEditorialSlots(archived.slots, { includeArchived: true })[0].id, id(3));
});

test('template service filters list and history by client on the server', async () => {
  h.calls.length = 0; h.respond({ data: [], error: null });
  await h.service.getEditorialTemplates(id(2)); await h.service.getEditorialTemplateRevisions(id(2), id(1));
  assert.equal(h.calls.filter(call => call[0] === 'eq' && call[1] === 'client_id' && call[2] === id(2)).length, 2);
  assert.ok(h.calls.some(call => call[0] === 'eq' && call[1] === 'template_id' && call[2] === id(1)));
});

test('invalid or cross-client saves cannot issue any database request', async () => {
  h.calls.length = 0;
  await assert.rejects(h.service.saveEditorialTemplate(id(99), draft()), /outro cliente/);
  await assert.rejects(h.service.saveEditorialTemplate(id(2), { ...draft(), slots: [{ ...slot(), quantity: -1 }] }));
  assert.equal(h.calls.length, 0);
});

test('save sends expected revision and conflict never becomes successful fallback', async () => {
  h.calls.length = 0; const model = { ...draft(), revision: 4 };
  h.respond({ data: null, error: { message: 'revision_conflict' } });
  await assert.rejects(h.service.saveEditorialTemplate(id(2), model), /outra sessão/);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0][0], 'rpc');
  assert.equal(h.calls[0][2].p_expected_revision, 4); assert.equal(h.calls[0][2].p_client_id, id(2));
  assert.equal(model.revision, 4);
});
