import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ memberships = [{ workspace_id: 'own-workspace' }], user = { id: 'fictional-user' }, insertError = null, membershipError = null } = {}) {
  const calls = [];
  const supabase = {
    auth: { async getUser() { return { data: { user }, error: null }; } },
    from(table) {
      const call = { table, filters: [] }; calls.push(call);
      return {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        in(column, values) { call.filters.push([column, [...values]]); return this; },
        insert(payload) { call.payload = payload; return this; },
        single() { return this; },
        then(resolve, reject) {
          return Promise.resolve(table === 'workspace_members'
            ? { data: memberships, error: membershipError }
            : { data: insertError ? null : { id: 'created-client', ...call.payload }, error: insertError }).then(resolve, reject);
        },
      };
    },
  };
  const context = createContext({ crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' }, console });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/clientsService.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(() => new SyntheticModule(['supabase'], function () { this.setExport('supabase', supabase); }, { context }));
  await module.evaluate();
  return { create: module.namespace.createManualClient, calls };
}

test('manual creation uses own active admin workspace and no commercial entities', async () => {
  const { create, calls } = await load();
  const result = await create({ name: ' Agência fictícia ', phone: ' 123 ', email: '', workspace_id: 'foreign', origin_contract_id: 'fake-contract' });
  assert.equal(result.name, 'Agência fictícia');
  assert.equal(result.commercial_name, 'Agência fictícia');
  assert.equal(result.workspace_id, 'own-workspace');
  assert.equal(result.status, 'onboarding');
  assert.equal(result.phone, '123');
  assert.equal(result.email, null);
  assert.match(result.slug, /^agencia-ficticia-11111111/);
  assert.deepEqual(calls.map(call => call.table), ['workspace_members', 'clients']);
  assert.deepEqual(calls[0].filters, [['user_id', 'fictional-user'], ['status', 'active'], ['role', ['owner', 'admin']], ['workspace.status', 'active']]);
  assert.equal('origin_contract_id' in calls[1].payload, false);
  assert.equal('origin_opportunity_id' in calls[1].payload, false);
  assert.equal('monthly_amount' in calls[1].payload, false);
});

test('empty name causes no database request', async () => {
  const { create, calls } = await load();
  await assert.rejects(create({ name: '  ' }), /nome/);
  assert.equal(calls.length, 0);
});

test('missing identity causes no database request', async () => {
  const { create, calls } = await load({ user: null });
  await assert.rejects(create({ name: 'Teste' }), /conta/);
  assert.equal(calls.length, 0);
});

for (const memberships of [[], [{ workspace_id: 'one' }, { workspace_id: 'two' }]]) {
  test(`ambiguous or absent admin workspace never inserts (${memberships.length})`, async () => {
    const { create, calls } = await load({ memberships });
    await assert.rejects(create({ name: 'Teste' }), /agência/);
    assert.equal(calls.length, 1);
  });
}

test('failed membership lookup cannot proceed to insert', async () => {
  const { create, calls } = await load({ membershipError: { message: 'denied' } });
  await assert.rejects(create({ name: 'Teste' }), /confirmar/);
  assert.equal(calls.length, 1);
});

test('denied insert reports failure and is never retried', async () => {
  const { create, calls } = await load({ insertError: { code: '42501' } });
  await assert.rejects(create({ name: 'Teste' }), /permissão/);
  assert.equal(calls.length, 2);
});

test('commercial name is independent of the legal name', async () => {
  const { create } = await load();
  const client = await create({ name: 'Nome legal', commercial_name: 'Marca fictícia' });
  assert.equal(client.name, 'Nome legal');
  assert.equal(client.commercial_name, 'Marca fictícia');
});
