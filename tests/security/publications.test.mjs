import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
const cid='00000000-0000-4000-8000-000000000001', id='00000000-0000-4000-8000-000000000002';
const input={content_id:cid,channel:'instagram',status:'planned',scheduled_for:null,published_at:null,post_url:null,channel_specific_copy:null};
async function load(mock) {
  const ctx=createContext({URL,Date}),cache=new Map();
  async function at(url){
    if(cache.has(url.href))return cache.get(url.href);
    const module=new SourceTextModule(stripTypeScriptTypes(readFileSync(url,'utf8'),{mode:'transform'}),{context:ctx,identifier:url.href});cache.set(url.href,module);
    await module.link(async(spec,ref)=>{
      if(spec==='../lib/supabase'){const m=new SyntheticModule(['supabase'],function(){this.setExport('supabase',mock);},{context:ctx});return m;}
      return at(new URL(spec+'.ts',ref.identifier));
    });return module;
  }
  const module=await at(new URL('../../src/services/publicationsService.ts',import.meta.url));await module.evaluate();
  return {service:module.namespace,contracts:cache.get(new URL('../../src/services/publicationContracts.ts',import.meta.url).href).namespace};
}
function setup({anonymous=false,members=['workspace-a'],writeFailure=false,pages=false}={}){
  const calls=[];
  const mock={auth:{getUser:async()=>({data:{user:anonymous?null:{id:'user-a'}},error:null})},from(table){
    const call={table,filters:[],offset:0,action:'read'};calls.push(call);
    const chain={select(value){call.select=value;return chain;},eq(key,value){call.filters.push([key,value]);return chain;},in(key,value){call.filters.push([key,value]);return chain;},order(){return chain;},range(from,to){call.offset=from;call.to=to;return chain;},single(){call.single=true;return chain;},insert(value){call.action='insert';call.payload=value;return chain;},update(value){call.action='update';call.payload=value;return chain;},then(resolve,reject){
      let data=table==='workspace_members'?members.map(workspace_id=>({workspace_id})):table==='contents'?[{id:cid,client:{workspace_id:'workspace-a'}}]:[];
      if(pages&&table!=='workspace_members')data=call.offset===0?Array.from({length:500},()=>({id:cid})):call.offset===500?[{id}]:[];
      if(call.action!=='read')data=[{id,...call.payload,updated_at:'2026-10-27T12:00:00Z'}];
      const error=writeFailure&&call.action!=='read'?{message:'conflict'}:null;
      return Promise.resolve({data:error?null:call.single?data[0]:data,error}).then(resolve,reject);
    }};return chain;
  }};
  return {calls,mock};
}
const base=setup(),{contracts}=await load(base.mock);
test('manual payload rejects unsupported channels/status and requires relevant dates',()=>{
  for(const change of[{channel:'whatsapp'},{channel:'other'},{channel:'__proto__'},{status:'sent'},{content_id:'wrong'},{status:'scheduled'},{status:'published'},{scheduled_for:'2026-02-30T10:00:00Z'}])assert.throws(()=>contracts.validatePublication({...input,...change}));
  assert.equal(contracts.validatePublication({...input,status:'scheduled',scheduled_for:'2026-10-28T09:00:00-03:00'}).scheduled_for,'2026-10-28T12:00:00.000Z');
});
test('publication URLs cannot execute scripts or carry embedded credentials',()=>{
  for(const post_url of['javascript:alert(1)','data:text/html,x','http://example.test','https://user:pass@example.test'])assert.throws(()=>contracts.validatePublication({...input,post_url}));
  assert.equal(contracts.validatePublication({...input,post_url:' https://example.test/post '} ).post_url,'https://example.test/post');
});
test('manual record does not accept injected ownership, metrics or identities',()=>{
  const result=contracts.validatePublication({...input,workspace_id:'foreign',metrics_cache:{reach:999},id:'foreign',channel_specific_copy:' texto '});
  assert.equal(result.workspace_id,undefined);assert.equal(result.metrics_cache,undefined);assert.equal(result.id,undefined);assert.equal(result.channel_specific_copy,'texto');
});
test('missing or ambiguous identity stops before distribution reads/writes',async()=>{
  for(const options of[{anonymous:true},{members:[]},{members:['a','b']}]){const s=setup(options),{service}=await load(s.mock);await assert.rejects(service.fetchPublicationData());assert.equal(s.calls.some(c=>c.table==='publications'),false);}
});
test('read lists are explicitly scoped through client workspace and fully paginated',async()=>{
  const s=setup({pages:true}),{service}=await load(s.mock),data=await service.fetchPublicationData();
  assert.equal(data.rows.length,501);assert.equal(data.pieces.length,501);
  for(const call of s.calls.filter(c=>c.table!=='workspace_members'))assert.ok(call.filters.some(([key,value])=>key.endsWith('client.workspace_id')&&value==='workspace-a'));
  assert.deepEqual(s.calls.filter(c=>c.table==='publications').map(c=>c.offset),[0,500]);
});
test('save preserves stable ID, ownership and optimistic revision without touching Content',async()=>{
  const s=setup(),{service}=await load(s.mock);await service.savePublication(id,input);
  const insert=s.calls.find(c=>c.action==='insert');assert.equal(insert.payload.id,id);assert.equal(insert.payload.content_id,cid);
  assert.equal(s.calls.some(c=>c.table==='contents'&&c.action!=='read'),false);
  const previous={id,content_id:cid,updated_at:'2026-10-27T10:00:00Z'};
  await service.savePublication(id,{...input,status:'cancelled'},previous);
  const update=s.calls.find(c=>c.action==='update');assert.ok(update.filters.some(([key,value])=>key==='updated_at'&&value===previous.updated_at));
  await assert.rejects(service.savePublication(id,{...input,content_id:id},previous));
});
test('unconfirmed mutation is an error and is never automatically retried',async()=>{
  const s=setup({writeFailure:true}),{service}=await load(s.mock);await assert.rejects(service.savePublication(id,input),/Atualize/);assert.equal(s.calls.filter(c=>c.action==='insert').length,1);
});
