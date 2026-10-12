import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

// Execute the real hook with controlled React lifecycles and delayed service responses.
async function harness() {
  const slots = [], requests = [];
  let cursor = 0, pendingEffect, cleanup;
  const same = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback(fn, deps) { const index = cursor++; if (!same(slots[index]?.deps, deps)) slots[index] = { deps, fn }; return slots[index].fn; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const index = cursor++; if (!same(slots[index], deps)) { slots[index] = deps; pendingEffect = fn; } },
  };
  const service = {
    fetchContentPlanningOptions(clientId) { return new Promise((resolve, reject) => requests.push({ clientId, resolve, reject })); },
    formatPlanningError(error) { return error.message; },
  };
  const context = createContext({ console: { error() {} } });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/hooks/useContentPlanningOptions.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(specifier => {
    const exports = specifier === 'react' ? react : specifier.includes('planningService') ? service : { EditorialPlan: undefined, ClientPillar: undefined, Campaign: undefined };
    return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
  });
  await module.evaluate();
  return {
    requests,
    render(clientId, runEffects = true) {
      cursor = 0;
      const result = module.namespace.useContentPlanningOptions(clientId);
      if (runEffects && pendingEffect) { const effect = pendingEffect; pendingEffect = undefined; cleanup?.(); cleanup = effect(); }
      return result;
    },
    unmount() { cleanup?.(); },
  };
}
const payload = id => ({ editorialPlans: [{ id, status: 'active' }], pillars: [{ id, is_active: true }], campaigns: [{ id, status: 'draft' }] });
const settle = () => new Promise(resolve => setImmediate(resolve));

test('switching clients hides old options before effects and ignores late success', async () => {
  const h = await harness();
  h.render('A'); h.requests[0].resolve(payload('A')); await settle();
  assert.equal(h.render('A').plans[0].id, 'A');
  const switched = h.render('B', false);
  assert.equal(switched.plans.length, 0); assert.equal(switched.activePillars.length, 0); assert.equal(switched.loading, true);
  h.render('B');
  const refresh = h.render('B').reload();
  h.requests[2].resolve(payload('B-new')); await refresh;
  h.requests[1].resolve(payload('B-old')); await settle();
  assert.equal(h.render('B').plans[0].id, 'B-new');
  assert.equal(h.render('B').campaigns[0].id, 'B-new');
});

test('late rejection cannot replace current success or loading state', async () => {
  const h = await harness(); h.render('A'); h.render('B');
  h.requests[1].resolve(payload('B')); await settle();
  h.requests[0].reject(new Error('old error')); await settle();
  const result = h.render('B');
  assert.equal(result.pillars[0].id, 'B'); assert.equal(result.error, null); assert.equal(result.loading, false);
});

test('old client success cannot populate selectors or finish the new client load', async () => {
  const h = await harness(); h.render('A'); h.render('B');
  h.requests[0].resolve(payload('A')); await settle();
  assert.equal(h.render('B').plans.length, 0); assert.equal(h.render('B').loading, true);
  h.requests[1].resolve(payload('B')); await settle();
  assert.equal(h.render('B').activePlans[0].id, 'B'); assert.equal(h.render('B').loading, false);
});

test('clearing the client invalidates outstanding requests and empties every selector', async () => {
  const h = await harness(); h.render('A'); h.render(null);
  h.requests[0].resolve(payload('A')); await settle();
  const result = h.render(null);
  for (const key of ['plans', 'activePlans', 'pillars', 'activePillars', 'campaigns', 'activeCampaigns']) assert.equal(result[key].length, 0);
  assert.equal(result.loading, false); assert.equal(result.error, null);
});

test('unmount invalidates a pending load without applying its response', async () => {
  const h = await harness(); h.render('A'); h.unmount();
  h.requests[0].resolve(payload('A')); await settle();
  assert.equal(h.render('A', false).plans.length, 0);
});
