import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

async function routerHarness() {
  const target = new EventTarget();
  const updates = [], pushes = [], scrolls = [], cleanup = [];
  const window = {
    location: { pathname: '/planejamento' },
    history: { pushState(_state, _title, path) { pushes.push(path); window.location.pathname = path; } },
    scrollTo(options) { scrolls.push(options); },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  const react = {
    useState(initial) { return [initial(), value => updates.push(value)]; },
    useCallback(fn) { return fn; },
    useEffect(fn) { cleanup.push(fn()); },
  };
  const context = createContext({ window, Event, CustomEvent });
  const code = stripTypeScriptTypes(readFileSync(new URL('../../src/hooks/useRouter.ts', import.meta.url), 'utf8'), { mode: 'transform' });
  const module = new SourceTextModule(code, { context });
  await module.link(() => new SyntheticModule(Object.keys(react), function () {
    for (const [name, value] of Object.entries(react)) this.setExport(name, value);
  }, { context }));
  await module.evaluate();
  const router = module.namespace.useRouter();
  return { window, router, updates, pushes, scrolls, unmount() { cleanup.forEach(fn => fn?.()); } };
}

test('canceling internal navigation preserves URL and visible route', async () => {
  const h = await routerHarness();
  h.window.addEventListener('meliere:before-navigate', event => event.preventDefault());
  h.router.navigate('/clientes');
  assert.equal(h.window.location.pathname, '/planejamento');
  assert.deepEqual(h.pushes, []);
  assert.deepEqual(h.updates, []);
  assert.deepEqual(h.scrolls, []);
  h.unmount();
});

test('confirmed or clean internal navigation still updates all router subscribers', async () => {
  const h = await routerHarness();
  let checks = 0;
  h.window.addEventListener('meliere:before-navigate', () => checks++);
  h.router.navigate('/clientes');
  assert.equal(checks, 1);
  assert.deepEqual(h.pushes, ['/clientes']);
  assert.deepEqual(h.updates, ['/clientes', '/clientes']);
  assert.equal(h.scrolls.length, 1);
  h.unmount();
});

test('selecting current route does not ask to discard a draft', async () => {
  const h = await routerHarness();
  let checks = 0;
  h.window.addEventListener('meliere:before-navigate', () => checks++);
  h.router.navigate('/planejamento');
  assert.equal(checks, 0);
  assert.deepEqual(h.pushes, []);
  h.unmount();
});

test('in-app confirmation can resume a previously blocked route without a second navigation prompt', async () => {
  const h = await routerHarness(); let proceed; let checks = 0;
  h.window.addEventListener('meliere:before-navigate', event => { checks++; event.preventDefault(); proceed = event.detail.proceed; });
  h.router.navigate('/conteudos');
  assert.equal(h.window.location.pathname, '/planejamento');
  proceed();
  assert.equal(h.window.location.pathname, '/conteudos');
  assert.equal(checks, 1); assert.deepEqual(h.pushes, ['/conteudos']); h.unmount();
});
