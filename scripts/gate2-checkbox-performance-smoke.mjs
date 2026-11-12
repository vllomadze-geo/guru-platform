import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const folder = 'artifacts/gate2-performance';
mkdirSync(folder, { recursive: true });
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page, browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 200; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2wRefresh === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-checkbox-perf-isolated', name: 'Gate 2 checkbox perf', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = 'gate2-checkbox-perf-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Gate 2 checkbox perf' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
    for (const selector of ['[data-g2sb-id="company-domain"]', '[data-g2w-card-view="counter"]']) {
      const node = document.querySelector(selector);
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) if (ancestor.tagName === 'DETAILS') ancestor.open = true;
    }
  })()`);
  const result = await evaluate(`(async () => {
    const metrics = {}, longTasks = [], samples = [], originals = {};
    const names = ['g2wSave', 'guruPersistStateFast', 'g2wRefresh', 'g2ServiceBlockRefresh',
      'g2s4UpdateScopeSummaries', 'g2s4Readiness', 'guruPrepareWorkspaceSave',
      'g2wStatus', 'g2ServiceBlockStatus', 'g2ServiceBlockStepDone', 'g2UnifiedStepState',
      'g2wStepChecks', 'g2ServiceBlockValue', 'g2ServiceBlockStepValue', 'g2wInputs', 'g2wValue',
      'g2wCompanyValue', 'megaPlatformProductUrl', 'megaPlatformUrl', 'guruV194Products',
      'g2wRecord', 'g2wCard', 'g2wApplicability', 'g2wRoute', 'g2MetrikaProductRowV367', 'renderGate',
      'g2SeoRead', 'g2SeoProject', 'g2SeoSnapshot', 'nowGuideGate12Read', 'nowGuidePrivateView',
      'guruV194RefreshProductSelectorsV1', 'guruV194ProductReadinessMapV1'];
    for (const name of names) {
      try {
        const original = eval(name); if (typeof original !== 'function') continue;
        originals[name] = original;
        const wrapped = function (...args) {
          const start = performance.now();
          try { return original.apply(this, args); }
          finally { const metric = metrics[name] ||= { count: 0, ms: 0, maxMs: 0, byId: {} };
            const elapsed = performance.now() - start; metric.count++; metric.ms += elapsed; metric.maxMs = Math.max(metric.maxMs, elapsed);
            const id = name === 'g2ServiceBlockRefresh' ? args[0]?.dataset?.g2sbId
              : name === 'g2UnifiedStepState' ? args[1]?.step_id
              : name === 'g2ServiceBlockStepDone' || name === 'g2ServiceBlockValue' ? args[1]?.step_id || args[0]?.id
              : name === 'g2ServiceBlockStepValue' ? args[1]?.step_id
              : args[0]?.id;
            if (id) { const group = metric.byId[id] ||= { count: 0, ms: 0, maxMs: 0 };
              group.count++; group.ms += elapsed; group.maxMs = Math.max(group.maxMs, elapsed); } }
        };
        eval(name + ' = wrapped');
      } catch {}
    }
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(item => item.duration)));
    observer.observe({ entryTypes: ['longtask'] });
    const cacheState = () => ({ products: G2S4_PRODUCT_READY_CACHE.get(state)?.readiness?.size || 0,
      screen: Boolean(G2S4_VISIBLE_READINESS_CACHE.get(document.querySelector('.g2w-workspace'))) });
    const initialCache = cacheState();
    for (const [kind, selector] of [
      ['wizard', '[data-g2w-card-view="counter"] [data-g2w-step="create"]'],
      ['service', '[data-g2sb-id="company-domain"] [data-g2sb-step="dns_set"]'],
    ]) {
      const input = document.querySelector(selector);
      if (!input) throw new Error('Checkbox absent: ' + selector);
      const before = input.checked;
      const t0 = performance.now(); input.click(); const synchronousMs = performance.now() - t0;
      await new Promise(resolve => setTimeout(resolve, 350));
      const after = input.checked;
      const persisted = kind === 'wizard'
        ? g2wRecord(g2wDef('counter'))?.steps?.create?.result
        : g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'))?.steps?.dns_set?.result;
      samples.push({ kind, synchronousMs, before, after, persisted, cache: cacheState(),
        productReadinessRecalculations: metrics.guruV194ProductReadinessMapV1?.count || 0,
        ui: kind === 'wizard' ? document.querySelector('[data-g2w-card-view="counter"] .g2sb-progress')?.textContent
          : document.querySelector('[data-g2sb-id="company-domain"] .g2sb-progress')?.textContent });
    }
    observer.disconnect();
    const cachedReadiness = G2S4_PRODUCT_READY_CACHE.get(state)?.readiness;
    const previousRenderCache = guruRenderReadCacheV470;
    guruRenderReadCacheV470 = null;
    const freshReadiness = g2s4PreviousProductReadinessMap(state, 'gate-2');
    guruRenderReadCacheV470 = previousRenderCache;
    const readinessMatches = JSON.stringify([...cachedReadiness]) === JSON.stringify([...freshReadiness]);
    return { samples, metrics, longTasks, initialCache, readinessMatches,
      products: guruV194Products(state).length, workspaceBytes: JSON.stringify(state).length,
      errors: [...document.querySelectorAll('.g2w-workspace [data-g2step-action="mode"]')].length !== 19 ? ['missing editor buttons'] : [] };
  })()`);
  assert(result.samples.every(sample => sample.before !== sample.after));
  assert.equal(result.readinessMatches, true, 'cached product readiness must match a fresh calculation');
  assert.deepEqual(result.errors, []);
  const durability = await evaluate(`(async () => {
    const wizard = document.querySelector('[data-g2w-card-view="counter"] [data-g2w-step="create"]');
    const service = document.querySelector('[data-g2sb-id="company-domain"] [data-g2sb-step="dns_set"]');
    // Rapid reversals must leave the last state visible and durable.
    wizard.click(); wizard.click(); service.click(); service.click();
    const expectedProducts = guruV194Products(state).map(product => product.id);
    const expectedWizardResult = g2wRecord(g2wDef('counter'))?.steps?.create?.result;
    const expectedServiceResult = g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'))?.steps?.dns_set?.result;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const serialized = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId)
        || (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized;
      if (!serialized) continue;
      const saved = JSON.parse(serialized);
      const wizardResult = g2wRecord(g2wDef('counter'), '', false, saved)?.steps?.create?.result;
      const serviceResult = g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'), '', false, saved)?.steps?.dns_set?.result;
      const products = guruV194Products(saved).map(product => product.id);
      if (wizardResult === expectedWizardResult && serviceResult === expectedServiceResult &&
          JSON.stringify(products) === JSON.stringify(expectedProducts))
        return { saved: true, wizardResult, serviceResult, products: products.length };
    }
    return { saved: false };
  })()`);
  assert.equal(durability.saved, true, 'latest checkbox states must be persisted without losing products');
  const report = { ...result, durability, exceptions: page.errors };
  writeFileSync(`${folder}/checkbox-profile.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
