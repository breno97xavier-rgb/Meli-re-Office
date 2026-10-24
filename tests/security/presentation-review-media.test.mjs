import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewMediaHandler } from '../../supabase/functions/_shared/presentation-review-media-core.ts';
import { resolveReviewMaterial } from '../../src/services/presentationReviewContracts.ts';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const path = `workspace/${uuid(1)}/clients/${uuid(2)}/contents/${uuid(3)}/${uuid(4)}.png`;
const token = 'a'.repeat(64), now = Date.parse('2030-01-01T00:00:00Z');
const payload = () => ({ presentation: { client: { id: uuid(2) } }, access: { expires_at: new Date(now+600000).toISOString() },
  items: [{ content_id: uuid(3), review_id: uuid(5), assets: [{ file_url: path }] }] });
const request = (body = { token }, origin = 'https://office.example') => new Request('https://edge.example', {
  method: 'POST', headers: { Origin: origin }, body: JSON.stringify(body),
});
function setup(overrides = {}) {
  const calls = []; const deps = { origins: ['https://office.example'], now: () => now,
    async read() { calls.push('read'); return payload(); },
    async sign(paths, ttl) { calls.push({ paths, ttl }); return { [paths[0]]: 'https://storage.example/signed' }; }, ...overrides };
  return { calls, handler: createReviewMediaHandler(deps) };
}
test('anonymous token holder receives only frozen paths, short-lived URLs, revalidated after signing', async () => {
  const { handler, calls } = setup(); const res = await handler(request());
  assert.equal(res.status, 200); assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(calls, ['read', { paths: [path], ttl: 300 }, 'read']);
});
test('caller paths and unknown fields cannot widen the request', async () => {
  const { handler, calls } = setup(); assert.equal((await handler(request({ token, paths: ['secret'] }))).status, 400);
  assert.equal(calls.length, 0);
});
test('wrong origin and oversized/chunked input are denied before privileged access', async () => {
  const { handler, calls } = setup(); assert.equal((await handler(request({ token }, 'https://evil.example'))).status, 403);
  assert.equal((await handler(request({ token, extra: 'x'.repeat(2048) }))).status, 413); assert.equal(calls.length, 0);
});
test('revoked, expired or suspended token never signs files', async () => {
  const revoked = setup({ read: async () => { throw Error('revoked'); } });
  assert.equal((await revoked.handler(request())).status, 401); assert.equal(revoked.calls.length, 0);
  const expired = setup({ read: async () => ({ ...payload(), access: { expires_at: new Date(now-1).toISOString() } }) });
  assert.equal((await expired.handler(request())).status, 401); assert.equal(expired.calls.length, 0);
});
test('foreign-client, foreign-content and traversal paths are rejected', async () => {
  for (const bad of [path.replace(`/clients/${uuid(2)}/`, `/clients/${uuid(9)}/`), path.replace(`/contents/${uuid(3)}/`, `/contents/${uuid(9)}/`), '../private.png']) {
    const data = payload(); data.items[0].assets[0].file_url = bad;
    const { handler, calls } = setup({ read: async () => data });
    assert.equal((await handler(request())).status, 400); assert.equal(calls.length, 0);
  }
});
test('revocation during signing discards generated URLs and hides provider errors', async () => {
  let reads = 0; const { handler } = setup({ read: async () => { if (++reads > 1) throw Error('sensitive provider detail'); return payload(); } });
  const res = await handler(request()); assert.equal(res.status, 401); assert.doesNotMatch(await res.text(), /sensitive|signed|aaaa/);
});
test('TTL never exceeds token expiry and failed signing never returns partial URLs', async () => {
  const data = payload(); data.access.expires_at = new Date(now+45000).toISOString();
  const short = setup({ read: async () => data }); const res = await short.handler(request()); assert.equal((await res.json()).expires_in, 45);
  const failure = setup({ sign: async () => { throw Error('storage error'); } }); assert.equal((await failure.handler(request())).status, 401);
});
test('preflight has no body and unprepared/legacy material never gets signed', async () => {
  const data = payload(); data.items[0].review_id = null;
  const { handler, calls } = setup({ read: async () => data });
  const res = await handler(new Request('https://edge.example', { method: 'OPTIONS', headers: { Origin: 'https://office.example' } }));
  assert.equal(res.status, 204); assert.equal(await res.text(), '');
  assert.equal((await handler(request())).status, 200); assert.deepEqual(calls, []);
});
test('frozen materials win over live content; legacy approval cannot label new files as approved', () => {
  const live = { client_approval_status: 'approved', content: { caption: 'new' }, assets: ['new-file'] };
  assert.deepEqual(resolveReviewMaterial(live).assets, []); assert.equal(resolveReviewMaterial(live).content.caption, null);
  const frozen = resolveReviewMaterial({ ...live, review_id: uuid(5), review_content: { caption: 'old' }, review_assets: ['old-file'] });
  assert.equal(frozen.content.caption, 'old'); assert.deepEqual(frozen.assets, ['old-file']);
  assert.equal(live.content.caption, 'new');
});
