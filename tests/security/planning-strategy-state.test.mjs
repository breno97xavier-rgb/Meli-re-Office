import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule,SyntheticModule,createContext } from 'node:vm';

async function harness(){
 const slots=[],loads=[],saves=[];let cursor=0,effect,cleanup;
 const same=(a,b)=>a&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
  useRef(initial){const i=cursor++;return slots[i]||=( {current:initial});},
  useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i],deps)){slots[i]=deps;effect=fn;}},
 };
 const service={getClientStrategy(clientId){return new Promise((resolve,reject)=>loads.push({clientId,resolve,reject}));},formatPlanningError(error){return error.message;}};
 const foundation={saveStrategyRevision(clientId,revision,input){return new Promise((resolve,reject)=>saves.push({clientId,revision,input,resolve,reject}));}};
 const context=createContext({console:{error(){}}});
 const code=stripTypeScriptTypes(readFileSync(new URL('../../src/hooks/useClientStrategy.ts',import.meta.url),'utf8'),{mode:'transform'});
 const mod=new SourceTextModule(code,{context});
 await mod.link(name=>{const exports=name==='react'?react:name.includes('planningFoundationService')?foundation:name.includes('planningService')?service:{ClientStrategy:undefined,UpdateClientStrategyInput:undefined};return new SyntheticModule(Object.keys(exports),function(){for(const[key,value]of Object.entries(exports))this.setExport(key,value);},{context});});
 await mod.evaluate();
 return {loads,saves,render(clientId){cursor=0;const result=mod.namespace.useClientStrategy(clientId);if(effect){const run=effect;effect=undefined;cleanup?.();cleanup=run();}return result;},unmount(){cleanup?.();}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('strategy ignores late reads from another client',async()=>{
 const h=await harness();h.render('A');h.render('B');h.loads[1].resolve({id:'B',revision:2});await settle();h.loads[0].resolve({id:'A',revision:1});await settle();assert.equal(h.render('B').strategy.id,'B');assert.equal(h.render('B').loading,false);
});
test('late rejection cannot hide successful current strategy',async()=>{
 const h=await harness();h.render('A');h.render('B');h.loads[1].resolve({id:'B',revision:2});await settle();h.loads[0].reject(new Error('old error'));await settle();assert.equal(h.render('B').error,null);
});
test('strategy double click makes one request with current revision',async()=>{
 const h=await harness();h.render('A');h.loads[0].resolve({id:'A',revision:7});await settle();const hook=h.render('A');const first=hook.saveStrategy({positioning:'Novo'});const second=await hook.saveStrategy({positioning:'Duplicado'});assert.equal(second,null);assert.equal(h.saves.length,1);assert.equal(h.saves[0].revision,7);h.saves[0].resolve({id:'A',revision:8});await first;assert.equal(h.render('A').strategy.revision,8);assert.equal(h.render('A').saving,false);
});
test('failed save preserves prior strategy and releases submit lock',async()=>{
 const h=await harness();h.render('A');h.loads[0].resolve({id:'A',revision:1});await settle();const first=h.render('A').saveStrategy({positioning:'Novo'});h.saves[0].reject(new Error('Conflito de versão'));assert.equal(await first,null);const state=h.render('A');assert.equal(state.strategy.revision,1);assert.equal(state.saveError,'Conflito de versão');assert.equal(state.saving,false);const retry=state.saveStrategy({positioning:'Outro'});assert.equal(h.saves.length,2);h.saves[1].resolve({id:'A',revision:2});await retry;
});
test('unmount invalidates an outstanding read',async()=>{
 const h=await harness();h.render('A');h.unmount();h.loads[0].resolve({id:'old'});await settle();assert.equal(h.render('A').strategy,null);
});
