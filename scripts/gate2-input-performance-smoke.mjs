import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const projectId = 'gate2-input-performance-isolated';

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
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
let page; let browserContextId;
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
    projects = [{ id: ${JSON.stringify(projectId)}, name: 'Gate 2 performance', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = createFreshWorkspace({ id: ${JSON.stringify(projectId)}, name: 'Gate 2 performance' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: ${JSON.stringify(projectId)} };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
  })()`);
  const result = await evaluate(`(async () => {
    const companyToggle = document.querySelector('[data-gate0-section-toggle="company"]');
    if (companyToggle?.getAttribute('aria-expanded') !== 'true') companyToggle?.click();
    const input = document.querySelector('[data-g2sb-id="company-domain"] [data-g2w-field="registrar"]') ||
      document.querySelector('[data-g2w-field="registrar"]');
    if (!input) throw new Error('registrar input absent');
    for (let parent = input.parentElement; parent; parent = parent.parentElement)
      if (parent.tagName === 'DETAILS') parent.open = true;
    input.focus();
    let saves = 0, refreshes = 0, serviceRefreshes = 0;
    const serviceById = {}, statusById = {};
    const previousSave = saveState, previousRefresh = g2wRefresh, previousServiceRefresh = g2ServiceBlockRefresh,
      previousStatus = g2wStatus;
    saveState = function () { saves++; return previousSave.apply(this, arguments); };
    g2wRefresh = function () { refreshes++; return previousRefresh.apply(this, arguments); };
    g2ServiceBlockRefresh = function (block) {
      serviceRefreshes++; const start = performance.now();
      try { return previousServiceRefresh.apply(this, arguments); }
      finally { const id = block.dataset.g2sbId; const item = serviceById[id] ||= { count: 0, ms: 0 };
        item.count++; item.ms += performance.now() - start; }
    };
    g2wStatus = function (def) {
      const start = performance.now();
      try { return previousStatus.apply(this, arguments); }
      finally { const item = statusById[def.id] ||= { count: 0, ms: 0 };
        item.count++; item.ms += performance.now() - start; }
    };
    const samples = [];
    for (const letter of 'Gate2 perf') {
      input.value += letter;
      const start = performance.now(); input.dispatchEvent(new Event('input', { bubbles: true }));
      samples.push(performance.now() - start);
    }
    const immediate = { samples, saves, refreshes, serviceRefreshes, value: input.value,
      focused: document.activeElement === input, stored: g2wValue(g2wDef('domain'), '', 'registrar') };
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 900));
    const serialized = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)}) ||
      (await guruWorkspaceIdbReadV1(${JSON.stringify(projectId)}))?.serialized;
    const savedWorkspace = serialized && JSON.parse(serialized);
    const final = { saves, refreshes, serviceRefreshes, value: g2wValue(g2wDef('domain'), '', 'registrar'),
      preservedOtherCard: state.gates.find(gate => gate.id === 'gate-2').cards.length >= ${fixture.gate.cards.length},
      focus: document.activeElement === input,
      persisted: savedWorkspace ? g2wValue(g2wDef('domain'), '', 'registrar', savedWorkspace) : null,
      status: document.querySelector('[data-g2sb-id="company-domain"] [data-g2sb-status]')?.textContent,
      expectedStatus: g2ServiceBlockStatusLabel(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'),
        g2ServiceBlockStatus(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'))) };
    const serviceInput = document.querySelector('.g2w-workspace [data-g2sb-step][type="text"]');
    let service = null;
    if (serviceInput) {
      const start = performance.now();
      serviceInput.value += 'Gate2';
      serviceInput.dispatchEvent(new Event('input', { bubbles: true }));
      const inputMs = performance.now() - start;
      await new Promise(resolve => setTimeout(resolve, 1100));
      const serviceBlock = serviceInput.closest('[data-g2sb-id]');
      const serviceConfig = G2_SERVICE_BLOCK_CONFIGS.get(serviceBlock.dataset.g2sbId);
      const serviceProductId = serviceBlock.dataset.g2sbProductId || '';
      const serviceRaw = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)}) ||
        (await guruWorkspaceIdbReadV1(${JSON.stringify(projectId)}))?.serialized;
      const serviceSaved = serviceRaw && JSON.parse(serviceRaw);
      const persisted = serviceSaved && g2ServiceBlockRecord(serviceConfig, serviceProductId, false, serviceSaved)
        ?.steps?.[serviceInput.dataset.g2sbStep]?.params?.value;
      serviceInput.dispatchEvent(new Event('change', { bubbles: true }));
      service = { inputMs, value: serviceInput.value, persisted,
        stored: g2ServiceBlockRecord(serviceConfig, serviceProductId)
          ?.steps?.[serviceInput.dataset.g2sbStep]?.params?.value };
    }
    const checkbox = document.querySelector('[data-g2sb-id="company-domain"] [data-g2sb-step="dns_set"]');
    const previousChecked = checkbox?.checked;
    if (checkbox) { checkbox.checked = !checkbox.checked; checkbox.dispatchEvent(new Event('change', { bubbles: true })); }
    const record = g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'));
    const check = checkbox ? { previousChecked, checked: checkbox.checked,
      stored: record?.steps?.dns_set?.result,
      status: document.querySelector('[data-g2sb-id="company-domain"] [data-g2sb-status]')?.textContent,
      expectedStatus: g2ServiceBlockStatusLabel(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'),
        g2ServiceBlockStatus(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'))) } : null;
    await new Promise(resolve => setTimeout(resolve, 250));
    const statusMismatches = [];
    const fullReadiness = g2s4Readiness();
    const screenReadiness = G2S4_VISIBLE_READINESS_CACHE.get(document.querySelector('.g2w-workspace'));
    for (const unit of fullReadiness.allUnits) {
      const shown = screenReadiness?.allUnits.find(item => item.id === unit.id && item.productId === unit.productId);
      if (shown?.status !== unit.status) statusMismatches.push(unit.id + ':readiness');
    }
    for (const scope of ['company', 'product']) {
      const scopeNode = document.querySelector('[data-g2w-scope="' + scope + '"]');
      if (!scopeNode) continue;
      const statuses = JSON.parse(scopeNode.dataset.g2wStatuses || '{}');
      const productId = scope === 'product' ? guruV194SelectedProduct(state)?.id || '' : '';
      const defs = G2W_CARDS.filter(def => def.scope === scope);
      for (const def of defs) if (statuses[def.id] !== g2wStatus(def, productId))
        statusMismatches.push(scope + ':' + def.id);
      const subset = fullReadiness.allUnits.filter(unit => unit.scope === scope);
      const counted = subset.filter(unit => unit.status !== 'not_needed');
      const visibleReady = counted.filter(unit => unit.status === 'ready').length;
      const expectedSummary = scope === 'company'
        ? fullReadiness.summary.done + ' из ' + fullReadiness.summary.total + ' блоков готово · ' + fullReadiness.summary.percent + '%'
        : visibleReady + ' из ' + counted.length + ' готово' +
          (subset.length > counted.length ? ' · ' + (subset.length - counted.length) + ' не требуется' : '');
      if (scopeNode.querySelector('.g2w-scope-summary > span')?.textContent !== expectedSummary)
        statusMismatches.push(scope + ':summary ' + scopeNode.querySelector('.g2w-scope-summary > span')?.textContent + ' != ' + expectedSummary);
    }
    const selectedProduct = guruV194SelectedProduct(state);
    const productCheckbox = [...document.querySelectorAll('[data-g2-scope="product"] [data-g2sb-step][type="checkbox"]')]
      .find(node => !node.disabled);
    let productCheck = null;
    if (selectedProduct && productCheckbox) {
      productCheckbox.checked = !productCheckbox.checked;
      productCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 350));
      const shown = G2S4_PRODUCT_READY_CACHE.get(state)?.readiness.get(selectedProduct.id);
      const expected = guruV194ProductGateStatusV1(selectedProduct, 'gate-2', state);
      const option = [...document.querySelectorAll('[data-gate0-scope-product-select="gate2-product"] option')]
        .find(node => node.value === selectedProduct.id);
      productCheck = { shown, expected, optionReady: option?.textContent.includes('✓ Заполнен') || false,
        selectedId: selectedProduct.id,
        cachedOther: G2S4_PRODUCT_READY_CACHE.get(state)?.readiness.size || 0 };
    }
    const selector = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
    const nextOption = [...(selector?.options || [])].find(option => option.value && option.value !== selectedProduct?.id);
    let productSwitch = null;
    if (selector && nextOption && selectedProduct) {
      const original = selectedProduct.id;
      selector.value = nextOption.value;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      const newId = guruV194SelectedProduct(state)?.id;
      productSwitch = { original, newId, intended: nextOption.value,
        renderedId: document.querySelector('[data-g2sb-id="product-landing"]')?.dataset.g2sbProductId,
        originalStepPreserved: productCheckbox ? Boolean(g2ServiceBlockRecord(
          G2_SERVICE_BLOCK_CONFIGS.get(productCheckbox.closest('[data-g2sb-id]').dataset.g2sbId), original)
          ?.steps?.[productCheckbox.dataset.g2sbStep]) : true };
    }
    return { immediate, final, service, check, productCheck, productSwitch,
      statusMismatches, serviceById, statusById };
  })()`);
  const report = { ...result, errors: page.errors };
  mkdirSync('artifacts/gate2-performance', { recursive: true });
  writeFileSync('artifacts/gate2-performance/input.json', JSON.stringify(report, null, 2));
  assert.equal(result.immediate.value, result.immediate.stored);
  assert.equal(result.immediate.focused, true);
  assert.equal(result.final.preservedOtherCard, true);
  assert.equal(result.final.value, result.final.persisted);
  assert.equal(result.final.status, result.final.expectedStatus);
  if (result.service) {
    assert.equal(result.service.value.trim(), result.service.stored);
    assert.equal(result.service.value.trim(), result.service.persisted);
  }
  if (result.check) {
    assert.equal(result.check.stored, result.check.checked ? 'done' : 'pending');
    assert.equal(result.check.status, result.check.expectedStatus);
  }
  assert.deepEqual(result.statusMismatches, []);
  if (result.productCheck) {
    assert.equal(result.productCheck.shown, result.productCheck.expected);
    assert.equal(result.productCheck.optionReady, result.productCheck.expected === 'ready');
    assert.ok(result.productCheck.cachedOther > 1);
  }
  if (result.productSwitch) {
    assert.equal(result.productSwitch.newId, result.productSwitch.intended);
    assert.equal(result.productSwitch.renderedId, result.productSwitch.intended);
    assert.equal(result.productSwitch.originalStepPreserved, true);
  }
  console.log(JSON.stringify({ count: result.immediate.samples.length,
    totalMs: result.immediate.samples.reduce((a,b) => a+b, 0),
    maxMs: Math.max(...result.immediate.samples),
    saves: result.final.saves, refreshes: result.final.refreshes,
    serviceRefreshes: result.final.serviceRefreshes, errors: page.errors.length }, null, 2));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
