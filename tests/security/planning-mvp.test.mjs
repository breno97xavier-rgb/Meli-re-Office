import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ rpcError = null } = {}) {
  const calls = [];
  const supabase = {
    auth: { async getUser() { calls.push({ kind: 'identity' }); return { data: { user: { id: 'fictional-user' } } }; } },
    async rpc(name, payload) { calls.push({ kind: 'rpc', name, payload }); return { error: rpcError }; },
    from(table) {
      const call = { kind: 'table', table }; calls.push(call);
      return {
        insert(payload) { call.payload = payload; return this; },
        update(payload) { call.payload = payload; return this; },
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filter = { column, value }; return this; },
        single() { return this; },
        then(resolve, reject) { return Promise.resolve({ data: call.payload ? { id: 'fictional-plan', ...call.payload } : [], error: null }).then(resolve, reject); },
      };
    },
  };
  const context = createContext({ console: { error() {} } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/planningService.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(async specifier => {
    const declaration = code.match(new RegExp("import\\s*\\{([^}]+)\\}\\s*from\\s*['\"]" + specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]"));
    const names = declaration[1].split(',').map(name => name.trim()).filter(Boolean);
    return new SyntheticModule(names, function () { for (const name of names) this.setExport(name, name === 'supabase' ? supabase : undefined); }, { context });
  });
  await module.evaluate();
  return { service: module.namespace, calls };
}

const validPlan = { title: ' Ciclo fictício ', start_date: '2026-11-01', end_date: '2026-11-30' };

for (const method of ['createEditorialPlan', 'updateEditorialPlan', 'setEditorialPlanPillars']) {
  test(`${method}: invalid counts never start a request`, async () => {
    const { service, calls } = await load();
    for (const value of [-1, 1.5, NaN, Infinity, 2147483648, '3', null]) {
      const task = method === 'setEditorialPlanPillars'
        ? service[method]('plan', 'client', [{ pillar_id: 'pillar', target_count: value }])
        : service[method]('fictional-id', { ...validPlan, target_posts_count: value });
      await assert.rejects(task, /inteiro/);
    }
    assert.equal(calls.length, 0);
  });
}

test('creation keeps client ownership and defaults the optional target to zero', async () => {
  const { service, calls } = await load();
  const result = await service.createEditorialPlan('fictional-client', validPlan);
  assert.equal(result.client_id, 'fictional-client');
  assert.equal(result.target_posts_count, 0);
  assert.equal(result.title, 'Ciclo fictício');
  assert.equal(result.created_by, 'fictional-user');
  assert.equal(calls.at(-1).table, 'editorial_plans');
});

test('valid integer edit is one request and zero is preserved', async () => {
  const { service, calls } = await load();
  const result = await service.updateEditorialPlan('fictional-plan', { target_posts_count: 0 });
  assert.equal(result.target_posts_count, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].filter, { column: 'id', value: 'fictional-plan' });
});

test('valid allocations use transactional RPC then read back the same plan', async () => {
  const { service, calls } = await load();
  await service.setEditorialPlanPillars('fictional-plan', 'fictional-client', [{ pillar_id: 'pillar', target_count: 4 }]);
  assert.equal(calls[0].name, 'set_editorial_plan_pillars');
  assert.equal(calls[0].payload.p_client_id, 'fictional-client');
  assert.equal(calls[0].payload.p_allocations[0].target_count, 4);
  assert.deepEqual(calls[1].filter, { column: 'editorial_plan_id', value: 'fictional-plan' });
});

test('duplicate allocation is rejected before changing anything', async () => {
  const { service, calls } = await load();
  await assert.rejects(service.setEditorialPlanPillars('plan', 'client', [{ pillar_id: 'same', target_count: 1 }, { pillar_id: 'same', target_count: 2 }]), /duplicadas/);
  assert.equal(calls.length, 0);
});

test('failed RPC does not fall back to delete/insert or report a successful read', async () => {
  const { service, calls } = await load({ rpcError: { message: 'PILLAR_CLIENT_MISMATCH' } });
  await assert.rejects(service.setEditorialPlanPillars('plan', 'client', [{ pillar_id: 'foreign', target_count: 4 }]), /cliente/);
  assert.equal(calls.length, 1);
});
