import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const gate0 = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE || "/Users/vl/Downloads/gate-0.json", "utf8"));
const gate2 = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || "/Users/vl/Downloads/gate-2.json", "utf8"));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4318/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const blocks = ["product-landing", "product-counter", "product-goal", "product-vk", "product-lead"];
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        this.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)),
        method === 'Page.captureScreenshot' ? 90000 : 30000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
let browser; let page; let browserContextId; let targetId;
let evaluated = 0;
const evaluate = async (expression) => {
  if (process.env.GURU_SMOKE_TRACE === "1")
    console.error(`evaluate ${++evaluated}: ${expression.slice(0, 80)}`);
  const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
async function captureBlock(id, label) {
  const rect = await evaluate(`(() => {
    const node = document.querySelector('[data-g2sb-id="${id}"]');
    node.open = true;
    node.scrollIntoView({ block: 'start', behavior: 'instant' });
    const r = node.getBoundingClientRect();
    return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY),
      width: Math.ceil(r.width), height: Math.min(1100, Math.ceil(r.height)) };
  })()`);
  await wait(100);
  const image = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
    clip: { ...rect, scale: 1 } });
  writeFileSync(`artifacts/gate2-step4-icleaning-${label}-${id}.png`, Buffer.from(image.data, "base64"));
}
async function captureSelector(selector, file, maxHeight = 1100) {
  const rect = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error('Screenshot target missing: ' + ${JSON.stringify(selector)} +
      '; gate=' + activeGateId + '; blocks=' +
      [...document.querySelectorAll('[data-g2sb-id]')].map((item) => item.dataset.g2sbId).join(','));
    const disclosure = node.closest('details.g2sb-block');
    if (disclosure) disclosure.open = true;
    node.scrollIntoView({ block: 'start', behavior: 'instant' });
    const r = node.getBoundingClientRect();
    return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY),
      width: Math.ceil(r.width), height: Math.min(${maxHeight}, Math.ceil(r.height)) };
  })()`);
  await wait(100);
  const image = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
    clip: { ...rect, scale: 1 } });
  writeFileSync(file, Buffer.from(image.data, "base64"));
}
try {
  assert.equal(gate0.project.id, gate2.project.id);
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl); await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable"); await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2s4Readiness === "function"');

  const first = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const id = ${JSON.stringify(gate2.project.id)};
    projects = [{ id, name: 'iCleaning', lifecycleStatus: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = id;
    state = createFreshWorkspace({ id, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(gate2.content.project)}, id };
    state.project.name = 'iCleaning';
    updateProjectChrome();
    state.gates.find((gate) => gate.id === 'gate-0').cards = ${JSON.stringify(gate0.gate.cards)};
    const gate = state.gates.find((item) => item.id === 'gate-2');
    gate.cards = ${JSON.stringify(gate2.gate.cards)};
    ensureGate2Structure(gate);
    const sourceIds = gate.cards.map((card) => card.id);
    const allRecords = () => JSON.stringify(sourceIds.map((id) =>
      gate.cards.find((card) => card.id === id)?.fields?.g2SetupWizardV1 || null));
    const allBefore = allRecords();
    const products = guruV194Products(state).slice(0, 2);
    const snapshot = () => JSON.stringify(G2S4_PRODUCT_UNITS.map((unitId) => {
      const def = g2wDef(unitId);
      return [unitId, g2wCard(def)?.fields?.g2SetupWizardV1 || null];
    }));
    const before = snapshot();
    state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(products[0])[0] || '__uncategorized__',
      selectedProductId: products[0].id };
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const after = snapshot();
    const allAfter = allRecords();
    const summary = g2s4Readiness();
    const diagnostic = guruExportGateDiagnosticsCurrentV223('gate-2', guruExportRawCardStatusesV223(state));
    const oldIds = new Set(${JSON.stringify(gate2.gate.cards.map((card) => card.id))});
    return { allBefore, allAfter, products: products.map((product) => ({ id: product.id, name: product.name,
      categoryId: megaPlatformProductCategoryIds(product)[0] || '__uncategorized__',
      url: g2s4ProductUrl(product.id) })), before, after,
      oldCards: gate.cards.filter((card) => oldIds.has(card.id)).length,
      oldDom: document.querySelectorAll('.g2w-workspace [data-card]').length,
      archiveIds: [...document.querySelectorAll('.g2w-additional [data-card]')].map((node) => node.dataset.card),
      contextual: [...document.querySelectorAll('.g2s4-related [data-card]')].map((node) => node.dataset.card),
      metrikaOutsideArchive: [...document.querySelectorAll('[data-g2-metrika-quality-section-v360]')]
        .every((node) => !node.closest('.g2w-additional')),
      metrikaClosed: [...document.querySelectorAll('[data-g2-metrika-quality-section-v360]')]
        .every((node) => node.querySelector(':scope > [data-g2-toggle-section]')?.getAttribute('aria-expanded') === 'false'),
      servicesClosed: [...document.querySelectorAll('.g2sb-block')].every((node) => !node.open),
      marked: [...document.querySelectorAll('[data-g2s4-replaced-by]')].length,
      markedIds: [...document.querySelectorAll('[data-g2s4-replaced-by]')].map((node) => node.closest('[data-card]')?.dataset.card),
      companyBlocks: document.querySelectorAll('[data-g2-scope="company"] .g2sb-block').length,
      productBlocks: document.querySelectorAll('[data-g2-scope="product"] .g2sb-block').length,
      productWizard: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length,
      selected: document.querySelector('[data-gate0-scope-product-select="gate2-product"]').value,
      productIds: [...document.querySelectorAll('[data-g2-scope="product"] .g2sb-block')].map((node) => node.dataset.g2sbProductId),
      urlInputs: document.querySelectorAll('[data-g2-scope="product"] [data-g2w-field="productUrl"]').length,
      goalInputs: document.querySelectorAll('[data-g2-scope="product"] [data-g2w-field="goalRefId"]').length,
      formula: diagnostic.runtimeModel.readinessFormula,
      diagnosticUnits: diagnostic.runtimeModel.units.length,
      diagnosticSteps: diagnostic.runtimeModel.units.every((unit) => unit.details?.steps?.length > 0),
      includedUnits: diagnostic.runtimeModel.units.filter((unit) => unit.includedInGateReadiness).length,
      replacedExport: diagnostic.cards.filter((card) => card.replacedBy).length,
      nav: document.querySelector('[data-gate-id="gate-2"] .small')?.textContent,
      overviewCount: document.querySelectorAll('[data-g2s4-overall]').length,
      companyNumber: document.querySelector('[data-g2w-scope="company"] .g2w-scope-summary > span')?.textContent,
      statuses: summary.units.map((unit) => [unit.id, unit.status]),
      approvedLinks: [...document.querySelectorAll('[data-g2-scope="product"] .g2sb-help')].map((node) => node.href),
      noEmDash: [...document.querySelectorAll('.g2sb-block')].every((node) => !node.textContent.includes('\\u2014')) };
  })()`);
  assert.equal(first.before, first.after, "render must preserve product wizard records");
  assert.equal(first.allBefore, first.allAfter, "render must preserve every original wizard record");
  assert.equal(first.oldCards, 71); assert.equal(first.oldDom, 71);
  assert.equal(first.overviewCount, 0);
  assert.equal(first.servicesClosed, true);
  assert.equal(first.metrikaOutsideArchive, true);
  assert.equal(first.metrikaClosed, true);
  assert.deepEqual(first.archiveIds.slice().sort(),
    ['card-89', 'card-95', 'card-99', 'card-106', 'card-112', 'card-115',
      'card-121', 'card-125', 'card-130', 'card-133'].sort());
  assert.ok(first.contextual.includes('card-96') && first.contextual.includes('card-90'));
  assert.ok(first.contextual.includes('card-107') && first.contextual.includes('card-116'));
  assert.ok(first.contextual.includes('g2-marketing-meta-ads'));
  assert.equal(first.companyBlocks, 12); assert.equal(first.productBlocks, 5);
  assert.equal(first.productWizard, 0);
  assert.deepEqual(first.productIds, Array(5).fill(first.products[0].id));
  assert.equal(first.selected, first.products[0].id);
  assert.equal(first.urlInputs, 0); assert.equal(first.goalInputs, 0);
  assert.equal(first.marked, 28); assert.equal(first.replacedExport, 28);
  assert.equal(first.diagnosticUnits, 19);
  assert.equal(first.diagnosticSteps, true);
  assert.equal(first.includedUnits, first.formula.denominator);
  assert.equal(first.formula.denominator, first.statuses.length);
  assert.equal(first.nav, `0 из ${first.formula.denominator} блоков готово · 0%`);
  assert.equal(first.companyNumber, first.nav);
  assert.equal(first.noEmDash, true);
  assert.ok(!first.markedIds.includes('card-103'));
  assert.ok(!first.markedIds.includes('g2-metrika-company-counter'));
  assert.ok(!first.markedIds.includes('g2-metrika-company-goals'));
  assert.ok(!first.markedIds.includes('card-113') && !first.markedIds.includes('card-114'));
  const allowed = new Set([
    'https://yandex.ru/support/metrica/ru/general/check-counter',
    'https://yandex.ru/support/metrica/ru/general/check-goal.html',
    'https://yandex.ru/support/metrica/ru/general/goals',
    'https://help-ru.tilda.cc/forms',
    'https://help-ru.tilda.cc/statistics/mail-ru',
    'https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/ad/79ad8eafc5324d46a3c153cd5e9a2a32.pdf',
  ]);
  assert.ok(first.approvedLinks.every((url) => allowed.has(url)));
  const details = await evaluate(`(() => {
    const check = (block, step) => {
      const node = document.querySelector('[data-g2sb-id="' + block + '"] [data-g2sb-step-id="' + step + '"]');
      return [...node.querySelectorAll('.g2sb-copy > span')].map((item) => item.textContent);
    };
    return { domain: check('company-domain', 'https'),
      sitemap: check('company-webmaster', 'sitemap'),
      googleAds: check('company-google-ads', 'status'),
      metaReason: document.querySelector('[data-g2sb-id="company-meta-ads"] [data-g2sb-status]').textContent,
      googleReason: document.querySelector('[data-g2sb-id="company-google-ads"] [data-g2sb-status]').textContent,
      ga4Reason: document.querySelector('[data-g2sb-id="company-ga4"] [data-g2sb-status]').textContent,
      companyCount: g2s4Readiness().allUnits.filter((unit) => unit.scope === 'company' && unit.status !== 'not_needed').length };
  })()`);
  assert.ok(details.domain.includes('Если не получилось'));
  assert.ok(details.sitemap.includes('Если не получилось') && details.sitemap.includes('Сверка'));
  assert.ok(details.googleAds.includes('Если не получилось'));
  assert.equal(details.metaReason, 'Не требуется: все каналы отмечены «Не требуется» в Gate 0');
  assert.equal(details.googleReason, details.metaReason);
  assert.equal(details.ga4Reason, 'Gate 0: Не требуется');
  assert.equal(details.companyCount, 11);
  const opened = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    block.querySelector(':scope > summary').click();
    return block.open;
  })()`);
  assert.equal(opened, true, 'service heading must open its block');
  await wait(100);
  await evaluate('renderGate(); true');
  assert.equal(await evaluate(`document.querySelector('[data-g2sb-id="company-domain"]').open`), true,
    'open state must survive render');
  await captureSelector('[data-g2sb-id="company-domain"]',
    'artifacts/gate2-context-domain-open.png', 1000);
  const closed = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    block.querySelector(':scope > summary').click();
    return block.open;
  })()`);
  assert.equal(closed, false, 'service heading must close its block');
  await wait(100);
  await evaluate('renderGate(); true');
  assert.equal(await evaluate(`document.querySelector('[data-g2sb-id="company-domain"]').open`), false,
    'closed state must survive render');
  const linkDoesNotToggle = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    const link = block.querySelector(':scope > summary a');
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link.click();
    return !block.open;
  })()`);
  assert.equal(linkDoesNotToggle, true, 'service link must not toggle the block');
  const metrikaToggle = await evaluate(`(() => {
    const section = document.querySelector('[data-g2-metrika-quality-section-v360="company"]');
    const button = section.querySelector(':scope > [data-g2-toggle-section]');
    button.click();
    const opened = button.getAttribute('aria-expanded') === 'true' &&
      !section.querySelector(':scope > .g2-section-body').hidden;
    button.click();
    return { opened, closed: button.getAttribute('aria-expanded') === 'false' &&
      section.querySelector(':scope > .g2-section-body').hidden };
  })()`);
  assert.deepEqual(metrikaToggle, { opened: true, closed: true });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1915, height: 900,
    deviceScaleFactor: 1, mobile: false });
  await evaluate(`(() => {
    for (const node of [els.contentArea, els.contentArea?.parentElement, document.scrollingElement])
      if (node) node.scrollTop = 0;
    window.scrollTo(0, 0);
    return true;
  })()`);
  await wait(120);
  const top = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync("artifacts/gate2-context-top.png", Buffer.from(top.data, "base64"));
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900,
    deviceScaleFactor: 1, mobile: false });
  await captureSelector('[data-g2sb-id="company-domain"] .g2s4-related',
    'artifacts/gate2-context-domain-related.png', 900);
  await captureSelector('[data-g2sb-id="company-yandex-direct"] .g2s4-related',
    'artifacts/gate2-context-direct-related.png', 900);

  const second = await evaluate(`(() => {
    const product = ${JSON.stringify(first.products[1])};
    state.project.gate0ScopeUiV194 = { selectedCategoryId: product.categoryId, selectedProductId: product.id };
    renderGate();
    return { selected: document.querySelector('[data-gate0-scope-product-select="gate2-product"]').value,
      productIds: [...document.querySelectorAll('[data-g2-scope="product"] .g2sb-block')].map((node) => node.dataset.g2sbProductId),
      url: document.querySelector('[data-g2sb-id="product-landing"] [data-g2sb-step-id="url"] .g2sb-context')?.textContent,
      records: JSON.stringify(G2S4_PRODUCT_UNITS.map((unitId) => g2wCard(g2wDef(unitId))?.fields?.g2SetupWizardV1 || null)) };
  })()`);
  assert.equal(second.selected, first.products[1].id);
  assert.deepEqual(second.productIds, Array(5).fill(first.products[1].id));
  assert.ok(second.url.includes(first.products[1].url || 'URL не указан'));
  await captureSelector('[data-g2sb-id="product-landing"]',
    'artifacts/gate2-context-product-landing.png', 850);

  const seededPreservation = await evaluate(`(() => {
    const productId = ${JSON.stringify(first.products[1].id)};
    for (const unitId of G2S4_PRODUCT_UNITS) {
      const def = g2wDef(unitId);
      const record = g2wRecord(def, productId, true);
      record.values.savedAnswer = 'Сохранённый ответ ' + unitId;
      record.steps[def.steps[0][0]] = { step_id: def.steps[0][0], scope: 'product',
        project_id: state.project.id, product_id: productId, result: 'done',
        verification_type: 'self_reported_action', source_url: '', checked_at: '2026-10-20T00:00:00.000Z' };
    }
    const snapshot = () => JSON.stringify(G2S4_PRODUCT_UNITS.map((unitId) =>
      g2wCard(g2wDef(unitId)).fields.g2SetupWizardV1.byProduct[productId]));
    const before = snapshot();
    renderGate();
    return { before, after: snapshot() };
  })()`);
  assert.equal(seededPreservation.before, seededPreservation.after,
    "nonempty product wizard records must survive render without changes");

  const isolation = await evaluate(`(() => {
    const firstId = ${JSON.stringify(first.products[0].id)};
    const secondId = ${JSON.stringify(first.products[1].id)};
    const def = g2wDef('landing');
    const before = JSON.stringify(G2S4_PRODUCT_UNITS.map((unitId) => g2wCard(g2wDef(unitId))?.fields?.g2SetupWizardV1 || null));
    const checkbox = document.querySelector('[data-g2sb-id="product-landing"] [data-g2sb-step="mobile"]');
    checkbox.checked = true; checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const secondDone = g2wRecord(def, secondId)?.steps?.mobile?.result;
    const firstDone = g2wRecord(def, firstId)?.steps?.mobile?.result || '';
    renderGate();
    const restored = document.querySelector('[data-g2sb-id="product-landing"] [data-g2sb-step="mobile"]')?.checked;
    return { before, secondDone, firstDone, restored,
      productKeys: Object.keys(g2wCard(def).fields.g2SetupWizardV1.byProduct) };
  })()`);
  assert.equal(isolation.secondDone, 'done'); assert.equal(isolation.firstDone, '');
  assert.equal(isolation.restored, true);
  assert.ok(isolation.productKeys.every((key) => key === first.products[0].id || key === first.products[1].id));

  const goalSelect = await evaluate(`(() => {
    const productId = ${JSON.stringify(first.products[1].id)};
    const goals = g2MetrikaCompanyDataV374('goals');
    goals.primaryGoal = { entryId: 'smoke-goal', goalId: '123456', name: 'Тестовая заявка' };
    renderGate();
    const radio = document.querySelector('[data-g2sb-id="product-goal"] [data-g2s4-goal-ref]');
    radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true }));
    const selected = g2wValue(g2wDef('productGoal'), productId, 'goalRefId');
    renderGate();
    return { options: [...document.querySelectorAll('[data-g2sb-id="product-goal"] [data-g2s4-goal-ref]')]
      .map((node) => node.value), selected,
      restored: document.querySelector('[data-g2sb-id="product-goal"] [data-g2s4-goal-ref]')?.checked,
      other: g2wValue(g2wDef('productGoal'), ${JSON.stringify(first.products[0].id)}, 'goalRefId') };
  })()`);
  assert.deepEqual(goalSelect.options, ['smoke-goal']);
  assert.equal(goalSelect.selected, 'smoke-goal');
  assert.equal(goalSelect.restored, true);
  assert.equal(goalSelect.other, '');

  const fullExport = await evaluate(`(() => {
    const diagnostic = guruExportAllGateDiagnosticsFreshV223(state, ['gate-2'])['gate-2'];
    return { units: diagnostic.runtimeModel.units.length,
      replaced: diagnostic.cards.filter((card) => card.replacedBy).length,
      completeSteps: diagnostic.runtimeModel.units.every((unit) => unit.details?.steps?.length > 0),
      denominator: diagnostic.runtimeModel.readinessFormula.denominator };
  })()`);
  assert.equal(fullExport.units, 19);
  assert.equal(fullExport.replaced, 28);
  assert.equal(fullExport.completeSteps, true);
  assert.equal(fullExport.denominator, first.formula.denominator);

  const cleanProjects = [];
  for (const name of ['Коричное яблоко', 'SIVRCE', 'ГУРУ']) {
    const result = await evaluate(`(() => {
      const name = ${JSON.stringify(name)};
      const id = 'clean-' + name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-');
      activeProjectId = id; state = createFreshWorkspace({ id, name });
      const category = guruV189CreateCategory('Проверочная категория', state);
      const productId = id + '-product';
      guruV189CatalogItems(state).push({ id: productId, name: 'Проверочный продукт', continuum: 'product' });
      megaPlatformSetProductCategoryIds(productId, [category.id], state);
      state.project.gate0ScopeUiV194 = { selectedCategoryId: category.id, selectedProductId: productId };
      activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
      return { name: state.project.name, blocks: document.querySelectorAll('.g2sb-block').length,
        selected: document.querySelector('[data-gate0-scope-product-select="gate2-product"]').value };
    })()`);
    assert.deepEqual(result, { name, blocks: 17,
      selected: 'clean-' + name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-') + '-product' });
    cleanProjects.push(name);
  }
  assert.deepEqual(page.exceptions, [], "Gate 2 must open without uncaught browser errors");
  console.log(JSON.stringify({ ok: true, products: first.products.map(({ id, name }) => ({ id, name })),
    screenshots: 5, oldCards: first.oldCards, replaced: first.marked, diagnosticUnits: first.diagnosticUnits,
    formula: first.formula, counted: first.statuses, recordsUnchanged: first.before === first.after,
    seededRecordsUnchanged: seededPreservation.before === seededPreservation.after,
    productIdIsolation: true, liveSaved: true, cleanProjects, browserErrors: page.exceptions.length }));
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
