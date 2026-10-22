import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({error=null,result={revision:1}}={}) {
 const calls=[],context=createContext({console});
 const supabase={
  async rpc(name,args){calls.push({name,args});return {data:result,error};},
  from(table){const call={table};calls.push(call);return {select(fields){call.fields=fields;return this;},eq(key,value){call.filter={key,value};return this;},order(key,options){call.order={key,options};return this;},maybeSingle(){return this;},then(resolve,reject){return Promise.resolve({data:result,error}).then(resolve,reject);}};},
 };
 const cache=new Map();
 async function moduleAt(path){
  if(cache.has(path))return cache.get(path);
  const code=stripTypeScriptTypes(readFileSync(new URL(path,import.meta.url),'utf8'),{mode:'transform'});
  const mod=new SourceTextModule(code,{context});cache.set(path,mod);
  await mod.link(async name=>{
   if(name.includes('/lib/supabase'))return new SyntheticModule(['supabase'],function(){this.setExport('supabase',supabase);},{context});
   if(name.includes('types/contents'))return moduleAt('../../src/types/contents.ts');
   if(name.includes('utils/civilDate'))return moduleAt('../../src/utils/civilDate.ts');
   throw new Error('Unexpected import '+name);
  });return mod;
 }
 const mod=await moduleAt('../../src/services/planningFoundationService.ts');await mod.evaluate();return {api:mod.namespace,calls};
}
const question={id:'q1',block:'Negócio',label:'Objetivo?',type:'text',options:[],answer:''};
test('briefing rejects duplicate IDs and incompatible answers before requests',async()=>{
 const {api,calls}=await load();
 for(const questions of [[question,question],[{...question,type:'select',options:['A'],answer:'B'}],[{...question,type:'multiple',options:['A'],answer:['A','A']}],[{...question,label:''}],[{...question,id:10}],[{...question,type:'other'}]]) await assert.rejects(api.saveBriefing('client',0,questions,'draft'));
 assert.equal(calls.length,0);
});
test('empty optional briefing uses one RPC and expected revision',async()=>{
 const {api,calls}=await load();await api.saveBriefing('client',0,[],'draft');assert.equal(calls.length,1);assert.equal(calls[0].name,'save_client_briefing');assert.equal(calls[0].args.p_expected_revision,0);assert.equal(calls[0].args.p_questions.length,0);
});
test('revision conflict does not retry or rewrite another domain',async()=>{
 const {api,calls}=await load({error:{message:'revision_conflict'}});await assert.rejects(api.saveBriefing('client',2,[question],'draft'),/outra sessão/);assert.equal(calls.length,1);
});
test('strategy validates real civil dates, validity and channels before writing',async()=>{
 const {api,calls}=await load();for(const input of [{valid_from:'2026-02-30'},{valid_until:'2026-12-01'},{valid_from:'2026-12-01',valid_until:'2026-11-01'},{priority_channels:['made-up']}]) await assert.rejects(api.saveStrategyRevision('client',1,input));assert.equal(calls.length,0);
});
test('strategy write uses current client and expected revision without exposing arbitrary columns',async()=>{
 const {api,calls}=await load();await api.saveStrategyRevision('client',3,{positioning:'A',valid_from:'2026-10-19'});assert.equal(calls[0].name,'save_client_strategy_revision');assert.equal(calls[0].args.p_client_id,'client');assert.equal(calls[0].args.p_expected_revision,3);
});
test('series rejects foreign client and duplicate pillars before writing',async()=>{
 const {api,calls}=await load();const series={id:'series',client_id:'client',revision:0,name:'Bastidores',pillar_ids:[],channels:[],is_active:true};await assert.rejects(api.saveEditorialSeries('other',series));await assert.rejects(api.saveEditorialSeries('client',{...series,pillar_ids:['p','p']}));assert.equal(calls.length,0);
});
test('series retry keeps its stable ID and version for server conflict detection',async()=>{
 const {api,calls}=await load();const series={id:'stable-id',client_id:'client',revision:0,name:'Bastidores',pillar_ids:[],channels:[],is_active:true};await api.saveEditorialSeries('client',series);assert.equal(calls[0].args.p_series_id,'stable-id');assert.equal(calls[0].args.p_expected_revision,0);
});
test('read and history are filtered by client on the server and ordered by revision',async()=>{
 const {api,calls}=await load({result:[]});await api.getPlanningRevisions('client','briefing');assert.equal(calls[0].table,'client_briefing_revisions');assert.equal(calls[0].filter.value,'client');assert.equal(calls[0].order.key,'revision');assert.equal(calls[0].order.options.ascending,false);
});
test('missing migration is explicit and never treated as empty persisted data',async()=>{
 const {api}=await load({error:{code:'PGRST205',message:'not found'}});await assert.rejects(api.getBriefing('client'),/ainda não está disponível/);
});
test('unconfirmed mutation is not reported as success',async()=>{
 const {api}=await load({result:null});await assert.rejects(api.saveBriefing('client',0,[],'draft'),/não confirmada/);
});
