import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const gate0 = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE || "/Users/vl/Downloads/gate-0.json", "utf8"));
const gate2 = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || "/Users/vl/Downloads/gate-2.json", "utf8"));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4318/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ids = ["company-vk", "company-telegram-ads", "company-meta-ads", "company-ga4",
  "company-gsc", "company-google-ads", "company-leads", "company-safety"];

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
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
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 30000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser; let page; let browserContextId; let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshotBlock = async (id) => {
  const rect = await evaluate(`(() => {
    const node = document.querySelector('[data-g2sb-id="${id}"]');
    node.open = true;
    node.scrollIntoView({ block: 'start', behavior: 'instant' });
    [...document.querySelectorAll('body *')].filter((item) => !node.contains(item) && !item.contains(node) &&
      ['fixed', 'sticky'].includes(getComputedStyle(item).position)).forEach((item) => {
      item.dataset.g2s3CaptureHidden = item.style.visibility;
      item.style.visibility = 'hidden';
    });
    const r = node.getBoundingClientRect();
    return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY),
      width: Math.ceil(r.width), height: Math.ceil(r.height) };
  })()`);
  await wait(120);
  const result = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: { ...rect, scale: 1 },
  });
  writeFileSync(`artifacts/gate2-step3-icleaning-${id}.png`, Buffer.from(result.data, "base64"));
  await evaluate(`(() => {
    document.querySelectorAll('[data-g2s3-capture-hidden]').forEach((item) => {
      item.style.visibility = item.dataset.g2s3CaptureHidden;
      delete item.dataset.g2s3CaptureHidden;
    }); return true;
  })()`);
};

try {
  assert.equal(gate0.project.id, gate2.project.id, "Gate 0 and Gate 2 exports must belong to one project");
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
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2s3Applicability === "function"');

  const actual = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const id = ${JSON.stringify(gate2.project.id)};
    projects = [{ id, name: 'iCleaning', lifecycleStatus: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = id;
    state = createFreshWorkspace({ id, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(gate2.content.project)}, id };
    state.gates.find((item) => item.id === 'gate-0').cards = ${JSON.stringify(gate0.gate.cards)};
    const gate = state.gates.find((item) => item.id === 'gate-2');
    gate.cards = ${JSON.stringify(gate2.gate.cards)};
    ensureGate2Structure(gate);
    const snapshot = () => JSON.stringify(['vk','crm','safety'].map((unitId) => {
      const def = g2wDef(unitId);
      return [unitId, g2wCard(def)?.fields?.g2SetupWizardV1 || null];
    }));
    const before = snapshot();
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = {
      selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__',
      selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const after = snapshot();
    const scope = document.querySelector('[data-g2w-scope="company"]');
    const order = [...scope.children].map((node) => node.dataset.g2sbId || node.dataset.g2wCardView).filter(Boolean);
    const expectedIds = new Set(${JSON.stringify(gate2.gate.cards.map((card) => card.id))});
    const newBlocks = ${JSON.stringify(ids)}.map((id) => document.querySelector('[data-g2sb-id="' + id + '"]'));
    const links = newBlocks.flatMap((block) => [...block.querySelectorAll('.g2sb-help')].map((node) => node.href));
    const siteUrl = megaPlatformUrl('fixed','home');
    const privacyUrl = megaPlatformUrl('fixed','privacy');
    const crm = g2s3CrmName();
    const legal = newBlocks.at(-1);
    const meta = newBlocks[2];
    const vk = newBlocks[0];
    return { before, after, order, sourceCards: expectedIds.size,
      keptCards: gate.cards.filter((card) => expectedIds.has(card.id)).length,
      legacyCards: document.querySelectorAll('.g2w-workspace [data-card]').length,
      productUnits: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length,
      blockCount: document.querySelectorAll('.g2sb-block').length,
      steps: newBlocks.map((block) => block.querySelectorAll('.g2sb-step').length), links,
      siteUrl, privacyUrl, crm,
      vkFields: [...vk.querySelectorAll('[data-g2w-field]')].map((node) => node.dataset.g2wField),
      legalHttpsInputs: legal.querySelectorAll('[data-g2sb-step-id="https"] input').length,
      legalPolicyText: legal.querySelector('[data-g2sb-step-id="policy"]').textContent,
      metaNotice: meta.querySelector('.g2sb-notice')?.textContent,
      gray: newBlocks.map((block) => block.classList.contains('is-not-needed')),
      noEmDash: newBlocks.every((block) => !block.textContent.includes('\\u2014')),
      noUnconfirmedHelp: !document.querySelector('.g2w-workspace')?.textContent.includes('Справка: требует уточнения') };
  })()`);
  assert.equal(actual.before, actual.after, "existing wizard records must be unchanged by render");
  assert.equal(actual.sourceCards, 71);
  assert.equal(actual.keptCards, 71);
  assert.equal(actual.legacyCards, 71);
  assert.equal(actual.productUnits, 0);
  assert.equal(actual.blockCount, 17);
  assert.deepEqual(actual.order.slice(0, 6), ["company-domain", "counter", "goal",
    "company-webmaster", "company-yandex-business", "company-yandex-direct"]);
  assert.deepEqual(actual.order.slice(6, 14), ids);
  assert.deepEqual(actual.steps, [7, 4, 4, 5, 2, 4, 7, 5]);
  assert.equal(actual.siteUrl, "https://icleaning.ru/");
  assert.equal(actual.privacyUrl, "https://icleaning.ru/privacy-policy");
  assert.equal(actual.crm, "АГБИС");
  assert.deepEqual(actual.vkFields, ["vkAccount", "pixelId"]);
  assert.equal(actual.legalHttpsInputs, 0);
  assert.ok(actual.legalPolicyText.includes(actual.privacyUrl));
  assert.ok(actual.metaNotice.includes("21.03.2022"));
  assert.equal(actual.noEmDash, true);
  assert.equal(actual.noUnconfirmedHelp, true);
  const allowed = new Set(Object.values({
    vk: "https://help-ru.tilda.cc/vk-pixel", telegram: "https://ads.telegram.org/faq",
    meta: "https://help-ru.tilda.cc/facebook-pixel",
    ga4: "https://support.google.com/analytics/answer/9304153",
    gsc: "https://support.google.com/webmasters/answer/9008080",
    googleAds: "https://support.google.com/google-ads/answer/1722022",
    forms: "https://help-ru.tilda.cc/forms",
    vkGuide: "https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/ad/79ad8eafc5324d46a3c153cd5e9a2a32.pdf",
    vkCounter: "https://help-ru.tilda.cc/statistics/mail-ru",
    tildaPublish: "https://help-ru.tilda.cc/folders",
    ga4Tilda: "https://help-ru.tilda.cc/statistics/google-analytics",
    formSettings: "https://help-ru.tilda.cc/forms/settings",
    formErrors: "https://help-ru.tilda.cc/forms/errors",
    leads: "https://help-ru.tilda.cc/leads",
    tildaHttps: "https://tilda.cc/ru/answers/a/https/",
  }));
  assert.ok(actual.links.every((url) => allowed.has(url)), "help links must use the approved list");
  if (process.env.GURU_CAPTURE_SCREENSHOTS === "1")
    for (const id of ids) await screenshotBlock(id);

  const preservation = await evaluate(`(() => {
    const vk = g2wRecord(g2wDef('vk'), '', true);
    const crm = g2wRecord(g2wDef('crm'), '', true);
    const safety = g2wRecord(g2wDef('safety'), '', true);
    Object.assign(vk.values, { vkAccount: 'Сохранённый кабинет', pixelId: '123456789' });
    Object.assign(crm.values, { crmName: 'bitrix24' });
    safety.steps.https = { step_id: 'https', scope: 'company', result: 'pending' };
    safety.steps.policy = { step_id: 'policy', scope: 'company', result: 'done' };
    const snapshot = () => JSON.stringify([vk, crm, safety]);
    const before = snapshot();
    renderGate();
    const after = snapshot();
    const domain = g2wRecord(g2wDef('domain'), '', true);
    domain.steps.https = { step_id: 'https', scope: 'company', result: 'done' };
    renderGate();
    const legal = document.querySelector('[data-g2sb-id="company-safety"]');
    const inherited = { progress: legal.querySelector('[data-g2sb-progress]').textContent,
      sourceText: legal.querySelector('[data-g2sb-step-id="https"] .g2sb-context').textContent,
      ownHttps: safety.steps.https.result,
      crmText: document.querySelector('[data-g2sb-id="company-leads"] [data-g2sb-step-id="system"]').textContent };
    const lead = document.querySelector('[data-g2sb-id="company-leads"] [data-g2sb-step="storage"]');
    lead.checked = true; lead.dispatchEvent(new Event('change', { bubbles: true }));
    const storage = crm.steps.storage?.result;
    for (const id of ['consent', 'spam', 'test'])
      safety.steps[id] = { step_id: id, scope: 'company', result: 'done' };
    g2wRefresh();
    const canConfirm = g2wCanConfirm(g2wDef('safety'));
    const source = legal.querySelector('[data-g2w-source]');
    source.value = 'Проверено на сайте';
    legal.querySelector('[data-g2w-verify="passed"]').click();
    const ready = g2wStatus(g2wDef('safety'));
    domain.steps.https.result = 'pending';
    g2wRefresh();
    const stale = g2wStatus(g2wDef('safety'));
    return { before, after, inherited, storage, canConfirm, ready, stale };
  })()`);
  assert.equal(preservation.before, preservation.after, "nonempty VK, CRM and safety records must survive render");
  assert.equal(preservation.inherited.progress, "2 из 5 шагов");
  assert.ok(preservation.inherited.sourceText.includes("Выполнено"));
  assert.equal(preservation.inherited.ownHttps, "pending", "old safety answer must not be overwritten");
  assert.ok(preservation.inherited.crmText.includes("АГБИС"));
  assert.equal(preservation.storage, "done");
  assert.equal(preservation.canConfirm, true, "safety must use the Domain HTTPS result");
  assert.equal(preservation.ready, "ready");
  assert.equal(preservation.stale, "in_progress", "changing HTTPS must invalidate the safety check");

  const vkFlow = await evaluate(`(() => {
    const marketing = g2c2Marketing();
    marketing.infra.find((row) => row.name === 'VK Ads').status = 'not_started';
    for (const row of marketing.channels.filter((row) => row.platform === 'VK Ads'))
      row.status = 'not_started';
    const def = g2wDef('vk');
    const record = g2wRecord(def, '', true);
    const block = document.querySelector('[data-g2sb-id="company-vk"]');
    const ids = [...block.querySelectorAll('[data-g2sb-step-id]')].map((node) => node.dataset.g2sbStepId);
    const sources = [...block.querySelectorAll('[data-g2sb-step-id]')]
      .map((node) => Boolean(node.querySelector('.g2sb-help[href]')));
    const oldRoute = block.textContent.includes('VK Реклама → «Сайты»');
    const productBlock = document.querySelector('[data-g2sb-id="product-vk"]');
    const productSources = [...productBlock.querySelectorAll('[data-g2sb-step-id]')]
      .map((node) => Boolean(node.querySelector('.g2sb-help[href]')));
    const productOldRoute = productBlock.textContent.includes('VK Реклама → «Сайты»');
    const idOnly = g2wCanConfirm(def);
    for (const step of def.steps) record.steps[step[0]] = {
      step_id: step[0], result: 'done', params: {}, checked_at: new Date().toISOString()
    };
    record.verification = { result: 'passed', fingerprint: g2wInputs(def),
      checked_at: new Date().toISOString(), verification_type: 'manual' };
    const checkboxOnly = g2wStatus(def);
    const canConfirmCheckboxOnly = g2wCanConfirm(def);
    const visitControl = block.querySelector('[data-g2sb-step="visit"]');
    visitControl.value = 'Визит виден в Real-Time, 14:32';
    visitControl.dispatchEvent(new Event('change', { bubbles: true }));
    const withReportBeforeVerification = g2wStatus(def);
    const canConfirmWithReport = g2wCanConfirm(def);
    const searchControl = block.querySelector('[data-g2sb-step="existing"]');
    searchControl.value = 'Найден существующий ID 123456789';
    searchControl.dispatchEvent(new Event('change', { bubbles: true }));
    const canConfirmWithSearchAndReport = g2wCanConfirm(def);
    const source = block.querySelector('[data-g2w-source]');
    source.value = 'top.mail.ru → Мои счётчики → Real-Time → Обзор';
    block.querySelector('[data-g2w-verify="passed"]').click();
    const withReport = g2wStatus(def);
    renderGate();
    const savedSearch = g2wRecord(def)?.steps.existing?.params?.value;
    const savedVisit = g2wRecord(def)?.steps.visit?.params?.value;
    const savedId = g2wValue(def, '', 'pixelId');
    return { ids, sources, oldRoute, productSources, productOldRoute, idOnly, checkboxOnly, canConfirmCheckboxOnly,
      withReportBeforeVerification, canConfirmWithReport, canConfirmWithSearchAndReport,
      withReport, savedSearch, savedVisit, savedId,
      visitInput: visitControl.type, searchInput: searchControl.type };
  })()`);
  assert.deepEqual(vkFlow.ids, ['account', 'existing', 'pixel', 'id', 'install', 'publish', 'visit']);
  assert.ok(vkFlow.sources.every(Boolean), 'every VK step needs a source link');
  assert.ok(vkFlow.productSources.every(Boolean), 'every product VK step needs a source link');
  assert.equal(vkFlow.oldRoute, false);
  assert.equal(vkFlow.productOldRoute, false);
  assert.equal(vkFlow.idOnly, false);
  assert.equal(vkFlow.checkboxOnly, 'in_progress');
  assert.equal(vkFlow.canConfirmCheckboxOnly, false);
  assert.equal(vkFlow.withReportBeforeVerification, 'in_progress');
  assert.equal(vkFlow.canConfirmWithReport, false);
  assert.equal(vkFlow.canConfirmWithSearchAndReport, true);
  assert.equal(vkFlow.withReport, 'ready');
  assert.equal(vkFlow.savedSearch, 'Найден существующий ID 123456789');
  assert.equal(vkFlow.savedVisit, 'Визит виден в Real-Time, 14:32');
  assert.equal(vkFlow.savedId, '123456789');
  assert.equal(vkFlow.visitInput, 'text');
  assert.equal(vkFlow.searchInput, 'text');

  const skipped = await evaluate(`(() => {
    const marketing = g2c2Marketing();
    for (const name of ['VK Ads','Telegram Ads','Meta Ads','Google Analytics 4',
      'Google Search Console','Google Ads','CRM']) {
      const row = marketing.infra.find((item) => item.name === name);
      row.status = 'not_needed';
    }
    for (const row of marketing.channels.filter((item) => ['Meta Ads', 'Google Ads'].includes(item.platform)))
      row.status = 'not_needed';
    renderGate();
    return ${JSON.stringify(ids)}.map((id) => {
      const block = document.querySelector('[data-g2sb-id="' + id + '"]');
      return { id, gray: block.classList.contains('is-not-needed'),
        label: block.querySelector('[data-g2sb-status]').textContent };
    });
  })()`);
  assert.ok(skipped.slice(0, 7).every((item) => item.gray));
  assert.equal(skipped.find((item) => item.id === 'company-meta-ads').label,
    'Не требуется: все каналы отмечены «Не требуется» в Gate 0');
  assert.equal(skipped.find((item) => item.id === 'company-google-ads').label,
    'Не требуется: все каналы отмечены «Не требуется» в Gate 0');
  assert.equal(skipped.find((item) => item.id === 'company-ga4').label, 'Gate 0: Не требуется');
  assert.equal(skipped[7].gray, false);

  const cleanProjects = [];
  for (const name of ["Коричное яблоко", "SIVRCE", "ГУРУ"]) {
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
        products: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length };
    })()`);
    assert.deepEqual(result, { name, blocks: 17, products: 0 });
    cleanProjects.push(name);
  }
  assert.deepEqual(page.exceptions, [], "Gate 2 must open without uncaught browser errors");
  console.log(JSON.stringify({ ok: true, realProjectId: gate2.project.id,
    realRecordsUnchanged: actual.before === actual.after,
    seededRecordsUnchanged: preservation.before === preservation.after,
    oldCards: actual.keptCards, blocks: actual.blockCount, screenshots: process.env.GURU_CAPTURE_SCREENSHOTS === "1" ? ids.length : 0,
    savedStorageStep: preservation.storage, cleanProjects, browserErrors: page.exceptions.length }));
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
