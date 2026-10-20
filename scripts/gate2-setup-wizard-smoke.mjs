import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const fixturePath = process.env.GURU_GATE2_FIXTURE || "/Users/vl/Downloads/gate-2.json";
const fixture = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, "utf8")) : null;
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4318/";
const projectId = "gate2-wizard-isolated-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 30000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser; let page; let browserContextId; let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression, timeout = 15000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
const pointerClick = async (selector) => {
  const point = await evaluate(`(async () => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error('Missing pointer target: ' + ${JSON.stringify(selector)});
    node.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = node.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (!node.contains(document.elementFromPoint(x, y)))
      throw new Error('Pointer target is obscured: ' + ${JSON.stringify(selector)});
    return { x, y };
  })()`);
  await page.call("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await page.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  return point;
};

try {
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((item) => item.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: Number(process.env.GURU_GATE2_WIDTH || 1440), height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2wStatus === "function"');
  const seeded = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: ${JSON.stringify(projectId)}, name: "iCleaning Gate 2 smoke", lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = createFreshWorkspace({ id: ${JSON.stringify(projectId)}, name: "iCleaning Gate 2 smoke" });
    state.project = { ...state.project, ...${JSON.stringify(fixture?.content?.project || {})}, id: ${JSON.stringify(projectId)} };
    const gate = state.gates.find((item) => item.id === "gate-2");
    ${fixture ? `gate.cards = ${JSON.stringify(fixture.gate.cards)};` : `
    const category = guruV189CreateCategory('Проверочная категория', state);
    const catalog = guruV189CatalogItems(state);
    catalog.push({ id: 'smoke-product-a', name: 'Проверочный продукт A', continuum: 'product' },
      { id: 'smoke-product-b', name: 'Проверочный продукт B', continuum: 'product' });
    megaPlatformSetProductCategoryIds('smoke-product-a', [category.id], state);
    megaPlatformSetProductCategoryIds('smoke-product-b', [category.id], state);`}
    const old = gate.cards.find((card) => card.id === "g2-metrika-product-counter");
    old.fields.metrikaGuideChecklistV368 = { retained: "historical answer" };
    gate.cards.push({ id: "g2-metrika-product-webvisor", title: "Старая проверка Вебвизора", status: "not_started", fields: { metrikaGuideChecklistV368: { retained: "retired answer" } } });
    ensureGate2Structure(gate);
    const first = guruV194Products(state)[0];
    state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || "__uncategorized__", selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = "gate"; activeGateId = "gate-2"; renderGate();
    return { products: guruV194Products(state).length, first: first.id,
      retained: old.fields.metrikaGuideChecklistV368.retained,
      retired: gate.cards.some((card) => card.id === "g2-metrika-product-webvisor"),
      cards: gate.cards.length };
  })()`);
  assert.ok(seeded.products > 1);
  assert.equal(seeded.retained, "historical answer");
  assert.equal(seeded.retired, true);
  const initial = await evaluate(`(() => ({
    scopes: [...document.querySelectorAll('[data-g2w-scope]')].map((node) => node.dataset.g2wScope),
    company: document.querySelectorAll('[data-g2w-scope="company"] .g2w-card').length,
    product: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length,
    legacy: document.querySelectorAll('.g2w-legacy-list [data-card]').length,
    docs: [...document.querySelectorAll('.g2w-card a[href]')].every((link) => link.href.startsWith('https://')),
    selector: document.querySelectorAll('[data-gate0-scope-product-select="gate2-product"]').length,
    firstProduct: guruV194SelectedProduct(state)?.id,
  }))()`);
  assert.deepEqual(initial.scopes, ["company", "product"]);
  assert.equal(initial.company, 7);
  assert.equal(initial.product, 5);
  assert.ok(initial.legacy > 0);
  assert.equal(initial.docs, true);
  assert.equal(initial.selector, 1);
  assert.equal(initial.firstProduct, seeded.first);
  await evaluate(`(() => {
    window.__g2wRenderCalls = 0;
    window.__g2wOriginalRenderGate = renderGate;
    renderGate = function () {
      window.__g2wRenderCalls++;
      return window.__g2wOriginalRenderGate.apply(this, arguments);
    };
  })()`);
  await pointerClick('[data-gate0-section-toggle="company"]');
  const scopeAfter = await evaluate(`(() => ({ expanded: document.querySelector('[data-gate0-section-toggle="company"]')?.getAttribute('aria-expanded'),
    hidden: document.querySelector('[data-g2w-scope="company"]')?.classList.contains('gate0-section-content-hidden'),
    renders: window.__g2wRenderCalls }))()`);
  assert.equal(scopeAfter.expanded, 'false');
  assert.equal(scopeAfter.hidden, true);
  assert.equal(scopeAfter.renders, 0, 'scope click must not rebuild Gate 2');
  await pointerClick('[data-gate0-section-toggle="company"]');
  const scopeRestored = await evaluate(`(() => {
    const result = { expanded: document.querySelector('[data-gate0-section-toggle="company"]')?.getAttribute('aria-expanded'),
      hidden: document.querySelector('[data-g2w-scope="company"]')?.classList.contains('gate0-section-content-hidden'),
      renders: window.__g2wRenderCalls };
    renderGate = window.__g2wOriginalRenderGate;
    delete window.__g2wOriginalRenderGate;
    delete window.__g2wRenderCalls;
    return result;
  })()`);
  assert.deepEqual(scopeRestored, { expanded: 'true', hidden: false, renders: 0 });
  const beforePointer = await evaluate(`(() => ({ open: document.querySelector('[data-g2w-card-view="domain"]').open,
    done: Boolean(g2wRecord(G2W_CARDS[0])?.steps?.address?.result === 'done') }))()`);
  await pointerClick('[data-g2w-card-view="domain"] > summary');
  await wait(100);
  const afterSummaryPointer = await evaluate(`document.querySelector('[data-g2w-card-view="domain"]').open`);
  assert.equal(afterSummaryPointer, !beforePointer.open, 'summary must respond to a real pointer click');
  const openAfterRender = await evaluate(`(() => { renderGate(); return document.querySelector('[data-g2w-card-view="domain"]').open; })()`);
  assert.equal(openAfterRender, true, 'open wizard card must survive a Gate 2 render');
  await evaluate(`window.__g2wNavButton = document.querySelector('[data-gate-id="gate-2"]')`);
  await pointerClick('[data-g2w-card-view="domain"] [data-g2w-step="address"]');
  const afterStepPointer = await evaluate(`g2wRecord(G2W_CARDS[0])?.steps?.address?.result || ''`);
  assert.equal(afterStepPointer, 'done', 'step must respond to a real pointer click');
  const navAfterStep = await evaluate(`(() => ({
    sameButton: window.__g2wNavButton === document.querySelector('[data-gate-id="gate-2"]'),
    text: document.querySelector('[data-gate-id="gate-2"] .small')?.textContent,
    expected: guruGateReadiness(g2wGate()).percent,
  }))()`);
  assert.equal(navAfterStep.sameButton, true, 'step must update Gate 2 progress without rebuilding the sidebar');
  assert.equal(navAfterStep.text, `12 блоков, прогресс ${navAfterStep.expected}%`);
  await pointerClick('[data-g2w-card-view="domain"] [data-g2w-step="address"]');
  for (const cardId of ['counter', 'goal', 'crm', 'safety', 'landing', 'productCounter', 'productGoal', 'lead']) {
    const summary = `[data-g2w-card-view="${cardId}"] > summary`;
    const cardBefore = await evaluate(`document.querySelector(${JSON.stringify(`[data-g2w-card-view="${cardId}"]`)})?.open`);
    if (!cardBefore) await pointerClick(summary);
    const cardOpen = await evaluate(`document.querySelector(${JSON.stringify(`[data-g2w-card-view="${cardId}"]`)})?.open`);
    assert.equal(cardOpen, true, `${cardId} must open by pointer`);
    const stepSelector = `[data-g2w-card-view="${cardId}"] [data-g2w-step]`;
    const stepId = await evaluate(`document.querySelector(${JSON.stringify(stepSelector)})?.dataset.g2wStep || ''`);
    assert.ok(stepId, `${cardId} must have a step`);
    await pointerClick(stepSelector);
    const result = await evaluate(`(() => {
      const def = g2wDef(${JSON.stringify(cardId)});
      const product = def.scope === 'product' ? guruV194SelectedProduct(state)?.id : '';
      return g2wRecord(def, product)?.steps?.[${JSON.stringify(stepId)}]?.result || '';
    })()`);
    assert.equal(result, 'done', `${cardId} step must respond by pointer`);
    await pointerClick(stepSelector);
  }
  if (process.env.GURU_GATE2_SCREENSHOT) {
    await evaluate(`(() => { document.querySelector('[data-g2w-card-view="domain"]').open = true; return true; })()`);
    await wait(100);
    const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(process.env.GURU_GATE2_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  const deepLink = await evaluate(`(() => {
    history.replaceState(null, '', '#g2-metrika-product-counter');
    g2wOpenHash();
    const target = document.querySelector('[data-card="g2-metrika-product-counter"]');
    const opened = target?.closest('.g2w-additional')?.open &&
      !target?.closest('.g2-open-section')?.querySelector(':scope > .g2-section-body')?.hidden;
    history.replaceState(null, '', location.pathname);
    return Boolean(opened);
  })()`);
  assert.equal(deepLink, true);

  const edited = await evaluate(`(() => {
    const set = (card, key, value) => {
      const input = document.querySelector('[data-g2w-card-view="' + card + '"] [data-g2w-field="' + key + '"]');
      input.value = value;
      input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    };
    set('domain', 'homeUrl', 'https://example.org/');
    set('domain', 'platform', 'tilda');
    set('domain', 'registrar', 'Тестовый регистратор');
    set('domain', 'hosting', 'Tilda');
    set('domain', 'dnsRecord', 'Запись из панели Tilda');
    return { url: megaPlatformUrl('fixed','home'), platform: g2wPlatform(),
      oldCounter: g2wCompanyValue('counterId') };
  })()`);
  assert.equal(edited.url, "https://example.org/");
  assert.equal(edited.platform, "tilda");
  const progress = await evaluate(`(() => {
    for (const step of G2W_CARDS[0].steps) {
      document.querySelector('[data-g2w-card-view="domain"] [data-g2w-step="' + step[0] + '"]').click();
    }
    const card = document.querySelector('[data-g2w-card-view="domain"]');
    const input = card.querySelector('[data-g2w-source]');
    input.value = 'Проверено в браузере и панели Tilda';
    card.querySelector('[data-g2w-verify="passed"]').click();
    return { status: g2wStatus(G2W_CARDS[0]), checked: Object.values(g2wRecord(G2W_CARDS[0]).steps).filter((s) => s.result === 'done').length,
      source: g2wRecord(G2W_CARDS[0]).verification?.source_url };
  })()`);
  assert.equal(progress.status, "ready");
  assert.equal(progress.checked, 8);
  assert.equal(progress.source, "Проверено в браузере и панели Tilda");

  const stale = await evaluate(`(() => {
    const input = document.querySelector('[data-g2w-card-view="domain"] [data-g2w-field="homeUrl"]');
    input.value = 'https://example.com/'; input.dispatchEvent(new Event('input', { bubbles: true }));
    const status = g2wStatus(G2W_CARDS[0]);
    const historyStillPresent = Boolean(g2wRecord(G2W_CARDS[0]).verification);
    document.querySelector('[data-g2w-use="vk"]').value = 'no';
    document.querySelector('[data-g2w-use="vk"]').dispatchEvent(new Event('change', { bubbles: true }));
    return { status, historyStillPresent, vk: g2wStatus(G2W_CARDS[3]), productVk: g2wStatus(G2W_CARDS[10], guruV194SelectedProduct(state).id) };
  })()`);
  assert.equal(stale.status, "in_progress");
  assert.equal(stale.historyStillPresent, true);
  assert.equal(stale.vk, "not_needed");
  assert.equal(stale.productVk, "not_needed");
  const automatic = await evaluate(`(async () => {
    const originalFetch = window.fetch;
    window.fetch = async () => new Response('ok', { status: 200 });
    document.querySelector('[data-g2w-card-view="domain"] [data-g2w-auto]').click();
    for (let i = 0; i < 20 && !g2wRecord(G2W_CARDS[0]).auto; i++)
      await new Promise((resolve) => setTimeout(resolve, 20));
    window.fetch = originalFetch;
    const auto = g2wRecord(G2W_CARDS[0]).auto;
    return { result: auto?.result, type: auto?.verification_type, status: g2wStatus(G2W_CARDS[0]) };
  })()`);
  assert.deepEqual(automatic, { result: "passed", type: "automatic", status: "in_progress" });

  const isolation = await evaluate(`(() => {
    const first = guruV194SelectedProduct(state).id;
    document.querySelector('[data-g2w-card-view="landing"] [data-g2w-step="route"]').click();
    const second = guruV194Products(state).find((item) => item.id !== first);
    state.project.gate0ScopeUiV194.selectedCategoryId = megaPlatformProductCategoryIds(second)[0] || '__uncategorized__';
    state.project.gate0ScopeUiV194.selectedProductId = second.id;
    renderGate();
    const secondDone = g2wRecord(G2W_CARDS[7], second.id)?.steps?.route?.result || '';
    state.project.gate0ScopeUiV194.selectedCategoryId = megaPlatformProductCategoryIds(guruV194Products(state).find((item) => item.id === first))[0] || '__uncategorized__';
    state.project.gate0ScopeUiV194.selectedProductId = first;
    renderGate();
    return { secondDone, firstDone: g2wRecord(G2W_CARDS[7], first)?.steps?.route?.result,
      localSaved: Boolean(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)})) };
  })()`);
  assert.equal(isolation.secondDone, "");
  assert.equal(isolation.firstDone, "done");
  assert.equal(isolation.localSaved, true);
  const inheritance = await evaluate(`(() => {
    const input = document.querySelector('[data-g2w-card-view="counter"] [data-g2w-field="counterId"]');
    input.value = '12345'; input.dispatchEvent(new Event('input', { bubbles: true }));
    for (const step of G2W_CARDS[1].steps)
      document.querySelector('[data-g2w-card-view="counter"] [data-g2w-step="' + step[0] + '"]').click();
    const card = document.querySelector('[data-g2w-card-view="counter"]');
    card.querySelector('[data-g2w-source]').value = 'Проверка счётчика в Метрике';
    card.querySelector('[data-g2w-verify="passed"]').click();
    const verified = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374('counter'));
    input.value = '67890'; input.dispatchEvent(new Event('input', { bubbles: true }));
    const stale = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374('counter'));
    const model = guruExportRuntimeModelV223('gate-2');
    return { verified, stale, counterCheck: g2MetrikaCompanyDataV374('counter').counterCheck,
      model: model.model, units: model.units.length, wizardCardInExport: model.units.some((unit) => unit.unitId === 'g2w-counter'),
      oldChecklistInExport: JSON.stringify(state).includes('historical answer') };
  })()`);
  assert.equal(inheritance.verified, "ready");
  assert.equal(inheritance.stale, "in_progress");
  assert.equal(inheritance.counterCheck, "");
  assert.equal(inheritance.model, "gate2_setup_wizard");
  assert.equal(inheritance.units, 12);
  assert.equal(inheritance.wizardCardInExport, true);
  assert.equal(inheritance.oldChecklistInExport, true);
  await wait(800);
  const persisted = await evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)}));
    const cards = saved.gates.find((gate) => gate.id === 'gate-2').cards;
    return { domainSteps: Object.values(cards.find((card) => card.id === 'card-96').fields.g2SetupWizardV1.company.steps).filter((step) => step.result === 'done').length,
      counterId: cards.find((card) => card.id === 'g2-metrika-company-counter').fields.metrikaCompanyV374.counterId,
      archivedChecklist: cards.find((card) => card.id === 'g2-metrika-product-counter').fields.metrikaGuideChecklistV368.retained,
      productStep: cards.find((card) => card.id === 'card-90').fields.g2SetupWizardV1.byProduct[${JSON.stringify(seeded.first)}].steps.route.result };
  })()`);
  assert.deepEqual(persisted, { domainSteps: 8, counterId: "67890", archivedChecklist: "historical answer", productStep: "done" });
  const providerLinks = await evaluate(`(() => {
    const select = () => document.querySelector('[data-g2w-card-view="crm"] [data-g2w-field="crmName"]');
    select().value = 'bitrix24'; select().dispatchEvent(new Event('change', { bubbles: true }));
    const official = document.querySelector('[data-g2w-card-view="crm"] [data-g2w-doc-step="connect"]')?.href;
    const service = document.querySelector('[data-g2w-card-view="crm"] [data-g2w-open-step="system"]')?.href;
    select().value = 'other'; select().dispatchEvent(new Event('change', { bubbles: true }));
    const name = document.querySelector('[data-g2w-card-view="crm"] [data-g2w-field="crmServiceName"]');
    name.value = 'Система проекта'; name.dispatchEvent(new Event('input', { bubbles: true }));
    const docs = document.querySelector('[data-g2w-card-view="crm"] [data-g2w-field="crmDocsUrl"]');
    docs.value = 'https://example.org/help'; docs.dispatchEvent(new Event('input', { bubbles: true }));
    return { official, service, customDoc: document.querySelector('[data-g2w-card-view="crm"] [data-g2w-doc-step="connect"]')?.href,
      customName: g2wValue(G2W_CARDS[4], '', 'crmServiceName') };
  })()`);
  assert.equal(providerLinks.official, "https://helpdesk.bitrix24.ru/");
  assert.equal(providerLinks.service, "https://www.bitrix24.ru/");
  assert.equal(providerLinks.customDoc, "https://example.org/help");
  assert.equal(providerLinks.customName, "Система проекта");
  console.log(JSON.stringify({ ok: true, fixture: fixture ? "iCleaning Gate 2 export" : "generated portable workspace", cards: seeded.cards,
    wizard: [initial.company, initial.product], legacy: initial.legacy,
    canonicalUrl: edited.url, progress: progress.checked, stale: stale.status,
    optional: stale.vk, autoSeparated: true, productIsolation: true, inheritedMetrika: inheritance.verified,
    staleMetrika: inheritance.stale, exportUnits: inheritance.units, saved: true, providerDocs: true }));
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
