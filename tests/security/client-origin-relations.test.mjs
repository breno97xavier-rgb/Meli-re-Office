import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

const migration = readFileSync(new URL('../../supabase/migrations/20260926230000_root_entities_tenant_integrity.sql', import.meta.url), 'utf8');
const foreignKeys = new Set([...migration.matchAll(/ADD CONSTRAINT (\w+)\s+FOREIGN KEY/g)].map(match => match[1]));

async function loadService(responses) {
  const calls = [];
  const supabase = { from(table) {
    const call = { table };
    calls.push(call);
    const query = {
      select(columns) {
        call.columns = columns;
        // Model PostgREST's relationship lookup against the applied migration.
        const hints = [...columns.matchAll(/(?:contracts|opportunities)!(\w+)/g)].map(match => match[1]);
        call.invalidRelation = hints.some(hint => !foreignKeys.has(hint));
        return this;
      },
      update(payload) { call.payload = payload; return this; },
      eq(column, value) { call.filter = { column, value }; return this; },
      order() { return this; },
      single() { return this; },
      maybeSingle() { return this; },
      then(resolve, reject) {
        const result = call.invalidRelation
          ? { data: null, error: { message: 'PGRST200: relationship not found' } }
          : responses.shift();
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  } };
  const context = createContext({ console: { warn() {}, error() {} } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/clientsService.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const service = new SourceTextModule(code, { context });
  await service.link(() => new SyntheticModule(['supabase', 'Client', 'UpdateClientInput'], function () {
    this.setExport('supabase', supabase);
    this.setExport('Client', undefined);
    this.setExport('UpdateClientInput', undefined);
  }, { context }));
  await service.evaluate();
  return { service: service.namespace, calls };
}

const client = { id: 'fictional-client', name: 'Cliente fictício', origin_contract: [{ id: 'fictional-contract' }], origin_opportunity: [{ id: 'fictional-opportunity' }] };

for (const method of ['fetchClients', 'fetchClientById', 'updateClient']) {
  test(`${method}: current composite relationships return origins without fallback`, async () => {
    const { service, calls } = await loadService([{ data: method === 'fetchClients' ? [client] : client, error: null }]);
    const result = await service[method]('fictional-client', { name: ' Cliente fictício ' });
    const row = method === 'fetchClients' ? result[0] : result;
    assert.equal(row.origin_contract.id, 'fictional-contract');
    assert.equal(row.origin_opportunity.id, 'fictional-opportunity');
    assert.equal(calls.length, 1, 'must not hide a missing relationship through fallback');
    assert.equal(calls[0].invalidRelation, false);
    assert.match(calls[0].columns, /contracts!fk_clients_origin_contract_opportunity/);
    assert.match(calls[0].columns, /opportunities!fk_clients_workspace_origin_opportunity/);
    if (method === 'updateClient') {
      assert.equal(calls[0].payload.name, 'Cliente fictício');
      assert.deepEqual(calls[0].filter, { column: 'id', value: 'fictional-client' });
      assert.equal('workspace_id' in calls[0].payload, false);
      assert.equal('origin_contract_id' in calls[0].payload, false);
    }
  });
}

test('clients without a commercial origin remain valid', async () => {
  const { service } = await loadService([{ data: { id: 'manual-client', origin_contract: null, origin_opportunity: [] }, error: null }]);
  const result = await service.fetchClientById('manual-client');
  assert.equal(result.origin_contract, null);
  assert.equal(result.origin_opportunity, null);
});

test('update errors are reported without retrying a write', async () => {
  const { service, calls } = await loadService([{ data: null, error: { message: 'permission denied' } }]);
  await assert.rejects(service.updateClient('fictional-client', { name: 'Teste' }), /permission denied/);
  assert.equal(calls.length, 1);
});
