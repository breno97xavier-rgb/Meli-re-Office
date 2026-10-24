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

  const service = await moduleAt(`${root}/src/services/editorialExecutionService.ts`.replaceAll('\\', '/'));
  await service.evaluate();
  return { service: service.namespace, calls, respond(value) { response = value; } };
}

const client=id(1),plan=id(2),model=id(3),app=id(4),slot=id(5);
test('application reads are always scoped by client and cycle',async()=>{const h=await load(); await h.service.getEditorialApplication(client,plan); assert.ok(h.calls.some(call=>call[0]==='eq'&&call[1]==='client_id'&&call[2]===client));assert.ok(h.calls.some(call=>call[0]==='eq'&&call[1]==='editorial_plan_id'&&call[2]===plan));});
test('links are scoped by application and client',async()=>{const h=await load();await h.service.getEditorialContentLinks(client,app); assert.ok(h.calls.some(call=>call[0]==='eq'&&call[1]==='application_id'&&call[2]===app));assert.ok(h.calls.some(call=>call[0]==='eq'&&call[1]==='client_id'&&call[2]===client));});
test('invalid identifiers and revision do not issue requests',async()=>{const h=await load();await assert.rejects(h.service.applyEditorialTemplate(client,plan,model,0));await assert.rejects(h.service.applyEditorialTemplate('bad',plan,model,1));assert.equal(h.calls.length,0);});
test('create strips caller cycle and starts draft while retaining custom classification',async()=>{const h=await load();h.respond({data:{id:id(9)},error:null});await h.service.resolveEditorialSlotContent(client,app,slot,1,{input:{client_id:client,editorial_plan_id:id(88),internal_title:'Tema',format:'reels',primary_channel:null,funnel_stage:'Relacionamento',editorial_status:'approved'}});const payload=h.calls[0][2];assert.equal(payload.p_input.editorial_status,'draft');assert.equal(payload.p_input.editorial_plan_id,undefined);assert.equal(payload.p_input.client_id,undefined);assert.equal(payload.p_input.primary_channel,null);assert.equal(payload.p_input.funnel_stage,'Relacionamento');assert.equal(payload.p_content_id,null);});
test('link does not send a creation payload',async()=>{const h=await load();h.respond({data:{id:id(9)},error:null});await h.service.resolveEditorialSlotContent(client,app,slot,2,{contentId:id(9)});assert.equal(h.calls[0][2].p_input,null);assert.equal(h.calls[0][2].p_content_id,id(9));});
test('foreign input and invalid unit are rejected before network',async()=>{const h=await load();await assert.rejects(h.service.resolveEditorialSlotContent(client,app,slot,0,{contentId:id(9)}));await assert.rejects(h.service.resolveEditorialSlotContent(client,app,slot,1,{input:{client_id:id(99),internal_title:'Tema',format:'reels'}}));assert.equal(h.calls.length,0);});
test('denial does not fall back to direct insert',async()=>{const h=await load();h.respond({data:null,error:{message:'permission_denied',code:'42501'}});await assert.rejects(h.service.resolveEditorialSlotContent(client,app,slot,1,{contentId:id(9)}),/permissão/);assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'rpc');});
test('missing return value never reports confirmed write',async()=>{const h=await load();h.respond({data:null,error:null});await assert.rejects(h.service.applyEditorialTemplate(client,plan,model,1),/não confirmada/);});
