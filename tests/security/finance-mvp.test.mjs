import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ user={id:'fictional-user'}, workspaces=['workspace-a'], rows=[], queryError=null, missing=false, failPage=null }={}) {
 const calls=[];
 const supabase={auth:{async getUser(){calls.push({identity:true});return{data:{user},error:null};}},from(table){
  const call={table,filters:[]};calls.push(call);
  return {select(columns){call.columns=columns;return this;},eq(column,value){call.filters.push([column,value]);return this;},in(column,value){call.filters.push([column,value]);return this;},order(){return this;},range(start,end){call.range=[start,end];return this;},limit(value){call.limit=value;return this;},single(){call.single=true;return this;},insert(payload){call.insert=payload;return this;},update(payload){call.update=payload;return this;},then(resolve,reject){let result;
   if(table==='workspace_members') result={data:workspaces.map(workspace_id=>({workspace_id})),error:null};
   else if(call.single) result={data:missing?null:{id:'entry-a',...(call.insert||call.update),updated_at:'new-version'},error:queryError};
   else result={data:table==='finance_entries'?rows.slice(call.range[0],call.range[1]+1):[],error:call.range?.[0]===failPage?{message:'page failed'}:queryError};
   return Promise.resolve(result).then(resolve,reject);
  }};
 }};
 const context=createContext({console});const cache=new Map();
 async function real(path){if(cache.has(path))return cache.get(path);const code=stripTypeScriptTypes(readFileSync(new URL(path,import.meta.url),'utf8'),{mode:'transform'});const module=new SourceTextModule(code,{context});cache.set(path,module);await module.link(specifier=>{
  if(specifier.includes('lib/supabase'))return new SyntheticModule(['supabase'],function(){this.setExport('supabase',supabase);},{context});
  if(specifier.includes('financeContracts'))return real('../../src/services/financeContracts.ts');
  if(specifier.includes('civilDate'))return real('../../src/utils/civilDate.ts');
  throw new Error('Unexpected runtime import: '+specifier);
 });return module;}
 const service=await real('../../src/services/financeService.ts');await service.evaluate();
 const contracts=await real('../../src/services/financeContracts.ts');
 return {service:service.namespace,contracts:contracts.namespace,calls};
}
const input={title:' Receita fictícia ',description:null,category:'Serviços',entry_type:'income',amount_cents:12345,due_date:'2026-10-20',status:'pending',settlement_date:null,client_id:null};

test('amount parser accepts decimal comma, dot and explicit Brazilian thousands exactly',async()=>{
 const {contracts:c}=await load();for(const [value,cents] of [['0,01',1],['123,45',12345],['1.234,56',123456],['10.50',1050],['99999999,99',9999999999]])assert.equal(c.parseFinanceAmount(value),cents);
 for(const value of ['','-1','0','1.234','1,234','Infinity','R$ 10','100000000,00'])assert.throws(()=>c.parseFinanceAmount(value));
});
test('invalid financial fields cannot trigger identity or database requests',async()=>{
 const {service:s,calls}=await load();for(const patch of [{title:' '},{category:' '},{entry_type:'other'},{status:'other'},{amount_cents:0},{amount_cents:1.5},{amount_cents:NaN},{due_date:'2026-02-30'},{status:'settled'},{settlement_date:'2026-10-15'},{client_id:'invalid'}])await assert.rejects(s.saveFinanceEntry({...input,...patch}));assert.equal(calls.length,0);
});
test('creation derives immutable identity and workspace and ignores injected fields',async()=>{
 const {service:s,calls}=await load();await s.saveFinanceEntry({...input,workspace_id:'foreign',created_by:'foreign',id:'foreign'});const payload=calls.at(-1).insert;assert.equal(payload.workspace_id,'workspace-a');assert.equal(payload.created_by,'fictional-user');assert.equal(payload.id,undefined);assert.equal(payload.title,'Receita fictícia');
});
test('missing login or ambiguous agency prevents writing',async()=>{
 for(const options of [{user:null},{workspaces:[]},{workspaces:['a','b']}]){const {service:s,calls}=await load(options);await assert.rejects(s.saveFinanceEntry(input));assert.equal(calls.some(call=>call.insert),false);}
});
test('updates use entry ID, workspace and exact prior version in one operation',async()=>{
 const {service:s,calls}=await load();await s.saveFinanceEntry({...input,status:'settled',settlement_date:'2026-10-15'},'entry-a','old-version');const call=calls.at(-1);assert.equal(JSON.stringify(call.filters),JSON.stringify([['id','entry-a'],['workspace_id','workspace-a'],['updated_at','old-version']]));assert.equal(call.update.settlement_date,'2026-10-15');assert.equal(call.update.workspace_id,undefined);
});
test('missing prior version cannot overwrite financial records',async()=>{
 const {service:s,calls}=await load();await assert.rejects(s.saveFinanceEntry(input,'entry-a'));assert.equal(calls.length,0);
});
test('zero-row conflicts and permission errors never retry writes',async()=>{
 for(const options of [{missing:true},{queryError:{code:'42501'}}]){const {service:s,calls}=await load(options);await assert.rejects(s.saveFinanceEntry(input,'entry-a','old-version'));assert.equal(calls.filter(call=>call.update).length,1);}
});
test('read pagination includes entries beyond the API row limit and preserves workspace filter',async()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:String(i)}));const {service:s,calls}=await load({rows});const data=await s.fetchFinanceData();assert.equal(data.entries.length,1001);const pages=calls.filter(call=>call.table==='finance_entries');assert.equal(pages.length,3);for(const page of pages)assert.ok(page.filters.some(([key,value])=>key==='workspace_id'&&value==='workspace-a'));
});
test('failed later page cannot return a partial financial balance',async()=>{
 const {service:s}=await load({rows:Array.from({length:501},(_,i)=>({id:String(i)})),failPage:500});await assert.rejects(s.fetchFinanceData());
});
test('history read is scoped by entry and workspace with a fixed display limit',async()=>{
 const {service:s,calls}=await load();await s.fetchFinanceHistory('entry-a');const call=calls.at(-1);assert.equal(call.table,'finance_entry_events');assert.equal(JSON.stringify(call.filters),JSON.stringify([['workspace_id','workspace-a'],['entry_id','entry-a']]));assert.equal(call.limit,100);
});
test('monthly projection separates due dates from effective cash dates',async()=>{
 const {contracts:c}=await load();const entries=[{...input,id:'pending'},{...input,id:'paid-later',amount_cents:20000,status:'settled',settlement_date:'2026-11-01'},{...input,id:'expense',amount_cents:5000,entry_type:'expense',status:'settled',due_date:'2026-09-20',settlement_date:'2026-10-15'}];
 const october=c.summarizeFinance(entries,'2026-10');assert.equal(october.receivable,12345);assert.equal(october.received,0);assert.equal(october.paid,5000);assert.equal(october.balance,-5000);
 const november=c.summarizeFinance(entries,'2026-11');assert.equal(november.received,20000);assert.equal(november.receivable,0);
});
test('cancelled entries are excluded and cent totals have no floating-point drift',async()=>{
 const {contracts:c}=await load();const result=c.summarizeFinance([{...input,amount_cents:10},{...input,amount_cents:20},{...input,amount_cents:900,status:'cancelled'}],'2026-10');assert.equal(result.receivable,30);
});
test('unsafe accumulated totals fail explicitly',async()=>{
 const {contracts:c}=await load();assert.throws(()=>c.summarizeFinance([{...input,amount_cents:Number.MAX_SAFE_INTEGER},{...input,amount_cents:1}],'2026-10'));
});
