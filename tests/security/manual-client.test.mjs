import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ memberships = [{ workspace_id: 'own-workspace' }], user = { id: 'fictional-user' }, insertError = null, membershipError = null, origin = null } = {}) {
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
        update(payload) { call.payload = payload; call.updating = true; return this; },
        is(column, value) { call.filters.push([column, value]); return this; },
        single() { return this; },
        then(resolve, reject) {
          return Promise.resolve(table === 'workspace_members'
            ? { data: memberships, error: membershipError }
            : call.updating && origin && call.filters.some(([column]) => column === origin)
              ? { data: null, error: { code: 'PGRST116' } }
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
  return { create: module.namespace.createManualClient, update: module.namespace.updateClient, parse: module.namespace.parseOptionalClientAmount, calls };
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

test('optional monetary text preserves zero/null and accepts Brazilian decimals', async () => {
  const { parse } = await load();
  assert.equal(parse(''), null);
  assert.equal(parse('0'), 0);
  assert.equal(parse('1600,50'), 1600.5);
  assert.equal(parse('1600.50'), 1600.5);
  for (const value of ['-1', 'NaN', 'Infinity', '1.600,00', '1,234', '1e3', '9999999999999999999']) {
    assert.throws(() => parse(value));
  }
});

test('manual creation persists optional commercial amounts without origin records', async () => {
  const { create, calls } = await load();
  const client = await create({ name: 'Fictício', monthly_amount: 1600.5, one_time_amount: 0 });
  assert.equal(client.monthly_amount, 1600.5);
  assert.equal(client.one_time_amount, 0);
  assert.equal(calls.length, 2);
  assert.equal('origin_contract_id' in calls[1].payload, false);
});

test('invalid financial input cannot start creation or update', async () => {
  const { create, update, calls } = await load();
  for (const value of [-1, NaN, Infinity, 1.234, '100']) {
    await assert.rejects(create({ name: 'Teste', monthly_amount: value }), /inválido/);
    await assert.rejects(update('client', { one_time_amount: value }), /inválido/);
  }
  assert.equal(calls.length, 0);
});

test('financial update scopes a single request to both null origins and allows clearing', async () => {
  const { update, calls } = await load();
  const result = await update('manual-client', { name: 'Nome editado', monthly_amount: 2000, one_time_amount: null });
  assert.deepEqual(calls[0].filters, [['id', 'manual-client'], ['origin_contract_id', null], ['origin_opportunity_id', null]]);
  assert.equal(calls.length, 1);
  assert.equal(result.monthly_amount, 2000);
  assert.equal(result.one_time_amount, null);
});

for (const origin of ['origin_contract_id', 'origin_opportunity_id']) {
  test(`origin present at write time rejects the whole update (${origin})`, async () => {
    const { update, calls } = await load({ origin });
    await assert.rejects(update('converted-client', { name: 'Do not persist', monthly_amount: 100 }), /somente leitura/);
    assert.equal(calls.length, 1);
  });
}

test('basic edits do not carry financial fields or origin restrictions', async () => {
  const { update, calls } = await load({ origin: 'origin_contract_id' });
  await update('converted-client', { name: 'Basic edit' });
  assert.deepEqual(calls[0].filters, [['id', 'converted-client']]);
  assert.equal('monthly_amount' in calls[0].payload, false);
});
