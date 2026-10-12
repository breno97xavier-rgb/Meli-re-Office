import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function load({ rows = [], error = null, signError = null } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { table }; calls.push(call);
      return { select() { return this; }, in(column, ids) { call.ids = [...ids]; return this; }, eq(column, value) { call.condition = { column, value }; return this; }, order() { return this; }, then(resolve, reject) { return Promise.resolve({ data: rows, error }).then(resolve, reject); } };
    },
    storage: { from(bucket) { return { async createSignedUrls(paths, expiry) { calls.push({ bucket, paths: [...paths], expiry }); return { data: paths.map(path => ({ path, signedUrl: 'https://example.test/' + path, error: null })), error: signError }; } }; } },
  };
  const context = createContext({});
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/services/contentMediaService.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(specifier => new SyntheticModule([specifier.includes('lib/supabase') ? 'supabase' : 'CONTENT_ASSETS_BUCKET'], function () { this.setExport(specifier.includes('lib/supabase') ? 'supabase' : 'CONTENT_ASSETS_BUCKET', specifier.includes('lib/supabase') ? supabase : 'content-assets'); }, { context }));
  await module.evaluate();
  return { fetch: module.namespace.fetchContentMedia, calls };
}

test('empty feed makes no requests', async () => {
  const { fetch, calls } = await load();
  await fetch([]);
  assert.equal(calls.length, 0);
});
test('metadata and private previews are batched with deduplicated IDs and paths', async () => {
  const { fetch, calls } = await load({ rows: [{ file_url: 'same' }, { file_url: 'same' }] });
  const result = await fetch(['content', 'content', '']);
  assert.deepEqual(calls[0].ids, ['content']);
  assert.deepEqual(calls[0].condition, { column: 'is_current', value: true });
  assert.deepEqual(calls[1], { bucket: 'content-assets', paths: ['same'], expiry: 3600 });
  assert.equal(result.urls.same, 'https://example.test/same');
});
test('missing media skips URL signing', async () => {
  const { fetch, calls } = await load();
  const result = await fetch(['content']);
  assert.equal(calls.length, 1);
  assert.equal(result.assets.length, 0);
});
test('metadata failure is distinguished from an empty feed', async () => {
  const { fetch, calls } = await load({ error: { message: 'denied' } });
  await assert.rejects(fetch(['content']), /carregar as mídias/);
  assert.equal(calls.length, 1);
});
test('failed URL signing does not turn private media into public links', async () => {
  const { fetch } = await load({ rows: [{ file_url: 'private' }], signError: { message: 'denied' } });
  await assert.rejects(fetch(['content']), /prévia/);
});
