import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, createContext } from 'node:vm';
const context = createContext({});
const compile = relative => new SourceTextModule(stripTypeScriptTypes(readFileSync(new URL(relative,import.meta.url),'utf8'),{mode:'transform'}),{context});
const civil = compile('../../src/utils/civilDate.ts'); await civil.link(()=>{throw new Error('Unexpected import');});
const module = compile('../../src/services/calendarTaskContracts.ts'); await module.link(()=>civil); await module.evaluate();
const project = module.namespace.projectCalendarTasks;
const base = { year:2026,month:10,clientId:'all',search:'',includeDone:false,clientNames:{a:'Cliente A',b:'Cliente B'} };
const task = (id,patch={}) => ({id,title:id,client_id:'a',due_date:'2026-10-20',status:'todo',priority:'medium',...patch});

test('civil task deadlines appear on the same day and are not cloned as contents',()=>{
 const source=task('one'); const result=project([source],base);
 assert.equal(result.byDate['2026-10-20'][0],source); assert.equal(result.byDate['2026-10-19'],undefined); assert.equal(result.monthCount,1);
});
test('archived tasks are hidden and completed tasks require explicit inclusion',()=>{
 const items=[task('open'),task('done',{status:'done'}),task('archive',{status:'archived'})];
 assert.equal(project(items,base).monthCount,1); assert.equal(project(items,{...base,includeDone:true}).monthCount,2);
});
test('client and text filters do not mix tasks from other clients',()=>{
 const items=[task('A'),task('B',{client_id:'b'}),task('internal',{client_id:null})];
 assert.equal(project(items,{...base,clientId:'a'}).monthCount,1);
 assert.equal(project(items,{...base,search:'cliente b'}).byDate['2026-10-20'][0].id,'B');
});
test('undated tasks have a separate count and never receive an invented date',()=>{
 const result=project([task('undated',{due_date:null}),task('bad',{due_date:'2026-02-30'})],base);
 assert.equal(result.undatedCount,1); assert.equal(result.monthCount,0); assert.equal(Object.keys(result.byDate).length,0);
});
test('neighbor month cards do not inflate visible month count',()=>{
 const result=project([task('sept',{due_date:'2026-09-30'}),task('oct'),task('nov',{due_date:'2026-11-01'})],base);
 assert.equal(result.monthCount,1); assert.equal(result.byDate['2026-09-30'].length,1);
});
test('changing the original deadline moves the projection without duplicate records',()=>{
 const original=task('same'); const updated={...original,due_date:'2026-10-21'};
 const result=project([updated],base); assert.equal(result.byDate['2026-10-20'],undefined); assert.equal(result.byDate['2026-10-21'][0].id,'same'); assert.equal(result.monthCount,1);
});
test('priority ordering does not mutate source order',()=>{
 const items=[task('low',{priority:'low'}),task('urgent',{priority:'urgent'})]; const result=project(items,base);
 assert.equal(result.byDate['2026-10-20'][0].id,'urgent'); assert.equal(items[0].id,'low');
});
