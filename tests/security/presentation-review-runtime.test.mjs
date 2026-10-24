import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { createReviewMediaHandler } from '../../supabase/functions/_shared/presentation-review-media-core.ts';

async function load(signFailure = false) {
  let handler; const calls = [];
  const id = '00000000-0000-0000-0000-000000000001';
  const path = `workspace/${id}/clients/${id}/contents/${id}/${id}.png`;
  const payload = { presentation: { id, client: { id } }, access: { expires_at: new Date(Date.now()+600000).toISOString() },
    items: [{ review_id: id, content_id: id, assets: [{ file_url: path }] }] };
  const admin = {
    async rpc(name, params) { calls.push({ name, params }); return { data: payload }; },
    storage: { from(bucket) { assert.equal(bucket, 'content-assets'); return {
      async createSignedUrls(paths, ttl) { calls.push({ paths, ttl }); return signFailure
        ? { data: [{ path, error: 'provider-private-error' }] }
        : { data: [{ path, signedUrl: 'https://storage.example/short-lived-url' }] }; },
    }; } },
  };
  const createClient = (url, key, options) => {
    assert.equal(url, 'https://project.example'); assert.equal(key, 'synthetic-server-key');
    assert.equal(options.auth.persistSession, false); return admin;
  };
  const context = createContext({ Date, Deno: { env: { get: name => ({ SUPABASE_URL: 'https://project.example',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key', PRESENTATION_REVIEW_ORIGINS: 'https://office.example' })[name] },
    serve(fn) { handler = fn; } } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../supabase/functions/presentation-review-media/index.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(async specifier => {
    const exports = specifier.startsWith('npm:') ? { createClient } : { createReviewMediaHandler };
    return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
  });
  await module.evaluate(); return { handler, calls };
}

test('Edge adapter validates twice through token RPC and signs only the fixed private bucket', async () => {
  const { handler, calls } = await load();
  const res = await handler(new Request('https://edge.example', { method: 'POST', headers: { Origin: 'https://office.example' }, body: JSON.stringify({ token: 'a'.repeat(64) }) }));
  assert.equal(res.status, 200); assert.equal(calls[0].name, 'get_public_presentation');
  assert.equal(calls[1].ttl, 300); assert.equal(calls[2].name, 'get_public_presentation');
  assert.equal((await res.text()).includes('synthetic-server-key'), false);
});

test('partial Storage signing failure cannot expose partial URLs or provider details', async () => {
  const { handler } = await load(true);
  const res = await handler(new Request('https://edge.example', { method: 'POST', headers: { Origin: 'https://office.example' }, body: JSON.stringify({ token: 'a'.repeat(64) }) }));
  assert.equal(res.status, 401); assert.doesNotMatch(await res.text(), /provider-private-error|short-lived-url/);
});
