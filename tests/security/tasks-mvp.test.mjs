import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ membershipIds = ['workspace-a'], user = { id: 'user-a' }, resultError = null, resultMissing = false } = {}) {
  const calls = [];
  const supabase = {
    auth: { async getUser() { calls.push({ kind: 'identity' }); return { data: { user }, error: null }; } },
    from(table) {
      const call = { table, filters: [] }; calls.push(call);
      return {
        select(columns) { call.columns = columns; return this; },
        eq(column,value) { call.filters.push([column,value]); return this; },
        in(column,value) { call.filters.push([column,value]); return this; },
        order() { return this; }, single() { call.single = true; return this; },
        insert(payload) { call.insert = payload; return this; },
        update(payload) { call.update = payload; return this; },
        then(resolve,reject) { return Promise.resolve(table === 'workspace_members'
          ? { data: membershipIds.map(workspace_id => ({ workspace_id })), error: null }
          : { data: resultMissing ? null : call.single ? { id: 'task-a', ...(call.insert || call.update) } : [], error: resultError }).then(resolve,reject); },
      };
    },
  };
  const context = createContext({ console });
  const modules = new Map();
  async function real(relative) {
    if (modules.has(relative)) return modules.get(relative);
    const code = stripTypeScriptTypes(readFileSync(new URL(relative, import.meta.url),'utf8'),{mode:'transform'});
    const module = new SourceTextModule(code,{context}); modules.set(relative,module);
    await module.link(specifier => {
      if (specifier.includes('lib/supabase')) return new SyntheticModule(['supabase'],function(){this.setExport('supabase',supabase);},{context});
      if (specifier.includes('civilDate')) return real('../../src/utils/civilDate.ts');
      if (specifier.includes('types/tasks')) return real('../../src/types/tasks.ts');
      throw new Error('Unexpected import: '+specifier);
    });
    return module;
  }
  const module = await real('../../src/services/tasksService.ts'); await module.evaluate();
  return { service: module.namespace, calls };
}
const input = { title: ' Tarefa fictícia ', status:'todo', priority:'medium', due_date:'2026-10-20', client_id:'00000000-0000-0000-0000-000000000021' };

test('invalid input cannot start identity or database requests', async () => {
  const {service,calls}=await load();
  for (const patch of [{title:' '},{title:'a'.repeat(201)},{status:'invalid'},{priority:'toString'},{due_date:'2026-02-30'},{due_date:'2026-1-01'},{client_id:'invalid'}]) await assert.rejects(service.createTask({...input,...patch}));
  assert.equal(calls.length,0);
});
test('creation supplies workspace and authenticated author without unrelated links', async () => {
  const {service,calls}=await load(); await service.createTask({...input,workspace_id:'foreign',created_by:'foreign',content_id:'foreign'});
  const payload=calls.at(-1).insert;
  assert.equal(payload.workspace_id,'workspace-a'); assert.equal(payload.created_by,'user-a'); assert.equal(payload.assigned_to,'user-a'); assert.equal(payload.title,'Tarefa fictícia'); assert.equal(payload.content_id,undefined);
});
test('missing identity and ambiguous workspaces cannot create tasks', async () => {
  for (const options of [{user:null},{membershipIds:[]},{membershipIds:['a','b']}]) {
    const {service,calls}=await load(options); await assert.rejects(service.createTask(input)); assert.equal(calls.filter(call=>call.table==='tasks').length,0);
  }
});
test('update is scoped by ID and workspace and strips forbidden attributes', async () => {
  const {service,calls}=await load(); await service.updateTask('task-a',{status:'done',workspace_id:'foreign',created_by:'foreign'});
  const operation=calls.at(-1);
  assert.equal(JSON.stringify(operation.filters),JSON.stringify([['id','task-a'],['workspace_id','workspace-a']]));
  assert.equal(JSON.stringify(operation.update),JSON.stringify({status:'done'}));
});
test('zero rows and errors cannot report successful update or retry writes', async () => {
  for(const options of [{resultMissing:true},{resultError:{code:'42501'}}]) {
    const {service,calls}=await load(options); await assert.rejects(service.updateTask('task-a',{status:'done'})); assert.equal(calls.filter(call=>call.update).length,1);
  }
});
test('task and minimal client selectors share the same workspace', async () => {
  const {service,calls}=await load(); await service.fetchTasksData();
  for(const table of ['tasks','clients']) assert.ok(calls.find(call=>call.table===table).filters.some(([column,value])=>column==='workspace_id'&&value==='workspace-a'));
  assert.equal(calls.find(call=>call.table==='clients').columns,'id,name,commercial_name');
});
test('client profile filters tasks on the server without removing workspace scope', async () => {
  const {service,calls}=await load(); await service.fetchTasksData(input.client_id);
  const filters=calls.find(call=>call.table==='tasks').filters;
  assert.ok(filters.some(([column,value])=>column==='workspace_id'&&value==='workspace-a'));
  assert.ok(filters.some(([column,value])=>column==='client_id'&&value===input.client_id));
});
test('internal tasks and empty descriptions preserve explicit nulls', async () => {
  const {service}=await load(); const result=await service.createTask({...input,client_id:null,due_date:null,description:' '});
  assert.equal(result.client_id,null); assert.equal(result.due_date,null); assert.equal(result.description,null);
});
test('missing ID and empty update cannot trigger requests', async () => {
  const {service,calls}=await load(); await assert.rejects(service.updateTask('',{status:'done'})); await assert.rejects(service.updateTask('task-a',{})); assert.equal(calls.length,0);
});
