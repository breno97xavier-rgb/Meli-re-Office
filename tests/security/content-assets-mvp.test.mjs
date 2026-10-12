import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load(results, { uploadError = null } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { kind: 'db', table, filters: [] }; calls.push(call);
      return {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        order() { return this; }, single() { return this; },
        insert(payload) { call.insert = payload; return this; },
        update(payload) { call.update = payload; return this; },
        then(resolve, reject) {
          if (!results.length) return Promise.reject(new Error('Unexpected DB request')).then(resolve, reject);
          return Promise.resolve(results.shift()).then(resolve, reject);
        },
      };
    },
    storage: { from(bucket) { return {
      async upload(path, file, options) { calls.push({ kind: 'upload', bucket, path, file, options }); return { error: uploadError }; },
      async remove(paths) { calls.push({ kind: 'remove', bucket, paths: [...paths] }); return { error: null }; },
      async createSignedUrl(path, expiry) { calls.push({ kind: 'sign', bucket, path, expiry }); return { data: { signedUrl: 'https://example.test/private-media' }, error: null }; },
    }; } },
  };
  const context = createContext({ crypto: { randomUUID: () => 'file-uuid' }, console: { error() {}, warn() {} } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/contentAssetsService.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(async specifier => {
    const declaration = code.match(new RegExp("import\\s*\\{([^}]+)\\}\\s*from\\s*['\"]" + specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]"));
    const names = declaration[1].split(',').map(name => name.trim()).filter(Boolean);
    return new SyntheticModule(names, function () { for (const name of names) this.setExport(name, name === 'supabase' ? supabase : undefined); }, { context });
  });
  await module.evaluate();
  return { service: module.namespace, calls };
}

const ok = data => ({ data, error: null });
const file = { name: 'imagem-ficticia.png', type: 'image/png', size: 1024 };
const input = { clientId: 'client', contentId: 'content', file, assetType: 'image' };
const ownership = () => [ok({ client_id: 'client' }), ok({ workspace_id: 'workspace' })];
const target = { id: 'old', content_id: 'content', asset_type: 'image', is_current: true, display_order: 0, version: 2 };

test('upload resolves content ownership and order before private Storage, then stores metadata', async () => {
  const { service, calls } = await load([...ownership(), ok([{ is_current: true, asset_type: 'image', display_order: 2 }, { is_current: false, asset_type: 'image', display_order: 99 }]), ok({ id: 'new' })]);
  await service.uploadContentAsset(input);
  assert.deepEqual(calls.map(call => call.kind), ['db', 'db', 'db', 'upload', 'db']);
  assert.deepEqual(calls[0].filters, [['id', 'content'], ['client_id', 'client']]);
  assert.equal(calls[3].bucket, 'content-assets');
  assert.equal(calls[3].path, 'workspace/workspace/clients/client/contents/content/file-uuid.png');
  assert.equal(calls[3].options.upsert, false);
  assert.equal(calls[4].insert[0].display_order, 3);
  assert.equal(calls[4].insert[0].file_url, calls[3].path);
});

test('foreign content cannot trigger upload', async () => {
  const { service, calls } = await load([ok({ client_id: 'other-client' })]);
  await assert.rejects(service.uploadContentAsset(input), /pertence/);
  assert.equal(calls.length, 1);
});

test('failed asset listing cannot upload or silently assume order zero', async () => {
  const { service, calls } = await load([...ownership(), { data: null, error: { message: 'read denied' } }]);
  await assert.rejects(service.uploadContentAsset(input), /read denied/);
  assert.equal(calls.some(call => call.kind === 'upload'), false);
});

test('invalid order and file inputs never make requests', async () => {
  const { service, calls } = await load([]);
  for (const displayOrder of [-1, 0.5, NaN, Infinity, 2147483648]) {
    await assert.rejects(service.uploadContentAsset({ ...input, displayOrder }), /ordem/);
  }
  await assert.rejects(service.uploadContentAsset({ ...input, file: { ...file, size: 0 } }), /vazio/);
  await assert.rejects(service.uploadContentAsset({ ...input, file: { ...file, size: 50 * 1024 * 1024 + 1 } }), /50 MB/);
  await assert.rejects(service.uploadContentAsset({ ...input, assetType: 'video' }), /MP4/);
  assert.equal(calls.length, 0);
});

test('failed Storage upload cannot insert metadata', async () => {
  const { service, calls } = await load(ownership(), { uploadError: { message: 'upload denied' } });
  await assert.rejects(service.uploadContentAsset({ ...input, displayOrder: 0 }), /upload denied/);
  assert.equal(calls.filter(call => call.insert).length, 0);
});

test('metadata failure removes only the file uploaded by this operation', async () => {
  const { service, calls } = await load([...ownership(), { data: null, error: { message: 'insert failed' } }]);
  await assert.rejects(service.uploadContentAsset({ ...input, displayOrder: 0 }), /Falha ao registrar dados/);
  assert.deepEqual(calls.at(-1).paths, [calls.find(call => call.kind === 'upload').path]);
});

for (const badTarget of [{ ...target, content_id: 'other-content' }, { ...target, is_current: false }]) {
  test(`replacement rejects an unrelated or historical target (${badTarget.content_id}/${badTarget.is_current})`, async () => {
    const { service, calls } = await load([ok(badTarget)]);
    await assert.rejects(service.replaceContentAsset({ ...input, targetAssetId: 'old' }), /Arquivo atual/);
    assert.deepEqual(calls[0].filters, [['id', 'old'], ['content_id', 'content'], ['is_current', true]]);
    assert.equal(calls.length, 1);
  });
}

test('replacement checks current target and scopes the mutation to the same content', async () => {
  const { service, calls } = await load([ok(target), ...ownership(), ok({ id: 'old' }), ok({ id: 'new' })]);
  await service.replaceContentAsset({ ...input, targetAssetId: 'old' });
  const changed = calls.find(call => call.update);
  assert.deepEqual(changed.filters, [['id', 'old'], ['content_id', 'content'], ['is_current', true]]);
  assert.equal(calls.find(call => call.insert).insert[0].version, 3);
});

test('preview uses temporary signed URL from the private bucket', async () => {
  const { service, calls } = await load([]);
  assert.equal(await service.getContentAssetSignedUrl('synthetic-path'), 'https://example.test/private-media');
  assert.deepEqual(calls, [{ kind: 'sign', bucket: 'content-assets', path: 'synthetic-path', expiry: 3600 }]);
});
