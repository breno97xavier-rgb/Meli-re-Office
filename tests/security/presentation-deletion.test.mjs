import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

// Load the actual service, replacing only imported infrastructure with controlled doubles.
async function loadService(result) {
  const calls = [];
  const supabase = { from(table) {
    calls.push({ table });
    return { delete() { return this; }, eq(column,id) {
      Object.assign(calls.at(-1), { column,id }); return this;
    }, select(columns) { calls.at(-1).columns=columns; return Promise.resolve(result); } };
  } };
  const context = createContext({ console: { error() {}, warn() {} } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/presentationsService.ts',import.meta.url),'utf8'), { mode:'transform' });
  const service = new SourceTextModule(code,{ context });
  await service.link(async specifier => {
    const match = code.match(new RegExp("import\\s*\\{([^}]+)\\}\\s*from\\s*['\"]"+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"['\"]"));
    const names = match[1].split(',').map(name=>name.trim()).filter(Boolean);
    return new SyntheticModule(names,function() {
      for (const name of names) this.setExport(name,name==='supabase'?supabase:undefined);
    },{ context });
  });
  await service.evaluate();
  return { service:service.namespace,calls };
}

for (const [method,table] of [['deletePresentation','presentations'],['removeContentFromPresentation','presentation_items']]) {
  test(`${method}: successful deletion is one scoped request`,async()=> {
    const { service,calls }=await loadService({ data:[{id:'synthetic-id'}],error:null });
    await service[method]('synthetic-id');
    assert.deepEqual(calls,[{table,column:'id',id:'synthetic-id',columns:'id'}]);
  });
  test(`${method}: zero rows cannot report success`,async()=> {
    const { service,calls }=await loadService({ data:[],error:null });
    await assert.rejects(service[method]('synthetic-id'),/não encontrad.*sem permissão/);
    assert.equal(calls.length,1);
  });
  test(`${method}: a database error never triggers further deletion`,async()=> {
    const { service,calls }=await loadService({ data:null,error:{message:'permission denied'} });
    await assert.rejects(service[method]('synthetic-id'));
    assert.deepEqual(calls.map(call=>call.table),[table]);
  });
}
