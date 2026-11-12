import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const port = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const folder = 'artifacts/gate2-yandex-product';
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
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page, contextId;
try {
  ({ browserContextId: contextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId: contextId });
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evalInPage = async expression => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 200; i++) {
    if (await evalInPage('document.readyState === "complete" && typeof g2ypMount === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const init = `(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-yandex-product-isolated', name: 'Коричное яблоко', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    saveProjects(); activeProjectId = 'gate2-yandex-product-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Коричное яблоко' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const product = guruV194Products(state).find(p => /Шапка Коза/u.test(p.name)) || guruV194Products(state)[0];
    state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(product)[0] || '__uncategorized__', selectedProductId: product.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
    return { id: product.id, name: product.name };
  })()`;
  const chosen = await evalInPage(init);
  const snapshot = await evalInPage(`(() => {
    const group = document.querySelector('[data-g2yp-group]');
    const old = ['product-counter','product-goal'].map(id => document.querySelectorAll('[data-g2sb-id="' + id + '"]').length);
    const cards = state.gates.find(g => g.id === 'gate-2').cards;
    const oldRecords = ['g2-metrika-product-counter','g2-metrika-goals-primary','g2-metrika-product-goals'].map(id => ({ id, exists: !!cards.find(c => c.id === id), fields: JSON.stringify(cards.find(c => c.id === id)?.fields || {}).length }));
    return { group: !!group, blocks: [...group?.querySelectorAll(':scope > .g2yp-blocks > .g2yp-block') || []].map(b => ({ id: b.dataset.g2sbId, steps: b.querySelectorAll('.g2yp-step').length, status: b.querySelector(':scope > summary [data-status]')?.dataset.status })),
      old, oldVisibleCards: [...document.querySelectorAll('.g2w-additional [data-card]')].filter(c => /g2-metrika-product|g2-metrika-goals-primary/.test(c.dataset.card)).map(c => ({ id: c.dataset.card, scope: c.closest('[data-g2-scope]')?.dataset.g2Scope, parent: c.parentElement?.className })),
      independent: ['product-landing','product-vk','product-lead'].map(id => !!document.querySelector('[data-g2sb-id="' + id + '"]')), oldRecords,
      readinessIds: g2s4Units(state).filter(unit => unit.scope === 'product').map(unit => unit.id),
      otherLegacyRows: JSON.stringify(cards.filter(c => oldRecords.some(r => r.id === c.id)).map(c => ({ id: c.id,
        rows: (c.fields?.metrikaProductV367?.perProduct || c.fields?.metrikaQualityV360?.perProduct || []).filter(row => row.product_id !== guruV194SelectedProduct(state).id) }))),
      url: g2s4ProductUrl(guruV194SelectedProduct(state)?.id), counter: g2MetrikaCompanyCounterV374(),
      goalOptions: group?.querySelectorAll('[data-g2yp-goal] option').length || 0,
      instructions: [...group?.querySelectorAll('.g2yp-step') || []].every(s => s.querySelector('small')?.textContent === 'Что сделать' && s.querySelectorAll('.g2yp-guide h6').length === 2 && !!s.querySelector('.g2yp-guide a')) };
  })()`);
  assert(snapshot.group);
  assert.deepEqual(snapshot.blocks.map(b => b.steps), [3,1,1]);
  assert.deepEqual(snapshot.old, [0,0]);
  assert.equal(snapshot.oldVisibleCards.length, 0);
  assert(snapshot.independent.every(Boolean));
  assert(snapshot.oldRecords.every(r => r.exists));
  assert(snapshot.readinessIds.includes('product-yandex-metrika'));
  assert(snapshot.readinessIds.includes('product-yandex-webmaster'));
  assert(snapshot.readinessIds.includes('product-yandex-direct'));
  assert(!snapshot.readinessIds.includes('product-counter'));
  assert(!snapshot.readinessIds.includes('product-goal'));
  assert(snapshot.instructions);
  await evalInPage(`(() => { document.querySelector('[data-g2w-scope="product"]').scrollIntoView(); document.querySelector('[data-g2yp-group]').open = true; document.querySelectorAll('[data-g2yp-group] .g2yp-block').forEach(b => b.open = true); })()`);
  const groupClip = async () => evalInPage(`(() => {
    const rect = document.querySelector('[data-g2yp-group]').getBoundingClientRect();
    return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY),
      width: rect.width, height: rect.height };
  })()`);
  const captureGroup = async name => writeFileSync(`${folder}/${name}.png`, Buffer.from((await page.call('Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: true, clip: { ...await groupClip(), scale: 1 } })).data, 'base64'));
  await captureGroup('desktop-preview');
  await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => writeFileSync(`${folder}/desktop.png`, Buffer.from(r.data, 'base64')));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evalInPage(`(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, width: document.documentElement.scrollWidth, viewport: innerWidth, blocks: document.querySelectorAll('[data-g2yp-group] .g2yp-block').length }))()`);
  await captureGroup('mobile-preview');
  await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => writeFileSync(`${folder}/mobile.png`, Buffer.from(r.data, 'base64')));
  const platformNavigation = await evalInPage(`(() => {
    document.querySelector('[data-g2yp-open-platform]')?.click();
    return { navigated: activeGateId === 'gate-0' };
  })()`);
  for (let i = 0; i < 50; i++) {
    if (await evalInPage('activeGateId === "gate-0" && !!document.querySelector(".mega-platform-section")')) {
      platformNavigation.sectionFound = true; break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evalInPage(`(() => { activeGateId = 'gate-2'; activeView = 'gate'; renderGate(); return true; })()`);
  assert(platformNavigation.navigated && platformNavigation.sectionFound);
  const flows = await evalInPage(`(() => {
    const id = guruV194SelectedProduct(state).id;
    const other = guruV194Products(state).find(p => p.id !== id)?.id;
    const goalCard = state.gates.find(g => g.id === 'gate-2').cards.find(c => c.id === 'g2-metrika-goals-primary');
    const sourceBefore = JSON.stringify(goalCard.fields);
    const originalTest = g2MetrikaProductRowV367(goalCard, id)?.testConversionAt || '';
    megaPlatformSetUrl('products', id, 'https://example.com/shapka-koza');
    g2MetrikaCompanyDataV374('counter').counterCheck = 'found';
    const goal = g2MetrikaCompanyGoalsV374().find(g => g.entryId && g.goalId);
    g2ypRefreshBlock('product-yandex-metrika', id);
    g2ypRefreshBlock('product-yandex-direct', id);
    const action = document.querySelector('[data-g2yp-main-action]');
    action.value = 'Оформление заказа'; action.dispatchEvent(new Event('change', { bubbles: true }));
    if (goal) {
      const select = document.querySelector('[data-g2yp-goal]');
      select.value = goal.entryId; select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const originalTestPreserved = (g2MetrikaProductRowV367(goalCard, id)?.testConversionAt || '') === originalTest;
    const index = document.querySelector('[data-g2yp-group] [data-g2seo-editor="indexing"] select');
    index.value = 'yes'; index.dispatchEvent(new Event('change', { bubbles: true }));
    const indexSaved = g2SeoStore('product-landing', id)?.webmasterV298?.landingIndexed === 'yes';
    const reviewButton = document.querySelector('[data-g2yp-step="counter"] [data-g2yp-review="passed"]');
    const evidence = reviewButton.closest('[data-g2yp-step]').querySelector('[data-g2yp-evidence]');
    evidence.value = 'Проверка счётчика в Метрике'; reviewButton.click();
    const counterStatus = g2ypStepStatus('product-yandex-metrika', 'counter', id);
    const otherReview = other ? g2ypRecord(other)?.reviews?.['product-yandex-metrika:counter'] : null;
    const beforeFingerprint = g2ypRecord(id).reviews['product-yandex-metrika:counter'].fingerprint;
    megaPlatformSetUrl('products', id, 'https://example.com/shapka-koza-new');
    const staleStatus = g2ypStepStatus('product-yandex-metrika', 'counter', id);
    const storedFingerprint = g2ypRecord(id).reviews['product-yandex-metrika:counter'].fingerprint;
    const after = JSON.stringify(state.gates.find(g => g.id === 'gate-2').cards.find(c => c.id === 'g2-metrika-goals-primary').fields);
    return { counterStatus, staleStatus, otherReview: !!otherReview, fingerprintPreserved: beforeFingerprint === storedFingerprint,
      oldGoalFieldsRetained: after.includes('Оформление заказа') && after.length >= sourceBefore.length,
      originalTestPreserved, indexSaved, historyCount: g2ypRecord(id).history.length, oldVisibleAfter: document.querySelectorAll('.g2w-additional [data-card="g2-metrika-goals-primary"]').length,
      directWithNoCampaign: g2ypStatus('product-yandex-direct', id) };
  })()`);
  const moreFlows = await evalInPage(`(() => {
    const id = guruV194SelectedProduct(state).id;
    const other = guruV194Products(state).find(p => p.id !== id);
    g2ypSaveReview('product-yandex-webmaster', 'indexing', 'passed', 'Проверка страницы в Вебмастере', id);
    g2ypSaveReview('product-yandex-direct', 'readiness', 'passed', 'URL и настройки Директа проверены', id);
    const webmasterReady = g2ypStatus('product-yandex-webmaster', id);
    const directReady = g2ypStatus('product-yandex-direct', id);
    const landing = g2wRecord(g2wDef('landing'), id, true);
    const oldRoute = landing.values.route || '';
    landing.values.route = 'messenger';
    const nonSite = G2YP_DEFS.map(def => g2ypStatus(def.id, id));
    landing.values.route = oldRoute;
    state.project.gate0ScopeUiV194.selectedProductId = other.id;
    state.project.gate0ScopeUiV194.selectedCategoryId = megaPlatformProductCategoryIds(other)[0] || '__uncategorized__';
    renderGate();
    const otherProduct = { selected: guruV194SelectedProduct(state)?.id, blocks: document.querySelectorAll('[data-g2yp-group] .g2yp-block').length,
      reviews: g2ypRecord(other.id)?.reviews || {}, oldVisible: document.querySelectorAll('.g2w-additional [data-card="g2-metrika-goals-primary"]').length };
    state.project.gate0ScopeUiV194.selectedProductId = id;
    state.project.gate0ScopeUiV194.selectedCategoryId = megaPlatformProductCategoryIds(guruV194Products(state).find(p => p.id === id))[0] || '__uncategorized__';
    renderGate();
    const gateCards = state.gates.find(g => g.id === 'gate-2').cards;
    const otherLegacyRows = JSON.stringify(gateCards.filter(c => ['g2-metrika-product-counter','g2-metrika-goals-primary','g2-metrika-product-goals'].includes(c.id)).map(c => ({ id: c.id,
      rows: (c.fields?.metrikaProductV367?.perProduct || c.fields?.metrikaQualityV360?.perProduct || []).filter(row => row.product_id !== id) })));
    return { webmasterReady, directReady, nonSite, otherProduct, restored: guruV194SelectedProduct(state)?.id === id,
      otherLegacyRowsUnchanged: otherLegacyRows === ${JSON.stringify(snapshot.otherLegacyRows)},
      groupOrder: { landingY: document.querySelector('details[data-g2sb-id="product-landing"]').getBoundingClientRect().top,
        yandexY: document.querySelector('[data-g2yp-group]').getBoundingClientRect().top,
        landingParent: document.querySelector('details[data-g2sb-id="product-landing"]').parentElement.className,
        yandexParent: document.querySelector('[data-g2yp-group]').parentElement.className } };
  })()`);
  await evalInPage(`(async () => { g2wFlushPendingStepSave(true); await guruPersistStateFast({ durable: true, cloud: false }); return true; })()`);
  const beforeReloadOrigin = await evalInPage('performance.timeOrigin');
  await page.call('Page.reload', { ignoreCache: true });
  let reloaded = false;
  for (let i = 0; i < 500; i++) {
    if (await evalInPage(`performance.timeOrigin !== ${beforeReloadOrigin} && document.readyState === "complete" && typeof openProject === "function"`)) { reloaded = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(reloaded, 'app must reload');
  const persistence = await evalInPage(`(async () => {
    rememberAccessUnlocked(); setAccessState(true);
    await openProject('gate2-yandex-product-isolated');
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const selected = guruV194SelectedProduct(state);
    const gate = state.gates.find(g => g.id === 'gate-2');
    const legacy = gate.cards.filter(c => ['g2-metrika-product-counter','g2-metrika-goals-primary','g2-metrika-product-goals'].includes(c.id));
    return { selected: selected?.id, group: !!document.querySelector('[data-g2yp-group]'),
      blocks: document.querySelectorAll('[data-g2yp-group] .g2yp-block').length,
      oldVisible: document.querySelectorAll('.g2w-additional [data-card="g2-metrika-goals-primary"]').length,
      legacyStored: legacy.length, action: g2MetrikaProductRowV367(legacy.find(c => c.id === 'g2-metrika-goals-primary'), selected.id)?.mainAction,
      reviewCount: Object.keys(g2ypRecord(selected.id)?.reviews || {}).length,
      historyCount: g2ypRecord(selected.id)?.history?.length || 0,
      indexed: g2SeoStore('product-landing', selected.id)?.webmasterV298?.landingIndexed };
  })()`);
  writeFileSync(`${folder}/results.json`, JSON.stringify({ chosen, snapshot, mobile, platformNavigation, flows, moreFlows, persistence, errors: page.errors }, null, 2));
  assert(!mobile.overflow, `mobile overflow: ${mobile.width} > ${mobile.viewport}`);
  assert.equal(flows.counterStatus, 'ready');
  assert.equal(flows.staleStatus, 'recheck');
  assert.equal(flows.otherReview, false);
  assert(flows.fingerprintPreserved && flows.oldGoalFieldsRetained);
  assert(flows.originalTestPreserved && flows.indexSaved);
  assert.equal(flows.oldVisibleAfter, 0);
  assert.equal(moreFlows.webmasterReady, 'ready');
  assert.equal(moreFlows.directReady, 'ready');
  assert.deepEqual(moreFlows.nonSite, ['not_needed','not_needed','not_needed']);
  assert.equal(moreFlows.otherProduct.selected === chosen.id, false);
  assert.equal(moreFlows.otherProduct.blocks, 3);
  assert.equal(Object.keys(moreFlows.otherProduct.reviews).length, 0);
  assert.equal(moreFlows.otherProduct.oldVisible, 0);
  assert(moreFlows.otherLegacyRowsUnchanged);
  assert(moreFlows.groupOrder.landingY < moreFlows.groupOrder.yandexY);
  assert.equal(persistence.selected, chosen.id);
  assert.equal(persistence.group, true);
  assert.equal(persistence.blocks, 3);
  assert.equal(persistence.oldVisible, 0);
  assert.equal(persistence.legacyStored, 3);
  assert.equal(persistence.action, 'Оформление заказа');
  assert(persistence.reviewCount >= 3);
  assert(persistence.historyCount >= 1);
  assert.equal(persistence.indexed, 'yes');
  assert.equal(page.errors.length, 0, page.errors.join('\n'));
  console.log(JSON.stringify({ chosen, snapshot, mobile, platformNavigation, flows, moreFlows, persistence, errors: page.errors }, null, 2));
} finally {
  page?.close(); await browser.call('Target.disposeBrowserContext', { browserContextId: contextId }).catch(() => {}); browser.close();
}
